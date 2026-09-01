import { getSql } from '@/lib/supabase/server';
import { planLimits } from '@/lib/entitlements';
import { getDictionary } from '@/lib/i18n';

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
 * Le lot 1a ne crée que des `owner` ; le lot 1b s'occupe des invitations et du
 * second rôle.
 *
 * `max_active_projects` est SEMÉE ICI depuis la table des limites de
 * `lib/entitlements.ts`, puis c'est la colonne qui fait foi. Une remise
 * commerciale sur un compte se règle alors en base, sans déploiement, et la
 * colonne n'est jamais une valeur morte que personne ne relit.
 */
export async function ensureOrganizationForUser(userId: string): Promise<Organization> {
  const sql = getSql();

  const existing = await sql<
    { id: string; name: string; plan: string; max_active_projects: number }[]
  >`
    select o.id, o.name, o.plan, o.max_active_projects
      from public.organizations o
      join public.organization_members m on m.org_id = o.id
     where m.user_id = ${userId}
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

  // Création de l'organisation et de l'appartenance dans une seule transaction :
  // une organisation sans membre serait invisible et orpheline, et l'utilisateur
  // s'en verrait créer une nouvelle à chaque connexion.
  const created = await sql.begin(async (tx) => {
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

  return {
    id: created.id,
    name: created.name,
    plan: created.plan,
    maxActiveProjects: created.max_active_projects,
  };
}
