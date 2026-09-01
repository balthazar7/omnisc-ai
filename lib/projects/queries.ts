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
 */

export type ProjectRow = {
  id: string;
  name: string;
  inboundLocalPart: string;
  status: 'active' | 'archived';
  createdAt: Date;
};

type DbProject = {
  id: string;
  name: string;
  inbound_local_part: string;
  status: 'active' | 'archived';
  created_at: Date;
};

function toProject(row: DbProject): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    inboundLocalPart: row.inbound_local_part,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Les projets de l'organisation de l'utilisateur. Actifs d'abord. */
export async function listProjectsForUser(userId: string): Promise<ProjectRow[]> {
  const sql = getSql();

  const rows = await sql<DbProject[]>`
    select p.id, p.name, p.inbound_local_part, p.status, p.created_at
      from public.projects p
      join public.organization_members m on m.org_id = p.owner_org_id
     where m.user_id = ${userId}
     order by (p.status = 'archived'), p.created_at desc
  `;

  return rows.map(toProject);
}

/**
 * Un projet par sa partie locale, si l'utilisateur y a accès.
 *
 * `null` quand le projet n'existe pas ET quand l'utilisateur n'y a pas accès :
 * les deux cas sont volontairement indiscernables de l'extérieur.
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
    select p.id, p.name, p.inbound_local_part, p.status, p.created_at
      from public.projects p
      join public.organization_members m on m.org_id = p.owner_org_id
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
  | { ok: false; reason: 'quota' | 'address-generation' };

/**
 * Crée un projet et tire son adresse.
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

  const [org] = await sql<{ org_id: string }[]>`
    select m.org_id
      from public.organization_members m
     where m.user_id = ${userId}
     order by m.created_at asc
     limit 1
  `;

  if (!org) return { ok: false, reason: 'quota' };

  const quota = await getProjectQuota(org.org_id);
  if (!quota.canCreate) return { ok: false, reason: 'quota' };

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const localPart = buildInboundLocalPart(name);

    try {
      const [row] = await sql<DbProject[]>`
        insert into public.projects (owner_org_id, name, inbound_local_part)
        values (${org.org_id}, ${name.trim()}, ${localPart})
        returning id, name, inbound_local_part, status, created_at
      `;

      return { ok: true, project: toProject(row) };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Collision sur l'adresse : on retire un suffixe et on réessaie.
    }
  }

  return { ok: false, reason: 'address-generation' };
}

/**
 * Renomme un projet.
 *
 * **Ne touche JAMAIS à `inbound_local_part`.** L'adresse figure en copie de
 * fils de discussion déjà en cours, chez des gens qui ne sont pas nos
 * utilisateurs : la changer romprait la réception sans que personne s'en
 * aperçoive avant le prochain message perdu.
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
       )
    returning p.id
  `;

  return rows.length > 0;
}

/**
 * Archive ou réactive un projet.
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
       )
    returning p.id
  `;

  return rows.length > 0;
}
