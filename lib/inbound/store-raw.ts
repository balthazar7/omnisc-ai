import { randomUUID, timingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';
import type { Logger } from '@/lib/logger';
import { RAW_BUCKET, sql, storage } from '@/lib/supabase/server';

/**
 * Ingestion brute d'un message entrant Postmark — lot 0a.
 *
 * Cette fonction fait trois choses et rien d'autre : vérifier l'authentification
 * Basic, écrire le brut, insérer un job. Aucun traitement lourd dans le chemin
 * de la requête : un webhook qui dépasse le délai est rejoué par Postmark, donc
 * des doublons.
 *
 * Hors périmètre de ce lot, volontairement : DKIM/SPF et niveaux de confiance
 * (lot 2), décitationnage, fils, entités, pièces jointes (lot 3a), empreinte
 * synthétique (lot 3b), traitement des jobs (lot 3a).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Charge utile Postmark
//
// Forme relevée sur les captures réelles de `fixtures/inbound/` — jamais sur
// l'exemple de la documentation Postmark. Aucun champ n'est présumé au-delà de
// ce qui y figure.
// ─────────────────────────────────────────────────────────────────────────────

type PostmarkAddress = {
  Email?: string;
  Name?: string;
  MailboxHash?: string;
};

type PostmarkHeader = {
  Name?: string;
  Value?: string;
};

export type PostmarkInboundPayload = {
  /** Identifiant interne Postmark (UUID). Ce n'est PAS l'en-tête RFC Message-ID. */
  MessageID?: string;
  MessageStream?: string;
  From?: string;
  FromName?: string;
  FromFull?: PostmarkAddress;
  To?: string;
  ToFull?: PostmarkAddress[];
  Cc?: string;
  CcFull?: PostmarkAddress[];
  Bcc?: string;
  /**
   * Vide lorsque l'adresse du projet est en copie cachée : un destinataire en
   * Cci n'apparaît pas dans les en-têtes du message reçu.
   */
  BccFull?: PostmarkAddress[];
  /** Adresse à laquelle Postmark a réellement remis le message. Seul champ fiable en attrape-tout. */
  OriginalRecipient?: string;
  Subject?: string;
  ReplyTo?: string;
  MailboxHash?: string;
  /** Format dépendant du serveur émetteur, non normalisable. */
  Date?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  /** Message brut complet, activé par « Include raw email content ». */
  RawEmail?: string;
  Tag?: string;
  Headers?: PostmarkHeader[];
  Attachments?: unknown[];
};

export type InboundOutcome =
  | 'unauthorized'
  | 'bad_request'
  | 'orphan'
  | 'duplicate'
  | 'stored'
  | 'stored_failed'
  | 'error';

export type InboundResult = { status: number; outcome: InboundOutcome; body: unknown };

// ─────────────────────────────────────────────────────────────────────────────
// Compteur d'adresses orphelines
//
// Le domaine est en attrape-tout : n'importe qui peut écrire à une adresse qui
// ne correspond à aucun projet. Ces messages sont comptés et rejetés sans
// stockage du contenu, et un projet n'est JAMAIS créé implicitement.
// Le compteur est propre à l'instance serverless ; il est joint à la ligne de
// journal `inbound.orphan`, qui reste la source d'agrégation.
// ─────────────────────────────────────────────────────────────────────────────
const counters = globalThis as unknown as { __omniscOrphanCount?: number };

export function orphanCount(): number {
  return counters.__omniscOrphanCount ?? 0;
}

function incrementOrphanCount(): number {
  counters.__omniscOrphanCount = orphanCount() + 1;
  return counters.__omniscOrphanCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentification Basic
//
// Postmark NE SIGNE PAS ses webhooks : aucune vérification HMAC n'existe, ni en
// entrée ni en sortie. L'unique protection est l'authentification Basic encodée
// dans l'URL du webhook, comparée en TEMPS CONSTANT.
// ─────────────────────────────────────────────────────────────────────────────

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Comparaison factice pour ne pas révéler la longueur par le temps de retour.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization');
  if (!header) return false;

  const [scheme, value] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !value) return false;

  const expected = Buffer.from(
    `${env.POSTMARK_WEBHOOK_USER}:${env.POSTMARK_WEBHOOK_PASSWORD}`,
    'utf8',
  ).toString('base64');

  return constantTimeEquals(value.trim(), expected);
}

// ─────────────────────────────────────────────────────────────────────────────
// Résolution du projet
// ─────────────────────────────────────────────────────────────────────────────

/** Extrait la partie locale d'une adresse si elle appartient au domaine de réception. */
function localPartForInboundDomain(raw: string | undefined | null): string | null {
  if (!raw) return null;

  // `OriginalRecipient` est une adresse nue, mais ToFull/CcFull peuvent porter
  // un libellé : on retient ce qui est entre chevrons quand il y en a.
  const bracketed = raw.match(/<([^>]+)>/);
  const address = (bracketed ? bracketed[1] : raw).trim().toLowerCase();

  const at = address.lastIndexOf('@');
  if (at <= 0) return null;

  if (address.slice(at + 1) !== env.INBOUND_DOMAIN) return null;

  const localPart = address.slice(0, at);
  return localPart.length > 0 ? localPart : null;
}

/**
 * Parties locales candidates, par ordre de priorité :
 *  1. `OriginalRecipient` — adresse à laquelle Postmark a réellement remis le
 *     message. Seul champ fiable sur un domaine attrape-tout, et le seul qui
 *     fonctionne quand l'adresse du projet est en copie cachée.
 *  2. `ToFull`, puis 3. `CcFull`.
 */
export function candidateLocalParts(payload: PostmarkInboundPayload): string[] {
  const ordered: (string | undefined)[] = [
    payload.OriginalRecipient,
    ...(payload.ToFull ?? []).map((entry) => entry?.Email),
    ...(payload.CcFull ?? []).map((entry) => entry?.Email),
  ];

  const out: string[] = [];
  for (const candidate of ordered) {
    const localPart = localPartForInboundDomain(candidate);
    if (localPart && !out.includes(localPart)) out.push(localPart);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture de la charge utile
// ─────────────────────────────────────────────────────────────────────────────

function headerValue(payload: PostmarkInboundPayload, name: string): string | null {
  const wanted = name.toLowerCase();
  for (const header of payload.Headers ?? []) {
    if (header?.Name?.toLowerCase() === wanted) return header.Value?.trim() ?? null;
  }
  return null;
}

/**
 * Clé d'idempotence pour un message reçu directement : l'en-tête RFC
 * `Message-ID`, qui ne figure pas au premier niveau de la charge utile — le
 * champ `MessageID` de Postmark est son identifiant interne. Repli sur cet
 * identifiant, préfixé, quand l'en-tête est absent.
 */
export function messageIdHeaderOf(payload: PostmarkInboundPayload): string {
  const rfc = headerValue(payload, 'Message-ID') ?? headerValue(payload, 'Message-Id');
  if (rfc) return rfc;
  if (payload.MessageID) return `postmark:${payload.MessageID}`;
  return `postmark-unknown:${randomUUID()}`;
}

function addressesOf(entries: PostmarkAddress[] | undefined): string[] {
  return (entries ?? [])
    .map((entry) => entry?.Email?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

/**
 * Valide la structure et analyse la date.
 *
 * Postmark documente que le format du champ `Date` dépend du serveur émetteur
 * et n'est pas normalisable. En cas d'échec on n'invente RIEN : `sent_at` reste
 * nul et le message part en `failed`. Toute la résolution des dates du lot 4 se
 * calcule contre `sent_at` ; une date devinée produirait des échéances fausses
 * de plusieurs semaines.
 */
export function validatePayload(
  payload: PostmarkInboundPayload,
): { ok: true; sentAt: Date } | { ok: false; error: string } {
  const missing: string[] = [];
  if (!payload.MessageID) missing.push('MessageID');
  if (!payload.From) missing.push('From');
  // `To` peut être une chaîne vide sur une remise en copie cachée : on exige la
  // présence du champ, pas son contenu.
  if (typeof payload.To !== 'string') missing.push('To');
  if (!payload.Date) missing.push('Date');

  if (missing.length > 0) {
    return { ok: false, error: `Champs absents de la charge utile : ${missing.join(', ')}` };
  }

  const sentAt = new Date(payload.Date as string);
  if (Number.isNaN(sentAt.getTime())) {
    return { ok: false, error: `Date illisible : ${JSON.stringify(payload.Date)}` };
  }

  return { ok: true, sentAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Traitement
// ─────────────────────────────────────────────────────────────────────────────

export async function handleInboundPostmark(
  request: Request,
  log: Logger,
): Promise<InboundResult> {
  const startedAt = Date.now();

  // 1. Authentification Basic. Échec → 401, JAMAIS 403 : Postmark rejoue une
  //    réponse non-200 dix fois sur environ 10,5 heures, mais un 403 arrête les
  //    rejeux immédiatement et le message est perdu définitivement.
  const authorized = isAuthorized(request);

  // 2. Lecture du JSON. Illisible → 401 si l'authentification a échoué, sinon
  //    400. C'est le seul 400 de cette route.
  let payload: PostmarkInboundPayload;
  try {
    payload = (await request.json()) as PostmarkInboundPayload;
  } catch (error) {
    if (!authorized) {
      log.warn('inbound.unauthorized', { reason: 'auth_failed_and_bad_json' });
      return { status: 401, outcome: 'unauthorized', body: { error: 'unauthorized' } };
    }
    log.exception('inbound.bad_json', error);
    return { status: 400, outcome: 'bad_request', body: { error: 'invalid_json' } };
  }

  if (!authorized) {
    log.warn('inbound.unauthorized', { reason: 'basic_auth_mismatch' });
    return { status: 401, outcome: 'unauthorized', body: { error: 'unauthorized' } };
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    log.warn('inbound.bad_payload', { reason: 'not_an_object' });
    return { status: 400, outcome: 'bad_request', body: { error: 'invalid_payload' } };
  }

  // 3. Résolution du projet.
  const candidates = candidateLocalParts(payload);
  const project = candidates.length > 0 ? await findProject(candidates) : null;

  if (!project) {
    const count = incrementOrphanCount();
    log.warn('inbound.orphan', {
      original_recipient: payload.OriginalRecipient ?? null,
      to: payload.To ?? null,
      candidates,
      orphan_count: count,
      duration_ms: Date.now() - startedAt,
    });
    // 200 sans rien stocker. Ne jamais créer de projet implicitement.
    return { status: 200, outcome: 'orphan', body: { ok: true, stored: false } };
  }

  const projectLog = log.child({ project_id: project.id });

  // 4. Idempotence — après résolution du projet, et pas avant.
  const messageIdHeader = messageIdHeaderOf(payload);
  const existing = await sql<{ id: string }[]>`
    select id
      from public.messages
     where project_id = ${project.id}
       and message_id_header = ${messageIdHeader}
     limit 1
  `;

  if (existing.length > 0) {
    projectLog.info('inbound.duplicate', {
      message_id_header: messageIdHeader,
      message_id: existing[0].id,
      duration_ms: Date.now() - startedAt,
    });
    return { status: 200, outcome: 'duplicate', body: { ok: true, duplicate: true } };
  }

  // 5. Archive de la couche 0 : la charge utile JSON complète, telle que reçue.
  const rawPath = `${project.id}/${randomUUID()}.json`;
  const rawKey = `${RAW_BUCKET}/${rawPath}`;

  const upload = await storage.from(RAW_BUCKET).upload(rawPath, JSON.stringify(payload), {
    contentType: 'application/json',
    upsert: false,
  });

  if (upload.error) {
    // Le brut n'est pas archivé : on ne peut rien garantir. Un non-200 fait
    // rejouer Postmark, ce qui est exactement le comportement voulu ici.
    projectLog.exception('inbound.raw_upload_failed', upload.error, { raw_key: rawKey });
    throw upload.error;
  }

  // 6. Validation de structure et analyse de la date.
  const validation = validatePayload(payload);
  const sentAt = validation.ok ? validation.sentAt : null;
  const ingestError = validation.ok ? null : validation.error;
  const ingestStatus = validation.ok ? 'pending' : 'failed';

  // 7 et 8. Insertion du message, puis du job. `body_clean` reste vide : le
  //         nettoyage est le lot 3a.
  const inserted = await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`
      insert into public.messages (
        project_id, message_id_header, from_address, "to", cc,
        sent_at, subject, raw_key, channel_kind, ingest_status, ingest_error
      ) values (
        ${project.id},
        ${messageIdHeader},
        ${payload.FromFull?.Email?.trim().toLowerCase() ?? payload.From?.trim().toLowerCase() ?? null},
        ${addressesOf(payload.ToFull)},
        ${addressesOf(payload.CcFull)},
        ${sentAt},
        ${payload.Subject ?? null},
        ${rawKey},
        'email',
        ${ingestStatus},
        ${ingestError}
      )
      on conflict (project_id, message_id_header) do nothing
      returning id
    `;

    if (rows.length === 0) return null;

    // Aucun job pour un message en échec : il ne deviendra jamais valide.
    if (validation.ok) {
      await tx`
        insert into public.jobs (project_id, kind, payload, status)
        values (${project.id}, 'ingest', ${sql.json({ message_id: rows[0].id })}, 'pending')
      `;
    }

    return rows[0].id;
  });

  const durationMs = Date.now() - startedAt;

  if (inserted === null) {
    // Course entre deux rejeux Postmark simultanés : l'index unique a tranché.
    projectLog.info('inbound.duplicate', {
      message_id_header: messageIdHeader,
      reason: 'insert_conflict',
      duration_ms: durationMs,
    });
    return { status: 200, outcome: 'duplicate', body: { ok: true, duplicate: true } };
  }

  if (!validation.ok) {
    // Aucun échec silencieux : la ligne existe, l'erreur est conservée, le brut
    // est archivé, le message reste rejouable. Un 400 déclencherait dix rejeux
    // d'un message qui ne deviendra jamais valide.
    projectLog.error('inbound.stored_failed', {
      message_id: inserted,
      message_id_header: messageIdHeader,
      raw_key: rawKey,
      ingest_error: ingestError,
      duration_ms: durationMs,
    });
    return { status: 200, outcome: 'stored_failed', body: { ok: true, stored: true, failed: true } };
  }

  projectLog.info('inbound.stored', {
    message_id: inserted,
    message_id_header: messageIdHeader,
    raw_key: rawKey,
    duration_ms: durationMs,
  });

  return { status: 200, outcome: 'stored', body: { ok: true, stored: true } };
}

/**
 * Aucun filtre sur `projects.status` : un projet archivé continue de recevoir.
 * Rejeter le courrier d'un projet archivé serait une perte de donnée silencieuse,
 * et archiver ne libère qu'une place d'abonnement.
 */
async function findProject(localParts: string[]): Promise<{ id: string } | null> {
  const rows = await sql<{ id: string }[]>`
    select id
      from public.projects
     where lower(inbound_local_part) = any(${localParts})
     limit 1
  `;
  return rows[0] ?? null;
}
