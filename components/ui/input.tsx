import * as React from "react"

import { cn } from "@/lib/utils"

/** DESIGN.md §6.6 — champ de saisie. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-field border border-hair-2 bg-glass-3",
        "px-14 py-11 text-body text-ink",
        "transition-[border-color,box-shadow] duration-300 outline-none",
        "placeholder:text-ink-3",
        "focus-visible:border-accent-line focus-visible:ring-4 focus-visible:ring-accent-soft",
        "aria-invalid:border-alert-line aria-invalid:ring-4 aria-invalid:ring-alert-soft",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/** Aide sous le champ. DESIGN.md §6.6 : 11,5px, `--text3`. */
function InputHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="input-hint"
      className={cn("text-caption text-ink-3", className)}
      {...props}
    />
  )
}

/** Champ complet : libellé, contrôle, aide. Gap 7px, DESIGN.md §6.6. */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-7", className)}
      {...props}
    />
  )
}

export { Input, InputHint, Field }
