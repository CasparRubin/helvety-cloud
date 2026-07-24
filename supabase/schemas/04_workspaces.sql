-- workspaces: client-generated UUIDs; metadata only (no content ciphertext).

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_created_by_idx on public.workspaces (created_by);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
