-- Contribution events: planned sessions where multiple participants contribute.
-- e.g. a film shooting day, a workshop, a hackathon sprint.

create table if not exists contribution_events (
  id                   uuid        primary key default gen_random_uuid(),
  project_id           uuid        not null references projects(id) on delete cascade,
  event_date           date        not null,
  description          text        not null,
  location             text,
  status               text        not null check (status in ('planned', 'occurred', 'cancelled')),
  contribution_type_id uuid        references contribution_types(id) on delete set null,
  default_amount       numeric,
  created_at           timestamptz not null default now(),
  created_by           text
);

-- Intended participants for an event
create table if not exists contribution_event_participants (
  id                      uuid primary key default gen_random_uuid(),
  contribution_event_id   uuid not null references contribution_events(id) on delete cascade,
  participant_id          uuid not null references participants(id) on delete cascade,
  unique (contribution_event_id, participant_id)
);

create index if not exists contribution_events_project_id_idx
  on contribution_events (project_id);

create index if not exists contribution_event_participants_event_id_idx
  on contribution_event_participants (contribution_event_id);
