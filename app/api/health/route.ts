import { checkEnv, COMMIT_SHA, env } from '@/lib/env';
import { loggerForRequest } from '@/lib/logger';
import { pingDatabase } from '@/lib/supabase/server';

/**
 * Sonde de santé : SHA du commit déployé, validation du schéma d'environnement,
 * `select 1` sur la base.
 *
 * Ne renvoie aucune valeur de variable d'environnement — seulement l'état de la
 * validation et, en cas d'échec, le nom des variables fautives.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const log = loggerForRequest(request, { route: 'health' });

  const envCheck = checkEnv();
  const db = await pingDatabase();
  const ok = envCheck.ok && db.ok;

  const body = {
    status: ok ? 'ok' : 'degraded',
    commit_sha: COMMIT_SHA,
    vercel_env: env.VERCEL_ENV ?? null,
    env: envCheck.ok ? { ok: true } : { ok: false, issues: envCheck.issues },
    database: db.ok ? { ok: true } : { ok: false, error: db.error },
    checked_at: new Date().toISOString(),
  };

  if (!ok) log.error('health.degraded', { body });

  return Response.json(body, {
    status: ok ? 200 : 503,
    headers: { 'cache-control': 'no-store', 'x-request-id': log.requestId },
  });
}
