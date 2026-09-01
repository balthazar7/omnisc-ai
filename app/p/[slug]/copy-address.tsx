'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';

/**
 * Adresse du projet, avec bouton de copie.
 *
 * C'est le seul élément d'interface qui compte à ce stade : tout le produit
 * repose sur le fait que cette adresse parte en copie d'un e-mail réel. Elle
 * est donc affichée en grand, sélectionnable, et copiable en un geste.
 */
export function CopyAddress({
  address,
  copyLabel,
  copiedLabel,
}: {
  address: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : l'adresse
      // reste affichée en clair et sélectionnable, rien n'est perdu.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-14">
      <code className="rounded-field border border-accent-line bg-accent-soft px-16 py-12 text-body-lg text-accent select-all">
        {address}
      </code>
      <Button type="button" variant="tertiary" onClick={copy} aria-live="polite">
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
