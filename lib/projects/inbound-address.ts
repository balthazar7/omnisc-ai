/**
 * Génération de l'adresse de réception d'un projet.
 *
 *     Levée de fonds Startup  →  levee-de-fonds-startup-k9m2
 *     PV                      →  pv-xyz-k9m2
 *
 * Forme : `<préfixe lisible>-<suffixe aléatoire de 4 caractères>`.
 *
 * POURQUOI UN SUFFIXE, ET PAS LE SEUL PRÉFIXE (CLAUDE.md, section A) :
 *
 *   · l'unicité de `inbound_local_part` est GLOBALE à toute la base, pas par
 *     organisation : deux clients qui nomment tous deux leur projet
 *     « Rénovation » entreraient en collision ;
 *   · une adresse entièrement dérivable du nom est énumérable — on devine les
 *     projets d'un concurrent en essayant des noms ;
 *   · une adresse mal recopiée part vers une adresse orpheline, que le lot 0a
 *     journalise et abandonne sans rebond. C'est une perte silencieuse de
 *     correspondance, le pire mode de défaillance du produit.
 *
 * LE SUFFIXE FAIT TOUJOURS 4 CARACTÈRES. C'est le PRÉFIXE qu'on complète quand
 * il est trop court, jamais le suffixe qu'on allonge : une longueur variable
 * rendrait le format imprévisible et déplacerait la frontière préfixe/suffixe
 * selon le nom. Les 4 derniers caractères sont le suffixe, dans tous les cas.
 */

/**
 * Alphabet du suffixe et du complément de préfixe.
 *
 * Ni `0` ni `o`, ni `1` ni `l` ni `i` : l'adresse sera dictée au téléphone et
 * recopiée à la main. Une confusion coûte un message perdu en silence.
 */
const UNAMBIGUOUS = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Longueur du suffixe aléatoire. Invariable. */
const SUFFIX_LENGTH = 4;

/**
 * Longueur minimale de la partie lisible, complément compris.
 *
 * La raison est en base : `projects.inbound_local_part` porte
 * `check (char_length(inbound_local_part) >= 10)`, qui vient de l'exigence de
 * forte entropie de la section A. Avec 5 caractères lisibles au minimum, un
 * tiret et 4 caractères de suffixe, le plus court résultat possible fait
 * exactement 10 caractères — la borne est atteinte, jamais franchie.
 */
const MIN_PREFIX_LENGTH = 5;

/** Longueur maximale de la partie lisible, avant complément. */
const MAX_PREFIX_LENGTH = 32;

/** Préfixe de repli quand le nom ne produit aucun caractère latin. */
const FALLBACK_PREFIX = 'projet';

/**
 * Préfixes réservés au courrier de service.
 *
 * Sans cette liste, un projet nommé « Abuse » capterait le courrier
 * d'abus du domaine. Le suffixe aléatoire rend la collision improbable, mais
 * « improbable » ne suffit pas pour une adresse de service.
 */
const RESERVED_PREFIXES = new Set([
  'postmaster',
  'abuse',
  'noreply',
  'no-reply',
  'digest',
  'admin',
]);

/** Nombre de tentatives avant d'abandonner la génération. */
export const MAX_GENERATION_ATTEMPTS = 5;

/**
 * Translittère en ASCII puis normalise.
 *
 * `normalize('NFD')` sépare la lettre de son diacritique, la plage Unicode
 * `̀-ͯ` retire les diacritiques : « Levée » → « levee »,
 * « Chantier Saint-Étienne » → « chantier-saint-etienne ».
 */
export function slugifyProjectName(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const hyphenated = ascii
    // Tout ce qui n'est pas [a-z0-9] devient un tiret.
    .replace(/[^a-z0-9]+/g, '-')
    // Tirets consécutifs fusionnés.
    .replace(/-+/g, '-')
    // Tirets de bord retirés.
    .replace(/^-|-$/g, '');

  if (hyphenated.length === 0) return FALLBACK_PREFIX;

  // Tronquer sans couper au milieu d'un tiret : on coupe puis on retire le
  // tiret de bord que la coupe a pu laisser.
  const truncated = hyphenated.slice(0, MAX_PREFIX_LENGTH).replace(/-$/, '');

  if (truncated.length === 0) return FALLBACK_PREFIX;
  if (RESERVED_PREFIXES.has(truncated)) return `${FALLBACK_PREFIX}-${truncated}`;

  return truncated;
}

/** Tire `length` caractères de l'alphabet non ambigu. */
function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let token = '';
  for (const byte of bytes) token += UNAMBIGUOUS[byte % UNAMBIGUOUS.length];
  return token;
}

/**
 * Complète le préfixe jusqu'à `MIN_PREFIX_LENGTH` caractères lisibles.
 * « pv » → « pv-xyz ». Un préfixe déjà assez long est rendu tel quel.
 */
export function padPrefix(prefix: string): string {
  const readable = prefix.replace(/-/g, '').length;
  if (readable >= MIN_PREFIX_LENGTH) return prefix;

  return `${prefix}-${randomToken(MIN_PREFIX_LENGTH - readable)}`;
}

/**
 * Construit une partie locale candidate à partir du nom du projet.
 * Chaque appel tire un suffixe différent : c'est ce qui permet de réessayer
 * après une violation de l'index unique.
 */
export function buildInboundLocalPart(projectName: string): string {
  const prefix = padPrefix(slugifyProjectName(projectName));
  return `${prefix}-${randomToken(SUFFIX_LENGTH)}`;
}

/** Caractère marquant, dans l'aperçu, une position tirée au hasard à la création. */
const PLACEHOLDER = '·';

/**
 * Aperçu de l'adresse, affiché pendant la saisie du nom.
 *
 * Les positions aléatoires sont montrées comme telles, jamais tirées : un
 * aperçu qui afficherait un vrai suffixe laisserait croire qu'on peut le
 * choisir — et une adresse choisie redeviendrait énumérable.
 */
export function previewInboundLocalPart(projectName: string): string {
  const prefix = slugifyProjectName(projectName);
  const readable = prefix.replace(/-/g, '').length;
  const padding =
    readable >= MIN_PREFIX_LENGTH
      ? ''
      : `-${PLACEHOLDER.repeat(MIN_PREFIX_LENGTH - readable)}`;

  return `${prefix}${padding}-${PLACEHOLDER.repeat(SUFFIX_LENGTH)}`;
}

/**
 * Adresse complète, construite À L'AFFICHAGE seulement.
 *
 * La base ne stocke jamais le domaine : il vient de `INBOUND_DOMAIN` et doit
 * rester modifiable sans migration, le nom du produit n'étant pas arrêté.
 */
export function formatInboundAddress(localPart: string, inboundDomain: string): string {
  return `${localPart}@${inboundDomain}`;
}
