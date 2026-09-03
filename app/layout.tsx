import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { EnvBar } from "@/components/dev/env-bar";
import { themeCss } from "@/design/css";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";

import "./globals.css";

/**
 * DESIGN.md §1.1 — Manrope, aucune seconde famille, pas de monospace.
 * Les graisses 300 à 800 sont celles utilisées par le système.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const t = getDictionary();

export const metadata: Metadata = {
  title: `${t.app.name} — ${t.app.tagline}`,
  description: t.app.description,
};

/**
 * BARRE D'ENVIRONNEMENT — JAMAIS EN PRODUCTION, À AUCUNE CONDITION.
 *
 * Le garde est ici, hors du composant, et il porte sur `VERCEL_ENV` seul : en
 * production le composant n'est pas rendu du tout, donc `getUser()` n'y est pas
 * appelé et les pages statiques le restent. Un garde placé DANS la barre aurait
 * rendu le layout dynamique partout, production comprise.
 *
 * Supprimée au lot 7, avec `/design`.
 */
const SHOW_ENV_BAR = env.VERCEL_ENV !== 'production';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body>
        {/*
          Les jetons du système de design sont dérivés de `design/tokens.ts` et
          injectés ici. Aucune valeur n'est écrite dans `app/globals.css`, qui se
          borne à rattacher ces variables aux espaces de noms Tailwind. Modifier
          `tokens.ts` suffit donc à changer le rendu de toute l'application.
        */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        {SHOW_ENV_BAR && <EnvBar />}
        {children}
      </body>
    </html>
  );
}
