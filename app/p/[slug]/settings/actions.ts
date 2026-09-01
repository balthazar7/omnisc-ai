'use server';

import { notFound, redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { canCreateProject } from '@/lib/entitlements';
import {
  getOrgIdForProject,
  getProjectForUser,
  renameProjectForUser,
  setProjectStatusForUser,
} from '@/lib/projects/queries';

/**
 * Renomme le projet.
 *
 * `inbound_local_part` n'est jamais touchée : c'est l'invariant de l'écran, et
 * il est dit à l'utilisateur plutôt que supposé compris.
 */
export async function renameProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const slug = String(formData.get('slug') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  // Vérification d'accès avant toute chose : un projet inaccessible est
  // introuvable, jamais interdit.
  const project = await getProjectForUser(user.id, slug);
  if (!project) notFound();

  if (name.length === 0) redirect(`/p/${slug}/settings?error=name`);

  await renameProjectForUser(user.id, project.id, name);
  redirect(`/p/${slug}/settings?done=renamed`);
}

/**
 * Archive ou réactive le projet.
 *
 * Réactiver consomme une place : le quota est vérifié AVANT, pour refuser avec
 * une explication plutôt que de laisser passer un dépassement. Archiver n'est
 * jamais refusé — cela libère une place.
 */
export async function setProjectStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const slug = String(formData.get('slug') ?? '');
  const status = formData.get('status') === 'archived' ? 'archived' : 'active';

  const project = await getProjectForUser(user.id, slug);
  if (!project) notFound();

  if (status === 'active') {
    const orgId = await getOrgIdForProject(user.id, slug);
    if (orgId) {
      const entitlement = await canCreateProject(orgId);
      if (!entitlement.allowed) redirect(`/p/${slug}/settings?error=quota`);
    }
  }

  await setProjectStatusForUser(user.id, project.id, status);
  redirect(`/p/${slug}/settings?done=${status}`);
}
