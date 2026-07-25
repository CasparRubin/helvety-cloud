-- P8a: entity_links junction; migrate notes.task_id → links; drop notes.task_id.

create table public.entity_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_kind text not null
    check (source_kind in ('note', 'task', 'contact', 'project')),
  source_id uuid not null,
  target_kind text not null
    check (target_kind in ('note', 'task', 'contact', 'project')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint entity_links_no_self check (
    source_kind <> target_kind or source_id <> target_id
  ),
  constraint entity_links_unique_edge unique (
    workspace_id, source_kind, source_id, target_kind, target_id
  )
);

create index entity_links_workspace_source_idx
  on public.entity_links (workspace_id, source_kind, source_id);

create index entity_links_workspace_target_idx
  on public.entity_links (workspace_id, target_kind, target_id);

alter table public.entity_links enable row level security;
alter table public.entity_links force row level security;

create policy entity_links_select_member
  on public.entity_links
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy entity_links_insert_member
  on public.entity_links
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy entity_links_update_member
  on public.entity_links
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy entity_links_delete_member
  on public.entity_links
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.entity_links from anon, public;
grant select, insert, update, delete on table public.entity_links to authenticated;
revoke truncate, references, trigger on table public.entity_links from authenticated;

-- Migrate legacy single task link into the junction.
insert into public.entity_links (workspace_id, source_kind, source_id, target_kind, target_id)
select n.workspace_id, 'note', n.id, 'task', n.task_id
from public.notes n
where n.task_id is not null
on conflict do nothing;

drop index if exists public.notes_workspace_task_idx;
alter table public.notes drop constraint if exists notes_task_id_fkey;
alter table public.notes drop column if exists task_id;
