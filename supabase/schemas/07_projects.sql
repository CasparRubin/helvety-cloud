-- projects: ciphertext-only content blob for project content; workspace-scoped
-- categorizations are stored on the workspace, not the project.

create table public.projects (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index projects_workspace_updated_idx on public.projects (workspace_id, updated_at);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.projects force row level security;
