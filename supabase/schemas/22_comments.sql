-- comments: workspace-scoped E2EE comments on tasks, notes, and contacts.
-- Replies are the same table via parent_comment_id (self-FK).
-- Parent binding is plaintext metadata (like attachment_links); body is ciphertext.

create table public.comments (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_kind text not null
    check (parent_kind in ('task', 'note', 'contact')),
  parent_id uuid not null,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  encrypted_blob jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_workspace_parent_created_idx
  on public.comments (workspace_id, parent_kind, parent_id, created_at);

create index comments_parent_comment_id_idx
  on public.comments (parent_comment_id)
  where parent_comment_id is not null;

create index comments_author_id_idx
  on public.comments (author_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- Freeze parent binding and author after create (body ciphertext may change).
create or replace function public.comments_freeze_parent_and_author()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'comments.workspace_id is immutable'
      using errcode = 'P0001';
  end if;
  if new.parent_kind is distinct from old.parent_kind then
    raise exception 'comments.parent_kind is immutable'
      using errcode = 'P0001';
  end if;
  if new.parent_id is distinct from old.parent_id then
    raise exception 'comments.parent_id is immutable'
      using errcode = 'P0001';
  end if;
  if new.parent_comment_id is distinct from old.parent_comment_id then
    raise exception 'comments.parent_comment_id is immutable'
      using errcode = 'P0001';
  end if;
  if new.author_id is distinct from old.author_id then
    raise exception 'comments.author_id is immutable'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.comments_freeze_parent_and_author()
  from public, anon, authenticated;

create trigger comments_freeze_parent_and_author
  before update on public.comments
  for each row execute function public.comments_freeze_parent_and_author();

alter table public.comments enable row level security;
alter table public.comments force row level security;

create policy comments_select_member
  on public.comments
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy comments_insert_member
  on public.comments
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy comments_update_member
  on public.comments
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy comments_delete_member
  on public.comments
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.comments from anon, public;
grant select, insert, update, delete on table public.comments to authenticated;
revoke truncate, references, trigger on table public.comments from authenticated;
