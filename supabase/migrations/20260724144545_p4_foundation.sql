-- Shared helpers for P4 vault schema (timestamps).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- profiles: 1:1 with auth.users (non-secret account row).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
-- user_crypto: public key + wrapped key material (ciphertext opaque to server).

create table public.user_crypto (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  public_key text not null,
  wrapped_user_key jsonb not null,
  wrapped_private_key jsonb not null,
  prf_salt text not null,
  key_check jsonb not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_crypto_key_version_positive check (key_version > 0)
);

create trigger user_crypto_set_updated_at
  before update on public.user_crypto
  for each row execute function public.set_updated_at();

alter table public.user_crypto enable row level security;
alter table public.user_crypto force row level security;
-- workspaces: client-generated UUIDs; metadata only (no content ciphertext).

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
-- workspace_members: membership + role for RLS.

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('owner', 'admin', 'member'))
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

alter table public.workspace_members enable row level security;
alter table public.workspace_members force row level security;
-- Membership check used by workspace-scoped RLS policies.
-- security definer avoids recursive RLS on workspace_members.

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
-- projects: ciphertext-only content blob; plaintext FKs + sort + tombstone.

create table public.projects (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encrypted_blob jsonb,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index projects_workspace_updated_idx on public.projects (workspace_id, updated_at);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.projects force row level security;
-- wrapped_keys: per-member sealed workspace/project keys.

create table public.wrapped_keys (
  subject_type text not null,
  subject_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  wrapped_key jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (subject_type, subject_id, user_id),
  constraint wrapped_keys_subject_type_check check (subject_type in ('workspace', 'project'))
);

create index wrapped_keys_user_id_idx on public.wrapped_keys (user_id);

create trigger wrapped_keys_set_updated_at
  before update on public.wrapped_keys
  for each row execute function public.set_updated_at();

alter table public.wrapped_keys enable row level security;
alter table public.wrapped_keys force row level security;
-- issues: ciphertext-only content; plaintext FKs + sort + tombstone.

create table public.issues (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index issues_project_id_idx on public.issues (project_id);
create index issues_project_updated_idx on public.issues (project_id, updated_at);

create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

alter table public.issues enable row level security;
alter table public.issues force row level security;
-- RLS policies (after tables + is_workspace_member).

-- profiles
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_crypto
create policy user_crypto_select_own
  on public.user_crypto
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy user_crypto_insert_own
  on public.user_crypto
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy user_crypto_update_own
  on public.user_crypto
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- workspaces
create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (public.is_workspace_member(id));

create policy workspaces_insert_self
  on public.workspaces
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy workspaces_update_member
  on public.workspaces
  for update
  to authenticated
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

-- workspace_members
create policy workspace_members_select_member
  on public.workspace_members
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy workspace_members_insert_self_owner
  on public.workspace_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.created_by = (select auth.uid())
    )
  );

create policy workspace_members_delete_self
  on public.workspace_members
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- projects
create policy projects_select_member
  on public.projects
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy projects_insert_member
  on public.projects
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy projects_update_member
  on public.projects
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy projects_delete_member
  on public.projects
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- wrapped_keys
create policy wrapped_keys_select_own
  on public.wrapped_keys
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy wrapped_keys_insert_own
  on public.wrapped_keys
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        subject_type = 'workspace'
        and public.is_workspace_member(subject_id)
      )
      or (
        subject_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = subject_id
            and public.is_workspace_member(p.workspace_id)
        )
      )
    )
  );

create policy wrapped_keys_update_own
  on public.wrapped_keys
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wrapped_keys_delete_own
  on public.wrapped_keys
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- issues
create policy issues_select_member
  on public.issues
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_insert_member
  on public.issues
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_update_member
  on public.issues
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_delete_member
  on public.issues
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
-- Explicit GRANTs (Data API auto-expose is OFF). No vault access for anon.

revoke all on table public.profiles from anon, public;
revoke all on table public.user_crypto from anon, public;
revoke all on table public.workspaces from anon, public;
revoke all on table public.workspace_members from anon, public;
revoke all on table public.projects from anon, public;
revoke all on table public.wrapped_keys from anon, public;
revoke all on table public.issues from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_crypto to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.wrapped_keys to authenticated;
grant select, insert, update, delete on table public.issues to authenticated;
