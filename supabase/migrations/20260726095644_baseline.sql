-- Clean development baseline generated from supabase/schemas/*.sql.

-- Shared helpers for P4 vault schema (timestamps).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers keep working as table owner; clients must not call this via RPC.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

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

-- Trigger-only: not callable via PostgREST RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;

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

-- workspaces: client-generated UUIDs; plaintext display metadata only.

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references public.profiles (id),
  name text not null,
  kind text not null default 'standard'
    check (kind in ('personal', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_created_by_idx on public.workspaces (created_by);

-- At most one Personal workspace per owner.
create unique index workspaces_one_personal_per_owner_idx
  on public.workspaces (created_by)
  where kind = 'personal';

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

-- SECURITY DEFINER membership check — bypasses RLS on workspace_members so
-- policies on other tables (and workspace_members INSERT) do not recurse.
-- Own-row SELECT on workspace_members remains; do not use this helper there.

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
  encrypted_blob jsonb not null,
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

-- milestones: project-scoped ciphertext; title/description/startDate/endDate in blob.
-- Must load before 09_tasks.sql (tasks.milestone_id FK).

create table public.milestones (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index milestones_project_id_idx on public.milestones (project_id);
create index milestones_project_updated_idx on public.milestones (project_id, updated_at);

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

alter table public.milestones enable row level security;
alter table public.milestones force row level security;

create policy milestones_select_member
  on public.milestones
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

create policy milestones_insert_member
  on public.milestones
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

create policy milestones_update_member
  on public.milestones
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

create policy milestones_delete_member
  on public.milestones
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

revoke all on table public.milestones from anon, public;
grant select, insert, update, delete on table public.milestones to authenticated;
revoke truncate, references, trigger on table public.milestones from authenticated;

-- policy_acceptances: plaintext signup gates (ToS, Privacy, AUP, E2EE ack).
-- Append-only: users may insert/select own rows; no update/delete for clients.

create table public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy text not null
    check (policy in ('tos', 'privacy', 'aup', 'e2ee')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy, version)
);

create index policy_acceptances_user_id_idx
  on public.policy_acceptances (user_id);

alter table public.policy_acceptances enable row level security;
alter table public.policy_acceptances force row level security;

-- tasks: ciphertext-only content; plaintext FKs + categorization ids + sort + tombstone.
-- label_id / stage_id / priority_id are soft refs to option UUIDs inside project ciphertext.
-- milestone_id is a real FK to milestones (ON DELETE SET NULL).

create table public.tasks (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  label_id uuid,
  stage_id uuid,
  priority_id uuid,
  milestone_id uuid references public.milestones (id) on delete set null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_project_updated_idx on public.tasks (project_id, updated_at);
create index tasks_project_stage_idx on public.tasks (project_id, stage_id);
create index tasks_project_priority_idx on public.tasks (project_id, priority_id);
create index tasks_project_label_idx on public.tasks (project_id, label_id);
create index tasks_project_milestone_idx on public.tasks (project_id, milestone_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

-- RLS policies. Membership via is_workspace_member (SECURITY DEFINER).
-- workspace_members SELECT is own-row only.

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

-- workspaces (created_by allows owner read before membership row exists)
create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_workspace_member(id)
  );

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

-- workspace_members (own row only — do not call is_workspace_member here)
create policy workspace_members_select_own
  on public.workspace_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

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

-- tasks
create policy tasks_select_member
  on public.tasks
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

create policy tasks_insert_member
  on public.tasks
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

create policy tasks_update_member
  on public.tasks
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

create policy tasks_delete_member
  on public.tasks
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

-- policy_acceptances (own rows only; append-only)
create policy policy_acceptances_select_own
  on public.policy_acceptances
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy policy_acceptances_insert_own
  on public.policy_acceptances
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Explicit GRANTs (Data API auto-expose is OFF). No vault access for anon.

revoke all on table public.profiles from anon, public;
revoke all on table public.user_crypto from anon, public;
revoke all on table public.workspaces from anon, public;
revoke all on table public.workspace_members from anon, public;
revoke all on table public.projects from anon, public;
revoke all on table public.wrapped_keys from anon, public;
revoke all on table public.tasks from anon, public;
revoke all on table public.policy_acceptances from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_crypto to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.wrapped_keys to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert on table public.policy_acceptances to authenticated;

-- Match intended privileges: no TRUNCATE / REFERENCES / TRIGGER for clients.
revoke truncate, references, trigger on table public.profiles from authenticated;
revoke truncate, references, trigger on table public.user_crypto from authenticated;
revoke truncate, references, trigger on table public.workspaces from authenticated;
revoke truncate, references, trigger on table public.workspace_members from authenticated;
revoke truncate, references, trigger on table public.projects from authenticated;
revoke truncate, references, trigger on table public.wrapped_keys from authenticated;
revoke truncate, references, trigger on table public.tasks from authenticated;
revoke truncate, references, trigger on table public.policy_acceptances from authenticated;

-- Platform helper (not defined here); clients must not call it via RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- notes: workspace-scoped ciphertext; optional project_id for filing filters.
-- Cross-entity task/contact links live in entity_links.

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

-- contacts: workspace address book; ciphertext-only identity fields.

create table public.contacts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
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

-- P6e: workspace invitations (email-targeted; client-sealed workspace key).
-- Lifecycle: create → claim (invitee + public key) → seal (owner) → accept
-- (membership + wrapped_keys atomically). Server never sees plaintext keys.

create or replace function public.is_workspace_admin(ws_id uuid)
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
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

create or replace function public.normalized_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

revoke all on function public.normalized_auth_email() from public;
grant execute on function public.normalized_auth_email() to authenticated;

create table public.workspace_invitations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles (id),
  role text not null,
  claimed_by uuid references public.profiles (id),
  claimed_public_key text,
  claimed_at timestamptz,
  sealed_workspace_key jsonb,
  sealed_at timestamptz,
  sealed_by uuid references public.profiles (id),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_invitations_role_check check (role in ('admin', 'member')),
  constraint workspace_invitations_email_check check (
    email = lower(trim(email))
    and position('@' in email) > 1
    and char_length(email) <= 320
  ),
  constraint workspace_invitations_claim_consistency check (
    (claimed_by is null and claimed_public_key is null and claimed_at is null)
    or (claimed_by is not null and claimed_public_key is not null and claimed_at is not null)
  ),
  constraint workspace_invitations_seal_consistency check (
    (sealed_workspace_key is null and sealed_at is null and sealed_by is null)
    or (
      sealed_workspace_key is not null
      and sealed_at is not null
      and sealed_by is not null
      and claimed_by is not null
    )
  ),
  constraint workspace_invitations_accept_requires_seal check (
    accepted_at is null or sealed_workspace_key is not null
  )
);

create unique index workspace_invitations_active_email_idx
  on public.workspace_invitations (workspace_id, email)
  where cancelled_at is null and accepted_at is null;

create index workspace_invitations_workspace_id_idx
  on public.workspace_invitations (workspace_id);

create index workspace_invitations_email_idx
  on public.workspace_invitations (email);

create index workspace_invitations_claimed_by_idx
  on public.workspace_invitations (claimed_by);

create trigger workspace_invitations_set_updated_at
  before update on public.workspace_invitations
  for each row execute function public.set_updated_at();

alter table public.workspace_invitations enable row level security;
alter table public.workspace_invitations force row level security;

-- Owners/admins see workspace invitations; invitees see rows matching JWT email.
create policy workspace_invitations_select
  on public.workspace_invitations
  for select
  to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or email = public.normalized_auth_email()
  );

create policy workspace_invitations_insert_admin
  on public.workspace_invitations
  for insert
  to authenticated
  with check (
    invited_by = (select auth.uid())
    and public.is_workspace_admin(workspace_id)
    and claimed_by is null
    and sealed_workspace_key is null
    and accepted_at is null
    and cancelled_at is null
  );

-- No direct UPDATE/DELETE from clients — state transitions via RPCs below.
revoke all on table public.workspace_invitations from anon, public;
grant select, insert on table public.workspace_invitations to authenticated;
revoke update, delete, truncate, references, trigger
  on table public.workspace_invitations from authenticated;

-- Co-member member list (definer helper avoids RLS recursion).
create policy workspace_members_select_comember
  on public.workspace_members
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create or replace function public.claim_workspace_invitation(
  invitation_id uuid,
  public_key text
)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
  caller_email text := public.normalized_auth_email();
  vault_public_key text;
begin
  if caller is null or caller_email is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if public_key is null or length(trim(public_key)) = 0 then
    raise exception 'public_key required' using errcode = '22023';
  end if;

  select uc.public_key into vault_public_key
  from public.user_crypto uc
  where uc.user_id = caller;

  if vault_public_key is null then
    raise exception 'vault not set up' using errcode = 'P0001';
  end if;

  -- Owners seal to whatever key lands here, so it must be the caller's own
  -- registered vault key, not an arbitrary argument.
  if public_key is distinct from vault_public_key then
    raise exception 'public_key does not match vault public key'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (caller)
  on conflict (id) do nothing;

  update public.workspace_invitations wi
  set
    claimed_by = caller,
    claimed_public_key = vault_public_key,
    claimed_at = now()
  where wi.id = invitation_id
    and wi.email = caller_email
    and wi.cancelled_at is null
    and wi.accepted_at is null
    and wi.claimed_by is null
  returning * into row;

  if not found then
    raise exception 'invitation not claimable' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

revoke all on function public.claim_workspace_invitation(uuid, text) from public;
grant execute on function public.claim_workspace_invitation(uuid, text) to authenticated;

create or replace function public.seal_workspace_invitation(
  invitation_id uuid,
  sealed_key jsonb
)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if sealed_key is null then
    raise exception 'sealed_key required' using errcode = '22023';
  end if;

  update public.workspace_invitations wi
  set
    sealed_workspace_key = sealed_key,
    sealed_at = now(),
    sealed_by = caller
  where wi.id = invitation_id
    and wi.cancelled_at is null
    and wi.accepted_at is null
    and wi.claimed_by is not null
    and wi.sealed_workspace_key is null
    and public.is_workspace_admin(wi.workspace_id)
  returning * into row;

  if not found then
    raise exception 'invitation not sealable' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

revoke all on function public.seal_workspace_invitation(uuid, jsonb) from public;
grant execute on function public.seal_workspace_invitation(uuid, jsonb) to authenticated;

create or replace function public.cancel_workspace_invitation(invitation_id uuid)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Drop the seal so a cancelled invite keeps no usable copy of the wrap.
  update public.workspace_invitations wi
  set
    cancelled_at = now(),
    sealed_workspace_key = null,
    sealed_at = null,
    sealed_by = null
  where wi.id = invitation_id
    and wi.cancelled_at is null
    and wi.accepted_at is null
    and public.is_workspace_admin(wi.workspace_id)
  returning * into row;

  if not found then
    raise exception 'invitation not cancellable' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

revoke all on function public.cancel_workspace_invitation(uuid) from public;
grant execute on function public.cancel_workspace_invitation(uuid) to authenticated;

create or replace function public.accept_workspace_invitation(invitation_id uuid)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
  caller_email text := public.normalized_auth_email();
begin
  if caller is null or caller_email is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into row
  from public.workspace_invitations wi
  where wi.id = invitation_id
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if row.cancelled_at is not null
     or row.accepted_at is not null
     or row.claimed_by is distinct from caller
     or row.email is distinct from caller_email
     or row.sealed_workspace_key is null then
    raise exception 'invitation not acceptable' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = row.workspace_id
      and wm.user_id = caller
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.profiles (id)
  values (caller)
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (row.workspace_id, caller, row.role);

  insert into public.wrapped_keys (
    subject_type,
    subject_id,
    user_id,
    wrapped_key
  )
  values (
    'workspace',
    row.workspace_id,
    caller,
    row.sealed_workspace_key
  );

  update public.workspace_invitations wi
  set accepted_at = now()
  where wi.id = invitation_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.accept_workspace_invitation(uuid) from public;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;

-- Invitees may read workspace display metadata for their pending invitations
-- (name only; no ciphertext). Membership still required for vault tables, and
-- an accepted invite no longer grants metadata access once membership ends.
create policy workspaces_select_invitee
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = public.workspaces.id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
        and wi.accepted_at is null
    )
  );

-- P6f + P12: billing (plaintext entitlements only — never vault keys or content).
-- Stripe webhook / redeem API (service_role) write subscriptions; members SELECT.
-- Absence of a row = free plan (in code). Comp grants = billing_source=comp, no Stripe.

-- Admin-managed discount / complimentary codes (Dashboard / service_role only).
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent_off integer not null,
  active boolean not null default true,
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz,
  note text,
  stripe_coupon_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_percent_off_check check (
    percent_off >= 1 and percent_off <= 100
  ),
  constraint discount_codes_max_redemptions_check check (
    max_redemptions is null or max_redemptions > 0
  ),
  constraint discount_codes_redemption_count_check check (redemption_count >= 0)
);

-- Store codes uppercase; uniqueness is case-insensitive via unique index on code.
create unique index discount_codes_code_uidx on public.discount_codes (code);

create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

alter table public.discount_codes enable row level security;
alter table public.discount_codes force row level security;

-- No client policies/grants. Auto-expose is off → explicit service_role grants.
revoke all on table public.discount_codes from anon, public;
revoke all on table public.discount_codes from authenticated;
grant select, insert, update, delete on table public.discount_codes to service_role;

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  billing_source text not null default 'stripe',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  discount_code_id uuid references public.discount_codes (id) on delete set null,
  discount_percent_off integer,
  stripe_coupon_id text,
  unmetered boolean not null default false,
  -- Pack quantities keyed by addon meter (e.g. {"projects": 2}). Plaintext only.
  addon_quantities jsonb not null default '{}'::jsonb,
  -- Set when this workspace loses Pro while the owner exceeds free owned slots.
  -- Soft-lock is computed dynamically from these tags (newest first).
  free_overflowed_at timestamptz,
  applied_at timestamptz,
  applied_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan in ('free', 'pro')),
  constraint subscriptions_billing_source_check check (
    billing_source in ('stripe', 'comp')
  ),
  constraint subscriptions_discount_percent_off_check check (
    discount_percent_off is null
    or (discount_percent_off >= 1 and discount_percent_off <= 100)
  ),
  constraint subscriptions_status_check check (
    status in (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  )
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

-- Members may read their workspace plan/entitlements; no client writes.
create policy subscriptions_select_member
  on public.subscriptions
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.subscriptions from anon, public;
grant select on table public.subscriptions to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.subscriptions from authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;

-- Append-only audit of Stripe webhook events (idempotency + debugging).
-- Payload is the raw Stripe event: billing metadata only, never vault data.
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type text not null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index billing_events_workspace_id_idx on public.billing_events (workspace_id);
create index billing_events_type_idx on public.billing_events (type);

alter table public.billing_events enable row level security;
alter table public.billing_events force row level security;

-- No policies/grants for clients. Auto-expose is off → explicit service_role grants.
revoke all on table public.billing_events from anon, public;
revoke all on table public.billing_events from authenticated;
grant select, insert, update, delete on table public.billing_events to service_role;

-- Seat usage for entitlement gates. Members and active invitees may read the
-- member count + plan (plaintext metadata only); limits stay in app code.
create or replace function public.workspace_seat_usage(ws_id uuid)
returns table (
  member_count bigint,
  plan text,
  status text,
  billing_source text,
  unmetered boolean,
  addon_quantities jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.workspace_members wm
      where wm.workspace_id = ws_id
    ) as member_count,
    coalesce(s.plan, 'free') as plan,
    coalesce(s.status, 'active') as status,
    coalesce(s.billing_source, 'stripe') as billing_source,
    coalesce(s.unmetered, false) as unmetered,
    coalesce(s.addon_quantities, '{}'::jsonb) as addon_quantities
  from (select 1) as one
  left join public.subscriptions s on s.workspace_id = ws_id
  where public.is_workspace_member(ws_id)
    or exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = ws_id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
        and wi.accepted_at is null
    );
$$;

revoke all on function public.workspace_seat_usage(uuid) from public;
grant execute on function public.workspace_seat_usage(uuid) to authenticated;

-- Atomic redemption bump for discount codes (service_role / redeem API only).
create or replace function public.increment_discount_redemption(code_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.discount_codes
  set redemption_count = redemption_count + 1
  where id = code_id
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.increment_discount_redemption(uuid) from public;
revoke all on function public.increment_discount_redemption(uuid) from authenticated;
grant execute on function public.increment_discount_redemption(uuid) to service_role;

-- Owner-only hard delete for a non-personal workspace.
-- Cascades via FKs wipe members, projects, tasks, notes, contacts,
-- invitations, and subscriptions. wrapped_keys has no FK on subject_id,
-- so those rows are deleted explicitly here.

create or replace function public.delete_workspace(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  ws record;
  sub_status text;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select id, kind into ws
  from public.workspaces
  where id = ws_id;

  if not found then
    raise exception 'workspace not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = caller
      and role = 'owner'
  ) then
    raise exception 'not workspace owner' using errcode = '42501';
  end if;

  if ws.kind = 'personal' then
    raise exception 'cannot delete personal workspace' using errcode = 'P0001';
  end if;

  -- Only Stripe-paid subscriptions block delete. Complimentary (comp) grants
  -- have no Stripe customer to cancel in the Portal.
  select s.status into sub_status
  from public.subscriptions s
  where s.workspace_id = ws_id
    and s.billing_source = 'stripe'
    and s.stripe_subscription_id is not null
    and s.status in ('active', 'trialing', 'past_due', 'unpaid', 'paused')
    and s.cancel_at_period_end = false;

  if found then
    raise exception 'active subscription; cancel billing first'
      using errcode = 'P0001';
  end if;

  delete from public.wrapped_keys
  where subject_type = 'workspace'
    and subject_id = ws_id;

  delete from public.workspaces
  where id = ws_id;
end;
$$;

revoke all on function public.delete_workspace(uuid) from public;
grant execute on function public.delete_workspace(uuid) to authenticated;

-- entity_links: constrained cross-entity links for reverse lookup without
-- decrypting vault content. Intentional metadata: Helvety sees linked ids,
-- never titles or colors.

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
  constraint entity_links_allowed_pair check (
    (least(source_kind, target_kind), greatest(source_kind, target_kind)) in (
      ('contact', 'note'),
      ('contact', 'project'),
      ('contact', 'task'),
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

-- Account hard-delete prep: remove solo-owned workspaces and clear FK
-- blockers so auth.admin.deleteUser can cascade the rest.
-- Shared workspaces with other members are left intact; membership and
-- per-user wraps cascade when the auth user is deleted.
-- Blocks when the caller still owns any multi-member workspace.
--
-- Invariant this relies on: a workspace whose created_by is the caller is
-- always one the caller owns (no leave-workspace or ownership-transfer path
-- exists), so it is either deleted here or blocks deletion. If either path is
-- added, workspaces.created_by (ON DELETE NO ACTION) must be cleared here too
-- or auth.admin.deleteUser will fail after this function already deleted data.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  solo record;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = caller
      and wm.role = 'owner'
      and (
        select count(*)
        from public.workspace_members wm2
        where wm2.workspace_id = wm.workspace_id
      ) > 1
  ) then
    raise exception 'owns shared workspaces'
      using errcode = 'P0001';
  end if;

  for solo in
    select wm.workspace_id as id
    from public.workspace_members wm
    where wm.user_id = caller
      and wm.role = 'owner'
      and (
        select count(*)
        from public.workspace_members wm2
        where wm2.workspace_id = wm.workspace_id
      ) = 1
  loop
    delete from public.wrapped_keys
    where subject_type = 'project'
      and subject_id in (
        select p.id from public.projects p where p.workspace_id = solo.id
      );

    delete from public.wrapped_keys
    where subject_type = 'workspace'
      and subject_id = solo.id;

    delete from public.workspaces
    where id = solo.id;
  end loop;

  -- Clear invitation FK blockers on surviving (shared) workspaces.
  delete from public.workspace_invitations
  where invited_by = caller
     or claimed_by = caller
     or sealed_by = caller;
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

-- attachments: workspace-scoped E2EE file metadata (P11).
-- Ciphertext bytes live in private Storage bucket vault-attachments.
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

-- Private Storage bucket for E2EE attachment ciphertext (P11).
-- Objects are opaque; access is via API-minted signed URLs after membership
-- + entitlement checks. Direct client list/upload without a signed URL is denied.

insert into storage.buckets (id, name, public, file_size_limit)
values ('vault-attachments', 'vault-attachments', false, 26214400)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- No authenticated grants for this bucket; /api/v1 mints signed URLs with
-- the service role after plan/membership checks.
drop policy if exists vault_attachments_no_select on storage.objects;
drop policy if exists vault_attachments_no_insert on storage.objects;
drop policy if exists vault_attachments_no_update on storage.objects;
drop policy if exists vault_attachments_no_delete on storage.objects;

create policy vault_attachments_no_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'vault-attachments' and false);

create policy vault_attachments_no_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'vault-attachments' and false);

create policy vault_attachments_no_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'vault-attachments' and false)
  with check (bucket_id = 'vault-attachments' and false);

create policy vault_attachments_no_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'vault-attachments' and false);
