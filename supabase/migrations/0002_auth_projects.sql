-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 — Authentification, appartenance à une organisation, adresse de projet
--
-- Lot 1a. Rappels des règles de migration (CLAUDE.md, section B) :
--   · `enable row level security` sur chaque nouvelle table, sans policy ;
--   · `grant … to service_role` sur chaque nouvelle table, rien à `anon` ni à
--     `authenticated` — l'exposition automatique au Data API étant désactivée,
--     sans ce grant même `service_role` reçoit 42501 ;
--   · une colonne référençant une table pas encore créée reste `uuid null`,
--     sans contrainte.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- organization_members — lien utilisateur ↔ organisation, avec son rôle.
--
-- POURQUOI UNE TABLE DISTINCTE DE `memberships` (section D).
-- Ce sont deux concepts différents, et les confondre casserait l'un des deux :
--
--   · organization_members répond à « qui possède l'abonnement ». L'abonnement
--     appartient à l'organisation, jamais au projet ni à l'utilisateur, pour que
--     le projet survive au départ de son chef de projet. La ligne existe dès la
--     première connexion, avant qu'aucun projet n'existe — un lien de portée
--     projet ne le pourrait pas.
--
--   · `memberships` (portée projet, `user_id` NULLABLE, `identity_id`) répond à
--     « qui peut lire ce projet », y compris quelqu'un qui n'a pas encore de
--     compte : une invitation est une ligne avec `identity_id` renseigné et
--     `user_id` vide, résolue à l'inscription par appariement de l'adresse
--     vérifiée. C'est le cas nominal, les participants étant libres de
--     s'inscrire ou non. Cette table est créée au lot 1b, avec le code qui la lit.
--
-- `user_id` est ici NOT NULL, à la différence de `memberships` : on n'appartient
-- pas à une organisation sans compte.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.organization_members (
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner'
                check (role in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Le chemin de lecture nominal est « de quelle organisation cet utilisateur
-- est-il membre ». La clé primaire commence par org_id et ne le sert pas.
create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

alter table public.organization_members enable row level security;

grant select, insert, update, delete on public.organization_members to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- projects.name — le nom lisible, jusqu'ici absent.
--
-- `inbound_local_part` est dérivé du nom à la création puis figé ; il ne peut
-- pas servir de libellé, puisque renommer ne le change pas. Le nom est donc une
-- colonne à part entière. Reporté en section D de CLAUDE.md.
--
-- ORDRE IMPORTANT : la colonne est remplie depuis `slug` AVANT que `slug` ne
-- soit supprimée, sinon le libellé des projets existants serait perdu.
-- `coalesce` retombe sur la partie locale pour une ligne sans slug.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.projects add column if not exists name text;

update public.projects
   set name = coalesce(name, slug, inbound_local_part)
 where name is null;

alter table public.projects alter column name set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- projects.slug — suppression, une fois `name` remplie.
--
-- La colonne n'a jamais eu de rôle distinct de `inbound_local_part` : la section
-- D les listait toutes deux sans départager, et aucun code ne l'a jamais lue.
-- Le lot 1a tranche pour un jeton unique. Deux raisons :
--
--   · `/p/[slug]` résout sur `inbound_local_part`, et renommer un projet ne
--     change ni son adresse ni son URL — l'adresse figure en copie de fils déjà
--     en cours. Un slug renommable était donc exclu, et un slug figé n'aurait
--     été qu'un doublon.
--   · Deux valeurs toujours identiques sous deux noms finissent par diverger.
--
-- La contrainte `unique (owner_org_id, slug)` disparaît avec la colonne.
-- L'unicité qui compte est celle de `inbound_local_part`, GLOBALE à la base et
-- insensible à la casse — c'est elle que l'ingestion résout.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.projects drop column if exists slug;
