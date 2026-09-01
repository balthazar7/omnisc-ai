import * as React from "react"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/i18n/format"
import type { Lang } from "@/lib/i18n"

/**
 * DESIGN.md §6.3 — élément de navigation latérale.
 *
 * Le compteur à droite est la seule donnée chiffrée de la barre : il porte
 * `tabular-nums` par héritage du `body`, les colonnes restent donc alignées
 * quand les valeurs changent.
 */
function NavItem({
  label,
  count,
  active = false,
  tone = "neutral",
  lang = "fr",
  className,
  ...props
}: Omit<React.ComponentProps<"a">, "children"> & {
  label: string
  /** Omis, aucun compteur n'est rendu — ce n'est pas un zéro. */
  count?: number
  active?: boolean
  /** `alert` pour un compteur qui signale un manque : silence, retard, quarantaine. */
  tone?: "neutral" | "alert"
  lang?: Lang
}) {
  return (
    <a
      data-slot="nav-item"
      data-active={active || undefined}
      className={cn(
        "flex items-center justify-between gap-11 rounded-nav px-11 py-9 text-dense",
        "transition-colors duration-300",
        active
          ? "bg-glass-3 font-semibold text-ink shadow-pill"
          : "font-normal text-ink-2 hover:bg-glass-2",
        className
      )}
      {...props}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn("text-micro", tone === "alert" ? "text-alert" : "text-ink-3")}>
          {formatNumber(count, lang)}
        </span>
      )}
    </a>
  )
}

export { NavItem }
