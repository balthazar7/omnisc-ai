import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.1 — quatre variantes, cinq tailles.
 *
 * Les variantes par défaut de shadcn sont remplacées, pas complétées : le
 * système n'a ni `ghost`, ni `link`, ni `outline`. Si une variante manque, on
 * l'ajoute ici — on n'habille jamais un bouton au point d'usage.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-8 whitespace-nowrap",
    "rounded-pill border border-transparent select-none",
    "transition-transform duration-300 ease-interact",
    "outline-none focus-visible:ring-4 focus-visible:ring-accent-soft",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent font-semibold hover:-translate-y-2",
        secondary:
          "surface-control bg-glass border-stroke text-ink font-medium shadow-flat hover:-translate-y-2",
        tertiary:
          "bg-glass-3 border-hair-2 text-ink font-semibold transition-colors hover:border-accent-line hover:text-accent",
        danger:
          "bg-alert-soft border-alert-line text-alert font-semibold transition-colors hover:bg-alert hover:text-on-accent",
      },
      size: {
        lg: "py-14 px-26 text-row-label",
        md: "py-10 px-17 text-meta",
        sm: "py-8 px-15 text-field",
        xs: "py-5 px-11 text-caption",
        block: "w-full py-12 text-body",
      },
    },
    compoundVariants: [
      // L'ombre portée colorée n'existe que sous le bouton primaire, et seulement
      // dans les tailles qui la portent. DESIGN.md §6.1.
      {
        variant: "primary",
        size: "lg",
        class: "shadow-accent-lg hover:scale-[var(--hover-scale-button)]",
      },
      { variant: "primary", size: "md", class: "shadow-accent-md" },
      { variant: "primary", size: "block", class: "shadow-accent-block" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
