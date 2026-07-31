-- P17: boards (E2EE canvas) + entity_links board pairs

create table public.boards (
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

create index boards_workspace_id_idx on public.boards (workspace_id);
create index boards_workspace_updated_idx on public.boards (workspace_id, updated_at);
create index boards_workspace_created_idx on public.boards (workspace_id, created_at desc);

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

alter table public.boards enable row level security;
alter table public.boards force row level security;

create policy boards_select_member
  on public.boards
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy boards_insert_member
  on public.boards
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy boards_update_member
  on public.boards
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy boards_delete_member
  on public.boards
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.boards from anon, public;
grant select, insert, update, delete on table public.boards to authenticated;
revoke truncate, references, trigger on table public.boards from authenticated;

-- Widen entity_links kinds + allowed pairs for board placements.
alter table public.entity_links
  drop constraint entity_links_source_kind_check;

alter table public.entity_links
  drop constraint entity_links_target_kind_check;

alter table public.entity_links
  drop constraint entity_links_allowed_pair;

alter table public.entity_links
  add constraint entity_links_source_kind_check
  check (source_kind in ('note', 'task', 'contact', 'project', 'board'));

alter table public.entity_links
  add constraint entity_links_target_kind_check
  check (target_kind in ('note', 'task', 'contact', 'project', 'board'));

alter table public.entity_links
  add constraint entity_links_allowed_pair check (
    (least(source_kind, target_kind), greatest(source_kind, target_kind)) in (
      ('board', 'contact'),
      ('board', 'note'),
      ('board', 'project'),
      ('board', 'task'),
      ('contact', 'note'),
      ('contact', 'project'),
      ('contact', 'task'),
      ('note', 'project'),
      ('note', 'task')
    )
  );
