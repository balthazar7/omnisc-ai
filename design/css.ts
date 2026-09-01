import {
  DEFAULT_THEME,
  accentShadow,
  animation,
  backdrop,
  elevation,
  hoverScale,
  layout,
  motion,
  radius,
  spaceUnit,
  themes,
  typography,
  type ThemeName,
} from "./tokens";

/**
 * Dérive le bloc `:root` depuis `design/tokens.ts`.
 *
 * Les valeurs ne sont écrites nulle part ailleurs : `app/globals.css` ne fait que
 * mapper ces noms de variables sur les espaces de noms Tailwind (`@theme inline`),
 * sans jamais reprendre une valeur. Modifier `tokens.ts` suffit donc à changer le
 * rendu, sans toucher un autre fichier à la main.
 */
export function themeCss(theme: ThemeName = DEFAULT_THEME): string {
  const lines: string[] = [];
  const push = (name: string, value: string) => lines.push(`--${name}:${value}`);

  // couleurs — DESIGN.md §1.2
  for (const [name, value] of Object.entries(themes[theme])) push(name, value);

  // élévation — DESIGN.md §5
  for (const [name, value] of Object.entries(elevation)) push(name, value);
  push("elev-card", "var(--shade), var(--inset)");
  push("elev-hero", "var(--shade-lg), var(--inset)");
  for (const [size, value] of Object.entries(accentShadow)) push(`shade-accent-${size}`, value);

  // matière — DESIGN.md §5
  for (const [name, value] of Object.entries(backdrop)) push(`filter-${name}`, value);

  // rayons — DESIGN.md §4
  for (const [name, value] of Object.entries(radius)) push(`r-${name}`, value);

  // espacement — DESIGN.md §3
  push("space-unit", spaceUnit);

  // typographie — DESIGN.md §2
  for (const [name, t] of Object.entries(typography)) {
    push(`fs-${name}`, t.size);
    push(`fw-${name}`, t.weight);
    push(`ls-${name}`, t.tracking);
    push(`lh-${name}`, t.leading);
  }

  // mouvement — DESIGN.md §7
  for (const [name, value] of Object.entries(motion)) push(name, value);
  for (const [name, value] of Object.entries(animation)) push(`anim-${name}`, value);
  for (const [name, value] of Object.entries(hoverScale)) push(`hover-scale-${name}`, value);

  // layout — DESIGN.md §8
  for (const [name, value] of Object.entries(layout)) push(name, value);

  return `:root{${lines.join(";")}}`;
}
