-- Run this in the Supabase SQL editor (Dashboard → SQL editor)
-- or via: supabase db push

-- System-level roles table.
-- Only rows for OWNER exist here; absence of a row = regular USER.
create table if not exists user_roles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null unique,
  role        text        not null check (role = 'OWNER'),
  created_at  timestamptz not null default now(),
  created_by  text
);

-- Per-project membership and role.
create table if not exists project_members (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references projects(id) on delete cascade,
  user_id     uuid        not null,
  email       text        not null,
  role        text        not null check (role in ('PROJECT_ADMIN', 'USER')),
  created_at  timestamptz not null default now(),
  created_by  text,
  unique (project_id, user_id)
);

-- Indexes for common lookups
create index if not exists project_members_project_id_idx on project_members (project_id);
create index if not exists project_members_user_id_idx    on project_members (user_id);
