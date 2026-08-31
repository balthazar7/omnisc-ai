import { z } from 'zod';

/**
 * Schéma unique des variables d'environnement.
 *
 * Invariant (CLAUDE.md, section B) : aucune lecture de `process.env` ailleurs
 * dans le projet. Toute nouvelle variable est ajoutée ici ET dans `.env.example`
 * dans le même commit.
 *
 * La validation s'exécute à l'import du module : un import de `env` depuis une
 * route ou un module de `lib/` fait donc échouer bruyamment le build ou le
 * démarrage, avec un message nommant la variable manquante.
 */
const schema = z.object({
  /**
   * Chaîne de connexion Supabase — POOLER EN MODE TRANSACTION, port 6543.
   * Jamais la connexion directe (port 5432) : serverless + Postgres direct =
   * épuisement des connexions en production, invisible en local.
   */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL est vide')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL doit être une URL postgres:// ou postgresql://',
    )
    .refine(
      (value) => value.includes(':6543/'),
      "DATABASE_URL doit pointer sur le pooler en mode transaction (port 6543), jamais sur la connexion directe (5432)",
    ),

  /** URL du projet Supabase, ex. https://<ref>.supabase.co — utilisée pour Storage. */
  SUPABASE_URL: z.string().url('SUPABASE_URL doit être une URL absolue'),

  /**
   * Clé `service_role`. Ne quitte JAMAIS le serveur : aucun préfixe
   * NEXT_PUBLIC_, aucun import depuis un composant client.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY est vide'),

  /**
   * Domaine de réception attrape-tout, ex. `in.omnisc-ai.fr`.
   * La base ne stocke que `projects.inbound_local_part` : le domaine n'apparaît
   * nulle part en dur, le nom du produit n'étant pas arrêté.
   */
  INBOUND_DOMAIN: z
    .string()
    .min(1, 'INBOUND_DOMAIN est vide')
    .refine((value) => !value.includes('@'), "INBOUND_DOMAIN ne contient pas de '@'")
    .transform((value) => value.trim().toLowerCase()),

  /**
   * Authentification HTTP Basic encodée dans l'URL du webhook Postmark.
   * Postmark NE SIGNE PAS ses webhooks : il n'existe aucune vérification HMAC.
   * Ce couple est l'unique protection de la route d'ingestion.
   */
  POSTMARK_WEBHOOK_USER: z.string().min(1, 'POSTMARK_WEBHOOK_USER est vide'),
  POSTMARK_WEBHOOK_PASSWORD: z
    .string()
    .min(12, 'POSTMARK_WEBHOOK_PASSWORD doit faire au moins 12 caractères'),

  /** Injecté par Vercel. Optionnel : absent en local. */
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),

  /** Injecté par Vercel : 'production' | 'preview' | 'development'. Optionnel. */
  VERCEL_ENV: z.string().optional(),

  /** Posé par Next.js. Présent ici pour que rien ne lise `process.env` hors de ce module. */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof schema>;

function parseEnv(): Env {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(racine)'} : ${issue.message}`)
      .join('\n');

    // Échec bruyant au démarrage. Le message nomme chaque variable fautive.
    throw new Error(
      `Variables d'environnement invalides ou manquantes :\n${details}\n` +
        'Voir .env.example pour la liste exhaustive.',
    );
  }

  return result.data;
}

export const env: Env = parseEnv();

/** SHA du commit déployé, ou 'unknown' hors Vercel. */
export const COMMIT_SHA: string = env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';

/** Vrai en build et en exécution de production, y compris sur un déploiement de prévisualisation. */
export const IS_PRODUCTION_BUILD: boolean = env.NODE_ENV === 'production';

/**
 * Revalide le schéma sans lever, pour la route de santé.
 * Ne renvoie jamais de valeur, seulement les noms des variables fautives.
 */
export function checkEnv(): { ok: true } | { ok: false; issues: string[] } {
  const result = schema.safeParse(process.env);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(racine)'}: ${issue.message}`,
    ),
  };
}
