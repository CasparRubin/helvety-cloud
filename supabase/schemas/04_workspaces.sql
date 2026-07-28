-- workspaces: client-generated UUIDs; encrypted_blob stores workspace name plus
-- workspace-scoped task categorizations (labels / stages / priorities).

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references public.profiles (id),
  encrypted_blob jsonb not null,
  kind text not null default 'standard'
    check (kind in ('personal', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_created_by_idx on public.workspaces (created_by);

-- At most one Personal workspace per created_by.
create unique index workspaces_one_personal_per_owner_idx
  on public.workspaces (created_by)
  where kind = 'personal';

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
