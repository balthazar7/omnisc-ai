import * as React from "react"

import { cn } from "@/lib/utils"
import { formatDayMonth } from "@/lib/i18n/format"
import type { Lang } from "@/lib/i18n"

/**
 * DESIGN.md §6.5 — citation de source. Élément signature du produit.
 *
 * Toute donnée affichée porte sa source ; sans source, l'élément n'est pas
 * affiché. Le libellé suit toujours le même format — objet du fil, puis date en
 * JJ/MM — et la flèche finale n'est pas décorative : elle signale que la
 * citation mène au message d'origine.
 *
 * Ne jamais tronquer : la citation est la preuve, pas un ornement.
 */
const ARROW = "↗"

function SourceCitation({
  subject,
  date,
  lang = "fr",
  href,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** Objet du fil dont le fait est extrait. */
  subject: string
  /** Date du message cité. */
  date: Date
  lang?: Lang
  /** Renseigné, la citation devient un lien vers le message d'origine. */
  href?: string
}) {
  const label = `${subject} · ${formatDayMonth(date, lang)} ${ARROW}`

  const classes = cn(
    "inline-flex w-fit items-center whitespace-nowrap",
    "rounded-pill border border-accent-line bg-accent-soft px-11 py-5",
    "text-micro text-accent",
    href && "transition-colors duration-300 hover:bg-accent hover:text-on-accent",
    className
  )

  if (href) {
    return (
      <a data-slot="source-citation" href={href} className={classes}>
        {label}
      </a>
    )
  }

  return (
    <span data-slot="source-citation" className={classes} {...props}>
      {label}
    </span>
  )
}

export { SourceCitation }
