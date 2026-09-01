import { env } from '@/lib/env';

/**
 * Porte d'inscription pendant la phase de test.
 *
 * `SIGNUP_ALLOWLIST` vide — la valeur par défaut — signifie inscription
 * ouverte. Renseignée, seules les adresses qui y figurent obtiennent un lien
 * magique.
 *
 * Ce contrôle est un garde-fou d'exploitation, pas un mécanisme de sécurité :
 * il évite qu'un inconnu déclenche des envois depuis notre domaine pendant la
 * phase de test. La limitation de débit reste celle de Supabase Auth ; on n'en
 * construit pas une seconde, qui ferait un deuxième endroit à maintenir.
 */
function parseAllowlist(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/** Vrai si l'adresse peut demander un lien magique. */
export function isSignupAllowed(email: string): boolean {
  const allowlist = parseAllowlist(env.SIGNUP_ALLOWLIST);
  if (allowlist.length === 0) return true;
  return allowlist.includes(email.trim().toLowerCase());
}
