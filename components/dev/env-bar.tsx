import Link from 'next/link';

import { getUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getDictionary } from '@/lib/i18n';
import { supabaseProjectRefs } from '@/lib/supabase/project-ref';

/**
 * BARRE D'ENVIRONNEMENT — PROVISOIRE, SUPPRIMÉE AU LOT 7 AVEC `/design`.
 *
 * À supprimer alors : ce fichier, son appel dans `app/layout.tsx`, le bloc
 * `envBar` de `lib/i18n/fr.ts`, `lib/supabase/project-ref.ts` s'il n'a pas
 * trouvé d'autre usage, et `VERCEL_GIT_COMMIT_REF` du schéma, de `.env.example`
 * et du tableau des variables de CLAUDE.md.
 *
 * POURQUOI ELLE EXISTE. Un lien magique a été demandé depuis ce qu'on croyait
 * être la préversion et a été émis par le projet Supabase de PRODUCTION. Rien à
 * l'écran ne permettait de savoir sur quel déploiement on se trouvait, ni à
 * quelle base il parlait : les deux hôtes se ressemblent, et les variables qui
 * les distinguent sont marquées « Sensitive » dans Vercel, donc illisibles hors
 * du déploiement. La barre affiche ces valeurs à l'exécution, là où elles sont
 * vraies.
 *
 * JAMAIS EN PRODUCTION, À AUCUNE CONDITION. Le garde est dans `RootLayout`,
 * évalué avant tout appel : en production le composant n'est pas rendu, et
 * `getUser()` n'est donc pas appelé — ce qui laisse les pages statiques le
 * rester.
 */
export async function EnvBar() {
  const t = getDictionary();
  const refs = supabaseProjectRefs();
  const user = await getUser();

  const environment = env.VERCEL_ENV ?? 'development';
  const branch = env.VERCEL_GIT_COMMIT_REF ?? t.envBar.localBranch;

  /*
    Les trois chemins d'accès à Supabase sont affichés séparément dès qu'ils
    divergent — c'est précisément la panne qu'on cherche à rendre visible. S'ils
    concordent, une seule référence suffit et la ligne reste lisible.
  */
  const refLabel = refs.consistent
    ? (refs.auth ?? t.envBar.unknownRef)
    : [
        `${t.envBar.refAuth}:${refs.auth ?? t.envBar.unknownRef}`,
        `${t.envBar.refStorage}:${refs.storage ?? t.envBar.unknownRef}`,
        `${t.envBar.refDatabase}:${refs.database ?? t.envBar.unknownRef}`,
      ].join(' ');

  const links = [
    { href: '/', label: t.envBar.links.home },
    { href: '/login', label: t.envBar.links.login },
    { href: '/projects', label: t.envBar.links.projects },
    { href: '/organization', label: t.envBar.links.organization },
    { href: '/design', label: t.envBar.links.design },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-14 gap-y-4 border-b border-hair bg-glass-2 px-20 py-7 text-caption text-ink-3">
      <span>{environment}</span>
      <span>{branch}</span>
      {/* Rouge dès que les trois chemins ne désignent pas le même projet. */}
      <span className={refs.consistent ? undefined : 'text-alert'}>{refLabel}</span>
      <span>{user?.email ?? t.envBar.signedOut}</span>

      <span className="flex flex-wrap items-center gap-x-11 gap-y-4">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-accent">
            {link.label}
          </Link>
        ))}
      </span>
    </div>
  );
}
