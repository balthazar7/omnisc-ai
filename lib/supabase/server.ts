import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';

import { env } from '@/lib/env';

/**
 * Accès serveur à Supabase — SQL via le pooler, Storage via l'API HTTP.
 *
 * Invariants (CLAUDE.md, sections A et B) :
 *  - la clé `service_role` ne quitte jamais le serveur ;
 *  - le navigateur ne parle jamais directement à Supabase : tout passe par les
 *    fonctions de `lib/`, et RLS (activée partout, sans policy) n'est qu'un
 *    filet de sécurité — le contrôle d'accès réel vit dans `lib/` ;
 *  - la connexion est celle du pooler en mode transaction (port 6543), qui ne
 *    gère pas les requêtes préparées : `prepare: false`.
 *
 * INSTANCIATION PARESSEUSE, ET C'EST STRUCTUREL. `postgres()` et
 * `createClient()` analysent leur URL avec `new URL()` dès l'appel. Instanciés
 * au niveau du module, ils s'exécutaient pendant la collecte des pages du
 * `next build` : une chaîne de connexion mal encodée faisait échouer le BUILD
 * sur un `TypeError: Invalid URL` nu, sans nom de variable, depuis un chunk
 * anonyme. Le build ne doit dépendre que de la présence des variables, jamais
 * de la validité d'une connexion d'exécution.
 *
 * Ne pas réintroduire de `export const` appelant l'une de ces deux fabriques.
 */

// Garde : ce module ne doit jamais être atteint par un bundle client.
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase/server.ts est un module serveur : il porte la clé service_role ' +
      "et ne doit jamais être importé depuis un composant client.",
  );
}

/** Nom du bucket Storage privé où est archivé le brut (couche 0). */
export const RAW_BUCKET = 'raw';

type Sql = ReturnType<typeof postgres>;

/**
 * Le runtime serverless réutilise le contexte entre invocations à chaud : on
 * garde une seule connexion par instance, portée par `globalThis` pour survivre
 * au rechargement de module du mode développement.
 */
const globalForDb = globalThis as unknown as {
  __omniscSql?: Sql;
  __omniscSupabase?: SupabaseClient;
};

/**
 * Client SQL. Toute lecture ou écriture de la base passe par ici.
 * Créé à la première requête, jamais à l'import.
 */
export function getSql(): Sql {
  const existing = globalForDb.__omniscSql;
  if (existing) return existing;

  const sql = postgres(env.DATABASE_URL, {
    // Le pooler en mode transaction ne supporte pas les requêtes préparées.
    prepare: false,
    // Une invocation serverless traite une requête : peu de connexions suffisent.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Le journal applicatif est structuré ; postgres.js ne doit rien écrire seul.
    onnotice: () => {},
  });

  globalForDb.__omniscSql = sql;
  return sql;
}

function getSupabase(): SupabaseClient {
  const existing = globalForDb.__omniscSupabase;
  if (existing) return existing;

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  globalForDb.__omniscSupabase = client;
  return client;
}

/**
 * API Storage du client `service_role`. Les tables ne sont pas exposées au Data
 * API : elles se lisent via `getSql()`.
 * Créée à la première requête, jamais à l'import.
 */
export function getStorage(): SupabaseClient['storage'] {
  return getSupabase().storage;
}

/**
 * Ping de la base, pour la route de santé. Ne lève pas : une chaîne de
 * connexion invalide fait lever `postgres()` lui-même, et c'est justement ce
 * que `/api/health` doit pouvoir rapporter au lieu de renvoyer un 500 muet.
 */
export async function pingDatabase(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getSql()`select 1 as ok`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
