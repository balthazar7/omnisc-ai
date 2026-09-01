import { getSql } from '@/lib/supabase/server';

/**
 * Habilitations par plan.
 *
 * Table EN DUR, aucun appel à Stripe : la facturation n'existe pas avant le
 * lot 7, et une intégration posée par anticipation serait fausse le jour où on
 * la branchera.
 *
 * Ces valeurs SÈMENT `organizations.max_active_projects` à la création de
 * l'organisation ; ensuite c'est la colonne qui fait foi. Deux conséquences
 * voulues : une remise sur un compte se règle en base sans déploiement, et
 * changer la grille ne redéfinit pas rétroactivement les comptes existants.
 *
 * L'abonnement appartient à l'ORGANISATION, jamais au projet ni à
 * l'utilisateur : le projet doit survivre au départ de son chef de projet.
 */
export type PlanLimits = {
  maxActiveProjects: number;
};

const PLANS: Record<string, PlanLimits> = {
  trial: { maxActiveProjects: 1 },
  free: { maxActiveProjects: 1 },
  starter: { maxActiveProjects: 3 },
  pro: { maxActiveProjects: 10 },
};

const FALLBACK_PLAN: PlanLimits = PLANS.trial;

/** Limites d'un plan. Un plan inconnu retombe sur le plus restrictif. */
export function planLimits(plan: string): PlanLimits {
  return PLANS[plan] ?? FALLBACK_PLAN;
}

export type ProjectQuota = {
  /** Projets non archivés de l'organisation. */
  used: number;
  limit: number;
  canCreate: boolean;
};

/**
 * Quota de projets d'une organisation.
 *
 * **Seuls les projets non archivés comptent : archiver libère une place.**
 * C'est ce qui permet à un client de clore un chantier terminé sans perdre son
 * historique et sans changer de plan.
 */
export async function getProjectQuota(orgId: string): Promise<ProjectQuota> {
  const sql = getSql();

  const [row] = await sql<{ used: number; limit: number }[]>`
    select
      (select count(*)::int
         from public.projects p
        where p.owner_org_id = o.id
          and p.status <> 'archived')          as used,
      o.max_active_projects                     as limit
    from public.organizations o
   where o.id = ${orgId}
  `;

  if (!row) return { used: 0, limit: 0, canCreate: false };

  return { used: row.used, limit: row.limit, canCreate: row.used < row.limit };
}

export type Entitlement = { allowed: boolean; reason: 'quota' | 'unknown-org' | null };

/**
 * **Le seul point de décision d'habilitation** (CLAUDE.md, section A).
 *
 * Appelée à la création de projet et à la réactivation d'un projet archivé, et
 * nulle part ailleurs. En V1 elle lit une limite ; le jour où la facturation
 * est branchée, elle lira l'abonnement — une fonction à modifier, pas quinze
 * appels dispersés.
 */
export async function canCreateProject(orgId: string): Promise<Entitlement> {
  const quota = await getProjectQuota(orgId);
  if (quota.limit === 0) return { allowed: false, reason: 'unknown-org' };
  return quota.canCreate
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'quota' };
}
