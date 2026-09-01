import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.12 — jauge circulaire.
 *
 * Géométrie fixe : r = 42 dans un viewBox de 100, d'où une circonférence de
 * 264. `stroke-dashoffset` vaut 264 × (1 − ratio) ; le quart de tour négatif
 * amène l'origine en haut.
 *
 * Les valeurs 100 / 50 / 42 / 9 sont la géométrie du tracé, pas des jetons de
 * design : elles n'ont de sens que les unes par rapport aux autres.
 */
const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 264

const strokeTone = {
  accent: "stroke-accent",
  ok: "stroke-ok",
  alert: "stroke-alert",
} as const

function Gauge({
  ratio,
  tone = "accent",
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children"> & {
  /** Entre 0 et 1. */
  ratio: number
  tone?: keyof typeof strokeTone
  /** Libellé accessible. Vient du dictionnaire, jamais écrit ici. */
  label: string
}) {
  const clamped = Math.min(Math.max(ratio, 0), 1)

  return (
    <svg
      data-slot="gauge"
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className={cn("size-78 -rotate-90", className)}
      {...props}
    >
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        strokeWidth="9"
        className="stroke-hair-2"
      />
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        className={cn("animate-dash", strokeTone[tone])}
      />
    </svg>
  )
}

export { Gauge }
