Le lot 0 crée ce fichier à la racine. Il contient les sections ci-dessous, plus le résumé du produit et l'exemple travaillé de la section 2.3, plus une ligne d'avancement que chaque lot met à jour. C'est la mémoire du projet entre les sessions.

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

**Le corpus est partagé, l'historique de conversation est privé.** Chaque utilisateur a ses propres conversations, invisibles des autres, y compris du chef de projet. Ce sont deux choses distinctes : ne pas confondre avec le périmètre d'accès.

**Aucune réponse sans citation.** Le chat cite ses sources et refuse de conclure au-delà des éléments disponibles. Le domaine a des conséquences contractuelles.

**Sécurité de l'ingestion.** Quatre niveaux de confiance :

| Niveau | Condition | Traitement |
|---|---|---|
| `trusted` | DKIM/SPF valides **et** au moins un membre du projet en expéditeur ou destinataire, hors agent | Ingestion complète |
| `suspect` | Expéditeur connu, aucun autre membre en copie | Stocké, **aucun fait extrait**. Signalé au digest |
| `quarantine` | Expéditeur inconnu, ou aucun membre en copie, ou DKIM/SPF en échec | Non ingéré. Alerte au chef de projet, approbation en un clic |
| `rejected` | Réponse automatique, publicité, liste noire | Supprimé sans alerte |

- **DKIM/SPF est obligatoire** : une adresse d'expéditeur se falsifie trivialement, le contrôle d'appartenance seul est contournable.
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

**Traçabilité des appels IA.** Aucun appel à un modèle ne se fait hors du wrapper qui journalise dans `llm_runs`, quel que soit le lot. Les prompts vivent dans `lib/prompts/<clé>.ts`, exportent une clé et un numéro de version, et sont **référencés par clé** au point d'appel — jamais écrits en dur dans le code métier. Sans cela le journal ne peut pas dire quelle version a produit quel résultat, et il ne sert à rien.

**Aucun échec silencieux.** Un message qui ne peut pas être traité passe en `ingest_status = 'failed'` avec l'erreur conservée, apparaît dans le bandeau de la vue projet au même titre que la quarantaine, et reste rejouable via `/api/admin/reprocess`. Pour un produit dont la promesse est la mémoire, une perte de donnée invisible est le pire défaut possible.

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

## B. Contraintes de déploiement

**Le squelette marchant d'abord.** Le lot 0 construit la boucle complète, vide, en production : domaine → MX vers Postmark → app Next.js déployée → webhook sur l'URL de production → un e-mail envoyé → visible dans Supabase de production. Tant qu'elle ne tourne pas, aucun autre lot ne commence. Prévoir un environnement `preview` avec son propre projet Supabase.

**Variables d'environnement.** Schéma unique validé par `zod`, importé partout, qui **échoue bruyamment au démarrage** si une variable manque. `.env.example` exhaustif, mis à jour dans le même commit que toute nouvelle variable. Aucune lecture de `process.env` ailleurs.

**Runtime.** Le webhook Postmark exige le corps brut pour vérifier la signature → `export const runtime = 'nodejs'`, jamais Edge. Toute route touchant la base → `export const dynamic = 'force-dynamic'`, sinon Next.js tente de la prérendre au build et le build casse en CI alors qu'il passait en local. Bibliothèques **100 % JavaScript** : une dépendance native marchera en local et cassera sur serverless.

**Timeouts.** Aucun traitement lourd dans le chemin de la requête. Le webhook fait trois choses : vérifier la signature, écrire le brut, insérer un job. Il répond `200` en moins de 500 ms. Un webhook qui dépasse le timeout est rejoué par Postmark → doublons.

**Base de données.** Chaîne de connexion **du pooler en mode transaction** (port 6543), jamais la connexion directe : serverless + Postgres direct = épuisement des connexions en production, invisible en local. La clé `service_role` ne quitte jamais le serveur. Migrations = **fichiers SQL versionnés dans le dépôt**, appliqués par la CLI Supabase ; aucune modification via l'interface web. `create extension if not exists vector;` dans la première migration. **RLS activée dès la première migration.**

**Cron.** Routes HTTP protégées par un `CRON_SECRET` comparé en temps constant. Vérifier la fréquence minimale autorisée par le plan avant de concevoir la cadence.

**Régions.** Fonctions Vercel et projet Supabase dans la même région européenne.

**Protection de déploiement.** Les previews Vercel peuvent renvoyer `401` aux webhooks. Le webhook pointe **toujours** vers le domaine de production.

**Exploitabilité.** Journalisation structurée JSON avec `request_id` propagé de bout en bout. Le brut de chaque message est stocké et `/api/admin/reprocess` permet de le retraiter : sans cela, chaque bug d'ingestion en production coûte une demi-journée. Idempotence de bout en bout, clé sur `Message-ID`.

**Git et retour arrière.** `main` est la production. Toute évolution passe par une branche et son déploiement de prévisualisation. En cas de problème en production, le retour arrière se fait par la promotion du déploiement précédent sur Vercel, pas par un correctif dans l'urgence.

**Migrations.** Testées en local via la CLI Supabase, puis appliquées au projet de prévisualisation, puis à la production. Jamais directement en production, même si le chemin e-mail se développe contre elle. Une migration destructive doit être précédée d'une sauvegarde explicite.

**Fin de lot.** Aucun lot n'est terminé tant qu'il n'est pas déployé **et vérifié** en production.


## B bis. Design

**`DESIGN.md`, à la racine, est la source de vérité visuelle.** Le bloc ci-dessous en reprend les règles non négociables ; pour toute décision qui n'y figure pas, ouvrir `DESIGN.md`.

- La source unique des valeurs est un objet TypeScript (`design/tokens.ts`) ; `globals.css` et les constantes hexadécimales du digest e-mail en sont **dérivés**, jamais saisis séparément. Une seule source évite que le web et l'e-mail divergent, et c'est aussi ce qui rendra les tokens consommables hors du web plus tard.
- **Aucune valeur hexadécimale, aucune taille ni espacement en dur** dans un composant. Tout passe par les variables CSS et les classes Tailwind correspondantes.
- Si une valeur manque, on l'ajoute d'abord à `DESIGN.md` et à `globals.css`, puis on l'utilise. Jamais l'inverse : c'est ainsi qu'on se retrouve avec quarante valeurs ponctuelles.
- **On n'édite jamais un composant de `components/ui/` pour un besoin ponctuel.** Si une variante manque, on ajoute une variante au composant.
- Une seule exception au premier point : le digest e-mail, où les variables CSS ne fonctionnent pas. Les valeurs hexadécimales et les polices système du bloc e-mail de `DESIGN.md` s'y appliquent, et nulle part ailleurs.
- Mode clair uniquement en V1. La structure des variables prévoit le mode sombre, on ne l'implémente pas.
- Desktop d'abord, largeur de référence 1440 px.

## C. Stack

| Brique | Choix |
|---|---|
| Application | Next.js 15 App Router, TypeScript strict |
| Hébergement | Vercel Pro, région UE |
| Base | Supabase — PostgreSQL, pgvector, Auth, Storage, RLS — région UE |
| E-mail entrant et sortant | Postmark |
| File de traitement | Table `jobs` + Vercel Cron |
| PDF | `unpdf`, JavaScript pur. Pas d'OCR |
| Embeddings | `text-embedding-3-small` |
| Triage et extraction | Mistral Small 4 |
| Chat, réconciliation, digest | Claude Sonnet |
| Chemin d'écriture | En mode batch, schéma d'extraction mis en cache |
| Paiement | Hors V1 — liens de paiement manuels, habilitations mises à jour à la main sur `organizations` |

## D. Schéma de données

```
organizations     id, name, plan, max_active_projects, trial_ends_at,
                  billing_status, created_at
projects          id, owner_org_id, slug, inbound_local_part, vertical,
                  language, status, created_at
sources           id, project_id, kind ('email'|'drive'|'upload'|…),
                  config, last_sync_at
identities        id, project_id, canonical_name, org_domain, role
email_addresses   address, identity_id, project_id, verified_at
messages          id, project_id, source_id, message_id_header, in_reply_to,
                  references[], thread_id, from_address, to[], cc[], sent_at,
                  subject, body_clean, raw_key, channel_kind, trust_level,
                  trust_reason, ingest_status
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
- `messages.ingest_status` : `pending`, `processing`, `done`, `skipped`, `failed`. `failed` doit être visible dans l'interface, pas seulement en base.
- `conversations.user_id` : c'est ce qui rend l'historique de chat privé.
- **L'abonnement appartient à l'organisation, jamais au projet ni à l'utilisateur.** La grille tarifaire se compte en projets actifs inclus, et le titulaire du compte doit être l'entreprise pour que le projet survive au départ de son chef de projet. `projects.status` : `active`, `archived` — archiver libère une place.
- `llm_runs.task` : `triage`, `extract`, `reconcile`, `state`, `chat`, `digest`.
- Pas de liste de contrôle d'accès sur `chunks` : conséquence du périmètre unique.

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
- Tout écran ne figurant pas dans la liste de la section 3

Deux pièges du mode transaction :

Il ne prend pas en charge les requêtes préparées. Si le code utilise postgres.js, il faut prepare: false ; sinon ça marche en local et échoue en production.
Les migrations ne passent pas par lui : elles s'appliquent via supabase link --project-ref <ref> puis supabase db push, qui utilise la connexion directe.