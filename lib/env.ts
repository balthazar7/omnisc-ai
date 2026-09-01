import { z } from 'zod';

/**
 * Schéma unique des variables d'environnement.
 *
 * Invariant (CLAUDE.md, section B) : aucune lecture de `process.env` ailleurs
 * dans le projet.
 *
 * Trois fichiers doivent dire exactement la même chose, et sont modifiés dans
 * le MÊME commit : le tableau « Liste canonique » de la section B de CLAUDE.md,
 * ce schéma, et `.env.example`. Une variable ne figurant pas dans les trois
 * n'existe pas.
 *
 * Une variable n'entre ici qu'au lot où un code la lit réellement, jamais par
 * anticipation : une variable que rien ne lit finit par être fausse sans que
 * personne s'en aperçoive. Les neuf ci-dessous sont toutes lues par du code du
 * lot 0a.
 *
 * Aucune variable `NEXT_PUBLIC_` : le préfixe n'est pas une convention de
 * nommage, il inline la valeur dans le bundle client.
 *
 * La validation s'exécute à l'import du module : un import de `env` depuis une
 * route ou un module de `lib/` fait donc échouer bruyamment le build ou le
 * démarrage, avec un message nommant la variable manquante.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic des variables de type URL
//
// Deux variables sont analysées par `new URL()` — non par nous, mais par les
// bibliothèques qui les consomment : `postgres()` pour DATABASE_URL,
// `createClient()` pour SUPABASE_URL. Quand l'analyse échoue là-bas, l'erreur
// est un `TypeError: Invalid URL` nu, sans nom de variable ni valeur : en
// production, où la plateforme masque les valeurs, le diagnostic est
// impossible. On analyse donc l'URL ICI, pour que l'échec porte un nom.
// ─────────────────────────────────────────────────────────────────────────────

/** Longueur de l'aperçu joint aux messages d'erreur. */
const PREVIEW_LENGTH = 30;

/**
 * Masque le mot de passe d'une chaîne de connexion avant tout affichage.
 * `postgresql://user:secret@host` → `postgresql://user:***@host`.
 * Les messages d'erreur partent dans les journaux de build, qui sont lisibles :
 * un aperçu ne doit jamais pouvoir contenir un secret.
 */
function maskCredentials(value: string): string {
  return value.replace(/^([a-zA-Z][\w+.-]*:\/\/[^:/@\s]*:)[^@]*(@)/, '$1***$2');
}

/** Aperçu sûr d'une valeur : secret masqué, tronqué à 30 caractères, longueur réelle jointe. */
function preview(value: string): string {
  const masked = maskCredentials(value);
  const cut = masked.slice(0, PREVIEW_LENGTH);
  const suffix =
    masked.length > PREVIEW_LENGTH
      ? `… (tronquée à ${PREVIEW_LENGTH} caractères, longueur réelle ${value.length})`
      : ` (longueur ${value.length})`;
  return `"${cut}"${suffix}`;
}

/**
 * Caractères présents dans la partie identifiants d'une chaîne de connexion et
 * qui font échouer `new URL()` ou `decodeURIComponent()`.
 *
 * C'est le diagnostic utile : un aperçu tronqué à 30 caractères s'arrête avant
 * le mot de passe et ne montrerait donc jamais le caractère fautif. On nomme le
 * caractère sans jamais afficher le secret qui le contient.
 */
function offendingCredentialChars(value: string): string[] {
  const schemeEnd = value.indexOf('://');
  if (schemeEnd < 0) return [];
  const authority = value.slice(schemeEnd + 3);
  const at = authority.lastIndexOf('@');
  if (at < 0) return [];
  const userinfo = authority.slice(0, at);

  const found: string[] = [];
  for (const char of ['#', '?', '/', '\\', ' ', '[', ']', '<', '>', '"', '{', '}', '|', '^', '`']) {
    if (userinfo.includes(char)) found.push(`'${char}'`);
  }
  if (/%(?![0-9a-fA-F]{2})/.test(userinfo)) {
    found.push("'%' isolé, non suivi de deux chiffres hexadécimaux");
  }
  return found;
}

/** Nom de code d'un caractère à encoder, pour le message d'aide. */
const ENCODING_HINT =
  'Encoder le mot de passe en pourcentage dans la chaîne de connexion ' +
  "(par exemple '#' → %23, '%' → %25, ' ' → %20), ou le régénérer sans caractère spécial.";

const schema = z.object({
  /**
   * Chaîne de connexion Supabase — POOLER EN MODE TRANSACTION, port 6543.
   * Jamais la connexion directe (port 5432) : serverless + Postgres direct =
   * épuisement des connexions en production, invisible en local.
   */
  DATABASE_URL: z.string().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (value.length === 0) {
      fail('DATABASE_URL est vide');
      return;
    }

    if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
      fail(
        `DATABASE_URL doit commencer par postgres:// ou postgresql:// — valeur reçue : ${preview(value)}`,
      );
      return;
    }

    if (!value.includes(':6543/')) {
      fail(
        'DATABASE_URL doit pointer sur le pooler en mode transaction (port 6543), jamais sur ' +
          `la connexion directe (5432) — valeur reçue : ${preview(value)}`,
      );
    }

    // `postgres()` analyse la chaîne avec `new URL()` puis décode les
    // identifiants avec `decodeURIComponent()`. On reproduit les deux ici pour
    // que l'échec porte le nom de la variable au lieu d'un `TypeError` nu.
    const offenders = offendingCredentialChars(value);

    try {
      new URL(value);
    } catch {
      fail(
        `DATABASE_URL n'est pas analysable par new URL() — valeur reçue : ${preview(value)}. ` +
          (offenders.length > 0
            ? `Caractères à encoder détectés dans les identifiants : ${offenders.join(', ')}. `
            : '') +
          ENCODING_HINT,
      );
      return;
    }

    const parsed = new URL(value);
    try {
      decodeURIComponent(parsed.password);
      decodeURIComponent(parsed.username);
    } catch {
      fail(
        `DATABASE_URL contient des identifiants que decodeURIComponent() refuse — ` +
          `valeur reçue : ${preview(value)}. ` +
          (offenders.length > 0
            ? `Caractères à encoder détectés dans les identifiants : ${offenders.join(', ')}. `
            : '') +
          ENCODING_HINT,
      );
      return;
    }

    // `new URL()` accepte la chaîne mais un caractère a déplacé la frontière des
    // identifiants : l'hôte lu ne serait pas celui attendu.
    if (offenders.length > 0) {
      fail(
        `DATABASE_URL contient dans ses identifiants des caractères qui faussent l'analyse ` +
          `de l'URL : ${offenders.join(', ')} — valeur reçue : ${preview(value)}. ${ENCODING_HINT}`,
      );
    }
  }),

  /**
   * URL du projet Supabase, ex. https://<ref>.supabase.co — lue uniquement par
   * `lib/supabase/server.ts`, pour l'API Storage. Sans préfixe `NEXT_PUBLIC_`
   * délibérément : le navigateur ne parle jamais directement à Supabase.
   */
  SUPABASE_URL: z.string().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (value.length === 0) {
      fail('SUPABASE_URL est vide');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      fail(
        `SUPABASE_URL n'est pas analysable par new URL() — valeur reçue : ${preview(value)}. ` +
          'Attendu : une URL absolue de la forme https://<ref>.supabase.co',
      );
      return;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      fail(
        `SUPABASE_URL doit être en http:// ou https:// — protocole lu : '${parsed.protocol}', ` +
          `valeur reçue : ${preview(value)}`,
      );
    }
  }),

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

  /**
   * Projet Supabase et clé publique, pour le client d'AUTHENTIFICATION seul.
   *
   * Ces deux variables portent le préfixe `NEXT_PUBLIC_` alors que le lot 1a ne
   * les lit que côté serveur : le lien magique est entièrement traité par des
   * routes et des actions serveur. Le préfixe est délibéré — c'est le nom sous
   * lequel elles sont renseignées dans Vercel, et le jour où un composant client
   * aura besoin du client d'authentification, il les lira sans nouvelle variable.
   *
   * `NEXT_PUBLIC_` n'est pas une convention de nommage : Next.js inline la
   * valeur dans le bundle client, mais uniquement pour les occurrences
   * LITTÉRALES de `process.env.NEXT_PUBLIC_…`. Lues ici via
   * `schema.safeParse(process.env)`, elles ne sont pas inlinées et restent
   * serveur. Aucune fuite au demeurant : la clé `anon` est publique par
   * conception et ne donne accès à rien — RLS est activée partout sans policy,
   * et le client d'authentification ne touche jamais au schéma `public`.
   */
  NEXT_PUBLIC_SUPABASE_URL: z.string().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (value.length === 0) {
      fail('NEXT_PUBLIC_SUPABASE_URL est vide');
      return;
    }

    try {
      new URL(value);
    } catch {
      fail(
        `NEXT_PUBLIC_SUPABASE_URL n'est pas analysable par new URL() — valeur reçue : ${preview(value)}. ` +
          'Attendu : une URL absolue de la forme https://<ref>.supabase.co',
      );
    }
  }),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY est vide'),

  /**
   * Contrôle des inscriptions pendant la phase de test.
   *
   * Adresses séparées par des virgules. **Vide par défaut = inscription
   * ouverte** ; renseignée, seules ces adresses obtiennent un lien magique. Le
   * domaine est public et le produit enverra des e-mails dès le lot 5 : une
   * porte fermable pendant la phase de test coûte cinq lignes.
   *
   * Lue côté serveur uniquement. L'écran de connexion ne dit jamais si une
   * adresse est autorisée : il répond la même chose dans tous les cas.
   */
  SIGNUP_ALLOWLIST: z.string().default(''),

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
