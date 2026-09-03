import { getSql } from '@/lib/supabase/server';
import { getProjectQuota } from '@/lib/entitlements';
import {
  MAX_GENERATION_ATTEMPTS,
  buildInboundLocalPart,
} from '@/lib/projects/inbound-address';

/**
 * Accès aux projets.
 *
 * CONTRÔLE D'ACCÈS — UNE SEULE RÈGLE, ICI.
 * Toute fonction qui touche un projet prend `userId` en premier paramètre et
 * vérifie l'appartenance dans la requête SQL elle-même, par jointure sur
 * `organization_members`. Il n'existe pas de variante « sans vérification » :
 * c'est ce qui empêche qu'un futur écran en oublie une.
 *
 * **Un projet inaccessible est INTROUVABLE, pas interdit.** Ces fonctions
 * renvoient `null`, et les pages en font un 404. Un 403 confirmerait
 * l'existence du projet à quelqu'un qui devine des adresses — et l'adresse est
 * précisément ce qu'on protège par un suffixe aléatoire.
 *
 * DEUX NATURES DE PROJET DEPUIS LE LOT 1B. Un utilisateur voit les projets de
 * son organisation, dont il est `owner`, ET ceux des organisations qui l'ont
 * invité, où il est `member`. La LECTURE ne fait aucune différence entre les
 * deux — c'est l'invariant « périmètre d'accès unique » de la section A. Les
 * ÉCRITURES, elles, exigent `owner` : un invité ne renomme pas, n'archive pas
 * et ne crée pas de projet dans l'organisation qui l'a invité.
 *
 * Le rôle voyage donc avec chaque projet lu, pour que l'écran n'ait pas à le
 * redemander — mais l'écran ne décide de rien : chaque mutation revérifie.
 */

export type ProjectRole = 'owner' | 'member';

export type ProjectRow = {
  id: string;
  name: string;
  inboundLocalPart: string;
  status: 'active' | 'archived';
  createdAt: Date;
  /** L'organisation propriétaire, et le rôle qu'y tient l'utilisateur. */
  orgId: string;
  orgName: string;
  role: ProjectRole;
};

type DbProject = {
  id: string;
  name: string;
  inbound_local_part: string;
  status: 'active' | 'archived';
  created_at: Date;
  org_id: string;
  org_name: string;
  role: ProjectRole;
};

function toProject(row: DbProject): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    inboundLocalPart: row.inbound_local_part,
    status: row.status,
    createdAt: row.created_at,
    orgId: row.org_id,
    orgName: row.org_name,
    role: row.role,
  };
}

/**
 * Tous les projets visibles par l'utilisateur : les siens et ceux qu'on lui a
 * partagés. Ses propres projets d'abord, actifs avant archivés.
 *
 * Le tri place `owner` en tête pour que l'écran puisse découper la liste sans
 * seconde requête, et pour que « Mes projets » reste au-dessus quel que soit
 * l'ordre de création.
 */
export async function listProjectsForUser(userId: string): Promise<ProjectRow[]> {
  const sql = getSql();

  const rows = await sql<DbProject[]>`
    select p.id, p.name, p.inbound_local_part, p.status, p.created_at,
           o.id as org_id, o.name as org_name, m.role
      from public.projects p
      join public.organization_members m on m.org_id = p.owner_org_id
      join public.organizations o on o.id = p.owner_org_id
     where m.user_id = ${userId}
     order by (m.role = 'member'), o.name asc,
              (p.status = 'archived'), p.created_at desc
  `;

  return rows.map(toProject);
}

/**
 * Un projet par sa partie locale, si l'utilisateur y a accès.
 *
 * `null` quand le projet n'existe pas ET quand l'utilisateur n'y a pas accès :
 * les deux cas sont volontairement indiscernables de l'extérieur.
 *
 * La jointure ne filtre PAS sur le rôle, et c'est voulu : un invité lit le
 * projet exactement comme son propriétaire. Ce qu'il ne peut pas faire, ce sont
 * les mutations plus bas.
 *
 * La comparaison est insensible à la casse, comme l'index unique
 * `projects_inbound_local_part_lower_idx` que l'ingestion utilise : les deux
 * chemins doivent résoudre exactement le même projet.
 */
export async function getProjectForUser(
  userId: string,
  localPart: string,
): Promise<ProjectRow | null> {
  const sql = getSql();

  const rows = await sql<DbProject[]>`
    select p.id, p.name, p.inbound_local_part, p.status, p.created_at,
           o.id as org_id, o.name as org_name, m.role
      from public.projects p
      join public.organization_members m on m.org_id = p.owner_org_id
      join public.organizations o on o.id = p.owner_org_id
     where m.user_id = ${userId}
       and lower(p.inbound_local_part) = lower(${localPart})
     limit 1
  `;

  return rows.length > 0 ? toProject(rows[0]) : null;
}

/**
 * L'organisation propriétaire d'un projet, si l'utilisateur y a accès.
 * `null` dans les deux cas indiscernables : projet inexistant, ou inaccessible.
 */
export async function getOrgIdForProject(
  userId: string,
  localPart: string,
): Promise<string | null> {
  const sql = getSql();

  const rows = await sql<{ owner_org_id: string }[]>`
    select p.owner_org_id
      from public.projects p
      join public.organization_members m on m.org_id = p.owner_org_id
     where m.user_id = ${userId}
       and lower(p.inbound_local_part) = lower(${localPart})
     limit 1
  `;

  return rows.length > 0 ? rows[0].owner_org_id : null;
}

/** Violation d'un index unique PostgreSQL. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export type CreateProjectResult =
  | { ok: true; project: ProjectRow }
  | { ok: false; reason: 'quota' | 'address-generation' | 'no-organization' };

/**
 * Crée un projet et tire son adresse.
 *
 * LE PROJET EST TOUJOURS CRÉÉ DANS L'ORGANISATION DONT L'UTILISATEUR EST
 * `owner`, jamais dans une organisation qui l'a invité : le quota d'une
 * organisation n'est jamais consommé par un invité. `canCreateProject` n'est
 * donc appelée que sur cette organisation-là, et nulle part ailleurs.
 *
 * Le suffixe définitif est tiré ICI, au serveur : l'aperçu affiché pendant la
 * saisie est indicatif, il ne doit jamais devenir l'adresse réelle, sinon un
 * client pourrait la choisir et l'énumération redeviendrait possible.
 *
 * En cas de collision sur l'index unique, on retire un suffixe et on réessaie.
 * L'échec après cinq tentatives est signalé, jamais silencieux.
 */
export async function createProjectForUser(
  userId: string,
  name: string,
): Promise<CreateProjectResult> {
  const sql = getSql();

  const [org] = await sql<{ org_id: string; org_name: string }[]>`
    select m.org_id, o.name as org_name
      from public.organization_members m
      join public.organizations o on o.id = m.org_id
     where m.user_id = ${userId}
       and m.role = 'owner'
     order by m.created_at asc
     limit 1
  `;

  if (!org) return { ok: false, reason: 'no-organization' };

  const quota = await getProjectQuota(org.org_id);
  if (!quota.canCreate) return { ok: false, reason: 'quota' };

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const localPart = buildInboundLocalPart(name);

    try {
      const [row] = await sql<Omit<DbProject, 'org_id' | 'org_name' | 'role'>[]>`
        insert into public.projects (owner_org_id, name, inbound_local_part)
        values (${org.org_id}, ${name.trim()}, ${localPart})
        returning id, name, inbound_local_part, status, created_at
      `;

      return {
        ok: true,
        project: toProject({
          ...row,
          org_id: org.org_id,
          org_name: org.org_name,
          role: 'owner',
        }),
      };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Collision sur l'adresse : on retire un suffixe et on réessaie.
    }
  }

  return { ok: false, reason: 'address-generation' };
}

/**
 * Renomme un projet. `owner` seulement.
 *
 * **Ne touche JAMAIS à `inbound_local_part`.** L'adresse figure en copie de
 * fils de discussion déjà en cours, chez des gens qui ne sont pas nos
 * utilisateurs : la changer romprait la réception sans que personne s'en
 * aperçoive avant le prochain message perdu.
 *
 * Le filtre `role = 'owner'` est DANS la requête, pas dans l'écran qui
 * l'appelle : masquer le bouton chez l'invité ne protège rien, l'action serveur
 * reste appelable directement.
 */
export async function renameProjectForUser(
  userId: string,
  projectId: string,
  name: string,
): Promise<boolean> {
  const sql = getSql();

  const rows = await sql<{ id: string }[]>`
    update public.projects p
       set name = ${name.trim()}
     where p.id = ${projectId}
       and exists (
         select 1
           from public.organization_members m
          where m.org_id = p.owner_org_id
            and m.user_id = ${userId}
            and m.role = 'owner'
       )
    returning p.id
  `;

  return rows.length > 0;
}

/**
 * Archive ou réactive un projet. `owner` seulement.
 *
 * **Un projet archivé continue d'ingérer et de stocker** — jamais de perte
 * silencieuse de correspondance — mais ne fait tourner aucun traitement,
 * aucune extraction, aucun digest. Le lot 0a ne filtre déjà pas sur le statut à
 * la résolution de l'adresse, et c'est volontaire.
 *
 * Archiver libère une place dans le quota de l'organisation.
 */
export async function setProjectStatusForUser(
  userId: string,
  projectId: string,
  status: 'active' | 'archived',
): Promise<boolean> {
  const sql = getSql();

  const rows = await sql<{ id: string }[]>`
    update public.projects p
       set status = ${status}
     where p.id = ${projectId}
       and exists (
         select 1
           from public.organization_members m
          where m.org_id = p.owner_org_id
            and m.user_id = ${userId}
            and m.role = 'owner'
       )
    returning p.id
  `;

  return rows.length > 0;
}
