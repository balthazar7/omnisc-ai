"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * DESIGN.md §6.2 — groupe de pilules.
 *
 * Sert aussi bien aux onglets qu'à une navigation segmentée : la liste est un
 * rail en pilule, l'élément actif est une pilule claire posée dessus.
 */
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-16 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center justify-center gap-4 p-4",
        "rounded-pill border border-hair bg-glass-2",
        "group-data-vertical/tabs:flex-col",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-7 whitespace-nowrap",
        "rounded-pill border-none px-14 py-7 text-meta",
        "transition-all duration-350 ease-interact",
        "outline-none focus-visible:ring-4 focus-visible:ring-accent-soft",
        "disabled:pointer-events-none disabled:opacity-50",
        // inactif
        "bg-transparent font-medium text-ink-2 shadow-none",
        // actif
        "data-active:bg-glass-3 data-active:font-semibold data-active:text-ink data-active:shadow-pill",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 animate-fade text-body outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
