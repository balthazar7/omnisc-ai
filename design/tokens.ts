/**
 * Source unique des valeurs du système de design.
 *
 * `app/globals.css` et, au lot 7, les constantes hexadécimales du digest e-mail
 * sont DÉRIVÉS de ce fichier — jamais saisis séparément. Une seule source évite
 * que le web et l'e-mail divergent.
 *
 * Toute valeur transcrite ici vient de `DESIGN.md`. Si une valeur manque, on
 * l'ajoute d'abord à `DESIGN.md`, puis ici, puis on l'utilise. Jamais l'inverse.
 */

/** Thème. Mode clair uniquement en V1 : la structure prévoit le mode sombre, on ne l'implémente pas. */
export type ThemeName = "beige";

export const DEFAULT_THEME: ThemeName = "beige";

/** DESIGN.md §1.2 — jetons de couleur. */
export const themes: Record<ThemeName, Record<string, string>> = {
  beige: {
    // surfaces
    bg: "#f0eee7",
    glass: "#faf9f5",
    glass2: "#f5f3ed",
    glass3: "#fffefb",

    // traits
    stroke: "#e4e0d5",
    hair: "rgba(38,32,22,.08)",
    hair2: "rgba(38,32,22,.15)",

    // texte
    text: "#1c1a15",
    text2: "#5f5a4f",
    text3: "#918c7f",

    // accent (terracotta)
    accent: "#9a5b33",
    "accent-soft": "rgba(154,91,51,.09)",
    "accent-line": "rgba(154,91,51,.26)",

    // alerte / retard / silence
    alert: "#b0503f",
    "alert-soft": "rgba(176,80,63,.08)",
    "alert-line": "rgba(176,80,63,.26)",

    // validé / connecté
    ok: "#4d7a52",
    "ok-soft": "rgba(77,122,82,.1)",

    // seule couleur posée sur un fond --accent ou --alert (DESIGN.md §10)
    "on-accent": "#ffffff",
  },
};

/** DESIGN.md §5 — élévation. Les composites `elev-*` évitent de recomposer l'ombre au point d'usage. */
export const elevation = {
  shade: "0 1px 2px rgba(38,32,22,.05), 0 10px 26px -20px rgba(38,32,22,.2)",
  "shade-lg": "0 1px 2px rgba(38,32,22,.06), 0 24px 56px -34px rgba(38,32,22,.28)",
  inset: "inset 0 1px 0 rgba(255,255,255,.7)",
  /** DESIGN.md §6.2 / §6.3 — pilule active, élément de navigation actif. */
  "shade-pill": "0 1px 2px rgba(22,21,32,.10)",
} as const;

/** Ombres portées du bouton primaire. DESIGN.md §6.1. */
export const accentShadow = {
  lg: "0 14px 34px -14px var(--accent)",
  md: "0 12px 28px -14px var(--accent)",
  block: "0 12px 30px -14px var(--accent)",
} as const;

/** DESIGN.md §5 — matière. Saturation 170-180 %, flou de 24px (petits éléments) à 40px (hero). */
export const backdrop = {
  control: "blur(24px) saturate(175%)",
  card: "blur(30px) saturate(175%)",
  hero: "blur(36px) saturate(180%)",
} as const;

/**
 * DESIGN.md §4 — rayons. Le rayon décroît avec l'imbrication : 30 → 24 → 16.
 * Valeurs retenues à l'intérieur des fourchettes de DESIGN.md, reportées dans son tableau.
 */
export const radius = {
  pill: "999px",
  hero: "32px",
  card: "26px",
  panel: "22px",
  sub: "20px",
  bubble: "18px",
  row: "16px",
  /** Coin « queue » d'une bulle de conversation. DESIGN.md §6.10. */
  "bubble-tail": "6px",
  field: "14px",
  nav: "13px",
  chip: "10px",
  mark: "5px",
  avatar: "50%",
} as const;

/**
 * DESIGN.md §3 — espacement. L'échelle est resserrée et impaire par endroits ;
 * `--space-unit` vaut 1px pour que `p-18` désigne exactement 18px, et l'échelle
 * autorisée reste celle de DESIGN.md §3.
 */
export const spaceUnit = "1px";

/**
 * Les seules valeurs d'espacement autorisées. DESIGN.md §3.
 *
 * Avec `--space-unit` à 1px, chaque entrée se lit directement comme une classe
 * Tailwind : `p-18` vaut 18px. Une valeur absente de cette liste n'a pas le
 * droit d'apparaître dans un composant — on l'ajoute d'abord à DESIGN.md §3.
 */
export const spaceScale = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26,
  28, 30, 32, 44, 60, 64, 70, 78, 80, 90,
] as const;

/** DESIGN.md §2 — échelle typographique. Chaque entrée porte sa taille, sa graisse, son interlettrage et son interlignage. */
export const typography = {
  landing: { size: "62px", weight: "700", tracking: "-.04em", leading: "1.03" },
  section: { size: "34px", weight: "700", tracking: "-.03em", leading: "1.1" },
  "card-major": { size: "29px", weight: "700", tracking: "-.032em", leading: "1.18" },
  screen: { size: "26px", weight: "700", tracking: "-.03em", leading: "1.2" },
  panel: { size: "24px", weight: "700", tracking: "-.025em", leading: "1.25" },
  kpi: { size: "28px", weight: "700", tracking: "-.035em", leading: "1" },
  "kpi-hero": { size: "66px", weight: "800", tracking: "-.05em", leading: ".9" },
  subtitle: { size: "19px", weight: "700", tracking: "-.02em", leading: "1.3" },
  lead: { size: "17px", weight: "400", tracking: "0", leading: "1.6" },
  "body-lg": { size: "15.5px", weight: "500", tracking: "0", leading: "1.55" },
  "row-label": { size: "14.5px", weight: "500", tracking: "-.01em", leading: "1.4" },
  bubble: { size: "14px", weight: "400", tracking: "0", leading: "1.7" },
  body: { size: "13.5px", weight: "400", tracking: "0", leading: "1.65" },
  dense: { size: "13px", weight: "400", tracking: "0", leading: "1.45" },
  meta: { size: "12.5px", weight: "400", tracking: "0", leading: "1.5" },
  field: { size: "12px", weight: "600", tracking: "0", leading: "1.4" },
  caption: { size: "11.5px", weight: "400", tracking: "0", leading: "1.55" },
  micro: { size: "11px", weight: "400", tracking: "0", leading: "1.3" },
  tiny: { size: "10.5px", weight: "700", tracking: "0", leading: "1" },
} as const;

export type TypographyKey = keyof typeof typography;

/** DESIGN.md §7 — mouvement. Deux courbes seulement. */
export const motion = {
  "curve-enter": "cubic-bezier(.16,1,.3,1)",
  "curve-interact": "cubic-bezier(.32,.72,0,1)",
} as const;

/**
 * DESIGN.md §7 — survols autorisés.
 *
 * Les translations de survol passent par l'échelle d'espacement (`-translate-y-2`,
 * `-translate-y-3`…) ; seul le facteur d'échelle a besoin d'un jeton, Tailwind
 * n'ayant pas de pas à 1,02.
 */
export const hoverScale = {
  button: "1.02",
} as const;

/** DESIGN.md §7 — animations nommées. */
export const animation = {
  rise: "rise .75s var(--curve-enter) both",
  "rise-page": "rise .9s var(--curve-enter) both",
  fade: "fade .5s ease both",
  grow: "grow 1.1s var(--curve-enter) both",
  dash: "dash 1.4s var(--curve-enter) both",
  halo: "halo 2.6s ease-in-out infinite",
  sweep: "sweep 4.5s cubic-bezier(.4,0,.2,1) infinite",
} as const;

/** DESIGN.md §8 — layout. */
export const layout = {
  "w-app": "1560px",
  "w-landing": "1200px",
  "w-onboarding": "1060px",
  "w-bubble": "660px",
  "col-nav": "224px",
  "col-nav-collapsed": "54px",
  "col-aside": "300px",
  "col-aside-collapsed": "46px",
  "sticky-top": "88px",
  "h-chat": "74vh",
} as const;
