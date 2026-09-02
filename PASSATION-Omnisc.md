# PASSATION — Omnisc AI

Point d'entrée d'une session vierge. **Ce fichier ne contient aucune règle.** Il
dit quoi lire, où en est le chantier, et ce qu'il faut savoir avant de toucher
quoi que ce soit. Toute règle qui doit survivre à un `/clear` vit dans
`CLAUDE.md`, et nulle part ailleurs — dupliquer une règle ici la ferait diverger
en deux sessions.

## 1. Quoi lire, dans cet ordre

| Fichier | Chargé automatiquement | Rôle |
|---|---|---|
| `CLAUDE.md` | oui | Mémoire du projet. Produit, invariants d'architecture, contraintes de déploiement, schéma de données, hors périmètre. **Fait foi.** |
| `DESIGN.md` | non | Source de vérité visuelle. Échelle typographique, valeurs d'espacement, les douze composants, layouts d'écran. À ouvrir dès qu'on touche à l'interface. |
| `PASSATION-Omnisc.md` | non | Ce fichier. État du chantier et reprise. |

La section « Avancement » de `CLAUDE.md` est la seule source sur ce qui est
fait. Ce fichier ne la recopie pas.

## 2. Où l'on travaille

- Dépôt : `C:\Users\balth\dev\omnisc-ai`. **Pas `D:\18_SaaS CDP`** — le disque
  `D:` a des erreurs matérielles d'E/S, voir `CLAUDE.md` § Avancement.
- `main` est la production. Toute évolution passe par une branche et son
  déploiement de prévisualisation.
- Vercel : team `team-omnisc-9e8d9b8e`, projet `omnisc-ai`, fonctions à `cdg1`.
- Supabase : `omnisc-preview` (`ofjxocfdyquvdyhxckgy`) et `omnisc-prod`. Le
  `project-ref` lié localement est dans `supabase/.temp/project-ref`.
- Scripts : `npm run dev`, `npm run build`, `npm run lint`. Il n'y a pas de suite
  de tests — c'est voulu, voir `CLAUDE.md` § E.

## 3. Reprendre une session

1. Lire `CLAUDE.md` en entier, puis la section « Avancement » à nouveau : c'est
   elle qui dit quel lot est ouvert.
2. `git log --oneline -10` et `git status` : la branche en cours nomme le lot.
3. Vérifier que `npm run build` est vert avant toute modification. S'il ne l'est
   pas, c'est presque toujours `.env.local` qui a pris du retard sur
   `.env.example` — les deux doivent lister exactement les mêmes variables.
4. Ne rien deviner. Une décision manquante — nom de champ, comportement,
   affichage — se demande, elle ne s'invente pas (`CLAUDE.md` § F).

## 4. Vérifier une préversion — les deux pièges

Ils ont coûté deux sessions à eux deux, et ils se reproduiront.

- Une préversion protégée répond **`200` sur toutes les routes** en servant la
  page de connexion Vercel. Vérifier le **contenu** de la réponse
  (`content-type`, `<title>`), jamais le seul statut.
- Un `ERR_CONNECTION_RESET` sur une URL Vercel n'est pas un blocage réseau : la
  plateforme coupe le trafic en clair avant toute réponse. Chercher un `http://`
  quelque part — typiquement le Site URL de Supabase.

Le détail de ces deux constats, et de tous les autres, est en section B de
`CLAUDE.md`, « Constats de production ».

## 5. Dette ouverte, à traiter quand le lot concerné s'y prête

Cette liste est le seul contenu propre à ce fichier. **Elle se vide, elle ne
s'accumule pas** : ce qui est traité en sort dans le même commit.

- **Critère 7 du lot 1a — isolation entre comptes : non vérifié.** Bloqué par
  l'approbation du compte Postmark, qui n'autorise l'envoi qu'entre adresses
  d'un même domaine — donc pas de second compte de test. C'est le contrôle
  d'accès du produit, et il est sans preuve d'exécution. À faire dès
  l'approbation.
- **`request_id` non propagé dans `lib/orgs.ts`.** Le logger y fabrique son
  propre UUID : ses lignes ne se rapprochent d'aucune autre de la même requête.
  Faire descendre le logger de la requête jusqu'à `ensureOrganizationForUser`.
- **`body.json` traîne non suivi à la racine** alors qu'un commit l'a retiré du
  dépôt. À supprimer ou à ignorer explicitement.
