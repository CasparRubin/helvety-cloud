-- notes: workspace-scoped ciphertext; optional project_id for filing filters.
-- Task (and other) associations live in entity_links (P8a), not a notes.task_id column.

create table public.notes (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index notes_workspace_id_idx on public.notes (workspace_id);
create index notes_workspace_updated_idx on public.notes (workspace_id, updated_at);
create index notes_workspace_project_idx on public.notes (workspace_id, project_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.notes force row level security;

create policy notes_select_member
  on public.notes
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy notes_insert_member
  on public.notes
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy notes_update_member
  on public.notes
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy notes_delete_member
  on public.notes
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.notes from anon, public;
grant select, insert, update, delete on table public.notes to authenticated;
revoke truncate, references, trigger on table public.notes from authenticated;
