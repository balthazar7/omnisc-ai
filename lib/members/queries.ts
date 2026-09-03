import { getProjectQuota, type ProjectQuota } from '@/lib/entitlements';
import type { Logger } from '@/lib/logger';
import { getSql } from '@/lib/supabase/server';

import {
  generateInvitationToken,
  invitationExpiry,
  looksLikeEmail,
  normalizeEmail,
} from './token';

/**
 * Membres et invitations d'une organisation.
 *
 * CONTRÔLE D'ACCÈS — UNE SEULE RÈGLE, ICI. Chaque fonction prend `userId` en
 * premier argument et vérifie elle-même, DANS LE SQL, que cet utilisateur est
 * `owner` de l'organisation visée. Il n'existe pas de variante « sans
 * vérification » : c'est ce qui empêche un futur écran d'en oublier une.
 *
 * Une organisation inaccessible est INTROUVABLE, pas interdite : ces fonctions
 * renvoient `null`, et les pages en font un `notFound()`.
 *
 * UN MEMBER N'A AUCUNE ACTION SUR L'ORGANISATION QUI L'A INVITÉ. Il lit ses
 * projets, rien de plus : il n'y crée pas de projet, ne renomme pas, n'archive
 * pas, n'invite personne. Dans la sienne, il est `owner` et fait tout.
 *
 * PORTÉE ORGANISATION, JAMAIS PROJET. Une invitation ouvre tous les projets de
 * l'organisation, présents et futurs. Tant qu'une organisation n'a qu'un projet
 * — le défaut, `max_active_projects = 1` — la différence ne se voit pas ; elle
 * apparaîtra au premier client à deux projets. Tout libellé d'interface nomme
 * donc l'organisation, jamais un projet.
 */

export type OwnedOrganization = {
  id: string;
  name: string;
  plan: string;
  quota: ProjectQuota;
};

export type MemberRow = {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: Date;
};

export type InvitationRow = {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

export type MembersView = {
  members: MemberRow[];
  invitations: InvitationRow[];
};

/** Longueur maximale d'un nom d'organisation. */
export const MAX_ORGANIZATION_NAME_LENGTH = 60;

/**
 * Vrai si l'utilisateur est `owner` de cette organisation.
 *
 * Jamais exportée : aucun appelant ne doit pouvoir décider de l'accès ailleurs
 * que dans ce fichier.
 */
async function isOwner(userId: string, orgId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ one: number }[]>`
    select 1 as one
      from public.organization_members m
     where m.org_id = ${orgId}
       and m.user_id = ${userId}
       and m.role = 'owner'
     limit 1
  `;
  return rows.length > 0;
}

/**
 * L'organisation dont l'utilisateur est `owner`.
 *
 * Il y en a exactement une, garantie par l'index unique partiel
 * `organization_members_single_owner_idx` et par `ensureOrganizationForUser`.
 * D'où un retour à une seule valeur : ni liste, ni sélecteur d'organisation à
 * l'écran, ni paramètre de route sur `/organization`.
 *
 * `null` seulement si l'organisation personnelle n'a pas encore été créée —
 * cas transitoire qu'`ensureOrganizationForUser` referme à la connexion.
 */
export async function getOwnedOrganization(userId: string): Promise<OwnedOrganization | null> {
  const sql = getSql();

  const rows = await sql<{ id: string; name: string; plan: string }[]>`
    select o.id, o.name, o.plan
      from public.organizations o
      join public.organization_members m on m.org_id = o.id
     where m.user_id = ${userId}
       and m.role = 'owner'
     order by o.created_at asc
     limit 1
  `;

  if (rows.length === 0) return null;

  const quota = await getProjectQuota(rows[0].id);
  return { id: rows[0].id, name: rows[0].name, plan: rows[0].plan, quota };
}

/**
 * Membres et invitations en attente. `null` si l'utilisateur n'est pas `owner`.
 *
 * L'adresse des membres se lit dans `auth.users` : `organization_members` ne
 * porte qu'un `user_id`, et recopier l'adresse ici la ferait diverger de
 * l'adresse d'authentification au premier changement.
 */
export async function listMembers(userId: string, orgId: string): Promise<MembersView | null> {
  if (!(await isOwner(userId, orgId))) return null;

  const sql = getSql();

  const members = await sql<
    { user_id: string; email: string; role: 'owner' | 'member'; created_at: Date }[]
  >`
    select m.user_id, coalesce(u.email, '') as email, m.role, m.created_at
      from public.organization_members m
      left join auth.users u on u.id = m.user_id
     where m.org_id = ${orgId}
     order by (m.role = 'member'), m.created_at asc
  `;

  const invitations = await sql<
    { id: string; email: string; token: string; expires_at: Date; created_at: Date }[]
  >`
    select i.id, i.email, i.token, i.expires_at, i.created_at
      from public.organization_invitations i
     where i.org_id = ${orgId}
       and i.accepted_at is null
       and i.revoked_at is null
     order by i.created_at desc
  `;

  return {
    members: members.map((row) => ({
      userId: row.user_id,
      email: row.email,
      role: row.role,
      joinedAt: row.created_at,
    })),
    invitations: invitations.map((row) => ({
      id: row.id,
      email: row.email,
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
  };
}

export type RenameOrganizationResult =
  | { ok: true; name: string }
  | { ok: false; reason: 'not-owner' | 'invalid-name' };

/** Renomme l'organisation. `owner` seulement. */
export async function renameOrganization(
  userId: string,
  orgId: string,
  name: string,
  log: Logger,
): Promise<RenameOrganizationResult> {
  const trimmed = name.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_ORGANIZATION_NAME_LENGTH) {
    return { ok: false, reason: 'invalid-name' };
  }

  const sql = getSql();

  // L'appartenance est vérifiée DANS l'update : un contrôle préalable séparé
  // laisserait une fenêtre entre la vérification et l'écriture.
  const rows = await sql<{ id: string }[]>`
    update public.organizations o
       set name = ${trimmed}
     where o.id = ${orgId}
       and exists (
         select 1
           from public.organization_members m
          where m.org_id = o.id
            and m.user_id = ${userId}
            and m.role = 'owner'
       )
    returning o.id
  `;

  if (rows.length === 0) return { ok: false, reason: 'not-owner' };

  log.info('members.org.renamed', { org_id: orgId });
  return { ok: true, name: trimmed };
}

export type CreateInvitationResult =
  | { ok: true; invitation: InvitationRow }
  | {
      ok: false;
      reason: 'not-owner' | 'invalid-email' | 'already-member' | 'already-invited' | 'self';
    };

/**
 * Crée une invitation. `owner` seulement.
 *
 * Chaque refus a son motif propre : l'écran doit pouvoir dire POURQUOI. Un
 * message unique rendrait « déjà membre » et « déjà invitée » indiscernables,
 * or ce sont deux situations qui appellent deux gestes différents.
 *
 * Le rôle n'est pas laissé au défaut de la colonne. `organization_members`
 * porte `default 'owner'`, correct pour l'organisation créée à la volée et
 * piège partout ailleurs : la valeur voulue est nommée à chaque insertion,
 * sans exception.
 */
export async function createInvitation(
  userId: string,
  orgId: string,
  email: string,
  log: Logger,
): Promise<CreateInvitationResult> {
  if (!(await isOwner(userId, orgId))) return { ok: false, reason: 'not-owner' };

  const normalized = normalizeEmail(email);
  if (!looksLikeEmail(normalized)) return { ok: false, reason: 'invalid-email' };

  const sql = getSql();

  const [self] = await sql<{ email: string | null }[]>`
    select u.email from auth.users u where u.id = ${userId}
  `;
  if (self?.email && normalizeEmail(self.email) === normalized) {
    return { ok: false, reason: 'self' };
  }

  const existingMember = await sql<{ one: number }[]>`
    select 1 as one
      from public.organization_members m
      join auth.users u on u.id = m.user_id
     where m.org_id = ${orgId}
       and lower(u.email) = ${normalized}
     limit 1
  `;
  if (existingMember.length > 0) return { ok: false, reason: 'already-member' };

  const token = generateInvitationToken();
  const expiresAt = invitationExpiry();

  try {
    const [row] = await sql<
      { id: string; email: string; token: string; expires_at: Date; created_at: Date }[]
    >`
      insert into public.organization_invitations
        (org_id, email, role, token, expires_at, invited_by)
      values
        (${orgId}, ${normalized}, 'member', ${token}, ${expiresAt}, ${userId})
      returning id, email, token, expires_at, created_at
    `;

    log.info('members.invitation.created', { org_id: orgId, invitation_id: row.id });

    return {
      ok: true,
      invitation: {
        id: row.id,
        email: row.email,
        token: row.token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      },
    };
  } catch (error) {
    /*
      23505 sur `organization_invitations_pending_idx` : une invitation est déjà
      en attente pour cette adresse. C'est un refus attendu, pas un défaut — on
      le distingue plutôt que de le laisser remonter en 500.
    */
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : 'unknown';

    if (code === '23505') {
      log.info('members.invitation.duplicate', { org_id: orgId });
      return { ok: false, reason: 'already-invited' };
    }

    log.exception('members.invitation.failed', error, { org_id: orgId, pg_code: code });
    throw error;
  }
}

/** Révoque une invitation. `owner` seulement. Sans effet sur une invitation acceptée. */
export async function revokeInvitation(
  userId: string,
  orgId: string,
  invitationId: string,
  log: Logger,
): Promise<boolean> {
  const sql = getSql();

  const rows = await sql<{ id: string }[]>`
    update public.organization_invitations i
       set revoked_at = now()
     where i.id = ${invitationId}
       and i.org_id = ${orgId}
       and i.accepted_at is null
       and i.revoked_at is null
       and exists (
         select 1
           from public.organization_members m
          where m.org_id = i.org_id
            and m.user_id = ${userId}
            and m.role = 'owner'
       )
    returning i.id
  `;

  if (rows.length > 0) {
    log.info('members.invitation.revoked', { org_id: orgId, invitation_id: invitationId });
  }

  return rows.length > 0;
}

/**
 * Retire un membre. `owner` seulement.
 *
 * REFUSE DE RETIRER UN `owner`, Y COMPRIS SOI-MÊME. L'organisation porte
 * l'abonnement : une organisation sans propriétaire serait un compte facturé
 * que plus personne ne peut administrer. Le départ volontaire et le transfert
 * de propriété sont hors périmètre de ce lot.
 *
 * La suppression de la ligne retire IMMÉDIATEMENT l'accès à tous les projets de
 * l'organisation : les lectures de `lib/projects/queries.ts` joignent
 * `organization_members` à chaque requête, il n'y a aucun cache à invalider.
 */
export async function removeMember(
  userId: string,
  orgId: string,
  targetUserId: string,
  log: Logger,
): Promise<boolean> {
  const sql = getSql();

  const rows = await sql<{ user_id: string }[]>`
    delete from public.organization_members m
     where m.org_id = ${orgId}
       and m.user_id = ${targetUserId}
       and m.role = 'member'
       and exists (
         select 1
           from public.organization_members owner_row
          where owner_row.org_id = m.org_id
            and owner_row.user_id = ${userId}
            and owner_row.role = 'owner'
       )
    returning m.user_id
  `;

  if (rows.length > 0) log.info('members.member.removed', { org_id: orgId });
  return rows.length > 0;
}

export type InvitationState = 'valide' | 'expiree' | 'revoquee' | 'deja_acceptee' | 'introuvable';

export type InvitationView = {
  state: InvitationState;
  organizationName: string | null;
  email: string | null;
};

/**
 * L'invitation désignée par un jeton, et son état.
 *
 * AUCUNE AUTHENTIFICATION REQUISE : c'est la page publique du lien, atteinte
 * avant toute connexion. Elle ne révèle que le nom de l'organisation et
 * l'adresse invitée — soit exactement ce que l'expéditeur du lien a déjà écrit
 * à son destinataire.
 *
 * Quatre états d'échec distincts, et pas un message unique : une invitation
 * expirée se règle en en redemandant une, une révoquée en s'adressant à
 * l'organisation, une déjà acceptée en se connectant simplement. Les confondre
 * rendrait tout diagnostic impossible, pour l'utilisateur comme pour nous.
 */
export async function getInvitationByToken(token: string): Promise<InvitationView> {
  if (token.trim().length === 0) {
    return { state: 'introuvable', organizationName: null, email: null };
  }

  const sql = getSql();

  const rows = await sql<
    {
      email: string;
      org_name: string;
      expires_at: Date;
      accepted_at: Date | null;
      revoked_at: Date | null;
    }[]
  >`
    select i.email, o.name as org_name, i.expires_at, i.accepted_at, i.revoked_at
      from public.organization_invitations i
      join public.organizations o on o.id = i.org_id
     where i.token = ${token}
     limit 1
  `;

  if (rows.length === 0) {
    return { state: 'introuvable', organizationName: null, email: null };
  }

  const row = rows[0];
  const base = { organizationName: row.org_name, email: row.email };

  if (row.revoked_at) return { state: 'revoquee', ...base };
  if (row.accepted_at) return { state: 'deja_acceptee', ...base };
  if (row.expires_at.getTime() <= Date.now()) return { state: 'expiree', ...base };

  return { state: 'valide', ...base };
}

export type AcceptInvitationResult =
  | { ok: true; organizationName: string }
  | { ok: false; reason: InvitationState | 'wrong-email'; expectedEmail?: string };

/**
 * Accepte une invitation.
 *
 * L'ADRESSE AUTHENTIFIÉE DOIT ÉGALER L'ADRESSE INVITÉE, comparaison insensible
 * à la casse. Sans ce contrôle, le lien serait un jeton au porteur : quiconque
 * le reçoit en transfert entrerait dans l'organisation. Le refus nomme
 * l'adresse attendue — l'utilisateur doit pouvoir comprendre qu'il est connecté
 * sous le mauvais compte, pas seulement que « ça n'a pas marché ».
 *
 * IDEMPOTENTE. Un utilisateur déjà membre obtient un succès : le double clic,
 * le rechargement et le lien rouvert deux jours plus tard sont le cas normal.
 */
export async function acceptInvitation(
  userId: string,
  userEmail: string,
  token: string,
  log: Logger,
): Promise<AcceptInvitationResult> {
  const sql = getSql();

  const rows = await sql<
    {
      id: string;
      org_id: string;
      org_name: string;
      email: string;
      expires_at: Date;
      accepted_at: Date | null;
      revoked_at: Date | null;
    }[]
  >`
    select i.id, i.org_id, o.name as org_name, i.email,
           i.expires_at, i.accepted_at, i.revoked_at
      from public.organization_invitations i
      join public.organizations o on o.id = i.org_id
     where i.token = ${token}
     limit 1
  `;

  if (rows.length === 0) return { ok: false, reason: 'introuvable' };

  const invitation = rows[0];

  if (normalizeEmail(userEmail) !== normalizeEmail(invitation.email)) {
    log.info('members.invitation.email_mismatch', { invitation_id: invitation.id });
    return { ok: false, reason: 'wrong-email', expectedEmail: invitation.email };
  }

  /*
    Déjà membre : succès, sans rien réécrire. Testé AVANT les états d'échec —
    sinon une invitation acceptée puis rouverte afficherait une erreur à
    quelqu'un qui a pourtant bien l'accès.
  */
  const alreadyMember = await sql<{ one: number }[]>`
    select 1 as one
      from public.organization_members m
     where m.org_id = ${invitation.org_id}
       and m.user_id = ${userId}
     limit 1
  `;
  if (alreadyMember.length > 0) {
    return { ok: true, organizationName: invitation.org_name };
  }

  if (invitation.revoked_at) return { ok: false, reason: 'revoquee' };
  if (invitation.accepted_at) return { ok: false, reason: 'deja_acceptee' };
  if (invitation.expires_at.getTime() <= Date.now()) return { ok: false, reason: 'expiree' };

  /*
    Les deux écritures sont dans UNE SEULE transaction. Une appartenance sans
    invitation marquée acceptée laisserait le lien réutilisable par quelqu'un
    d'autre ; une invitation marquée acceptée sans appartenance donnerait un
    accès perdu sans recours.

    Le rôle est nommé explicitement : la colonne a `default 'owner'`, et un
    invité promu propriétaire par omission violerait l'invariant du lot.
  */
  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into public.organization_members (org_id, user_id, role)
        values (${invitation.org_id}, ${userId}, 'member')
        on conflict (org_id, user_id) do nothing
      `;

      await tx`
        update public.organization_invitations
           set accepted_at = now(), accepted_by = ${userId}
         where id = ${invitation.id}
           and accepted_at is null
      `;
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : 'unknown';

    log.exception('members.invitation.accept_failed', error, {
      invitation_id: invitation.id,
      pg_code: code,
    });
    throw error;
  }

  log.info('members.invitation.accepted', {
    org_id: invitation.org_id,
    invitation_id: invitation.id,
  });

  return { ok: true, organizationName: invitation.org_name };
}

/**
 * Vrai si l'adresse porte une invitation en attente, dans n'importe quelle
 * organisation.
 *
 * Sert uniquement à laisser passer un invité devant `SIGNUP_ALLOWLIST`. Voir
 * `lib/auth/signup-allowlist.ts` : le contrôle y reste en UN SEUL point.
 */
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const sql = getSql();

  const rows = await sql<{ one: number }[]>`
    select 1 as one
      from public.organization_invitations i
     where lower(i.email) = ${normalizeEmail(email)}
       and i.accepted_at is null
       and i.revoked_at is null
       and i.expires_at > now()
     limit 1
  `;

  return rows.length > 0;
}
