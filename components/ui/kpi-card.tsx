import * as React from "react"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/i18n/format"
import type { Lang } from "@/lib/i18n"

/**
 * DESIGN.md §6.8 — carte KPI.
 *
 * La couleur du chiffre porte le sens, pas la décoration : `ok` pour ce qui est
 * tenu, `alert` pour ce qui manque ou traîne, `accent` pour une valeur mise en
 * avant. Un chiffre neutre reste en `--text`.
 *
 * `ratio` pilote la barre de progression. Omis, aucune barre n'est rendue —
 * une barre sans dénominateur ne veut rien dire.
 */
type KpiTone = "ok" | "alert" | "accent" | "neutral"

const valueTone: Record<KpiTone, string> = {
  ok: "text-ok",
  alert: "text-alert",
  accent: "text-accent",
  neutral: "text-ink",
}

const barTone: Record<KpiTone, string> = {
  ok: "bg-ok",
  alert: "bg-alert",
  accent: "bg-accent",
  neutral: "bg-ink-3",
}

function KpiCard({
  label,
  value,
  suffix,
  ratio,
  tone = "neutral",
  hero = false,
  lang = "fr",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: string
  value: number
  /** Dénominateur ou unité, à droite du chiffre : « sur 18 », « demandes ». */
  suffix?: string
  /** Entre 0 et 1. Omis, la barre de progression n'est pas rendue. */
  ratio?: number
  tone?: KpiTone
  /** Chiffre héros : 66px. Réservé au chiffre unique d'un écran. */
  hero?: boolean
  lang?: Lang
}) {
  return (
    <div
      data-slot="kpi-card"
      data-tone={tone}
      className={cn(
        "surface rounded-panel p-18",
        "transition-transform duration-400 ease-interact hover:-translate-y-3",
        className
      )}
      {...props}
    >
      <div className="text-field font-normal text-ink-3">{label}</div>

      <div className="mt-9 flex items-baseline gap-7">
        <span className={cn(hero ? "text-kpi-hero" : "text-kpi", valueTone[tone])}>
          {formatNumber(value, lang)}
        </span>
        {suffix && <span className="text-field font-normal text-ink-3">{suffix}</span>}
      </div>

      {ratio !== undefined && (
        <div className="mt-13 h-4 overflow-hidden rounded-pill bg-hair">
          <div
            className={cn("h-full animate-grow rounded-pill", barTone[tone])}
            style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

export { KpiCard }
