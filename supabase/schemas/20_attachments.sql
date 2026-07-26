-- attachments: workspace-scoped E2EE file metadata (P11).
-- Ciphertext bytes live in private Storage bucket encrypted-attachments.
-- Server sees sizes/paths/status only — never filenames, MIME, or plaintext bytes.

create table public.attachments (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encrypted_meta jsonb not null,
  wrapped_dek jsonb not null,
  byte_size bigint not null check (byte_size >= 0),
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint attachments_storage_path_unique unique (storage_path)
);

create index attachments_workspace_id_idx on public.attachments (workspace_id);
create index attachments_workspace_status_idx
  on public.attachments (workspace_id, status)
  where deleted_at is null;

create trigger attachments_set_updated_at
  before update on public.attachments
  for each row execute function public.set_updated_at();

alter table public.attachments enable row level security;
alter table public.attachments force row level security;

create policy attachments_select_member
  on public.attachments
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy attachments_insert_member
  on public.attachments
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy attachments_update_member
  on public.attachments
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy attachments_delete_member
  on public.attachments
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.attachments from anon, public;
grant select, insert, update, delete on table public.attachments to authenticated;
revoke truncate, references, trigger on table public.attachments from authenticated;

-- attachment_links: plaintext parent → attachment junction for list + cascade cleanup.
create table public.attachment_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_kind text not null
    check (parent_kind in ('note', 'task', 'contact')),
  parent_id uuid not null,
  attachment_id uuid not null references public.attachments (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint attachment_links_unique unique (
    workspace_id, parent_kind, parent_id, attachment_id
  )
);

create index attachment_links_workspace_parent_idx
  on public.attachment_links (workspace_id, parent_kind, parent_id);

create index attachment_links_attachment_idx
  on public.attachment_links (attachment_id);

alter table public.attachment_links enable row level security;
alter table public.attachment_links force row level security;

create policy attachment_links_select_member
  on public.attachment_links
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy attachment_links_insert_member
  on public.attachment_links
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy attachment_links_update_member
  on public.attachment_links
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy attachment_links_delete_member
  on public.attachment_links
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.attachment_links from anon, public;
grant select, insert, update, delete on table public.attachment_links to authenticated;
revoke truncate, references, trigger on table public.attachment_links from authenticated;
