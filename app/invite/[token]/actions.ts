'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { loggerForHeaders } from '@/lib/logger';
import { acceptInvitation } from '@/lib/members/queries';

/**
 * Accepte l'invitation.
 *
 * Le jeton vient du formulaire, mais rien n'est décidé ici : `acceptInvitation`
 * revérifie l'état de l'invitation ET l'égalité entre l'adresse authentifiée et
 * l'adresse invitée. Sans cette seconde vérification, le lien serait un jeton au
 * porteur — quiconque le reçoit en transfert entrerait dans l'organisation.
 */
export async function accept(formData: FormData): Promise<void> {
  const user = await requireUser();
  const token = String(formData.get('token') ?? '');
  const log = loggerForHeaders(await headers(), { event_source: 'invite' });

  const result = await acceptInvitation(user.id, user.email, token, log);

  if (!result.ok) redirect(`/invite/${token}?error=${result.reason}`);

  redirect('/projects');
}
