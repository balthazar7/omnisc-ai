'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createAuthClient } from '@/lib/supabase/auth';
import { isSignupAllowed } from '@/lib/auth/signup-allowlist';
import { createLogger } from '@/lib/logger';

/**
 * Origine de la requête courante.
 *
 * Calculée à partir des en-têtes plutôt que d'une variable d'environnement :
 * chaque déploiement de prévisualisation a sa propre URL, et un lien magique
 * qui renverrait toujours vers la production fonctionnerait en production et
 * échouerait en préversion — le pire ordre pour s'en apercevoir.
 */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
  const proto = headerList.get('x-forwarded-proto') ?? 'https';
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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    log.warn('auth.magic_link.send_failed', { reason: error.message });
    redirect('/login?error=failed');
  }

  log.info('auth.magic_link.sent');
  redirect('/login?sent=1');
}
