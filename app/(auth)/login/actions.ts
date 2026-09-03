'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/lib/env';
import { createAuthClient } from '@/lib/supabase/auth';
import { isSignupAllowed } from '@/lib/auth/signup-allowlist';
import { requestOrigin, safeInternalPath } from '@/lib/http/origin';
import { loggerForHeaders } from '@/lib/logger';

/** Chemin de retour du lien magique. Une seule écriture, partagée avec le journal. */
const CALLBACK_PATH = '/auth/callback';

/** Validation d'adresse volontairement permissive : le seul juge est le message reçu. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Demande un lien magique.
 *
 * Un seul e-mail, qu'il s'agisse d'une première venue ou d'un retour : il n'y a
 * pas d'écran d'inscription distinct de l'écran de connexion.
 *
 * **La réponse est la même dans tous les cas** — adresse inconnue, adresse hors
 * liste d'autorisation, ou envoi réussi. Rien ne doit permettre de savoir si un
 * compte existe.
 *
 * Aucune limitation de débit maison : celle de Supabase Auth suffit, et une
 * seconde couche ferait un deuxième endroit à maintenir.
 */
export async function requestMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();

  /*
    `next` porte le retour vers la page d'invitation : quelqu'un qui arrive par
    un lien doit y revenir après s'être connecté, sinon il atterrit sur ses
    projets et doit rouvrir le lien à la main. Assaini avant tout usage — un
    `next` non filtré ferait de cet écran une redirection ouverte.
  */
  const next = safeInternalPath(String(formData.get('next') ?? ''), '/projects');

  const log = loggerForHeaders(await headers(), { event_source: 'auth.magic_link' });

  if (!looksLikeEmail(email)) redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);

  if (!(await isSignupAllowed(email))) {
    // Journalisé pour qu'un refus reste diagnosticable, mais l'écran ne le dit
    // pas : la réponse est identique à celle d'un envoi réussi.
    log.info('auth.magic_link.not_allowlisted');
    redirect('/login?sent=1');
  }

  const supabase = await createAuthClient();
  const origin = await requestOrigin();
  const redirectTo = `${origin}${CALLBACK_PATH}?next=${encodeURIComponent(next)}`;

  /*
    L'URL demandée est journalisée AVANT l'envoi, et telle quelle.

    C'est le seul moyen de départager les deux causes d'un lien magique qui
    n'atterrit pas sur `/auth/callback`, autrement indiscernables sans
    décortiquer un e-mail reçu :

      · le journal montre une origine fausse — protocole ou hôte — et le défaut
        est ici ;
      · le journal montre `https://<hôte>/auth/callback` alors que le lien reçu
        porte autre chose, et Supabase a REJETÉ l'URL demandée. GoTrue ignore en
        silence un `emailRedirectTo` absent de l'allowlist et retombe sur le
        Site URL — d'où un `redirect_to` réduit à l'hôte, sans chemin. Le
        correctif est alors dans Authentication → URL Configuration →
        Redirect URLs, jamais dans ce fichier.

    Ni l'adresse ni le jeton ne figurent dans cette ligne.
  */
  log.info('auth.magic_link.redirect_requested', {
    redirect_to: redirectTo,
    vercel_env: env.VERCEL_ENV ?? 'local',
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    log.warn('auth.magic_link.send_failed', { reason: error.message });
    redirect('/login?error=failed');
  }

  log.info('auth.magic_link.sent');
  redirect('/login?sent=1');
}
