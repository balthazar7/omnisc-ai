"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.9 — avatar.
 *
 * L'avatar de l'agent est la seule pastille sur fond `--accent` : c'est ce qui
 * distingue d'un coup d'œil une réponse de l'agent d'un message de personne.
 */
function Avatar({
  className,
  size = "default",
  tone = "person",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "sm" | "default"
  tone?: "person" | "agent"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/avatar relative flex shrink-0 rounded-avatar border border-hair-2 select-none",
        size === "sm" ? "size-28" : "size-30",
        tone === "agent" ? "bg-accent" : "bg-glass-3",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-avatar object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-avatar text-tiny",
        "text-ink-2 group-data-[tone=agent]/avatar:text-on-accent",
        className
      )}
      {...props}
    />
  )
}

/** Pile d'avatars. Le chevauchement reste dans l'échelle d'espacement. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn("flex -space-x-8", className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
