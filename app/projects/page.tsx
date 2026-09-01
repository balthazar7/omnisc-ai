import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSubText,
} from '@/components/ui/table';
import { requireUser } from '@/lib/auth/session';
import { getProjectQuota } from '@/lib/entitlements';
import { env } from '@/lib/env';
import { getDictionary } from '@/lib/i18n';
import { formatInboundAddress } from '@/lib/projects/inbound-address';
import { listProjectsForUser } from '@/lib/projects/queries';
import { ensureOrganizationForUser } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

/**
 * Liste des projets de l'organisation.
 *
 * C'est ici que l'organisation est créée si elle n'existe pas encore : c'est le
 * premier écran atteint après un lien magique, et l'opération est idempotente.
 * La placer dans la route de rappel seulement laisserait sans organisation un
 * utilisateur qui revient avec un cookie encore valide.
 */
export default async function ProjectsPage() {
  const user = await requireUser();
  const org = await ensureOrganizationForUser(user.id);

  const [projects, quota] = await Promise.all([
    listProjectsForUser(user.id),
    getProjectQuota(org.id),
  ]);

  const t = getDictionary();

  return (
    <main className="mx-auto flex max-w-landing flex-col gap-24 px-28 pt-64 pb-90">
      <header className="flex items-start justify-between gap-24">
        <div className="flex flex-col gap-7">
          <h1 className="text-screen text-ink">{t.projects.title}</h1>
          <p className="text-caption text-ink-3">
            {`${t.projects.quotaLabel} : ${quota.used} / ${quota.limit}`}
          </p>
        </div>

        <div className="flex items-center gap-11">
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="tertiary" size="sm">
              {t.common.signOut}
            </Button>
          </form>

          {quota.canCreate ? (
            <Button asChild>
              <Link href="/projects/new">{t.projects.create}</Link>
            </Button>
          ) : (
            <Button disabled aria-disabled>
              {t.projects.create}
            </Button>
          )}
        </div>
      </header>

      {/* La limite est expliquée AVANT l'action, pas après coup en message d'erreur. */}
      {!quota.canCreate && (
        <p className="rounded-sub border border-alert-line bg-alert-soft px-16 py-14 text-body text-alert">
          {t.projects.quotaReached}
        </p>
      )}

      {projects.length === 0 ? (
        <div className="surface flex flex-col gap-9 rounded-card p-24">
          <p className="text-body-lg text-ink">{t.projects.empty}</p>
          <p className="text-body text-ink-2">{t.projects.emptyLead}</p>
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.projects.nameColumn}</TableHead>
                <TableHead>{t.projects.addressColumn}</TableHead>
                <TableHead>{t.projects.statusColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link href={`/p/${project.inboundLocalPart}`} className="hover:text-accent">
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TableSubText className="mt-0">
                      {formatInboundAddress(project.inboundLocalPart, env.INBOUND_DOMAIN)}
                    </TableSubText>
                  </TableCell>
                  <TableCell>
                    {project.status === 'archived' ? (
                      <Badge variant="neutral">{t.projects.archivedBadge}</Badge>
                    ) : (
                      <Badge variant="ok">{t.projects.activeBadge}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
