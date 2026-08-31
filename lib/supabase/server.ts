import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';

import { env, IS_PRODUCTION_BUILD } from '@/lib/env';

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

/**
 * Le runtime serverless réutilise le contexte entre invocations à chaud :
 * on garde une seule connexion par instance, portée par `globalThis` pour
 * survivre au rechargement de module du mode développement.
 */
const globalForDb = globalThis as unknown as {
  __omniscSql?: ReturnType<typeof postgres>;
  __omniscStorage?: SupabaseClient;
};

function createSql() {
  return postgres(env.DATABASE_URL, {
    // Le pooler en mode transaction ne supporte pas les requêtes préparées.
    prepare: false,
    // Une invocation serverless traite une requête : peu de connexions suffisent.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Le journal applicatif est structuré ; postgres.js ne doit rien écrire seul.
    onnotice: () => {},
  });
}

/** Client SQL. Toute lecture ou écriture de la base passe par ici. */
export const sql = globalForDb.__omniscSql ?? createSql();
if (!IS_PRODUCTION_BUILD) globalForDb.__omniscSql = sql;

function createStorageClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabase: SupabaseClient = globalForDb.__omniscStorage ?? createStorageClient();
if (!IS_PRODUCTION_BUILD) globalForDb.__omniscStorage = supabase;

/**
 * Client Supabase à clé `service_role`, utilisé uniquement pour Storage.
 * Les tables ne sont pas exposées au Data API : elles se lisent via `sql`.
 */
export const storage = supabase.storage;

/** Ping de la base, pour la route de santé. Ne lève pas. */
export async function pingDatabase(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sql`select 1 as ok`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
