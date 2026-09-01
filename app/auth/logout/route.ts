import { NextResponse, type NextRequest } from 'next/server';

import { createAuthClient } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * Déconnexion.
 *
 * En POST et non en GET : un GET serait déclenché par un préchargement de lien
 * ou un scanner d'antivirus dans un e-mail, et déconnecterait l'utilisateur
 * sans qu'il ait rien demandé.
 */
export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', request.url), {
    // 303 : le navigateur doit suivre en GET, pas rejouer le POST.
    status: 303,
  });
}
