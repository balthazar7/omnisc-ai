"use client";

import * as React from "react";

import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { NavItem } from "@/components/ui/nav-item";
import { getDictionary } from "@/lib/i18n";

/**
 * Démonstration du panneau rangeable, qui a besoin d'état local.
 * Supprimée au lot 7 avec le reste de `/design`.
 */
export function PanelDemo() {
  const t = getDictionary();
  const [open, setOpen] = React.useState(true);

  return (
    <CollapsiblePanel
      side="left"
      open={open}
      onOpenChange={setOpen}
      toggleLabel={open ? t.common.collapse : t.common.expand}
      className="surface rounded-card p-14"
    >
      <div className="flex flex-col gap-4">
        <div className="px-11 pb-7 text-caption text-ink-3">{t.design.components.panelTitle}</div>
        {t.design.components.navItems.map((item, index) => (
          <NavItem
            key={item.label}
            label={item.label}
            count={item.count === 0 ? undefined : item.count}
            active={index === 0}
            tone={index >= 2 ? "alert" : "neutral"}
          />
        ))}
      </div>
    </CollapsiblePanel>
  );
}
