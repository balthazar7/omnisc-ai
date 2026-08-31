-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_init — Lot 0a, squelette marchant
--
-- Quatre tables seulement : organizations, projects, messages, jobs.
-- Les autres tables de la section D de CLAUDE.md viennent à leur lot.
--
-- Règles appliquées (CLAUDE.md, section B) :
--  · RLS activée sur chaque table, SANS AUCUNE POLICY. Le navigateur ne parle
--    jamais directement à Supabase : tout passe par lib/ avec la clé
--    service_role, qui contourne RLS par conception. RLS est un filet.
--  · L'exposition automatique des tables au Data API est désactivée sur les
--    deux projets : sans `grant … to service_role`, même service_role reçoit
--    `42501 permission denied for table`.
--  · Clés étrangères différées : une colonne référençant une table qui n'existe
--    pas encore est créée en `uuid null`, sans contrainte. La contrainte est
--    ajoutée par la migration du lot qui crée la table cible.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- organizations — le titulaire de l'abonnement. Jamais le projet, jamais
-- l'utilisateur : le projet doit survivre au départ de son chef de projet.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  plan                 text not null default 'trial',
  max_active_projects  integer not null default 1,
  trial_ends_at        timestamptz,
  billing_status       text not null default 'trial',
  created_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- projects
-- `inbound_local_part` : la base ne stocke QUE la partie locale. Le domaine
-- vient de INBOUND_DOMAIN et doit rester modifiable sans migration.
-- Au moins 10 caractères (section A : adresse de projet à forte entropie).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  owner_org_id        uuid not null references public.organizations (id) on delete restrict,
  slug                text not null,
  inbound_local_part  text not null unique
                        check (char_length(inbound_local_part) >= 10),
  vertical            text,
  language            text not null default 'fr',
  status              text not null default 'active'
                        check (status in ('active', 'archived')),
  created_at          timestamptz not null default now(),
  unique (owner_org_id, slug)
);

-- La résolution du projet à l'ingestion se fait sur la partie locale en
-- minuscules : l'index doit être insensible à la casse.
create unique index if not exists projects_inbound_local_part_lower_idx
  on public.projects (lower(inbound_local_part));

-- ─────────────────────────────────────────────────────────────────────────────
-- messages — couche 0/1. `raw_key` pointe l'archive brute immuable dans Storage.
--
-- Colonnes en clé étrangère différée (aucune contrainte ici) :
--   · source_id  → table `sources`, lot 3a
--   · thread_id  → table `threads`, lot 3a
--
-- Colonnes remplies par un lot ultérieur :
--   · trust_level, trust_reason      → lot 2
--   · body_clean, in_reply_to, "references", thread_id, source_id → lot 3a
--   · fingerprint                    → lot 3b
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  source_id          uuid,
  message_id_header  text not null,
  in_reply_to        text,
  "references"       text[] not null default '{}',
  thread_id          uuid,
  from_address       text,
  "to"               text[] not null default '{}',
  cc                 text[] not null default '{}',
  sent_at            timestamptz,
  subject            text,
  body_clean         text,
  raw_key            text,
  channel_kind       text not null default 'email',
  trust_level        text,
  trust_reason       text,
  -- Empreinte synthétique d'idempotence (section A). Remplie au lot 3b.
  fingerprint        text,
  ingest_status      text not null default 'pending'
                       check (ingest_status in ('pending', 'processing', 'done', 'skipped', 'failed')),
  -- Aucun échec silencieux : l'erreur de traitement est conservée en clair et
  -- remonte dans le bandeau de la vue projet.
  ingest_error       text,
  created_at         timestamptz not null default now()
);

-- Clé d'idempotence du lot 0a : un même Message-ID n'est ingéré qu'une fois par
-- projet, quel que soit le nombre de rejeux Postmark.
create unique index if not exists messages_project_message_id_idx
  on public.messages (project_id, message_id_header);

-- Empreinte synthétique : index unique partiel, la colonne restant nulle
-- jusqu'au lot 3b.
create unique index if not exists messages_project_fingerprint_idx
  on public.messages (project_id, fingerprint)
  where fingerprint is not null;

create index if not exists messages_project_sent_at_idx
  on public.messages (project_id, sent_at desc);

-- Le bandeau de la vue projet liste les messages en échec.
create index if not exists messages_ingest_status_idx
  on public.messages (project_id, ingest_status)
  where ingest_status in ('pending', 'failed');

-- ─────────────────────────────────────────────────────────────────────────────
-- jobs — file de traitement. La table existe au lot 0a ; rien ne la consomme
-- avant le lot 3a.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'failed')),
  attempts    integer not null default 0,
  run_after   timestamptz not null default now(),
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists jobs_pending_idx
  on public.jobs (status, run_after)
  where status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — activée partout, aucune policy. Refuse tout aux clés `anon` et
-- `authenticated`. Envisager un accès client direct exigerait d'écrire des
-- policies exhaustives au préalable, jamais au fil de l'eau.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.projects      enable row level security;
alter table public.messages      enable row level security;
alter table public.jobs          enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants — service_role uniquement. Rien à anon ni à authenticated.
-- ─────────────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.organizations to service_role;
grant select, insert, update, delete on public.projects      to service_role;
grant select, insert, update, delete on public.messages      to service_role;
grant select, insert, update, delete on public.jobs          to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage — bucket `raw`, privé. Archive immuable de la couche 0.
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('raw', 'raw', false)
on conflict (id) do nothing;
