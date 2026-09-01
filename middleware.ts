import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';

/**
 * Rafraîchissement de la session à chaque navigation.
 *
 * Les jetons Supabase expirent. Un composant serveur ne peut pas écrire de
 * cookie : sans ce middleware, la session expirerait pendant la navigation et
 * l'utilisateur serait déconnecté sans raison visible. Le middleware, lui,
 * dispose d'une réponse à modifier — c'est le seul endroit où le cookie
 * rafraîchi peut être posé.
 *
 * Il ne décide d'AUCUN accès : la protection des pages est faite par
 * `requireUser()` côté serveur. Un middleware qui garderait les routes ferait
 * un second endroit où la règle d'accès vit, et les deux divergeraient.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Appel volontaire et non utilisé : c'est lui qui déclenche le
  // rafraîchissement du jeton et l'écriture des cookies via `setAll`.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
      Toutes les routes sauf les fichiers statiques, les images optimisées, le
      favicon, et le webhook d'ingestion.

      `api/inbound` est exclu explicitement : il est appelé par Postmark, qui
      n'a pas de cookie de session, et le faire traverser le client
      d'authentification n'ajouterait que de la latence sur un chemin qui doit
      répondre en moins de 500 ms sous peine d'être rejoué — donc de produire
      des doublons.
    */
    '/((?!_next/static|_next/image|favicon.ico|api/inbound|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
