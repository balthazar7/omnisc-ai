import { getSql } from '@/lib/supabase/server';
import { planLimits } from '@/lib/entitlements';
import { getDictionary } from '@/lib/i18n';
import type { Logger } from '@/lib/logger';

/** L'organisation d'un utilisateur, réduite à ce que les écrans affichent. */
export type Organization = {
  id: string;
  name: string;
  plan: string;
  maxActiveProjects: number;
};

/**
 * L'organisation de l'utilisateur, créée à la volée si elle n'existe pas.
 *
 * **Aucun écran de création d'organisation.** Demander à quelqu'un de nommer
 * une entité juridique avant d'avoir vu le produit est une friction pure au
 * premier contact. L'organisation est créée à la première connexion, nommée
 * par défaut, et renommable ensuite.
 *
 * LA RECHERCHE PORTE SUR `role = 'owner'`, ET SUR RIEN D'AUTRE. C'est le point
 * où le lot 1b casserait le lot 1a si l'on n'y prenait pas garde : depuis les
 * invitations, un utilisateur peut appartenir à une organisation sans en être
 * propriétaire. Une recherche sur « une appartenance quelconque » ferait passer
 * un invité pour déjà pourvu, il n'obtiendrait jamais son organisation à lui, et
 * ne pourrait donc jamais créer de projet.
 *
 * Tout utilisateur possède toujours sa propre organisation, y compris s'il
 * arrive par une invitation : accepter une invitation AJOUTE une appartenance,
 * cela ne remplace jamais l'organisation personnelle.
 *
 * `max_active_projects` est SEMÉE ICI depuis la table des limites de
 * `lib/entitlements.ts`, puis c'est la colonne qui fait foi. Une remise
 * commerciale sur un compte se règle alors en base, sans déploiement, et la
 * colonne n'est jamais une valeur morte que personne ne relit.
 */
export async function ensureOrganizationForUser(
  userId: string,
  log: Logger,
): Promise<Organization> {
  const sql = getSql();

  const existing = await sql<
    { id: string; name: string; plan: string; max_active_projects: number }[]
  >`
    select o.id, o.name, o.plan, o.max_active_projects
      from public.organizations o
      join public.organization_members m on m.org_id = o.id
     where m.user_id = ${userId}
       and m.role = 'owner'
     order by o.created_at asc
     limit 1
  `;

  if (existing.length > 0) {
    const row = existing[0];
    return {
      id: row.id,
      name: row.name,
      plan: row.plan,
      maxActiveProjects: row.max_active_projects,
    };
  }

  const t = getDictionary();
  const plan = 'trial';
  const limit = planLimits(plan).maxActiveProjects;

  /*
    Les deux insertions sont dans UNE SEULE transaction : une organisation sans
    membre serait invisible et orpheline, et l'utilisateur s'en verrait créer une
    nouvelle à chaque connexion.

    Conséquence à connaître au diagnostic : si la seconde insertion échoue, la
    PREMIÈRE est annulée aussi. Voir `organizations` ET `organization_members`
    vides ne signifie donc pas que ce code ne s'exécute pas — c'est au contraire
    la signature d'un échec sur l'insertion de l'appartenance.

    Le cas le plus probable est `23503` sur `organization_members.user_id`, qui
    référence `auth.users` : l'utilisateur n'existe pas dans le `auth.users` de
    la base où l'on écrit. Cela arrive quand le déploiement authentifie contre un
    projet Supabase et écrit dans un autre — variables `NEXT_PUBLIC_SUPABASE_*`
    et `DATABASE_URL` pointant deux projets différents.
  */
  let created: { id: string; name: string; plan: string; max_active_projects: number };

  try {
    created = await sql.begin(async (tx) => {
      const [org] = await tx<
        { id: string; name: string; plan: string; max_active_projects: number }[]
      >`
        insert into public.organizations (name, plan, max_active_projects)
        values (${t.org.defaultName}, ${plan}, ${limit})
        returning id, name, plan, max_active_projects
      `;

      await tx`
        insert into public.organization_members (org_id, user_id, role)
        values (${org.id}, ${userId}, 'owner')
        on conflict (org_id, user_id) do nothing
      `;

      return org;
    });
  } catch (error) {
    // On journalise puis on relance : l'échec doit rester bruyant. Sans cette
    // trace, la seule chose observable était une page en 500 et deux tables
    // vides, sans rien qui nomme la cause.
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : 'unknown';

    log.exception('orgs.ensure.failed', error, {
      pg_code: code,
      hint:
        code === '23503'
          ? "user_id absent de auth.users dans la base d'écriture : le déploiement " +
            'authentifie probablement contre un projet Supabase et écrit dans un autre'
          : undefined,
    });

    throw error;
  }

  log.info('orgs.ensure.created', { org_id: created.id });

  return {
    id: created.id,
    name: created.name,
    plan: created.plan,
    maxActiveProjects: created.max_active_projects,
  };
}
