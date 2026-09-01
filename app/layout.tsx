import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { themeCss } from "@/design/css";
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
        {children}
      </body>
    </html>
  );
}
