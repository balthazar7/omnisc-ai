import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';
import { createLogger } from '@/lib/logger';

/**
 * Client Supabase d'AUTHENTIFICATION.
 *
 * EXCEPTION EXPLICITE à la note RLS du lot 0a (CLAUDE.md, section A) :
 * c'est le seul client Supabase dont la clé puisse un jour atteindre le
 * navigateur, et le seul qui n'utilise pas `service_role`. Il porte la clé
 * `anon` et **ne touche jamais au schéma `public`** — il ne parle qu'à
 * `auth.*`, via l'API GoTrue.
 *
 * Tout accès aux données métier reste dans `lib/`, avec `service_role`, côté
 * serveur, et le contrôle d'accès réel y est écrit à la main. Si tu te
 * retrouves à écrire une lecture de `public.*` avec ce client, tu t'es trompé
 * de chemin : passe par `getSql()` de `lib/supabase/server.ts`.
 *
 * La session vit dans des cookies posés par le serveur. `@supabase/ssr` s'en
 * charge, à condition de lui donner `getAll` / `setAll`.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /*
            Un composant serveur ne peut pas écrire de cookie : Next.js lève.
            C'est la marche à suivre documentée de @supabase/ssr — le
            rafraîchissement est fait par le middleware, qui dispose d'une
            réponse à modifier.

            MAIS AVALER SANS TRACE EST DANGEREUX : si le middleware ne couvre
            pas la route, Supabase a déjà fait tourner le jeton de
            rafraîchissement côté serveur alors que le nouveau jeton n'est
            jamais posé. La session devient alors invalide à la requête
            suivante, sans le moindre message. On journalise donc les NOMS des
            cookies perdus, jamais leurs valeurs.
          */
          createLogger(crypto.randomUUID(), { event_source: 'auth.client' }).warn(
            'auth.cookies.write_refused',
            { sb_token_keys: cookiesToSet.map((c) => c.name) },
          );
        }
      },
    },
  });
}
