import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { createAuthClient } from '@/lib/supabase/auth';
import { safeInternalPath } from '@/lib/http/origin';
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
  /*
    Retour demandé par l'écran de connexion. Assaini : ce paramètre a fait
    l'aller-retour par un e-mail, donc il est modifiable par qui reçoit le lien.
  */
  const next = safeInternalPath(searchParams.get('next'), '/projects');

  if (!code) {
    log.warn('auth.callback.missing_code');
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  /*
    Trace de l'échange : c'est le seul endroit où la session est POSÉE. Si la
    requête suivante ne trouve aucun cookie `sb-*`, la comparaison entre ce
    qu'on a écrit ici et ce qui revient là-bas dit lequel des deux côtés est
    fautif. Noms seulement, jamais les valeurs.
  */
  if (!error) {
    const jar = await cookies();
    const written = jar
      .getAll()
      .map((c) => c.name)
      .filter((name) => name.startsWith('sb-'));

    log.info('auth.callback.session_established', {
      sb_token_keys: written,
      sb_token_count: written.length,
    });
  }

  if (error) {
    // Le message d'erreur ne remonte pas à l'utilisateur : un lien expiré et un
    // lien déjà consommé donnent le même écran.
    log.warn('auth.callback.exchange_failed', { reason: error.message });
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
