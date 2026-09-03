import { headers } from 'next/headers';

import { env } from '@/lib/env';

/**
 * Origine de la requête courante, et chemins de retour.
 *
 * Calculée à partir des en-têtes plutôt que d'une variable d'environnement :
 * chaque déploiement de prévisualisation a sa propre URL, et un lien qui
 * renverrait toujours vers la production fonctionnerait en production et
 * échouerait en préversion — le pire ordre pour s'en apercevoir.
 *
 * LE PROTOCOLE N'EST PAS LU DANS LES EN-TÊTES SUR VERCEL. On a observé un
 * `redirect_to` en `http://` sur la préversion. Vercel n'accepte pas le trafic
 * en clair : la connexion est coupée avant toute réponse, et le navigateur
 * affiche `ERR_CONNECTION_RESET` — indiscernable d'un blocage réseau local.
 * `x-forwarded-proto` n'est donc consulté qu'en dehors d'un déploiement.
 *
 * Hors Vercel, le défaut est `http` : c'est le développement local, où `https`
 * produirait un lien injoignable sur `localhost`.
 */
export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
  const deployed = env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'production';
  const proto = deployed ? 'https' : (headerList.get('x-forwarded-proto') ?? 'http');
  return `${proto}://${host}`;
}

/**
 * Chemin de retour interne, assaini.
 *
 * Un `next` arrivant de l'URL est une donnée d'attaquant : sans ce filtre, un
 * lien `?next=https://ailleurs` transformerait notre écran de connexion en
 * tremplin de redirection ouverte, avec notre domaine en caution. Seuls les
 * chemins absolus internes passent, et `//` est rejeté — le navigateur le lit
 * comme une URL protocol-relative vers un autre hôte.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}
