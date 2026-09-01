import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";

/**
 * Accueil minimal. Aucun bouton d'inscription fonctionnel : l'authentification
 * et la création de projet arrivent au lot 1.
 *
 * Toutes les chaînes viennent de `lib/i18n/fr.ts` — aucune littérale ici.
 *
 * Layout landing : DESIGN.md §8.
 */
export default function Home() {
  const t = getDictionary();

  return (
    <main className="mx-auto max-w-landing px-28 pt-64 pb-90">
      <h1 className="animate-rise-page text-landing text-ink">{t.home.title}</h1>

      <p className="mt-24 max-w-bubble animate-rise-page text-lead text-ink-2">
        {t.home.lead}
      </p>

      <div className="mt-32 flex animate-rise-page flex-col items-start gap-8">
        <Button size="lg" disabled>
          {t.home.cta}
        </Button>
        <p className="text-caption text-ink-3">{t.home.ctaNote}</p>
      </div>

      <div className="mt-90 grid grid-cols-3 gap-16">
        {t.home.points.map((point) => (
          <Card key={point.title}>
            <CardHeader>
              <CardTitle>{point.title}</CardTitle>
              <CardDescription>{point.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
