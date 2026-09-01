# CLAUDE.md — Omnisc AI

Mémoire du projet entre les sessions. Chargé à chaque session Claude Code. `DESIGN.md`, à la racine, ne l'est pas : toute règle qui doit survivre à un `/clear` vit ici.

## Avancement

- **Partie A — configuration externe : terminée.** Domaine `omnisc-ai.fr` et `.com`, dépôt `omnisc-ai`, Supabase `omnisc-prod` et `omnisc-preview` (région UE), Vercel Pro (Team Omnisc, fonctions à Paris), Postmark serveur Live avec flux entrant sur `in.omnisc-ai.fr` et contenu brut activé, fixtures réelles dans `fixtures/inbound/`.
- **Lot 0a — squelette marchant : terminé le 31 août 2026, vérifié en production.** `lib/env.ts` (schéma zod, échec bruyant), `lib/logger.ts` (JSON, `request_id`), `lib/supabase/server.ts` (pooler 6543 `prepare: false` + Storage `service_role`), `supabase/migrations/0001_init.sql` (`vector`, `organizations`, `projects`, `messages`, `jobs`, RLS sans policy, `grant … to service_role`, bucket `raw` privé), `lib/inbound/store-raw.ts` et `app/api/inbound/postmark/route.ts`, `app/api/health/route.ts`. Aucun fichier d'interface touché. Liste d'acceptation vérifiée en production — migrations sur `omnisc-preview` puis `omnisc-prod`, `/api/health` à 200 avec le bon SHA, webhook renseigné dans Postmark, e-mail de bout en bout, lecture `anon` refusée. Ce que la vérification a appris est consigné en section B, « Constats de production ».
- **Lot 0b — design system : terminé le 1er septembre 2026, vérifié en production.** `design/tokens.ts` (source unique, transcrite de `DESIGN.md`) et `design/css.ts` (dérivation du bloc `:root`), `app/globals.css` réduit à un mappage sans aucune valeur, `lib/i18n/` (dictionnaire `fr.ts`, formateurs `Intl`), les douze composants de `DESIGN.md` §6 dans `components/ui/`, `app/page.tsx`, `app/design/page.tsx`. Bloc Design rédigé en section B bis. Trois écarts relevés dans `DESIGN.md` et corrigés à la source : §3 ne listait ni `15`, ni `17`, ni `78` alors que §6.1 et §6.12 les emploient ; §4 ne donnait que des fourchettes, la valeur retenue de chaque rayon y est désormais arrêtée. **Tailwind v4 : il n'existe pas de `tailwind.config.ts`** — le thème est déclaré en CSS, voir section B bis.
- **Piège de vérification : une préversion Vercel protégée répond `200` sur TOUTES les routes**, en servant la page de connexion Vercel — y compris `/api/health`, qui rend alors du `text/html` d'environ 340 ko au lieu de son JSON. Une vérification qui ne regarde que le code de statut passe donc à tort. **Toute vérification de préversion doit porter sur le contenu de la réponse** (`content-type`, `<title>`), jamais sur le seul statut. Le contournement est l'en-tête `x-vercel-protection-bypass`, dont le secret se génère dans Vercel → Settings → Deployment Protection → Protection Bypass for Automation.
- **Le dépôt de travail a changé de disque le 31 août 2026.** Le disque `D:` (Seagate ST2000DM008) renvoie des erreurs matérielles d'E/S et disparaît par intermittence du gestionnaire de disques ; `npm install` y échoue sur des secteurs illisibles. Le dépôt a été recloné depuis GitHub vers `C:\Users\balth\dev\omnisc-ai`, `.env.local` restauré et vérifié par empreinte. **Travailler dans `C:\Users\balth\dev\omnisc-ai`, pas dans `D:\18_SaaS CDP`.** Le disque `D:` n'a pas été diagnostiqué ni remplacé.
- **Prochain : lot 1 — auth, organisations, projets, membres, génération d'adresse, écran de création.**
- Chaque lot met cette section à jour avant de se clore.

---

## 0. Le produit

Un projet d'entreprise implique plusieurs sociétés. L'information de coordination — qui s'est engagé à quoi, quelle décision a été prise, quelle version fait foi — vit dans les e-mails, éparpillée entre les boîtes de quinze personnes appartenant à des organisations différentes.

Les outils de suivi existants échouent parce qu'ils **exigent une saisie manuelle** que personne ne fait. Omnisc lit l'information là où elle est déjà. Personne ne change d'outil.

**Conséquence directe pour la conception : l'interface est une surface de lecture, pas de saisie.** Presque aucun formulaire. Le seul geste fréquent est de poser une question.

Avantage défendable : les fournisseurs de messagerie ne voient qu'un seul tenant, jamais l'autre moitié d'une conversation inter-entreprises. Toute fonctionnalité qui n'exploite pas ce caractère inter-entreprises est de faible priorité.

### Exemple travaillé — la référence pour toute extraction

Trois messages, sur trois semaines :

```
De : marc.deleuze@fabrik-industries.fr
À : claire.b@meridian.fr
Cc : p-k3n8xq2a@in.omnisc-ai.fr
Date : 4 février, 09:12
Objet : RE: Planning production Meridian

Bonjour Claire,
Après validation avec l'atelier, nous pouvons livrer les 2 000 premières
unités le 12 mars. Il nous faut le BAT définitif avant le 20 février,
sans quoi la date saute.
Cordialement, Marc
```

```
De : claire.b@meridian.fr
À : julie.roux@studio-nord.com
Cc : marc.deleuze@fabrik-industries.fr, p-k3n8xq2a@in.omnisc-ai.fr
Date : 5 février, 14:40
Objet : BAT packaging — urgent

Julie, peux-tu nous confirmer que le BAT sera prêt avant le 20/02 ?
Marc en a besoin pour tenir la date de production.
```

```
De : marc.deleuze@fabrik-industries.fr
À : claire.b@meridian.fr
Cc : p-k3n8xq2a@in.omnisc-ai.fr
Date : 28 février, 17:03
Objet : RE: Planning production Meridian

Sans BAT, nous décalons. Nouvelle date de livraison : 3 avril.
```

Faits extraits — **c'est le format d'annotation attendu** :

| Type | Acteur | Énoncé | Échéance | Statut |
|---|---|---|---|---|
| engagement | Marc / Fabrik | Livrer 2 000 unités | 12 mars | **remplacé** par le fait du 28/02 |
| demande | Marc → Claire | BAT définitif requis | 20 février | ouvert |
| demande | Claire → Julie | Confirmer que le BAT sera prêt | 20 février | **ouvert, sans réponse** |
| engagement | Marc / Fabrik | Livrer 2 000 unités | 3 avril | actif |

Le troisième fait est le cœur du produit : **Julie n'a jamais répondu**. Aucun message ne le dit. C'est une absence — elle ne se cherche pas, elle se calcule, parce qu'une demande a été enregistrée comme objet et qu'aucun message ultérieur ne l'a satisfaite.

Réponse attendue du chat :

> **Claire :** *Où en est-on sur la production ?*
>
> **Agent :** Livraison de 2 000 unités annoncée au 3 avril. Cette date remplace un engagement précédent au 12 mars, décalé faute de BAT. `[Marc Deleuze — Fabrik Industries, 28 février]`
>
> Point bloquant : votre demande du 5 février à Julie Roux, sur la confirmation du BAT avant le 20 février, est restée sans réponse. `[Claire Berthier, 5 février]`

Digest du lundi :

> **Sans réponse depuis 23 jours** — Confirmation du BAT demandée à Julie Roux (Studio Nord), échéance dépassée le 20 février.
> **Modifié cette semaine** — Livraison Fabrik : 12 mars → 3 avril.

---

## A. Invariants d'architecture

**Séparation écriture / lecture.** L'ingestion est asynchrone et différée. Le chat est synchrone. La base de données est l'unique interface entre les deux.

**Mémoire en couches — on ne relit jamais le corpus.** Un projet de deux ans, c'est ~30 M de tokens. La synthèse est maintenue **à l'écriture**, incrémentalement, jamais reconstruite à la lecture.

| Couche | Contenu | Rôle |
|---|---|---|
| 0 | Archive brute, immuable | Historique, preuve, rejouabilité |
| 1 | Message normalisé, fils, fragments + embeddings | Recherche sémantique |
| 2 | `facts` — engagements, demandes, décisions, échéances | Cœur du produit |
| 3 | `project_state` — document compact, ~3 000 tokens | Toujours chargé en premier |
| 4 | Résumé par fil, ~300 tokens | Contexte intermédiaire |

**Cascade de lecture — s'arrêter dès qu'on a la réponse :**
1. `project_state` (couche 3).
2. Requête SQL sur `facts` (couche 2) — c'est ainsi que « qui n'a pas répondu » devient calculable. Aucun système vectoriel ne sait prouver une absence.
3. Recherche vectorielle filtrée (couche 1).
4. Message brut (couche 0), uniquement pour citer.

**Régénération à l'écriture.** Un fait modifié marque `project_state` obsolète. Le job de nuit régénère les états obsolètes, **une fois par projet et par jour maximum**.

**Versionnement des faits.** `valid_from`, `valid_to`, `superseded_by`. « Où en est-on » = les faits dont `valid_to` est nul. « Comment en est-on arrivé là » = la chaîne de remplacements. Historique et état courant dans la même table.

**Origine des faits.** `origin` vaut `extracted` ou `user`. Un fait d'origine humaine n'est **jamais** écrasé par la réconciliation de nuit ; s'il est contredit par un message postérieur, il est signalé comme contredit, pas remplacé.

**Périmètre d'accès unique.** Tout membre de l'équipe interroge tout le corpus. Pas de liste de contrôle d'accès par fragment.

**Qui a un compte.** En V1, seul l'organisateur du projet possède un compte. Il déclare les adresses des personnes à qui il ouvre le chat ; celles-ci sont libres de créer un compte ou non. L'accès est nominatif et **total** : toute personne autorisée interroge l'intégralité du corpus, sans filtrage par fil ni par paire d'entités. Toute demande de granularité plus fine est un changement d'architecture des couches 1 à 3, pas un réglage — s'arrêter et demander.

**Le corpus est partagé, l'historique de conversation est privé.** Chaque utilisateur a ses propres conversations, invisibles des autres, y compris du chef de projet. Ce sont deux choses distinctes : ne pas confondre avec le périmètre d'accès.

**Aucune réponse sans citation.** Le chat cite ses sources et refuse de conclure au-delà des éléments disponibles. Le domaine a des conséquences contractuelles.

**Sécurité de l'ingestion.** Cinq niveaux de confiance :

| Niveau | Condition | Traitement |
|---|---|---|
| `trusted` | DKIM/SPF valides **et** au moins un membre du projet en expéditeur ou destinataire, hors agent | Ingestion complète |
| `rapporte` | Message imbriqué extrait d'un transfert : pas de DKIM propre, authentifié seulement par le transféreur | Ingéré, faits extraits, mais citation à deux niveaux : source d'origine **et** transféreur. Ne monte jamais à `trusted` |
| `suspect` | Expéditeur connu, aucun autre membre en copie | Stocké, **aucun fait extrait**. Signalé au digest |
| `quarantine` | Expéditeur inconnu, ou aucun membre en copie, ou DKIM/SPF en échec | Non ingéré. Alerte au chef de projet, approbation en un clic |
| `rejected` | Réponse automatique, publicité, liste noire | Supprimé sans alerte |

- **DKIM/SPF est obligatoire** : une adresse d'expéditeur se falsifie trivialement, le contrôle d'appartenance seul est contournable.
- **Postmark fournit un verdict SPF, jamais un verdict DKIM** — constaté sur les six fixtures de `fixtures/inbound/` (Gmail, Outlook, Apple Mail/SFR). Il ajoute son propre `Received-SPF` en tête des `Headers`, reconnaissable à son `receiver=p-pm-inbound…`. Il n'ajoute **aucun** `Authentication-Results`. Les `Authentication-Results` présents sont **ceux de l'émetteur** et ne sont pas un verdict de réception : la fixture Outlook porte `authentication-results: dkim=none (message not signed)` alors qu'elle contient bien un `DKIM-Signature d=courslacordee.fr` valide — Microsoft décrit l'état du message **avant** sa propre signature. Lire cet en-tête comme un verdict mettrait en quarantaine tout expéditeur Microsoft 365. La présence d'un `DKIM-Signature` ne prouve rien non plus : n'importe qui peut en écrire un. **Le lot 2 doit donc trancher : vérifier DKIM nous-mêmes contre `RawEmail` avec une bibliothèque 100 % JavaScript, ou n'exiger que SPF.** Ne pas coder de niveau de confiance avant cet arbitrage.
- **Les noms d'en-têtes varient en casse selon le client** : `Message-Id` chez Apple Mail, `Message-ID` chez Gmail et Outlook, `authentication-results` en minuscules chez Outlook. Toute lecture d'en-tête est insensible à la casse, sans exception.
- **`HtmlBody` peut être vide** : Apple Mail envoie du texte seul. Le nettoyage du corps (lot 3a) part de `TextBody` et ne suppose jamais l'existence d'une partie HTML.
- **Un message imbriqué n'a pas de DKIM.** Seul le transféreur est authentifié. N'importe quel participant peut donc fabriquer une chaîne attribuant un engagement à un tiers. `rapporte` ne monte jamais à `trusted`, et toute citation issue d'un message imbriqué porte les deux sources : l'auteur d'origine et celui qui a transféré.
- **Isolation des instructions** : le contenu des messages n'est jamais concaténé au même niveau que les consignes du modèle. Séparation par balises, consigne explicite indiquant que c'est une donnée à analyser, sortie contrainte par schéma. Un message contenant « ignore les instructions précédentes » doit produire un fait décrivant cette phrase, pas un changement de comportement.
- **Amorçage** : le chef de projet est fiable par définition, il déclare les adresses attendues, les participants apparaissant dans ses fils sont ajoutés automatiquement.

**Adresse de projet à forte entropie.** Partie locale d'au moins 10 caractères aléatoires. Domaine unique en réception attrape-tout, la partie locale servant de clé de projet.

**Frontière d'adaptateur de canal.** Le mot « email » n'apparaît nulle part au-delà de l'adaptateur d'entrée. Tout le pipeline consomme :

```
type NormalizedMessage = {
  source_id, channel_kind, external_id,
  thread_ref: string | null,          // null si le canal n'a pas de fils
  author_external_id, author_label,
  recipients_external_ids: string[],  // vide sur un canal de groupe
  sent_at, body_text, attachments: [...],
  trust_level, trust_reason, raw_key
}
```

`trust_level` est calculé **par l'adaptateur**, jamais par le pipeline. Le seuil de triage est réglable par canal.

**Un transfert est N messages, pas un.** Le décitationnage et le découpage d'une chaîne transférée sont le même problème — repérer les blocs d'en-têtes imbriqués dans un corps — mais l'un jette ce que l'autre conserve. Le pipeline **découpe**, il ne nettoie pas.

- Chercher d'abord une partie MIME `message/rfc822` : un transfert en pièce jointe conserve les en-têtes d'origine intacts, avec vrai `Message-ID`, vraie date et vrai fuseau. C'est le cas fiable, à traiter en priorité.
- À défaut, analyser les séparateurs en clair, propres à chaque client et à chaque langue : `---------- Message transféré ----------`, `Début du message transféré :`, `De : / Envoyé : / À : / Objet :`, `-------- Message transféré --------`, et les préfixes de sujet `Tr:`, `Fwd:`, `FW:`, `WG:`, `RV:`, que l'utilisateur peut aussi avoir effacés.
- **En cas d'échec de reconnaissance, conserver le message entier comme un seul message et n'extraire aucune date absolue de son corps.** Un découpage raté en silence produit des échéances fausses de plusieurs semaines.
- Une date lue dans un en-tête en clair n'a pas de fuseau et est souvent tronquée à la minute : la stocker avec un indicateur de précision, jamais comme une date exacte.
- **Résoudre les dates relatives contre le `sent_at` du message imbriqué, jamais contre celui du transfert.** « Avant vendredi » écrit le 4 février et transféré le 3 avril se résoudrait deux mois trop tard.

**Traçabilité des appels IA.** Aucun appel à un modèle ne se fait hors du wrapper qui journalise dans `llm_runs`, quel que soit le lot. Les prompts vivent dans `lib/prompts/<clé>.ts`, exportent une clé et un numéro de version, et sont **référencés par clé** au point d'appel — jamais écrits en dur dans le code métier. Sans cela le journal ne peut pas dire quelle version a produit quel résultat, et il ne sert à rien.

**Traçabilité des envois.** Aucun e-mail ne part hors de `lib/email/send.ts`, qui refuse tout destinataire absent de `OUTBOUND_ALLOWLIST` tant que `OUTBOUND_UNRESTRICTED` n'est pas explicitement activé. Le risque n'est pas en prévisualisation mais en production, où les projets réels comptent de vrais participants chez plusieurs sociétés : une boucle de digest y écrirait à quinze personnes. À implémenter au lot 5, avec le premier envoi — pas avant.

**Aucun échec silencieux.** Un message qui ne peut pas être traité passe en `ingest_status = 'failed'` avec l'erreur conservée, apparaît dans le bandeau de la vue projet au même titre que la quarantaine, et reste rejouable via `/api/admin/reprocess`. Pour un produit dont la promesse est la mémoire, une perte de donnée invisible est le pire défaut possible.

**Réconciliation d'ingestion.** Le webhook est en poussée : un message que Postmark n'a pas pu remettre — corps trop volumineux, dépassement de délai, fenêtre de déploiement — n'existe nulle part chez nous, et aucun contrôle interne ne peut le détecter. Un job quotidien interroge l'API des messages entrants de Postmark, compare la liste de ce qu'il a reçu avec le contenu de `messages`, et fait remonter tout écart dans le bandeau de la vue projet, au même titre que la quarantaine. C'est la seule défense possible contre les `413`, les dépassements de délai et les fenêtres de déploiement. À implémenter au lot 3.

**Adresses orphelines.** Le domaine est en attrape-tout : n'importe qui peut écrire à une adresse qui ne correspond à aucun projet. Ces messages sont comptés et rejetés sans stockage du contenu. Ne jamais créer de projet implicitement à partir d'une adresse inconnue.

**Langue.** La V1 est en français : interface, prompts d'extraction, énoncés des faits, état du projet, réponses du chat, digest. Le corpus peut être mixte français-anglais ; la sortie ne l'est jamais.

La couture pour les langues suivantes coûte environ une heure et se pose maintenant :
- `projects.language`, par défaut `fr`. **La langue du contenu généré est une propriété du projet, pas de l'utilisateur** — les faits sont stockés sous forme de phrases et partagés par l'équipe ; deux langues par projet obligeraient à régénérer tous les faits à chaque bascule. La langue d'interface, elle, pourra être par utilisateur.
- **Toutes les chaînes d'interface dans un fichier de dictionnaire**, même avec une seule langue dedans. Aucune chaîne en dur dans un composant : c'est la seule couture qui demande de la discipline, et la seule coûteuse à rattraper.
- Les prompts prennent la langue en paramètre, même si elle vaut toujours `fr`.
- Dates et nombres via `Intl`, jamais formatés à la main.

Aucune bibliothèque d'internationalisation, aucune seconde langue en V1 : seulement ces quatre points.

**Abstraction du fournisseur.** Deux fonctions, `extract()` et `analyze()`. La bascule d'un fournisseur à l'autre doit coûter une journée.

**Habilitation en un seul point.** Une fonction `lib/entitlements.ts → canCreateProject(orgId)` renvoyant `{ allowed, reason }`, appelée à la création de projet et nulle part ailleurs. En V1 elle lit une limite en dur. Le jour où la facturation est branchée, elle lit l'abonnement : une fonction à modifier, pas quinze appels dispersés.

**Aucun formulaire de carte, jamais.** Le jour venu, Checkout hébergé par Stripe uniquement : les données de paiement ne touchent pas le serveur, et le périmètre PCI reste hors de portée.

**Logique métier transport-agnostique.** Aucune logique métier dans un composant serveur, une server action ou un handler de route. Tout vit dans `lib/`, sous forme de fonctions prenant `(userId, projectId, params)` et renvoyant des données ; le transport n'est qu'une enveloppe. Cela rend le code testable, et c'est aussi la seule couture nécessaire pour exposer une API JSON le jour où une application mobile la demande — sans elle, il faut déplacer la logique écran par écran.

**Zéro donnée client vers une API hébergée hors UE.**

---

## B. Contraintes de déploiement

**Le squelette marchant d'abord.** Le lot 0 construit la boucle complète, vide, en production : domaine → MX vers Postmark → app Next.js déployée → webhook sur l'URL de production → un e-mail envoyé → visible dans Supabase de production. Tant qu'elle ne tourne pas, aucun autre lot ne commence. Prévoir un environnement `preview` avec son propre projet Supabase.

**Variables d'environnement.** Schéma unique validé par `zod`, importé partout, qui **échoue bruyamment au démarrage** si une variable manque. `.env.example` exhaustif, mis à jour dans le même commit que toute nouvelle variable. Aucune lecture de `process.env` ailleurs.

**Liste canonique.** Trois fichiers doivent dire exactement la même chose, et sont modifiés dans le **même commit** : le tableau ci-dessous, `lib/env.ts`, `.env.example`. Une variable ne figurant pas dans les trois n'existe pas. `.env.local` (ignoré par git, propre à chaque poste) est renseigné d'après `.env.example` ; le tenir à jour est ce qui garde `npm run build` vert en local.

**Une variable que rien ne lit finit par être fausse sans que personne s'en aperçoive** : une variable n'entre dans le schéma qu'au lot où un code la lit réellement, jamais par anticipation.

| Variable | Portée | Introduite au | Rôle |
|---|---|---|---|
| `DATABASE_URL` | serveur | 0a | Pooler en mode transaction, port 6543. Le schéma refuse la connexion directe |
| `SUPABASE_URL` | serveur | 0a | Projet Supabase, pour l'API Storage. **Sans préfixe `NEXT_PUBLIC_` délibérément** |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur | 0a | Contourne RLS. Ne quitte jamais le serveur |
| `INBOUND_DOMAIN` | serveur | 0a | Domaine de réception attrape-tout, sans `@` |
| `POSTMARK_WEBHOOK_USER` | serveur | 0a | Authentification Basic du webhook |
| `POSTMARK_WEBHOOK_PASSWORD` | serveur | 0a | Idem. Unique protection de la route d'ingestion |
| `NEXT_PUBLIC_SUPABASE_URL` | serveur | 1a | Projet Supabase, pour le client d'**authentification** seul |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | serveur | 1a | Clé `anon`. Publique par conception, ne donne accès à rien |
| `SIGNUP_ALLOWLIST` | serveur | 1a | Adresses séparées par des virgules. **Vide = inscription ouverte** |
| `VERCEL_GIT_COMMIT_SHA` | serveur, injectée | 0a | SHA renvoyé par `/api/health`. Optionnelle : absente en local |
| `VERCEL_ENV` | serveur, injectée | 0a | `production` / `preview` / `development`. Optionnelle |
| `NODE_ENV` | serveur, injectée | 0a | Posée par Next.js. Dans le schéma pour que rien ne lise `process.env` hors de `lib/env.ts` |

**Les deux variables `NEXT_PUBLIC_` du lot 1a ne sont pas une entorse à la règle, mais elles méritent l'explication.** Le préfixe n'est pas une convention de nommage : Next.js **inline la valeur dans le bundle client** — mais uniquement pour les occurrences **littérales** de `process.env.NEXT_PUBLIC_…`. Lues via `schema.safeParse(process.env)` dans `lib/env.ts`, elles ne sont pas inlinées et restent serveur : le lot 1a traite le lien magique entièrement en routes et actions serveur. Le préfixe est conservé parce que c'est le nom sous lequel elles sont renseignées dans Vercel, et parce que le jour où un composant client aura besoin du client d'authentification, il les lira sans nouvelle variable. Aucune fuite au demeurant : la clé `anon` est publique par conception et ne donne accès à rien — RLS est activée partout sans policy, et ce client ne touche jamais au schéma `public`.

Variables déjà décidées mais **pas encore dans le schéma**, faute de code qui les lise : `CRON_SECRET` (au premier cron), `OUTBOUND_ALLOWLIST` et `OUTBOUND_UNRESTRICTED` (lot 5, avec le premier envoi).

**Les variables analysées comme des URL sont validées par nous, pas par leurs consommateurs.** `postgres()` et `createClient()` appellent `new URL()` dès leur instanciation : quand l'analyse échoue là-bas, l'erreur est un `TypeError: Invalid URL` nu, sans nom de variable, depuis un chunk anonyme — indiagnosticable en production, où la plateforme masque les valeurs. `lib/env.ts` refait donc l'analyse en amont, et **tout message d'erreur d'une variable de type URL nomme la variable, joint sa valeur tronquée à 30 caractères et sa longueur réelle, et désigne le caractère fautif**. Les identifiants sont masqués avant tout affichage : un aperçu ne doit jamais pouvoir contenir un secret dans un journal de build.

**Tout secret destiné à figurer dans une URL ou un fichier `.env` est strictement alphanumérique.** Cela vaut pour le mot de passe de `DATABASE_URL` comme pour `POSTMARK_WEBHOOK_PASSWORD`. Un caractère hors de cet alphabet se règle en **régénérant le secret**, jamais en l'encodant : l'encodage en pourcentage (`#` → `%23`, `%` → `%25`, ` ` → `%20`) marche, mais il faut y penser à chaque report de valeur, et il suffit de l'oublier une fois. Le piège, pour mémoire : deux comportements divergent entre local et Vercel — dans un fichier `.env`, un `#` non quoté démarre un commentaire et tronque la valeur en silence ; dans le tableau de bord Vercel, la valeur est prise telle quelle. Le même mot de passe passe donc d'un côté et casse de l'autre, et l'échec se présente comme un `TypeError` anonyme. C'est ce qui a fait échouer le premier build de production du lot 0a, preview au vert, au prix de cinq déploiements.

**Aucun client de base ou de Storage n'est instancié au niveau d'un module.** `postgres()` et `createClient()` sont appelés dans `getSql()` et `getStorage()`, à la requête, et mémorisés sur `globalThis`. Instanciés à l'import, ils s'exécutaient pendant la collecte des pages du `next build` : le build dépendait alors de la validité d'une connexion d'exécution, pas seulement de la présence des variables. Ne pas réintroduire de `export const` appelant ces fabriques.

**Runtime.** Postmark **ne signe pas** ses webhooks : il n'existe aucune vérification HMAC, ni en entrée ni en sortie. La protection est l'authentification HTTP Basic encodée dans l'URL du webhook, comparée en **temps constant** avec `crypto.timingSafeEqual`, complétée par la validation de la structure de la charge utile. Le webhook reste en `export const runtime = 'nodejs'`, jamais Edge, mais pour une autre raison : les pièces jointes arrivent en base64 et le traitement demande `Buffer`. Toute route touchant la base → `export const dynamic = 'force-dynamic'`, sinon Next.js tente de la prérendre au build et le build casse en CI alors qu'il passait en local. Bibliothèques **100 % JavaScript** : une dépendance native marchera en local et cassera sur serverless.

**Timeouts.** Aucun traitement lourd dans le chemin de la requête. Le webhook fait trois choses : vérifier l'authentification Basic, écrire le brut, insérer un job. Il répond `200` en moins de 500 ms. Un webhook qui dépasse le timeout est rejoué par Postmark → doublons.

**Charge utile du webhook.** Le contenu brut du message est demandé à Postmark (`Include raw email content`) : sans lui, la couche 0 n'archive pas le message mais l'interprétation qu'en a faite Postmark, et la rejouabilité disparaît — on perd la structure MIME, les encodages exacts, les parties `message/rfc822` et l'intégralité des en-têtes. Contrepartie assumée : les pièces jointes voyagent deux fois, en base64 dans `Attachments` et de nouveau dans le MIME brut. Une fonction Vercel plafonne à **4,5 Mo** de corps de requête et renvoie `413 FUNCTION_PAYLOAD_TOO_LARGE` au-delà ; c'est une limite d'infrastructure qu'aucun réglage de `vercel.json` ne déplace. Le plafond réel de pièce jointe est donc de l'ordre de 1,5 à 2 Mo, et au-delà le message est perdu — d'où la réconciliation d'ingestion de la section A.

**Base de données.** Chaîne de connexion **du pooler en mode transaction** (port 6543), jamais la connexion directe : serverless + Postgres direct = épuisement des connexions en production, invisible en local. La clé `service_role` ne quitte jamais le serveur. Migrations = **fichiers SQL versionnés dans le dépôt**, appliqués par la CLI Supabase ; aucune modification via l'interface web. `create extension if not exists vector;` dans la première migration. **RLS activée dès la première migration.**

Le pooler en mode transaction **ne gère pas les requêtes préparées** : avec `postgres.js`, passer `prepare: false`. Sans cela le code marche en local, sur connexion directe, et échoue en production. Les migrations ne passent pas par le pooler : `supabase link --project-ref <ref>` puis `supabase db push`.

**Clés étrangères différées.** Une colonne qui référence une table pas encore créée est posée en `uuid null`, **sans contrainte**. La contrainte est ajoutée par la migration du lot qui crée la table cible. C'est le cas de `messages.source_id` et `messages.thread_id`, posées au lot 0a, contraintes au lot 3a. Sans cette règle, la première migration devrait créer des tables vides dont personne ne connaît encore les colonnes.

**L'exposition automatique des tables au Data API est désactivée sur les deux projets Supabase.** Toute migration créant une table doit donc inclure `grant select, insert, update, delete on public.<table> to service_role;` et **rien** à `anon` ni à `authenticated`. Sans ce `grant`, même `service_role` reçoit `42501 permission denied for table`.

**RLS est un filet de sécurité, pas le mécanisme d'accès.** Le navigateur ne parle jamais directement à Supabase : tout passe par le serveur Next.js, via les fonctions de `lib/` de signature `(userId, projectId, params)`, avec la clé `service_role` qui contourne RLS par conception. RLS est activée sur toutes les tables, **sans aucune policy**, ce qui refuse tout aux clés `anon` et `authenticated`. Le contrôle d'accès réel vit dans `lib/` et nulle part ailleurs. Envisager un accès client direct exigerait d'écrire des policies exhaustives au préalable — jamais au fil de l'eau.

**Une seule exception, l'authentification (lot 1a).** `lib/supabase/auth.ts` est le seul client Supabase dont la clé puisse un jour atteindre le navigateur, et le seul qui n'utilise pas `service_role` : il porte la clé `anon` et **ne parle qu'à `auth.*`, jamais au schéma `public`**. Tout accès aux données métier reste dans `lib/`, avec `service_role`, côté serveur. **Écrire une lecture de `public.*` avec le client d'authentification est une erreur de chemin** : passer par `getSql()` de `lib/supabase/server.ts`.

**Une ressource inaccessible renvoie 404, jamais 403.** Un 403 confirmerait l'existence de la ressource à quelqu'un qui devine des identifiants — or l'adresse de projet est précisément protégée par un suffixe aléatoire. Les fonctions de `lib/projects/queries.ts` renvoient donc `null` aussi bien pour un projet inexistant que pour un projet inaccessible, et les pages en font un `notFound()`. Il n'existe pas de variante « sans vérification d'accès » : l'appartenance est vérifiée dans la requête SQL elle-même, par jointure sur `organization_members`.

**Un projet archivé ingère toujours, ne traite jamais.** Il continue de recevoir et de stocker les e-mails envoyés à son adresse — jamais de perte silencieuse de correspondance — mais ne fait tourner aucun traitement, aucune extraction, aucun digest. Le lot 0a ne filtre déjà pas sur `projects.status` à la résolution de l'adresse, et c'est volontaire. Archiver libère une place dans le quota de l'organisation ; c'est ce qui permet de clore un chantier terminé sans changer de plan.

**Cron.** Routes HTTP protégées par un `CRON_SECRET` comparé en temps constant. Vérifier la fréquence minimale autorisée par le plan avant de concevoir la cadence.

**Régions.** Fonctions Vercel et projet Supabase dans la même région européenne. En production : fonctions à Paris (`cdg1`), Supabase en région UE correspondante.

**Protection de déploiement.** Les previews Vercel peuvent renvoyer `401` aux webhooks. Le webhook pointe **toujours** vers le domaine de production.

**Exploitabilité.** Journalisation structurée JSON avec `request_id` propagé de bout en bout. Ne jamais journaliser l'en-tête `Authorization`. Le brut de chaque message est stocké et `/api/admin/reprocess` permet de le retraiter : sans cela, chaque bug d'ingestion en production coûte une demi-journée.

**Idempotence.** Clé sur `Message-ID` pour les messages reçus directement. Un message imbriqué extrait d'un transfert n'en a pas — il a disparu au rendu : lui calculer une **empreinte synthétique** sur (adresse d'expéditeur normalisée, date analysée à la minute, sujet normalisé, N premiers caractères du corps nettoyé). Cette empreinte est calculée **aussi** pour les messages reçus directement, sans quoi le même message reçu en copie puis retrouvé dans un transfert produira deux faits identiques. Le recouvrement est le cas normal, pas l'exception : on transfère une suite justement parce qu'une partie manque, donc l'autre partie est déjà en base.

**Git et retour arrière.** `main` est la production. Toute évolution passe par une branche et son déploiement de prévisualisation. En cas de problème en production, le retour arrière se fait par la promotion du déploiement précédent sur Vercel, pas par un correctif dans l'urgence.

**Migrations.** Appliquées à `omnisc-preview`, puis à `omnisc-prod`, via `supabase link --project-ref <ref>` puis `supabase db push`. Pas d'étape locale : `supabase start` réclame Docker Desktop, et la préversion remplit ce rôle. Jamais directement en production, même si le chemin e-mail se développe contre elle. Une migration destructive doit être précédée d'une sauvegarde explicite.

**Fin de lot.** Aucun lot n'est terminé tant qu'il n'est pas déployé **et vérifié** en production.

**Constats de production.** Relevés à la vérification du lot 0a, le 31 août 2026.

- **Postmark ne renvoie pas les CRLF dans `RawEmail`** : ni les charges utiles reçues ni les fixtures n'en contiennent. La vérification DKIM contre le brut stocké est donc impossible. Le lot 2 s'appuiera sur SPF. **Décision à confirmer au lot 2.**
- **Postmark n'expose pas de rejeu manuel d'un message entrant depuis l'activité.** L'idempotence sur `(project_id, message_id_header)` n'a pas pu être vérifiée en production ; elle le sera au lot 3a.

---

## B bis. Design

**`DESIGN.md`, à la racine, est la source de vérité visuelle.** Le bloc ci-dessous en reprend les règles non négociables ; pour toute décision qui n'y figure pas, ouvrir `DESIGN.md`.

- La source unique des valeurs est un objet TypeScript (`design/tokens.ts`) ; `globals.css` et les constantes hexadécimales du digest e-mail en sont **dérivés**, jamais saisis séparément. Une seule source évite que le web et l'e-mail divergent, et c'est aussi ce qui rendra les tokens consommables hors du web plus tard.
- **Aucune valeur hexadécimale, aucune taille ni espacement en dur** dans un composant. Tout passe par les variables CSS et les classes Tailwind correspondantes.
- Si une valeur manque, on l'ajoute d'abord à `DESIGN.md`, puis à `design/tokens.ts`, puis on l'utilise. Jamais l'inverse : c'est ainsi qu'on se retrouve avec quarante valeurs ponctuelles.
- **On n'édite jamais un composant de `components/ui/` pour un besoin ponctuel.** Si une variante manque, on ajoute une variante au composant.
- Une seule exception au premier point : le digest e-mail, où les variables CSS ne fonctionnent pas. Les valeurs hexadécimales et les polices système du bloc e-mail de `DESIGN.md` s'y appliquent, et nulle part ailleurs.
- Mode clair uniquement en V1. La structure des variables prévoit le mode sombre, on ne l'implémente pas.
- Desktop d'abord, largeur de référence 1440 px.
- **Ordre d'installation impératif** : `shadcn/ui` s'initialise **avant** l'écriture des tokens. Son initialisation écrase `app/globals.css` ; dans l'autre ordre, les tokens sont perdus silencieusement, sans erreur. Fait au lot 0b — ne vaut que pour une réinitialisation.
- **Tailwind v4 : il n'y a pas de `tailwind.config.ts`.** Le thème se déclare en CSS dans `@theme` au sein de `app/globals.css`. Ce fichier ne contient aucune valeur : il rattache les variables de `design/tokens.ts` aux espaces de noms Tailwind (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--animate-*`). Les valeurs sont injectées dans `:root` par `app/layout.tsx` via `themeCss()`. Ne jamais écrire une couleur ou une cote dans `globals.css`.
- **L'échelle d'espacement est en pixels** : `--spacing` vaut 1px, donc `p-18` fait exactement 18px et `px-17` 17px. Les seules valeurs permises sont celles de `spaceScale` (`design/tokens.ts`), qui transcrit `DESIGN.md` §3.

**Règles visuelles — thème beige, seul livré.**

- **La couleur porte le sens, jamais la décoration.** `--accent` (terracotta) : boutons primaires, liens, sources citées, valeurs mises en avant. `--alert` : retards, jours de silence, échéances dépassées, purge. `--ok` : engagements tenus, connecteurs actifs, projets actifs. Tout le reste est neutre, en `--text2` ou `--text3`. Une couleur employée hors de ce tableau est un défaut.
- **Trois surfaces empilées au maximum**, et jamais plus : `--bg` (page), `--glass` (cartes), `--glass2` (en-têtes, lignes survolées), `--glass3` (champs, puces, boutons secondaires). Ni dégradé de fond, ni ombre colorée hors bouton primaire, ni teinte nouvelle.
- **Bordure et ombre vont ensemble** : toute carte est `border 1px --stroke` + `--shade` + le liseré `--inset`, qui est systématique sur toute surface `--glass` et n'est jamais optionnel. Une carte mise en avant remplace `--stroke` par `--accent-line`, ou par `--alert-line` si le sujet est un manque.
- **Rien n'a un rayon nul.** Le rayon décroît avec l'imbrication : 32 → 26 → 20 → 16. Pilules, boutons, badges et chips sont à `999px`.
- **Densité d'une ligne de liste** : `padding 12-14px 20px`, `border-top 1px --hair`, libellé à 13-14px, sous-texte à 11,5-12px en `--text3` posé 4px dessous, `:hover { background: --glass2 }`. L'en-tête de tableau est à `14px 20px` sur `--glass2`, 11,5px, `--text3`.
- **Un élément en retard ou silencieux se signale par un badge**, pas par une ligne rouge : `--alert` sur `--alert-soft`, 11px, rayon `999px`, libellé `Retard 3 j` ou `9 j`. Le rouge ne colore jamais le fond d'une ligne entière.
- **Toute donnée affichée porte sa source, sinon elle n'est pas affichée.** La citation est une pilule `--accent` sur `--accent-soft`, bordée `--accent-line`, 11px, au format `Objet du fil · JJ/MM ↗`, toujours suffixée par la flèche et **jamais tronquée** — `white-space: nowrap`, y compris en dernière colonne d'un tableau.
- **Le refus de réponse a sa propre forme** : encart `--alert-soft` bordé `--alert-line`. Ne jamais le rendre comme une réponse ordinaire.
- **Typographie** : Manrope seule, aucune seconde famille, jamais d'italique, jamais de `text-transform: uppercase`. `tabular-nums` partout — c'est ce qui aligne les chiffres des tableaux et des KPI. `text-wrap: pretty` sur les paragraphes et les titres.
- **Mouvement** : deux courbes seulement, `cubic-bezier(.16,1,.3,1)` en entrée (.75s à 1.4s) et `cubic-bezier(.32,.72,0,1)` en interaction (.3s à .5s). Les survols autorisés sont `translateY(-2px)` sur un bouton, `-3px` sur un KPI, `-4px` sur une carte, `translateX(4px)` sur une ligne, `scale(1.02-1.04)` sur un petit bouton, et le changement de fond d'une ligne de tableau. Rien d'autre.
- **Ton** : français, phrases courtes, pas de superlatif, pas d'emoji. Les libellés nomment un fait — « Ce qui manque », « Demandes sans réponse », « jours de silence ». Durées et retards en `9 j` / `Retard 3 j`, dates en `JJ/MM`, montants en `79 € HT / mois`.
- **Aucune chaîne de texte en dur dans un composant** : tout passe par `lib/i18n/fr.ts`, même avec une seule langue. Dates et nombres via `lib/i18n/format.ts`, qui appelle `Intl` — jamais un formatage à la main.

> Ces règles sont un extrait. **Pour toute valeur, tout composant et tout cas non tranché ici, `DESIGN.md` fait foi** — en particulier ses §2 (échelle typographique complète), §3 (valeurs d'espacement autorisées), §6 (les douze composants et leurs cotes) et §8 (layouts d'écran). Les valeurs elles-mêmes sont dans `design/tokens.ts`, qui transcrit `DESIGN.md` ; `/design` les affiche toutes.

---

## C. Stack

| Brique | Choix |
|---|---|
| Application | Next.js 15 App Router, TypeScript strict |
| Hébergement | Vercel Pro, fonctions région `cdg1` (Paris) |
| Base | Supabase — PostgreSQL, pgvector, Auth, Storage, RLS — région UE |
| E-mail entrant et sortant | Postmark, serveur Live `omnisc-prod` |
| Domaine de réception | `in.omnisc-ai.fr`, lu depuis `INBOUND_DOMAIN`. La base ne stocke que `projects.inbound_local_part` ; le domaine n'apparaît **nulle part en dur**, le nom du produit n'étant pas arrêté |
| File de traitement | Table `jobs` + Vercel Cron |
| PDF | `unpdf`, JavaScript pur. Pas d'OCR |
| Embeddings | `text-embedding-3-small` |
| Triage et extraction | Mistral Small 4 |
| Chat, réconciliation, digest | Claude Sonnet |
| Chemin d'écriture | En mode batch, schéma d'extraction mis en cache |
| Paiement | Hors V1 — liens de paiement manuels, habilitations mises à jour à la main sur `organizations` |

---

## D. Schéma de données

```
organizations     id, name, plan, max_active_projects, trial_ends_at,
                  billing_status, created_at
projects          id, owner_org_id, name, inbound_local_part, vertical,
                  language, status, created_at
organization_members  org_id, user_id, role, created_at
sources           id, project_id, kind ('email'|'drive'|'upload'|…),
                  config, last_sync_at
identities        id, project_id, canonical_name, org_domain, role
email_addresses   address, identity_id, project_id, verified_at
messages          id, project_id, source_id, message_id_header, in_reply_to,
                  references[], thread_id, from_address, to[], cc[], sent_at,
                  subject, body_clean, raw_key, channel_kind, trust_level,
                  trust_reason, fingerprint, ingest_status, ingest_error,
                  created_at
attachments       id, message_id, filename, mime, storage_key, text
threads           id, project_id, subject_norm, first_seen, last_seen,
                  digest, digest_stale
facts             id, project_id, source_message_id, type, actor_id,
                  counterpart_id, statement, due_date, status, origin,
                  valid_from, valid_to, superseded_by, confidence
project_state     project_id, content, token_count, rebuilt_at, stale
chunks            id, project_id, source_id, content, embedding
memberships       project_id, user_id, identity_id, role
conversations     id, project_id, user_id, title, created_at
chat_messages     id, conversation_id, role, content, citations[], llm_run_id
quarantine        id, project_id, raw_key, from_address, reason, resolved_by
jobs              id, project_id, kind, payload, status, attempts,
                  run_after, last_error
llm_runs          id, project_id, task, model, prompt_key, prompt_version,
                  input_tokens, output_tokens, cost_estimate, latency_ms,
                  status, error, source_message_id, result_ref, created_at
```

- `identities` / `email_addresses` : séparation **indispensable**. Une même personne apparaît sous plusieurs adresses ; sans réconciliation, aucun suivi d'engagement n'est fiable.
- `facts.type` : `engagement`, `demande`, `decision`, `echeance`, `risque`. `facts.status` : `ouvert`, `satisfait`, `remplace`, `annule`. `facts.origin` : `extracted`, `user`.
- `messages.ingest_status` : `pending`, `processing`, `done`, `skipped`, `failed`. `failed` doit être visible dans l'interface, pas seulement en base. `messages.ingest_error` conserve l'erreur en clair : aucun échec silencieux.
- `messages.message_id_header` est l'en-tête **RFC `Message-ID`**, lu dans `Headers` de la charge utile Postmark — **pas** le champ `MessageID` de premier niveau, qui est l'identifiant interne de Postmark. Repli sur `postmark:<MessageID>` quand l'en-tête est absent. C'est la clé de l'index unique `(project_id, message_id_header)`.
- `messages.fingerprint` : empreinte synthétique d'idempotence de la section A. Colonne créée au lot 0a pour éviter une migration ultérieure sur la table la plus chargée ; **remplie au lot 3b**, nulle avant. Index unique partiel `where fingerprint is not null`.
- `messages."to"` et `messages."references"` sont des mots réservés SQL : toujours cités entre guillemets doubles dans les requêtes.
- **`organization_members` et `memberships` sont deux tables distinctes, et les confondre casserait l'une des deux** (tranché au lot 1a). `organization_members` répond à « qui possède l'abonnement » : la ligne existe dès la première connexion, avant qu'aucun projet n'existe, et son `user_id` est **NOT NULL** — on n'appartient pas à une organisation sans compte. `memberships`, de portée projet, répond à « qui peut lire ce projet », y compris quelqu'un qui n'a pas encore de compte. Créée au lot 1b.
- **Format de l'adresse de projet** : `<préfixe lisible>-<suffixe aléatoire de 4 caractères>`, par exemple `levee-de-fonds-startup-k9m2`. Trois raisons au suffixe, aucune n'est cosmétique : l'unicité de `inbound_local_part` est **globale à toute la base**, donc deux clients nommant leur projet « Rénovation » entreraient en collision ; une adresse dérivable du seul nom est **énumérable** ; et une adresse mal recopiée part vers une adresse orpheline, que le lot 0a journalise et abandonne **sans rebond** — une perte silencieuse de correspondance, le pire mode de défaillance du produit. L'alphabet du suffixe exclut `0`, `o`, `1`, `l` et `i` : l'adresse est dictée au téléphone.
- **Le suffixe fait toujours 4 caractères ; c'est le PRÉFIXE qu'on complète.** Un préfixe de moins de 5 caractères lisibles est complété à 5 par des caractères du même alphabet non ambigu, séparés par un tiret : « PV » donne `pv-xyz-k9m2`. La raison est en base — `inbound_local_part` porte `check (char_length >= 10)`, qui vient de l'exigence de forte entropie de la section A — et le plus court résultat possible fait donc exactement 10 caractères. **Ne jamais allonger le suffixe à la place** : une longueur variable rendrait le format imprévisible et déplacerait la frontière préfixe/suffixe selon le nom. Les 4 derniers caractères sont le suffixe, dans tous les cas.
- **`projects.slug` a été supprimée au lot 1a.** Elle n'a jamais eu de rôle distinct de `inbound_local_part`, aucun code ne l'a lue, et `/p/[slug]` résout sur `inbound_local_part`. Renommer un projet ne change ni son adresse ni son URL — l'adresse figure en copie de fils déjà en cours — donc un slug renommable était exclu et un slug figé n'aurait été qu'un doublon. `projects.name` la remplace comme libellé.
- **`memberships.user_id` est nullable.** Une invitation est une ligne avec `identity_id` renseigné et `user_id` vide, résolue à l'inscription par appariement de l'adresse vérifiée. Sans cela il est impossible d'ouvrir le chat à quelqu'un qui n'a pas encore de compte — or c'est le cas nominal, les participants étant libres de s'inscrire ou non.
- `conversations.user_id` : c'est ce qui rend l'historique de chat privé.
- **L'abonnement appartient à l'organisation, jamais au projet ni à l'utilisateur.** La grille tarifaire se compte en projets actifs inclus, et le titulaire du compte doit être l'entreprise pour que le projet survive au départ de son chef de projet. `projects.status` : `active`, `archived` — archiver libère une place.
- `llm_runs.task` : `triage`, `extract`, `reconcile`, `state`, `chat`, `digest`.
- Pas de liste de contrôle d'accès sur `chunks` : conséquence du périmètre unique.

---

## E. Hors périmètre — ne pas coder

Claude Code a tendance à anticiper ; c'est ce qui fait déraper les délais.

- Stripe, Checkout, webhooks de facturation, portail client, TVA, factures — seuls les champs d'abonnement sur `organizations` et la fonction `canCreateProject` sont posés
- OCR, lecture de plans, fichiers CAO
- Connecteurs Drive et SharePoint
- Tout adaptateur de messagerie, Telegram compris — seule la frontière `NormalizedMessage` est construite
- Transcription de notes vocales, analyse d'images
- Tableau de bord configurable, vues nommées, filtres ou tri paramétrables, export, partage externe
- Création ou édition de faits par l'utilisateur, hors le bouton « ce fait est faux »
- Interface d'inspection de `llm_runs` — la table existe, l'écran attend la V1.1
- Agents spécialisés par métier
- Application mobile, PWA, manifeste, service worker, API JSON — seule la règle « logique métier dans `lib/` » est appliquée
- Tests exhaustifs — uniquement le harnais d'évaluation de l'extraction et des tests sur le parsing e-mail
- Seconde langue, bibliothèque d'internationalisation, sélecteur de langue — seules les quatre coutures de la section A sont posées
- Mise en cache sophistiquée, files externes, microservices
- Tout écran ne figurant pas dans la liste des écrans de la V1

---

## F. Règle de conduite

**Ne pas deviner.** S'il manque une décision — un nom de champ, un comportement, un choix d'affichage — s'arrêter et demander, au lieu d'inventer. Une décision inventée devient une convention en une session et un défaut structurel en cinq. C'est le principal mode de dérive sur une vingtaine de sessions.

**Un lot = une session = un `/clear`.** Chaque lot se termine sur un état déployé et vérifié en production, jamais sur une production cassée, et met à jour la section Avancement de ce fichier avant de se clore.
