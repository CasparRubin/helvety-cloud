-- tasks: ciphertext-only content; plaintext FKs + sort + tombstone.

create table public.tasks (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_project_updated_idx on public.tasks (project_id, updated_at);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;
