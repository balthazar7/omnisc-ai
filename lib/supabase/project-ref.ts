import { env } from '@/lib/env';

/**
 * Référence du projet Supabase, extraite de chaque variable qui en désigne un.
 *
 * POURQUOI TROIS ET PAS UNE. L'application parle à Supabase par trois chemins
 * qui n'ont aucune raison structurelle de coïncider :
 *
 *   · `NEXT_PUBLIC_SUPABASE_URL` — le client d'AUTHENTIFICATION (`auth.*`) ;
 *   · `SUPABASE_URL` — l'API Storage, avec la clé `service_role` ;
 *   · `DATABASE_URL` — le SQL, par le pooler, où vit tout le schéma `public`.
 *
 * Quand elles divergent, le déploiement authentifie contre un projet et écrit
 * dans un autre. Le symptôme est un `23503` sur `organization_members.user_id`,
 * qui référence `auth.users` : l'utilisateur connecté n'existe pas dans la base
 * où l'on écrit. C'est l'hypothèse qui a coûté le plus de temps au lot 1a, et
 * elle est restée ouverte parce que deux de ces trois variables sont marquées
 * « Sensitive » dans Vercel — donc illisibles par `vercel env pull`, qui les
 * renvoie vides.
 *
 * D'où ces fonctions : la référence se lit À L'EXÉCUTION, dans le déploiement
 * lui-même, seul endroit où les valeurs sont réellement présentes.
 *
 * AUCUN SECRET NE SORT D'ICI. On n'extrait que la référence de projet, qui est
 * publique : elle figure déjà dans le nom du cookie de session
 * (`sb-<ref>-auth-token`). Le mot de passe de `DATABASE_URL` n'est jamais lu.
 */

/** `https://<ref>.supabase.co` → `<ref>`. */
function refFromSupabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const [ref] = host.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * `postgres://postgres.<ref>:<mot de passe>@…pooler.supabase.com:6543/postgres`
 * → `<ref>`.
 *
 * La référence est dans le NOM D'UTILISATEUR du pooler, pas dans l'hôte : le
 * pooler est partagé par région, son hôte ne nomme aucun projet. On découpe
 * donc l'utilisateur, et on ne touche jamais au mot de passe.
 */
function refFromDatabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const user = decodeURIComponent(new URL(url).username);
    const [, ref] = user.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

export type ProjectRefs = {
  /** Client d'authentification — `NEXT_PUBLIC_SUPABASE_URL`. */
  auth: string | null;
  /** API Storage — `SUPABASE_URL`. */
  storage: string | null;
  /** SQL par le pooler — `DATABASE_URL`. */
  database: string | null;
  /** Vrai si les trois chemins désignent le même projet. */
  consistent: boolean;
};

export function supabaseProjectRefs(): ProjectRefs {
  const auth = refFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const storage = refFromSupabaseUrl(env.SUPABASE_URL);
  const database = refFromDatabaseUrl(env.DATABASE_URL);

  const found = [auth, storage, database].filter((ref): ref is string => ref !== null);
  const consistent = found.length === 3 && new Set(found).size === 1;

  return { auth, storage, database, consistent };
}
