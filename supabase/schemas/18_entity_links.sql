-- entity_links: constrained cross-entity links for reverse lookup without
-- decrypting content. Intentional metadata: Helvety sees linked ids,
-- never titles or colors.

create table public.entity_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_kind text not null
    check (source_kind in ('note', 'task', 'contact', 'project', 'board')),
  source_id uuid not null,
  target_kind text not null
    check (target_kind in ('note', 'task', 'contact', 'project', 'board')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint entity_links_no_self check (
    source_kind <> target_kind or source_id <> target_id
  ),
  constraint entity_links_allowed_pair check (
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
