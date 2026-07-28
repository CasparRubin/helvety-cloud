-- contacts: workspace address book; ciphertext-only identity fields.

create table public.contacts (
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

create index contacts_workspace_id_idx on public.contacts (workspace_id);
create index contacts_workspace_updated_idx on public.contacts (workspace_id, updated_at);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
alter table public.contacts force row level security;

create policy contacts_select_member
  on public.contacts
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy contacts_insert_member
  on public.contacts
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy contacts_update_member
  on public.contacts
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy contacts_delete_member
  on public.contacts
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.contacts from anon, public;
grant select, insert, update, delete on table public.contacts to authenticated;
revoke truncate, references, trigger on table public.contacts from authenticated;
