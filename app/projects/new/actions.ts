'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/session';
import { createProjectForUser } from '@/lib/projects/queries';

/**
 * Crée le projet et redirige vers sa page.
 *
 * Le suffixe de l'adresse est tiré au SERVEUR, ici : l'aperçu affiché pendant
 * la saisie est indicatif et n'est jamais transmis.
 *
 * L'échec repasse par l'URL plutôt que par de l'état client — la page se
 * réaffiche avec son message, et un rechargement ne recrée pas de projet.
 */
export async function createProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();

  if (name.length === 0) redirect('/projects/new?error=name');

  const result = await createProjectForUser(user.id, name);

  if (!result.ok) {
    redirect(`/projects/new?error=${result.reason === 'quota' ? 'quota' : 'address'}`);
  }

  redirect(`/p/${result.project.inboundLocalPart}`);
}
