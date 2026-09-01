import { NextResponse, type NextRequest } from 'next/server';

import { createAuthClient } from '@/lib/supabase/auth';
import { loggerForRequest } from '@/lib/logger';

/**
 * Retour du lien magique : échange le code contre une session, puis redirige.
 *
 * Toute route qui touche à la session est dynamique — sinon Next.js tente de la
 * prérendre au build, et le build casse en CI alors qu'il passait en local.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const log = loggerForRequest(request);
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    log.warn('auth.callback.missing_code');
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Le message d'erreur ne remonte pas à l'utilisateur : un lien expiré et un
    // lien déjà consommé donnent le même écran.
    log.warn('auth.callback.exchange_failed', { reason: error.message });
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  return NextResponse.redirect(`${origin}/projects`);
}
