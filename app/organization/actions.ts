'use server';

import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { loggerForHeaders } from '@/lib/logger';
import {
  createInvitation,
  getOwnedOrganization,
  removeMember,
  renameOrganization,
  revokeInvitation,
} from '@/lib/members/queries';

/**
 * Actions de l'écran d'organisation.
 *
 * CHAQUE ACTION REVÉRIFIE LE DROIT, elle ne se fie pas à l'écran. Les boutons
 * ne sont pas rendus pour un invité, mais une server action reste appelable
 * directement : c'est `lib/members/queries.ts` qui refuse, dans le SQL.
 *
 * L'organisation n'est jamais prise dans le formulaire mais toujours relue
 * comme « celle dont l'utilisateur est propriétaire ». Un `org_id` posté serait
 * un paramètre à valider ; ne pas l'accepter du tout est plus court et ne peut
 * pas être oublié.
 */
async function ownedOrganizationOrNotFound() {
  const user = await requireUser();
  const org = await getOwnedOrganization(user.id);
  if (!org) notFound();
  return { user, org };
}

export async function renameOrg(formData: FormData): Promise<void> {
  const { user, org } = await ownedOrganizationOrNotFound();
  const log = loggerForHeaders(await headers(), { event_source: 'organization' });

  const result = await renameOrganization(
    user.id,
    org.id,
    String(formData.get('name') ?? ''),
    log,
  );

  if (!result.ok) redirect(`/organization?error=${result.reason}`);
  redirect('/organization?done=renamed');
}

export async function invite(formData: FormData): Promise<void> {
  const { user, org } = await ownedOrganizationOrNotFound();
  const log = loggerForHeaders(await headers(), { event_source: 'organization' });

  const result = await createInvitation(
    user.id,
    org.id,
    String(formData.get('email') ?? ''),
    log,
  );

  // Chaque refus garde son motif : l'écran doit pouvoir dire POURQUOI.
  if (!result.ok) redirect(`/organization?error=${result.reason}`);
  redirect('/organization?done=invited');
}

export async function revoke(formData: FormData): Promise<void> {
  const { user, org } = await ownedOrganizationOrNotFound();
  const log = loggerForHeaders(await headers(), { event_source: 'organization' });

  await revokeInvitation(user.id, org.id, String(formData.get('invitationId') ?? ''), log);
  redirect('/organization?done=revoked');
}

export async function remove(formData: FormData): Promise<void> {
  const { user, org } = await ownedOrganizationOrNotFound();
  const log = loggerForHeaders(await headers(), { event_source: 'organization' });

  const done = await removeMember(user.id, org.id, String(formData.get('userId') ?? ''), log);

  // L'échec est dit. Retirer un `owner` est refusé par la requête, et un écran
  // qui afficherait « fait » sur un refus serait pire qu'un message d'erreur.
  redirect(`/organization?${done ? 'done=removed' : 'error=remove-failed'}`);
}
