import { randomInt } from 'node:crypto';

/**
 * Jeton d'invitation.
 *
 * ALPHABET STRICTEMENT ALPHANUMÉRIQUE, ET MINUSCULE. C'est la règle du projet
 * pour toute valeur destinée à figurer dans une URL ou un fichier `.env`
 * (CLAUDE.md, section B) : elle a déjà coûté cinq déploiements en échec au lot
 * 0a, où un `#` dans un mot de passe tronquait la valeur en silence côté local
 * et passait côté Vercel. Ici le jeton voyage dans un chemin d'URL, recopié à
 * la main depuis un écran puis collé dans une messagerie : ni encodage en
 * pourcentage, ni casse à préserver, ni caractère qu'un client de messagerie
 * pourrait avaler en fin de lien.
 *
 * `randomInt` et jamais `Math.random` : le jeton est le seul secret qui protège
 * l'entrée dans une organisation. 32 caractères sur un alphabet de 36 valent
 * environ 165 bits.
 *
 * `randomInt(max)` rejette lui-même les tirages qui biaiseraient la
 * distribution — c'est la raison de ne pas écrire un modulo sur `randomBytes`.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const INVITATION_TOKEN_LENGTH = 32;

/** Durée de validité d'une invitation, en jours. */
export const INVITATION_TTL_DAYS = 14;

export function generateInvitationToken(): string {
  let token = '';
  for (let i = 0; i < INVITATION_TOKEN_LENGTH; i++) {
    token += ALPHABET[randomInt(ALPHABET.length)];
  }
  return token;
}

/** Date d'expiration d'une invitation créée maintenant. */
export function invitationExpiry(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + INVITATION_TTL_DAYS);
  return expires;
}

/**
 * Adresse normalisée : détourée et en minuscules.
 *
 * Une seule écriture, partagée par l'insertion, l'index unique partiel
 * `(org_id, lower(email))` et la comparaison faite à l'acceptation. Trois
 * normalisations écrites séparément finiraient par diverger, et le symptôme
 * serait une invitation impossible à accepter par son destinataire.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validation permissive, identique à celle du formulaire de connexion. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
