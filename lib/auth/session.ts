import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createLogger } from '@/lib/logger';
import { createAuthClient } from '@/lib/supabase/auth';

/** L'utilisateur connecté, réduit à ce dont l'application a besoin. */
export type SessionUser = {
  id: string;
  email: string;
};

/**
 * L'utilisateur connecté, ou `null`.
 *
 * On appelle `getUser()` et jamais `getSession()` : `getSession()` lit le
 * cookie sans le vérifier, donc une valeur forgée passerait. `getUser()` valide
 * le jeton auprès de Supabase.
 *
 * DIAGNOSTIC. Une session refusée est journalisée avec les NOMS des cookies
 * Supabase présents — jamais leurs valeurs. C'est ce qui distingue les deux
 * causes possibles, indiscernables autrement :
 *
 *   · aucun cookie `sb-*` → le navigateur ne l'a pas stocké ou ne l'envoie pas
 *     (pose ratée au callback, attributs, domaine) ;
 *   · cookies `sb-*` présents mais `getUser()` nul → le jeton est refusé par
 *     Supabase. Le nom du cookie porte la référence du projet : si elle ne
 *     correspond pas à `NEXT_PUBLIC_SUPABASE_URL` du déploiement, le
 *     déploiement authentifie contre un projet et lit le cookie d'un autre.
 */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user?.email) return { id: user.id, email: user.email };

  const cookieStore = await cookies();
  // Noms seulement. Le champ ne s'appelle pas « cookie » : le journal masque
  // toute clé contenant ce mot, ce qui rendrait la trace inutilisable.
  const sbTokenKeys = cookieStore
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.startsWith('sb-'));

  createLogger(crypto.randomUUID(), { event_source: 'auth.session' }).info(
    'auth.session.rejected',
    {
      sb_token_keys: sbTokenKeys,
      sb_token_count: sbTokenKeys.length,
      reason: error?.message ?? 'no_user',
    },
  );

  return null;
}

/**
 * L'utilisateur connecté, ou redirection vers `/login`.
 *
 * **Aucune page protégée ne lit la session autrement.** Une page qui
 * appellerait `createAuthClient()` directement finirait par oublier la
 * redirection, et afficherait un écran vide au lieu de renvoyer au formulaire.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
