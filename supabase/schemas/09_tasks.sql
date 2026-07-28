-- tasks: ciphertext-only content; plaintext FKs + categorization ids + sort + tombstone.
-- label_id / stage_id / priority_id are soft refs to option UUIDs inside workspace ciphertext.
-- milestone_id is a real FK to milestones (ON DELETE SET NULL).

create table public.tasks (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  label_id uuid,
  stage_id uuid,
  priority_id uuid,
  milestone_id uuid references public.milestones (id) on delete set null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_project_updated_idx on public.tasks (project_id, updated_at);
create index tasks_project_stage_idx on public.tasks (project_id, stage_id);
create index tasks_project_priority_idx on public.tasks (project_id, priority_id);
create index tasks_project_label_idx on public.tasks (project_id, label_id);
create index tasks_project_milestone_idx on public.tasks (project_id, milestone_id);
create index tasks_milestone_id_idx on public.tasks (milestone_id)
  where milestone_id is not null;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;
