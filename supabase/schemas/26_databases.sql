-- databases: workspace-scoped E2EE Dataverse-style data model containers (P18).

create table public.databases (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  is_pinned boolean not null default false,
  pin_sort_order bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index databases_workspace_id_idx on public.databases (workspace_id);
create index databases_workspace_updated_idx on public.databases (workspace_id, updated_at);
create index databases_workspace_created_idx on public.databases (workspace_id, created_at desc);

create trigger databases_set_updated_at
  before update on public.databases
  for each row execute function public.set_updated_at();

alter table public.databases enable row level security;
alter table public.databases force row level security;

create policy databases_select_member
  on public.databases
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy databases_insert_member
  on public.databases
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy databases_update_member
  on public.databases
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy databases_delete_member
  on public.databases
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.databases from anon, public;
grant select, insert, update, delete on table public.databases to authenticated;
revoke truncate, references, trigger on table public.databases from authenticated;
