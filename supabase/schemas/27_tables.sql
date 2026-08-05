-- tables: E2EE Dataverse-style table definitions nested under databases (P18).
-- Columns, relationships, and sample rows live in encrypted_blob (client-only).

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
