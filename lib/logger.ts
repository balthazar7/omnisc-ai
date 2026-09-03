import { randomUUID } from 'node:crypto';

/**
 * Journalisation structurée JSON, avec `request_id` propagé de bout en bout.
 *
 * Invariant (CLAUDE.md, section B) : ne jamais journaliser l'en-tête
 * `Authorization`. La redaction ci-dessous est un filet de sécurité — la règle
 * reste de ne pas passer de secret au journal.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

/** Clés dont la valeur n'est jamais écrite au journal, quelle que soit sa forme. */
const REDACTED_KEY = /(authorization|password|secret|token|service_role|api[-_]?key|cookie)/i;

const REDACTED = '[redacted]';

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_KEY.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return out;
}

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { error_name: error.name, error_message: error.message, error_stack: error.stack };
  }
  return { error_message: String(error) };
}

export type Logger = {
  readonly requestId: string;
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** Journalise une exception sous forme structurée. */
  exception(event: string, error: unknown, fields?: LogFields): void;
  /** Dérive un logger portant le même `request_id` et des champs additionnels. */
  child(fields: LogFields): Logger;
};

function emit(level: LogLevel, requestId: string, base: LogFields, event: string, fields?: LogFields) {
  const line = {
    ts: new Date().toISOString(),
    level,
    request_id: requestId,
    event,
    ...(redact({ ...base, ...fields }) as LogFields),
  };

  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export function createLogger(requestId: string, base: LogFields = {}): Logger {
  return {
    requestId,
    debug: (event, fields) => emit('debug', requestId, base, event, fields),
    info: (event, fields) => emit('info', requestId, base, event, fields),
    warn: (event, fields) => emit('warn', requestId, base, event, fields),
    error: (event, fields) => emit('error', requestId, base, event, fields),
    exception: (event, error, fields) =>
      emit('error', requestId, base, event, { ...fields, ...serializeError(error) }),
    child: (fields) => createLogger(requestId, { ...base, ...fields }),
  };
}

/**
 * Crée un logger pour une requête entrante.
 *
 * `request_id` est repris de l'amont s'il existe (`x-request-id`), à défaut de
 * l'identifiant d'invocation Vercel (`x-vercel-id`), sinon généré. Il est
 * renvoyé dans la réponse via `x-request-id` pour permettre le rapprochement.
 */
export function loggerForRequest(request: Request, base: LogFields = {}): Logger {
  return createLogger(requestIdFromHeaders(request.headers), base);
}

/** Le porteur minimal d'en-têtes dont ce module a besoin. */
type HeaderReader = { get(name: string): string | null };

/**
 * `request_id` d'une requête, lu dans ses en-têtes.
 *
 * Extrait de `loggerForRequest` pour servir aussi aux composants serveur et aux
 * server actions, qui n'ont pas d'objet `Request` mais ont `headers()`. Sans
 * cela, chacun fabriquait son propre UUID et ses lignes ne se rapprochaient de
 * rien — c'est exactement le défaut relevé en production sur `lib/orgs.ts`.
 */
export function requestIdFromHeaders(headerList: HeaderReader): string {
  return headerList.get('x-request-id') ?? headerList.get('x-vercel-id') ?? randomUUID();
}

/**
 * Logger d'un composant serveur ou d'une server action.
 *
 * `loggerForHeaders(await headers(), …)` est la seule façon correcte d'obtenir
 * un logger hors d'un handler de route. **Ne jamais écrire
 * `createLogger(crypto.randomUUID())` dans du code de requête** : la ligne
 * produite est alors incorrélable, et la journalisation structurée n'existe que
 * pour ce rapprochement.
 */
export function loggerForHeaders(headerList: HeaderReader, base: LogFields = {}): Logger {
  return createLogger(requestIdFromHeaders(headerList), base);
}
