import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §5 — carte.
 *
 * `surface` porte le fond, la bordure, l'ombre et le liseré `--inset` ; le
 * liseré est systématique sur toute surface `--glass`, il n'est donc jamais
 * optionnel ici. Trois tailles seulement :
 *
 * - `sm`     sous-carte / encart  → rayon 20, padding 18
 * - `default` carte standard      → rayon 26, padding 24
 * - `hero`   carte majeure        → rayon 32, padding 28, ombre longue
 *
 * Le rayon décroît avec l'imbrication, on n'imbrique donc jamais deux `hero`.
 */
type CardSize = "sm" | "default" | "hero"

function Card({
  className,
  size = "default",
  tone = "neutral",
  ...props
}: React.ComponentProps<"div"> & {
  size?: CardSize
  /** Une carte mise en avant remplace `--stroke` par une ligne colorée. DESIGN.md §5. */
  tone?: "neutral" | "accent" | "alert"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) py-(--card-spacing) text-body text-ink-2",
        size === "hero"
          ? "surface-hero rounded-hero [--card-spacing:--spacing(28)]"
          : size === "sm"
            ? "surface rounded-sub [--card-spacing:--spacing(18)]"
            : "surface rounded-card [--card-spacing:--spacing(24)]",
        tone === "accent" && "surface-accent",
        tone === "alert" && "surface-alert",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-7 px-(--card-spacing)",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-subtitle text-ink",
        "group-data-[size=hero]/card:text-card-major",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body text-ink-2", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-11 border-t border-hair px-(--card-spacing) pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
