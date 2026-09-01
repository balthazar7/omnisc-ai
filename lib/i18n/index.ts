/**
 * Point d'entrée du dictionnaire.
 *
 * La V1 est en français et n'a qu'une langue au catalogue. La couture posée ici
 * est volontairement minimale : un type `Lang`, une table de dictionnaires, une
 * fonction qui prend la langue en paramètre. Aucune bibliothèque d'i18n, aucun
 * sélecteur de langue.
 *
 * La langue du contenu généré est une propriété du projet (`projects.language`,
 * par défaut `fr`), pas de l'utilisateur : les faits sont stockés sous forme de
 * phrases et partagés par l'équipe.
 */
import { fr, type Dictionary } from "./fr";

export type Lang = "fr";

export const DEFAULT_LANG: Lang = "fr";

const dictionaries: Record<Lang, Dictionary> = { fr };

export function getDictionary(lang: Lang = DEFAULT_LANG): Dictionary {
  return dictionaries[lang];
}

export type { Dictionary };
