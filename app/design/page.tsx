/*
  PAGE DE VÉRIFICATION DU SYSTÈME DE DESIGN — SUPPRIMÉE AU LOT 7.

  Elle affiche tous les jetons de `design/tokens.ts` et tous les composants de
  `components/ui/`, pour qu'un coup d'œil suffise à vérifier la conformité à
  DESIGN.md. Elle n'a aucune dépendance métier et ne doit jamais en acquérir.

  Deux invariants tenus ici :
  - aucune chaîne littérale : tout vient de `lib/i18n/fr.ts` ;
  - aucune valeur de design : les échantillons lisent `design/tokens.ts`, et les
    aplats de couleur pointent la variable CSS par son nom plutôt que sa valeur.
*/
import * as React from "react";

import {
  animation,
  elevation,
  motion,
  radius,
  spaceScale,
  themes,
  typography,
  DEFAULT_THEME,
  type TypographyKey,
} from "@/design/tokens";

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Field, Input, InputHint } from "@/components/ui/input";
import { Gauge } from "@/components/ui/gauge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Label } from "@/components/ui/label";
import { NavItem } from "@/components/ui/nav-item";
import { Separator } from "@/components/ui/separator";
import { SourceCitation } from "@/components/ui/source-citation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSubText,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getDictionary } from "@/lib/i18n";
import { formatDayMonth } from "@/lib/i18n/format";

import { PanelDemo } from "./panel-demo";

/**
 * Tailwind lit les classes dans la source : un nom construit à l'exécution ne
 * produirait aucune règle. Cette table est donc écrite en toutes lettres, et
 * c'est le seul endroit du dépôt où elle l'est.
 */
const TYPE_CLASS: Record<TypographyKey, string> = {
  landing: "text-landing",
  section: "text-section",
  "card-major": "text-card-major",
  screen: "text-screen",
  panel: "text-panel",
  kpi: "text-kpi",
  "kpi-hero": "text-kpi-hero",
  subtitle: "text-subtitle",
  lead: "text-lead",
  "body-lg": "text-body-lg",
  "row-label": "text-row-label",
  bubble: "text-bubble",
  body: "text-body",
  dense: "text-dense",
  meta: "text-meta",
  field: "text-field",
  caption: "text-caption",
  micro: "text-micro",
  tiny: "text-tiny",
};

/**
 * Les trois matières de DESIGN.md §5. Le nom affiché est le nom de la classe :
 * c'est une donnée de la page, pas une chaîne d'interface.
 */
const ELEVATION_SAMPLES = [
  { name: "surface", className: "surface rounded-card" },
  { name: "surface-hero", className: "surface-hero rounded-hero" },
  { name: "shadow-pill", className: "rounded-pill bg-glass-3 shadow-pill" },
];

/** Dates du jeu d'essai. Elles ne vivent pas dans le dictionnaire : ce sont des données. */
const SAMPLE_DUE = [new Date(2026, 3, 3), new Date(2026, 1, 20), new Date(2026, 2, 12)];
const SAMPLE_SOURCE_DATE = [new Date(2026, 1, 28), new Date(2026, 1, 5), new Date(2026, 1, 4)];
const SAMPLE_TONE = ["ok", "alert", "neutral"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-18">
      <h2 className="text-panel text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-11">
      <div className="text-caption text-ink-3">{label}</div>
      {children}
    </div>
  );
}

export default function DesignPage() {
  const t = getDictionary();
  const colors = themes[DEFAULT_THEME];

  return (
    <main className="mx-auto flex max-w-landing flex-col gap-70 px-28 pt-64 pb-90">
      <header className="flex flex-col gap-14">
        <h1 className="text-screen text-ink">{t.design.title}</h1>
        <p className="max-w-bubble text-lead text-ink-2">{t.design.lead}</p>
        <Badge variant="alert">{t.design.removalNotice}</Badge>
      </header>

      {/* ---------- Couleurs ---------- */}
      <Section title={t.design.sections.colors}>
        <div className="grid grid-cols-4 gap-16">
          {Object.entries(colors).map(([name, value]) => (
            <div key={name} className="surface flex flex-col gap-11 rounded-sub p-14">
              <div
                className="h-44 rounded-field border border-hair-2"
                style={{ background: `var(--${name})` }}
              />
              <div className="text-meta text-ink">{`--${name}`}</div>
              <div className="text-caption text-ink-3">{value}</div>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.design.sections.colorRoles}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_1fr] items-baseline gap-x-20 gap-y-12">
            {t.design.colorRoles.map((role) => (
              <React.Fragment key={role.token}>
                <span className="text-meta text-accent">{role.token}</span>
                <span className="text-body text-ink-2">{role.usage}</span>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* ---------- Typographie ---------- */}
      <Section title={t.design.sections.typography}>
        <div className="surface grid grid-cols-[max-content_1fr_max-content] items-baseline gap-x-20 gap-y-20 rounded-card p-24">
          {(Object.keys(typography) as TypographyKey[]).map((key) => (
            <React.Fragment key={key}>
              <span className="text-caption text-ink-3">{key}</span>
              <span className={`${TYPE_CLASS[key]} text-ink`}>{key}</span>
              <span className="justify-self-end text-caption text-ink-3">
                {`${typography[key].size} / ${typography[key].weight}`}
              </span>
            </React.Fragment>
          ))}
        </div>
      </Section>

      {/* ---------- Espacement ---------- */}
      <Section title={t.design.sections.spacing}>
        <div className="surface flex flex-wrap items-end gap-12 rounded-card p-24">
          {spaceScale.map((step) => (
            <div key={step} className="flex flex-col items-center gap-7">
              <div
                className="bg-accent-soft"
                style={{ width: `calc(var(--space-unit) * ${step})`, height: "44px" }}
              />
              <span className="text-micro text-ink-3">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Rayons ---------- */}
      <Section title={t.design.sections.radius}>
        <div className="grid grid-cols-6 gap-16">
          {Object.entries(radius).map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-9">
              <div
                className="size-70 border border-accent-line bg-accent-soft"
                style={{ borderRadius: `var(--r-${name})` }}
              />
              <span className="text-micro text-ink-2">{name}</span>
              <span className="text-micro text-ink-3">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Élévation ---------- */}
      <Section title={t.design.sections.elevation}>
        <div className="grid grid-cols-3 gap-16">
          {ELEVATION_SAMPLES.map((sample) => (
            <div
              key={sample.name}
              className={`${sample.className} flex h-90 items-center justify-center text-meta text-ink-2`}
            >
              {sample.name}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-7">
          {Object.keys(elevation).map((name) => (
            <span key={name} className="text-micro text-ink-3">{`--${name}`}</span>
          ))}
        </div>
      </Section>

      {/* ---------- Mouvement ---------- */}
      <Section title={t.design.sections.motion}>
        <div className="surface grid grid-cols-[max-content_1fr] gap-x-20 gap-y-9 rounded-card p-24 text-meta">
          {Object.entries(motion).map(([name, value]) => (
            <React.Fragment key={name}>
              <span className="text-ink-3">{`--${name}`}</span>
              <span className="text-ink">{value}</span>
            </React.Fragment>
          ))}
          <Separator className="col-span-2 my-9" />
          {Object.entries(animation).map(([name, value]) => (
            <React.Fragment key={name}>
              <span className="text-ink-3">{name}</span>
              <span className="text-ink">{value}</span>
            </React.Fragment>
          ))}
        </div>
      </Section>

      {/* ---------- Composants ---------- */}
      <Section title={t.design.sections.components}>
        <Row label={t.design.components.button}>
          <div className="flex flex-wrap items-center gap-14">
            <Button variant="primary">{t.design.components.buttonPrimary}</Button>
            <Button variant="secondary">{t.design.components.buttonSecondary}</Button>
            <Button variant="tertiary">{t.design.components.buttonTertiary}</Button>
            <Button variant="danger">{t.design.components.buttonDanger}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-14">
            <Button size="lg">{t.design.components.buttonSizes}</Button>
            <Button size="md">{t.design.components.buttonSizes}</Button>
            <Button size="sm">{t.design.components.buttonSizes}</Button>
            <Button size="xs">{t.design.components.buttonSizes}</Button>
          </div>
          <div className="grid max-w-onboarding grid-cols-2 gap-20">
            <Button size="block">{t.design.components.buttonSizes}</Button>
          </div>
        </Row>

        <Row label={t.design.components.pills}>
          <Tabs defaultValue={t.design.components.pillsItems[0]}>
            <TabsList>
              {t.design.components.pillsItems.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Row>

        <Row label={t.design.components.badge}>
          <div className="flex flex-wrap items-center gap-11">
            <Badge variant="ok">{t.design.components.badgeOk}</Badge>
            <Badge variant="alert">{t.design.components.badgeAlert}</Badge>
            <Badge variant="accent">{t.design.components.badgeAccent}</Badge>
            <Badge variant="neutral">{t.design.components.badgeNeutral}</Badge>
          </div>
        </Row>

        <Row label={t.design.components.source}>
          <div className="flex flex-wrap items-center gap-11">
            <SourceCitation
              subject={t.design.sampleFacts[0].sourceSubject}
              date={SAMPLE_SOURCE_DATE[0]}
            />
            <SourceCitation
              subject={t.design.sampleFacts[1].sourceSubject}
              date={SAMPLE_SOURCE_DATE[1]}
              href="#"
            />
          </div>
          <p className="text-caption text-ink-3">{t.design.components.sourceNote}</p>
        </Row>

        <Row label={t.design.components.nav}>
          <div className="surface w-col-nav rounded-card p-14">
            <div className="flex flex-col gap-4">
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
          </div>
        </Row>

        <Row label={t.design.components.field}>
          {/* Grille d'onboarding : deux colonnes, DESIGN.md §8. */}
          <div className="grid max-w-onboarding grid-cols-2 gap-20">
            <Field>
              <Label htmlFor="design-field">{t.design.components.fieldLabel}</Label>
              <Input id="design-field" placeholder={t.design.components.fieldPlaceholder} />
              <InputHint>{t.design.components.fieldHint}</InputHint>
            </Field>
          </div>
        </Row>

        <Row label={t.design.components.table}>
          <div className="surface overflow-hidden rounded-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.design.components.tableHeaders.statement}</TableHead>
                  <TableHead>{t.design.components.tableHeaders.actor}</TableHead>
                  <TableHead>{t.design.components.tableHeaders.due}</TableHead>
                  <TableHead>{t.design.components.tableHeaders.status}</TableHead>
                  <TableHead>{t.design.components.tableHeaders.source}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.design.sampleFacts.map((fact, index) => (
                  <TableRow key={`${fact.statement}-${index}`}>
                    <TableCell>
                      {fact.statement}
                      <TableSubText>{fact.org}</TableSubText>
                    </TableCell>
                    <TableCell>{fact.actor}</TableCell>
                    <TableCell>{formatDayMonth(SAMPLE_DUE[index])}</TableCell>
                    <TableCell>
                      <Badge variant={SAMPLE_TONE[index]}>{fact.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <SourceCitation
                        subject={fact.sourceSubject}
                        date={SAMPLE_SOURCE_DATE[index]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Row>

        <Row label={t.design.components.kpi}>
          <div className="grid grid-cols-3 gap-16">
            <KpiCard
              label={t.design.components.kpiLabel}
              value={14}
              suffix={t.design.components.kpiSuffix}
              ratio={14 / 18}
              tone="ok"
            />
            <KpiCard
              label={t.design.components.kpiAlertLabel}
              value={3}
              suffix={t.design.components.kpiAlertSuffix}
              tone="alert"
            />
            <KpiCard
              label={t.design.components.kpiAlertLabel}
              value={3}
              tone="alert"
              hero
            />
          </div>
        </Row>

        <Row label={t.design.components.avatar}>
          <div className="flex items-center gap-16">
            <Avatar>
              <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>JR</AvatarFallback>
            </Avatar>
            <Avatar tone="agent">
              <AvatarFallback>{t.design.components.avatarAgent.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>MD</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>CB</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>JR</AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </div>
        </Row>

        <Row label={t.design.components.bubble}>
          <div className="flex flex-col gap-14">
            <ChatBubble role="question">{t.design.components.bubbleQuestion}</ChatBubble>
            <ChatBubble role="answer">{t.design.components.bubbleAnswer}</ChatBubble>
            <ChatBubble role="refusal">{t.design.components.bubbleRefusal}</ChatBubble>
          </div>
        </Row>

        <Row label={t.design.components.panel}>
          <PanelDemo />
          <p className="text-caption text-ink-3">{t.design.components.panelBody}</p>
        </Row>

        <Row label={t.design.components.gauge}>
          <div className="flex items-center gap-24">
            <Gauge ratio={0.6} label={t.design.components.gaugeLabel} />
            <Gauge ratio={0.85} tone="ok" label={t.design.components.gaugeLabel} />
            <Gauge ratio={0.2} tone="alert" label={t.design.components.gaugeLabel} />
          </div>
        </Row>
      </Section>
    </main>
  );
}
