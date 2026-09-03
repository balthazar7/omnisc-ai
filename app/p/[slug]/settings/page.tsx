import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, InputHint } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getDictionary } from '@/lib/i18n';
import { formatInboundAddress } from '@/lib/projects/inbound-address';
import { getProjectForUser } from '@/lib/projects/queries';

import { renameProject, setProjectStatus } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const { error, done } = await searchParams;

  const project = await getProjectForUser(user.id, slug);
  // 404 et jamais 403 — voir la page projet.
  if (!project) notFound();

  /*
    L'écran de réglages n'existe QUE pour le propriétaire : il ne contient que
    des actions qu'un invité n'a pas. Un 404 plutôt qu'un écran désactivé, par
    cohérence avec la règle « inaccessible = introuvable » — et parce qu'un
    écran vide de toute action n'apprendrait rien à personne.
  */
  if (project.role !== 'owner') notFound();

  const t = getDictionary();
  const address = formatInboundAddress(project.inboundLocalPart, env.INBOUND_DOMAIN);
  const archived = project.status === 'archived';

  const notice =
    done === 'renamed'
      ? t.projects.settings.renamed
      : done === 'archived'
        ? t.projects.settings.archived
        : done === 'active'
          ? t.projects.settings.unarchived
          : null;

  const failure =
    error === 'quota'
      ? t.projects.settings.unarchiveQuotaError
      : error === 'name'
        ? t.projects.new.nameRequired
        : null;

  return (
    <main className="mx-auto flex max-w-onboarding flex-col gap-24 px-28 pt-64 pb-90">
      <header className="flex flex-col gap-9">
        <Link href={`/p/${project.inboundLocalPart}`} className="text-caption text-ink-3 hover:text-accent">
          {project.name}
        </Link>
        <h1 className="text-screen text-ink">{t.projects.settings.title}</h1>
      </header>

      {notice && (
        <p className="rounded-sub border border-ok bg-ok-soft px-16 py-14 text-body text-ok">
          {notice}
        </p>
      )}
      {failure && (
        <p className="rounded-sub border border-alert-line bg-alert-soft px-16 py-14 text-body text-alert">
          {failure}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.projects.settings.nameLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={renameProject} className="flex flex-col gap-18">
            <input type="hidden" name="slug" value={project.inboundLocalPart} />
            <Field>
              <Label htmlFor="name">{t.projects.settings.nameLabel}</Label>
              <Input id="name" name="name" defaultValue={project.name} required />
              {/* Dit à l'écran : c'est contre-intuitif, et s'en apercevoir trop tard coûte des messages. */}
              <InputHint>{t.projects.settings.renameNote}</InputHint>
            </Field>
            <div>
              <Button type="submit">{t.projects.settings.rename}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.projects.settings.addressLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-9">
          <code className="w-fit rounded-field border border-hair-2 bg-glass-3 px-14 py-11 text-body text-ink-2 select-all">
            {address}
          </code>
          <p className="text-caption text-ink-3">{t.projects.settings.addressFixed}</p>
        </CardContent>
      </Card>

      <Card tone={archived ? 'neutral' : 'alert'}>
        <CardHeader>
          <CardTitle>{t.projects.settings.archiveTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-18">
          <p className="text-body text-ink-2">{t.projects.settings.archiveNote}</p>
          <form action={setProjectStatus}>
            <input type="hidden" name="slug" value={project.inboundLocalPart} />
            <input type="hidden" name="status" value={archived ? 'active' : 'archived'} />
            <Button type="submit" variant={archived ? 'tertiary' : 'danger'}>
              {archived ? t.projects.settings.unarchive : t.projects.settings.archive}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
