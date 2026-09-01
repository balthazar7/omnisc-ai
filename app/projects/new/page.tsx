import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getDictionary } from '@/lib/i18n';

import { createProject } from './actions';
import { ProjectNameField } from './name-field';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();

  const t = getDictionary();
  const { error } = await searchParams;

  const fieldError = error === 'name' ? t.projects.new.nameRequired : undefined;
  const formError =
    error === 'quota'
      ? t.projects.new.quotaError
      : error === 'address'
        ? t.projects.new.addressError
        : null;

  return (
    <main className="mx-auto flex max-w-onboarding flex-col gap-24 px-28 pt-64 pb-90">
      <Card>
        <CardHeader>
          <CardTitle>{t.projects.new.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-20">
          <p className="text-body text-ink-2">{t.projects.new.lead}</p>

          {formError && (
            <p className="rounded-sub border border-alert-line bg-alert-soft px-16 py-14 text-body text-alert">
              {formError}
            </p>
          )}

          <form action={createProject} className="flex flex-col gap-24">
            <ProjectNameField
              inboundDomain={env.INBOUND_DOMAIN}
              label={t.projects.new.nameLabel}
              placeholder={t.projects.new.namePlaceholder}
              previewLabel={t.projects.new.previewLabel}
              previewNote={t.projects.new.previewNote}
              error={fieldError}
            />

            <div className="flex items-center gap-11">
              <Button type="submit">{t.projects.new.submit}</Button>
              <Button asChild variant="tertiary">
                <Link href="/projects">{t.common.cancel}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
