import { redirect } from 'next/navigation';

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
 * cookie sans le vérifier, donc une valeur forgée passerait. `getUser()`
 * valide le jeton auprès de Supabase.
 */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return { id: user.id, email: user.email };
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
