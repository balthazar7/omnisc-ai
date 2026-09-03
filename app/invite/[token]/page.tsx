import type * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n';
import { getInvitationByToken, type InvitationState } from '@/lib/members/queries';

import { accept } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Page publique d'acceptation d'une invitation.
 *
 * AUCUNE AUTHENTIFICATION POUR L'AFFICHER : c'est le premier écran que voit
 * quelqu'un qui n'a pas encore de compte. Elle ne révèle que le nom de
 * l'organisation et l'adresse invitée, soit exactement ce que l'expéditeur du
 * lien a déjà écrit à son destinataire.
 *
 * QUATRE ÉTATS D'ÉCHEC DISTINCTS, et pas un message unique : une invitation
 * expirée se règle en en redemandant une, une révoquée en s'adressant à
 * l'organisation, une déjà acceptée en se connectant simplement, un lien
 * introuvable en vérifiant ce qui a été collé. Les confondre rendrait tout
 * diagnostic impossible, pour l'utilisateur comme pour nous.
 *
 * L'ADRESSE CONNECTÉE DOIT ÊTRE L'ADRESSE INVITÉE. Accepter en silence pour
 * quelqu'un d'autre ferait du lien un jeton au porteur. Le refus prend la forme
 * prévue par DESIGN.md pour un refus — encart `--alert-soft` bordé
 * `--alert-line` — jamais celle d'une réponse ordinaire.
 */
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const t = getDictionary();
  const invitation = await getInvitationByToken(token);
  const user = await getUser();

  const stateMessages: Record<Exclude<InvitationState, 'valide'>, string> = {
    expiree: t.invite.states.expiree,
    revoquee: t.invite.states.revoquee,
    deja_acceptee: t.invite.states.dejaAcceptee,
    introuvable: t.invite.states.introuvable,
  };

  if (invitation.state !== 'valide') {
    return (
      <Shell title={t.invite.title}>
        <Refusal body={stateMessages[invitation.state]} />
        <SignInLink label={t.auth.title} href="/login" />
      </Shell>
    );
  }

  const invitedEmail = invitation.email ?? '';
  const wrongAccount =
    user !== null && user.email.trim().toLowerCase() !== invitedEmail.trim().toLowerCase();

  /*
    Un `error` renvoyé par l'action : l'invitation a changé d'état entre
    l'affichage et le clic — révoquée, expirée entre-temps. Le message est celui
    de l'état, pas un « échec » générique.
  */
  const actionError =
    error && error !== 'wrong-email' && error in stateMessages
      ? stateMessages[error as Exclude<InvitationState, 'valide'>]
      : null;

  return (
    <Shell title={t.invite.title}>
      <Card size="hero" tone={wrongAccount ? 'alert' : 'accent'}>
        <CardHeader>
          <CardTitle>{invitation.organizationName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-20">
          <p className="text-body text-ink-2">{t.invite.lead}</p>

          <dl className="flex flex-col gap-9">
            <div className="flex flex-wrap items-baseline gap-9">
              <dt className="text-caption text-ink-3">{t.invite.organizationLabel}</dt>
              <dd className="text-body text-ink">{invitation.organizationName}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-9">
              <dt className="text-caption text-ink-3">{t.invite.emailLabel}</dt>
              <dd className="text-body text-ink">{invitedEmail}</dd>
            </div>
          </dl>

          <p className="text-caption text-ink-3">{t.invite.scopeNote}</p>
        </CardContent>
      </Card>

      {actionError && <Refusal body={actionError} />}

      {user === null ? (
        /*
          Non connecté : on envoie vers le lien magique, adresse pré-remplie et
          retour sur cette page. Sans le retour, l'invité atterrit sur ses
          projets après connexion et doit rouvrir le lien à la main.
        */
        <Button asChild size="block">
          <Link
            href={`/login?email=${encodeURIComponent(invitedEmail)}&next=${encodeURIComponent(`/invite/${token}`)}`}
          >
            {t.invite.signIn}
          </Link>
        </Button>
      ) : wrongAccount ? (
        <>
          <Refusal title={t.invite.wrongAccountTitle} body={t.invite.wrongAccountBody}>
            <p className="text-caption text-alert">
              {`${t.invite.wrongAccountExpected} : ${invitedEmail}`}
            </p>
            <p className="text-caption text-alert">
              {`${t.invite.wrongAccountCurrent} : ${user.email}`}
            </p>
          </Refusal>

          <form action="/auth/logout" method="post">
            <Button type="submit" variant="secondary" size="block">
              {t.common.signOut}
            </Button>
          </form>
        </>
      ) : (
        <form action={accept}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" size="block">
            {t.invite.accept}
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-onboarding flex-col items-center px-28 pt-90 pb-90">
      <div className="flex w-full max-w-bubble flex-col gap-20">
        <h1 className="text-screen text-ink">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** DESIGN.md : un refus a sa propre forme — `--alert-soft` bordé `--alert-line`. */
function Refusal({
  title,
  body,
  children,
}: {
  title?: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-9 rounded-sub border border-alert-line bg-alert-soft px-16 py-14">
      {title && <p className="text-body-lg text-alert">{title}</p>}
      <p className="text-body text-alert">{body}</p>
      {children}
    </div>
  );
}

function SignInLink({ label, href }: { label: string; href: string }) {
  return (
    <Button asChild variant="secondary" size="block">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
