import { env } from '@/lib/env';
import { hasPendingInvitation } from '@/lib/members/queries';

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

/**
 * Vrai si l'adresse peut demander un lien magique.
 *
 * UNE INVITATION EN ATTENTE PASSE LA LISTE. Le lot 1b ouvre l'inscription à des
 * adresses qu'on ne connaît pas d'avance : celles qu'un propriétaire invite
 * dans son organisation. Sans cette porte, une invitation vers une adresse
 * extérieure échouerait SANS MESSAGE — la réponse de l'écran de connexion est
 * volontairement la même dans tous les cas, y compris le refus — et elle
 * échouerait à l'endroit précis où l'utilisateur ne peut rien comprendre ni
 * rien faire.
 *
 * `SIGNUP_ALLOWLIST` n'est renseignée dans aucun environnement aujourd'hui, donc
 * ce chemin ne change rien pour l'instant : il existe pour le jour où elle le
 * sera. La lecture en base n'a lieu que dans ce cas — liste vide, on sort avant.
 *
 * Le contrôle reste en UN SEUL POINT : cette fonction. Ne pas en ajouter un
 * second dans l'écran d'invitation ou dans la route de rappel.
 */
export async function isSignupAllowed(email: string): Promise<boolean> {
  const allowlist = parseAllowlist(env.SIGNUP_ALLOWLIST);
  if (allowlist.length === 0) return true;
  if (allowlist.includes(email.trim().toLowerCase())) return true;
  return hasPendingInvitation(email);
}
