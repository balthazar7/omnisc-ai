/*
  Page projet — VERSION MINIMALE, REMPLACÉE AU LOT 5 par la vue projet
  (project_state, engagements, demandes sans réponse, digest).

  Elle ne montre qu'une chose, et c'est volontaire : l'adresse à mettre en
  copie. Tant que cette adresse n'est pas partie dans un vrai fil, le produit
  n'a aucune matière à afficher.
*/
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getDictionary } from '@/lib/i18n';
import { formatInboundAddress } from '@/lib/projects/inbound-address';
import { getProjectForUser } from '@/lib/projects/queries';

import { CopyAddress } from './copy-address';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const project = await getProjectForUser(user.id, slug);

  /*
    404 ET JAMAIS 403. Un 403 confirmerait l'existence du projet à quelqu'un qui
    devine des adresses — or c'est précisément ce que le suffixe aléatoire de
    l'adresse cherche à empêcher. Projet inexistant et projet inaccessible
    donnent donc exactement la même réponse.
  */
  if (!project) notFound();

  const t = getDictionary();
  const address = formatInboundAddress(project.inboundLocalPart, env.INBOUND_DOMAIN);

  return (
    <main className="mx-auto flex max-w-landing flex-col gap-24 px-28 pt-64 pb-90">
      <header className="flex items-start justify-between gap-24">
        <div className="flex flex-col gap-9">
          <Link href="/projects" className="text-caption text-ink-3 hover:text-accent">
            {t.common.back}
          </Link>
          <div className="flex items-center gap-11">
            <h1 className="text-screen text-ink">{project.name}</h1>
            {project.status === 'archived' && (
              <Badge variant="neutral">{t.projects.archivedBadge}</Badge>
            )}
          </div>
        </div>

        <Button asChild variant="tertiary" size="sm">
          <Link href={`/p/${project.inboundLocalPart}/settings`}>{t.projects.detail.settings}</Link>
        </Button>
      </header>

      <Card size="hero" tone="accent">
        <CardHeader>
          <CardTitle>{t.projects.detail.addressLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-20">
          <CopyAddress
            address={address}
            copyLabel={t.projects.detail.copy}
            copiedLabel={t.projects.detail.copied}
          />
          <p className="max-w-bubble text-body text-ink-2">{t.projects.detail.addressHelp}</p>
        </CardContent>
      </Card>
    </main>
  );
}
