-- ─────────────────────────────────────────────────────────────────────────────
-- 0003 — Invitations d'organisation
--
-- Lot 1b. Rappels des règles de migration (CLAUDE.md, section B) :
--   · `enable row level security` sur chaque nouvelle table, sans policy ;
--   · `grant … to service_role` sur chaque nouvelle table, rien à `anon` ni à
--     `authenticated` — l'exposition automatique au Data API étant désactivée,
--     sans ce grant même `service_role` reçoit 42501.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- organization_invitations
--
-- UNE INVITATION NE CRÉE AUCUN COMPTE. Elle pose une ligne portant un jeton. La
-- personne suit le lien, se connecte par lien magique — le chemin d'inscription
-- normal, inchangé — et c'est seulement à ce moment que `organization_members`
-- est écrite. Pré-créer l'utilisateur par l'API admin de Supabase laisserait un
-- compte orphelin derrière chaque invitation jamais acceptée.
--
-- PORTÉE ORGANISATION, JAMAIS PROJET. L'invitation donne accès à tous les
-- projets de l'organisation, présents et futurs — conséquence directe de
-- l'invariant « périmètre d'accès unique » de la section A. Tout libellé
-- d'interface nomme donc l'organisation, jamais un projet.
--
-- LE JETON EST STOCKÉ EN CLAIR, ET C'EST UN CHOIX. Aucun e-mail ne part avant
-- le lot 5 : le propriétaire copie le lien depuis l'écran d'organisation et le
-- transmet lui-même, éventuellement plusieurs jours après l'avoir créé. Un
-- stockage haché interdirait de réafficher ce lien. Le jeton n'est pas un mot
-- de passe — il ne donne qu'une chose, devenir `member` d'une organisation — il
-- expire, et il est révocable. Ne pas le remplacer par une empreinte.
--
-- LES COLONNES D'ENVOI SONT POSÉES DÈS MAINTENANT alors que rien ne les lit
-- encore : `email`, `token`, `expires_at`, `invited_by`. L'envoi automatique de
-- l'invitation est voulu et reporté au lot 5, avec `lib/email/send.ts` et son
-- garde-fou `OUTBOUND_ALLOWLIST`. Aucune migration ne sera nécessaire ce jour-là.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.organization_invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  -- Toujours écrite en minuscules et détourée par le code, jamais telle que saisie.
  email        text not null,
  -- Une invitation donne toujours `member`. Le `check` fige l'invariant en base
  -- plutôt que dans la seule mémoire de la prochaine session.
  role         text not null default 'member'
                 check (role = 'member'),
  token        text not null unique,
  expires_at   timestamptz not null,
  invited_by   uuid references auth.users (id) on delete set null,
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Une seule invitation EN ATTENTE par adresse et par organisation. Le prédicat
-- partiel est ce qui autorise à réinviter quelqu'un qu'on a révoqué, ou dont
-- l'invitation a été acceptée puis l'appartenance retirée.
create unique index if not exists organization_invitations_pending_idx
  on public.organization_invitations (org_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- Chemin de lecture nominal : les invitations d'une organisation.
create index if not exists organization_invitations_org_idx
  on public.organization_invitations (org_id);

alter table public.organization_invitations enable row level security;

grant select, insert, update, delete on public.organization_invitations to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Un seul `owner` par organisation — l'invariant, matérialisé en base.
--
-- « Mon organisation » se définit comme celle où l'utilisateur est `owner`, et
-- le code du lot 1b tient pour acquis qu'il y en a exactement une :
-- `getOwnedOrganization` renvoie une ligne, pas une liste, et
-- `ensureOrganizationForUser` ne cherche plus une appartenance quelconque mais
-- une appartenance `owner`. Sans cet index, un second `owner` inséré par erreur
-- ferait diverger ces deux fonctions en silence.
--
-- Le jour où deux associés partageront un abonnement, cet invariant devra être
-- levé EXPLICITEMENT, par une migration qui supprime cet index — pas contourné
-- au cas par cas dans le code.
--
-- Le garde ci-dessous échoue AVANT la création de l'index. `create unique index`
-- échouerait de toute façon sur un doublon, mais avec un message qui nomme
-- l'index et pas le problème ; on préfère une erreur qui dit quoi faire.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  offenders integer;
begin
  select count(*) into offenders
    from (
      select org_id
        from public.organization_members
       where role = 'owner'
       group by org_id
      having count(*) > 1
    ) as duplicates;

  if offenders > 0 then
    raise exception
      'Migration 0003 interrompue : % organisation(s) ont plusieurs owner. '
      'L''invariant « un seul owner par organisation » (CLAUDE.md, section A) '
      'est violé. Corriger les données avant de rejouer cette migration.',
      offenders;
  end if;
end
$$;

create unique index if not exists organization_members_single_owner_idx
  on public.organization_members (org_id)
  where role = 'owner';
