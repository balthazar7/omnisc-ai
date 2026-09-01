import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.10 — bulle de conversation.
 *
 * Trois rôles, trois formes distinctes :
 *
 * - `question` : surface secondaire, coin bas-gauche rentré.
 * - `answer`   : surface tertiaire bordée d'accent, coin bas-droit rentré.
 * - `refusal`  : encart d'alerte, coins pleins.
 *
 * Le refus de réponse a sa propre forme parce qu'il porte une information
 * contractuelle : l'agent ne conclut pas au-delà des éléments disponibles. Le
 * confondre visuellement avec une réponse serait un défaut de produit, pas de
 * style.
 *
 * `white-space: pre-line` : les réponses arrivent avec leurs sauts de ligne.
 */
function ChatBubble({
  role,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  role: "question" | "answer" | "refusal"
}) {
  return (
    <div
      data-slot="chat-bubble"
      data-role={role}
      className={cn(
        "w-fit max-w-bubble border whitespace-pre-line text-bubble",
        role === "question" &&
          "rounded-bubble rounded-bl-bubble-tail border-hair bg-glass-2 px-16 py-12 text-ink",
        role === "answer" &&
          "rounded-bubble rounded-br-bubble-tail border-accent-line bg-glass-3 px-18 py-14 text-ink",
        role === "refusal" &&
          "rounded-bubble border-alert-line bg-alert-soft px-18 py-14 text-alert",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { ChatBubble }
