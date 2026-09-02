'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/lib/env';
import { createAuthClient } from '@/lib/supabase/auth';
import { isSignupAllowed } from '@/lib/auth/signup-allowlist';
import { createLogger } from '@/lib/logger';

/** Chemin de retour du lien magique. Une seule écriture, partagée avec le journal. */
const CALLBACK_PATH = '/auth/callback';

/**
 * Origine de la requête courante.
 *
 * Calculée à partir des en-têtes plutôt que d'une variable d'environnement :
 * chaque déploiement de prévisualisation a sa propre URL, et un lien magique
 * qui renverrait toujours vers la production fonctionnerait en production et
 * échouerait en préversion — le pire ordre pour s'en apercevoir.
 *
 * LE PROTOCOLE, LUI, N'EST PAS LU DANS LES EN-TÊTES SUR VERCEL. On a observé un
 * `redirect_to` en `http://` sur la préversion. Vercel n'accepte pas le trafic
 * en clair : la connexion est coupée avant toute réponse, et le navigateur
 * affiche `ERR_CONNECTION_RESET` — indiscernable d'un blocage réseau local.
 * C'est ce qui a coûté une session entière de diagnostic. `x-forwarded-proto`
 * n'est donc consulté qu'en dehors d'un déploiement ; partout ailleurs, le
 * protocole est `https` par construction et rien ne peut le dégrader.
 *
 * Hors Vercel, le défaut est `http` : c'est le développement local, où `https`
 * produirait un lien injoignable sur `localhost`.
 */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
  const deployed = env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'production';
  const proto = deployed ? 'https' : (headerList.get('x-forwarded-proto') ?? 'http');
  return `${proto}://${host}`;
}

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

  if (!looksLikeEmail(email)) redirect('/login?error=invalid');

  const log = createLogger(crypto.randomUUID(), { event_source: 'auth.magic_link' });

  if (!isSignupAllowed(email)) {
    // Journalisé pour qu'un refus reste diagnosticable, mais l'écran ne le dit
    // pas : la réponse est identique à celle d'un envoi réussi.
    log.info('auth.magic_link.not_allowlisted');
    redirect('/login?sent=1');
  }

  const supabase = await createAuthClient();
  const origin = await requestOrigin();
  const redirectTo = `${origin}${CALLBACK_PATH}`;

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
