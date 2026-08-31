import { handleInboundPostmark } from '@/lib/inbound/store-raw';
import { loggerForRequest } from '@/lib/logger';

/**
 * Webhook entrant Postmark.
 *
 * La route n'est qu'une enveloppe : toute la logique vit dans
 * `lib/inbound/store-raw.ts` (logique métier transport-agnostique).
 *
 * `nodejs` et non Edge : les pièces jointes arrivent en base64 et le traitement
 * demande `Buffer`. `force-dynamic` : sans cela Next.js tente de prérendre la
 * route au build, et le build casse en CI alors qu'il passait en local.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const log = loggerForRequest(request, { route: 'inbound.postmark' });

  try {
    const result = await handleInboundPostmark(request, log);

    return Response.json(result.body, {
      status: result.status,
      headers: {
        'x-request-id': log.requestId,
        // 401 et jamais 403 : un 403 arrête les rejeux Postmark et le message
        // est perdu définitivement.
        ...(result.status === 401
          ? { 'www-authenticate': 'Basic realm="omnisc-inbound"' }
          : {}),
      },
    });
  } catch (error) {
    // Un 500 est rejoué par Postmark : c'est le comportement voulu quand c'est
    // notre infrastructure qui a lâché.
    log.exception('inbound.unhandled', error);
    return Response.json(
      { error: 'internal_error' },
      { status: 500, headers: { 'x-request-id': log.requestId } },
    );
  }
}
