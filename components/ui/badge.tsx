import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.4 — badge / statut.
 *
 * Les variantes sont nommées par le sens porté, pas par la couleur : c'est ce
 * qui empêche d'employer le rouge pour autre chose qu'un retard ou un silence.
 */
const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-4",
    "rounded-pill border border-transparent px-11 py-4",
    "text-micro font-semibold whitespace-nowrap",
    "[&>svg]:pointer-events-none [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Engagement tenu, connecteur actif, projet actif. */
        ok: "bg-ok-soft text-ok",
        /** Retard, jours de silence, échéance dépassée. */
        alert: "bg-alert-soft text-alert",
        /** Valeur mise en avant, élément cité. */
        accent: "bg-accent-soft text-accent",
        /** Tout le reste. */
        neutral: "bg-glass-3 text-ink-3",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
