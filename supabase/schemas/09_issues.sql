-- issues: ciphertext-only content; plaintext FKs + sort + tombstone.

create table public.issues (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index issues_project_id_idx on public.issues (project_id);
create index issues_project_updated_idx on public.issues (project_id, updated_at);

create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

alter table public.issues enable row level security;
alter table public.issues force row level security;
