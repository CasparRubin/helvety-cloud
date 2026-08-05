-- P18: databases + tables (Dataverse-style modeling) and entity_links extensions.

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

create table public.tables (
  id uuid primary key,
  database_id uuid not null references public.databases (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  is_pinned boolean not null default false,
  pin_sort_order bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tables_database_id_idx on public.tables (database_id);
create index tables_database_updated_idx on public.tables (database_id, updated_at);
create index tables_database_created_idx on public.tables (database_id, created_at desc);

create trigger tables_set_updated_at
  before update on public.tables
  for each row execute function public.set_updated_at();

alter table public.tables enable row level security;
alter table public.tables force row level security;

create policy tables_select_member
  on public.tables
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.databases d
      where d.id = database_id
        and public.is_workspace_member(d.workspace_id)
    )
  );

create policy tables_insert_member
  on public.tables
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.databases d
      where d.id = database_id
        and public.is_workspace_member(d.workspace_id)
    )
  );

create policy tables_update_member
  on public.tables
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.databases d
      where d.id = database_id
        and public.is_workspace_member(d.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.databases d
      where d.id = database_id
        and public.is_workspace_member(d.workspace_id)
    )
  );

create policy tables_delete_member
  on public.tables
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.databases d
      where d.id = database_id
        and public.is_workspace_member(d.workspace_id)
    )
  );

revoke all on table public.tables from anon, public;
grant select, insert, update, delete on table public.tables to authenticated;
revoke truncate, references, trigger on table public.tables from authenticated;

alter table public.entity_links
  drop constraint entity_links_source_kind_check,
  drop constraint entity_links_target_kind_check,
  drop constraint entity_links_allowed_pair;

alter table public.entity_links
  add constraint entity_links_source_kind_check
    check (source_kind in ('note', 'task', 'contact', 'project', 'board', 'database', 'table')),
  add constraint entity_links_target_kind_check
    check (target_kind in ('note', 'task', 'contact', 'project', 'board', 'database', 'table')),
  add constraint entity_links_allowed_pair check (
    (least(source_kind, target_kind), greatest(source_kind, target_kind)) in (
      ('board', 'contact'),
      ('board', 'database'),
      ('board', 'note'),
      ('board', 'project'),
      ('board', 'table'),
      ('board', 'task'),
      ('contact', 'database'),
      ('contact', 'note'),
      ('contact', 'project'),
      ('contact', 'table'),
      ('contact', 'task'),
      ('database', 'note'),
      ('database', 'task'),
      ('note', 'project'),
      ('note', 'table'),
      ('note', 'task'),
      ('table', 'task')
    )
  );
