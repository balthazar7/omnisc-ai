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
    /*
      `no-organization` est distinct de `quota` : le premier veut dire que
      l'organisation propriétaire n'a pas été retrouvée — session anormale — le
      second qu'elle existe et qu'elle est pleine. Les confondre enverrait
      quelqu'un archiver un projet pour rien.
    */
    const reason =
      result.reason === 'quota' ? 'quota' : result.reason === 'no-organization' ? 'org' : 'address';
    redirect(`/projects/new?error=${reason}`);
  }

  redirect(`/p/${result.project.inboundLocalPart}`);
}
