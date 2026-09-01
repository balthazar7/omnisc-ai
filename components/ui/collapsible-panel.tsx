"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.11 — panneau rangeable.
 *
 * La colonne est pilotée par `grid-template-columns`, pas par une largeur sur
 * l'enfant : c'est ce qui rend la transition continue au lieu de saccadée.
 *
 * Replié, le contenu passe à `opacity:0`, perd le pointeur et sort de l'arbre
 * d'accessibilité. Le conteneur reste en `overflow:hidden` pour que le texte ne
 * déborde pas pendant l'animation.
 */
const WIDTHS = {
  left: { open: "var(--col-nav)", closed: "var(--col-nav-collapsed)" },
  right: { open: "var(--col-aside)", closed: "var(--col-aside-collapsed)" },
} as const

function CollapsiblePanel({
  side = "left",
  open,
  onOpenChange,
  toggleLabel,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  side?: "left" | "right"
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Libellé accessible du bouton. Vient du dictionnaire, jamais écrit ici. */
  toggleLabel: string
}) {
  const width = open ? WIDTHS[side].open : WIDTHS[side].closed

  return (
    <div
      data-slot="collapsible-panel"
      data-side={side}
      data-open={open || undefined}
      className={cn(
        "grid overflow-hidden transition-[grid-template-columns] duration-500 ease-interact",
        side === "right" && "justify-items-end",
        className
      )}
      style={{ gridTemplateColumns: width }}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-11">
        <button
          type="button"
          aria-label={toggleLabel}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex size-26 shrink-0 items-center justify-center rounded-avatar",
            "border border-hair-2 bg-glass-3 text-micro text-ink-2 shadow-flat",
            "transition-colors duration-300 outline-none",
            "hover:text-accent focus-visible:ring-4 focus-visible:ring-accent-soft",
            side === "right" ? "self-start" : "self-end"
          )}
        >
          {/* Glyphe directionnel : il pointe vers l'endroit où le panneau va aller. */}
          <span aria-hidden="true">
            {side === "left" ? (open ? "‹" : "›") : open ? "›" : "‹"}
          </span>
        </button>

        <div
          aria-hidden={!open}
          className={cn(
            "min-w-0 transition-opacity duration-500 ease-interact",
            !open && "pointer-events-none opacity-0"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export { CollapsiblePanel }
