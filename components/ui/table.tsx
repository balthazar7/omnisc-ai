"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.7 — tableau / liste.
 *
 * La colonne de droite porte la citation de source et n'est jamais tronquée :
 * une donnée sans source n'est pas affichée, la source ne peut donc pas être la
 * première chose qu'on sacrifie à la largeur.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-dense", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("bg-glass-2", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-hair bg-glass-2", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-t border-hair transition-colors duration-300 hover:bg-glass-2",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-20 py-14 text-left align-middle text-caption font-normal whitespace-nowrap text-ink-3",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-20 py-14 align-middle text-dense text-ink", className)}
      {...props}
    />
  )
}

/** Sous-texte d'une cellule principale : 11,5-12px, `--text3`, à 4px en dessous. */
function TableSubText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-subtext"
      className={cn("mt-4 text-caption text-ink-3", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-16 text-caption text-ink-3", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableSubText,
  TableCaption,
}
