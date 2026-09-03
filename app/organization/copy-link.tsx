'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';

/**
 * Bouton de copie d'un lien d'invitation.
 *
 * AUCUN E-MAIL N'EST ENVOYÉ DANS CE LOT : `lib/email/send.ts` et son garde-fou
 * `OUTBOUND_ALLOWLIST` arrivent au lot 5, et ce garde-fou existe pour éviter
 * qu'une boucle écrive un jour à quinze personnes chez de vrais clients. Le
 * propriétaire copie donc le lien et le transmet par sa propre messagerie —
 * d'où un jeton stocké en clair, réaffichable des jours plus tard.
 */
export function CopyLink({
  url,
  copyLabel,
  copiedLabel,
}: {
  url: string;
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
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Presse-papiers refusé : le lien reste sélectionnable dans le champ
      // voisin, rien n'est perdu.
    }
  }

  return (
    <Button type="button" variant="tertiary" size="xs" onClick={copy} aria-live="polite">
      {copied ? copiedLabel : copyLabel}
    </Button>
  );
}
