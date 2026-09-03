import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, InputHint } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireUser } from '@/lib/auth/session';
import { requestOrigin } from '@/lib/http/origin';
import { getDictionary } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';
import { loggerForHeaders } from '@/lib/logger';
import { ensureOrganizationForUser } from '@/lib/orgs';
import {
  getOwnedOrganization,
  listMembers,
  MAX_ORGANIZATION_NAME_LENGTH,
} from '@/lib/members/queries';

import { invite, remove, renameOrg, revoke } from './actions';
import { CopyLink } from './copy-link';

export const dynamic = 'force-dynamic';

/**
 * Écran d'organisation.
 *
 * PAS DE PARAMÈTRE DE ROUTE, PAS DE SÉLECTEUR. L'écran administre toujours
 * l'organisation dont l'utilisateur est propriétaire, et il y en a exactement
 * une (invariant du lot 1b, matérialisé par l'index unique partiel
 * `organization_members_single_owner_idx`). Un utilisateur n'administre jamais
 * l'organisation d'un autre : c'est ce qui évite d'écrire une matrice d'accès
 * entière pour un produit qui n'en a pas besoin.
 *
 * TOUT LIBELLÉ NOMME L'ORGANISATION, JAMAIS UN PROJET. Une invitation ouvre
 * tous les projets de l'organisation, présents et futurs. Un bouton qui
 * annoncerait l'accès à un projet et donnerait l'accès à toute l'organisation
 * serait un défaut, pas une approximation.
 */
export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { done, error } = await searchParams;

  /*
    L'organisation est créée ici si elle ne l'est pas encore, comme sur
    `/projects` : quelqu'un arrivé par une invitation peut atteindre cet écran
    sans être jamais passé par la liste des projets, et il doit y trouver SA
    propre organisation — accepter une invitation ajoute une appartenance, cela
    ne remplace jamais l'organisation personnelle.
  */
  const log = loggerForHeaders(await headers(), { event_source: 'organization' });
  await ensureOrganizationForUser(user.id, log);

  const org = await getOwnedOrganization(user.id);
  if (!org) notFound();

  const view = await listMembers(user.id, org.id);
  // `null` seulement si l'utilisateur n'est pas propriétaire — impossible ici,
  // mais on ne le suppose pas : la fonction est le seul juge.
  if (!view) notFound();

  const t = getDictionary();
  const origin = await requestOrigin();

  const notice =
    done === 'renamed'
      ? t.org.renamed
      : done === 'invited'
        ? t.org.inviteCreated
        : done === 'revoked'
          ? t.org.revoked
          : done === 'removed'
            ? t.org.removed
            : null;

  const failure =
    error === 'invalid-name'
      ? t.org.nameTooLong
      : error === 'invalid-email'
        ? t.org.inviteErrors.invalidEmail
        : error === 'already-member'
          ? t.org.inviteErrors.alreadyMember
          : error === 'already-invited'
            ? t.org.inviteErrors.alreadyInvited
            : error === 'self'
              ? t.org.inviteErrors.self
              : error === 'not-owner'
                ? t.org.inviteErrors.notOwner
                : error === 'remove-failed'
                  ? t.org.removeFailed
                  : null;

  return (
    <main className="mx-auto flex max-w-onboarding flex-col gap-24 px-28 pt-64 pb-90">
      <header className="flex flex-col gap-9">
        <Link href="/projects" className="text-caption text-ink-3 hover:text-accent">
          {t.common.back}
        </Link>
        <h1 className="text-screen text-ink">{t.org.title}</h1>
      </header>

      {notice && (
        <p className="rounded-sub border border-ok bg-ok-soft px-16 py-14 text-body text-ok">
          {notice}
        </p>
      )}

      {/* Un refus prend la forme prévue pour un refus, jamais celle d'une réponse ordinaire. */}
      {failure && (
        <p className="rounded-sub border border-alert-line bg-alert-soft px-16 py-14 text-body text-alert">
          {failure}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.org.nameLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={renameOrg} className="flex flex-wrap items-end gap-14">
            <Field className="min-w-bubble flex-1">
              <Label htmlFor="org-name">{t.org.nameLabel}</Label>
              <Input
                id="org-name"
                name="name"
                required
                maxLength={MAX_ORGANIZATION_NAME_LENGTH}
                defaultValue={org.name}
              />
            </Field>
            <Button type="submit" variant="secondary">
              {t.org.rename}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.org.membersTitle}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.org.memberColumn}</TableHead>
                <TableHead>{t.org.roleColumn}</TableHead>
                <TableHead>{t.org.joinedColumn}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {member.role === 'owner' ? (
                      <Badge variant="accent">{t.org.roleOwner}</Badge>
                    ) : (
                      <Badge variant="neutral">{t.org.roleMember}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(member.joinedAt)}</TableCell>
                  <TableCell className="text-right">
                    {/*
                      Aucune action sur la ligne du propriétaire : une
                      organisation sans propriétaire serait un compte facturé que
                      plus personne ne peut administrer.
                    */}
                    {member.role === 'member' && (
                      <form action={remove}>
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" variant="danger" size="xs">
                          {t.org.remove}
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.org.invitationsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-16 px-0 pb-0">
          {view.invitations.length === 0 ? (
            <p className="px-24 text-body text-ink-2">{t.org.invitationsEmpty}</p>
          ) : (
            <>
              <p className="px-24 text-caption text-ink-3">{t.org.inviteNoEmailNote}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.org.memberColumn}</TableHead>
                    <TableHead>{t.org.expiresColumn}</TableHead>
                    <TableHead>{t.org.inviteLinkLabel}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.invitations.map((invitation) => {
                    const url = `${origin}/invite/${invitation.token}`;
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-11">
                            {/* Le lien reste copiable tant que l'invitation est en attente. */}
                            <code className="truncate rounded-chip bg-glass-3 px-11 py-4 text-micro text-ink-2 select-all">
                              {url}
                            </code>
                            <CopyLink
                              url={url}
                              copyLabel={t.common.copy}
                              copiedLabel={t.common.copied}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={revoke}>
                            <input type="hidden" name="invitationId" value={invitation.id} />
                            <Button type="submit" variant="danger" size="xs">
                              {t.org.revoke}
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.org.inviteTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={invite} className="flex flex-wrap items-start gap-14">
            <Field className="min-w-bubble flex-1">
              <Label htmlFor="invite-email">{t.org.inviteEmailLabel}</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder={t.org.inviteEmailPlaceholder}
              />
              {/* La portée est dite sous le champ, pas après coup. */}
              <InputHint>{t.org.inviteScopeNote}</InputHint>
            </Field>
            <Button type="submit" className="mt-24">
              {t.org.inviteSubmit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
