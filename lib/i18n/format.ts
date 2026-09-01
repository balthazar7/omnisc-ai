/**
 * Dates et nombres via `Intl`, jamais formatés à la main.
 *
 * La langue est un paramètre, même si elle vaut toujours `fr` en V1 : c'est une
 * propriété du projet (`projects.language`), pas de l'utilisateur.
 *
 * Conventions d'écriture : DESIGN.md §9.
 */
import type { Lang } from "./index";

const locales: Record<Lang, string> = { fr: "fr-FR" };

/** Date courte, `JJ/MM`. Le format d'affichage par défaut du produit. */
export function formatDayMonth(date: Date, lang: Lang = "fr"): string {
  return new Intl.DateTimeFormat(locales[lang], {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

/** Date complète, pour les écrans qui ont besoin de l'année. */
export function formatDate(date: Date, lang: Lang = "fr"): string {
  return new Intl.DateTimeFormat(locales[lang], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Nombre. `tabular-nums` est posé sur `body`, l'alignement est donc acquis. */
export function formatNumber(value: number, lang: Lang = "fr"): string {
  return new Intl.NumberFormat(locales[lang]).format(value);
}

/** Montant hors taxes, `79 € HT`. */
export function formatAmount(value: number, lang: Lang = "fr"): string {
  return new Intl.NumberFormat(locales[lang], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Durée de silence ou de retard, en jours : `9 j`. DESIGN.md §9. */
export function formatDays(days: number, lang: Lang = "fr"): string {
  return `${formatNumber(days, lang)} j`;
}
