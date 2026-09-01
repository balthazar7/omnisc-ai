'use client';

import * as React from 'react';

import { Field, Input, InputHint } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { previewInboundLocalPart, formatInboundAddress } from '@/lib/projects/inbound-address';

/**
 * Champ du nom, avec aperçu de l'adresse pendant la saisie.
 *
 * Seul composant client du lot : l'aperçu doit suivre la frappe. Il n'appelle
 * rien au serveur — la dérivation du préfixe est une fonction pure partagée
 * avec le chemin de création, ce qui garantit que l'aperçu et l'adresse réelle
 * ne peuvent pas diverger sur la partie lisible.
 *
 * Le domaine est passé en propriété : la base ne stocke jamais le domaine, et
 * `INBOUND_DOMAIN` ne doit pas se retrouver inlinée dans le bundle client par
 * une lecture directe.
 */
export function ProjectNameField({
  inboundDomain,
  label,
  placeholder,
  previewLabel,
  previewNote,
  error,
}: {
  inboundDomain: string;
  label: string;
  placeholder: string;
  previewLabel: string;
  previewNote: string;
  error?: string;
}) {
  const [name, setName] = React.useState('');
  const preview = formatInboundAddress(previewInboundLocalPart(name), inboundDomain);

  return (
    <div className="flex flex-col gap-18">
      <Field>
        <Label htmlFor="name">{label}</Label>
        <Input
          id="name"
          name="name"
          required
          autoFocus
          autoComplete="off"
          placeholder={placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
        {error && <InputHint className="text-alert">{error}</InputHint>}
      </Field>

      <Field>
        <span className="text-field text-ink-2">{previewLabel}</span>
        <output
          className="rounded-field border border-hair-2 bg-glass-3 px-14 py-11 text-body text-accent"
          aria-live="polite"
        >
          {preview}
        </output>
        <InputHint>{previewNote}</InputHint>
      </Field>
    </div>
  );
}
