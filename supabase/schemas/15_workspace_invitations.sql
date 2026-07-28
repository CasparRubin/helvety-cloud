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

create index workspace_invitations_invited_by_idx
  on public.workspace_invitations (invited_by);

create index workspace_invitations_sealed_by_idx
  on public.workspace_invitations (sealed_by)
  where sealed_by is not null;

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

-- No direct UPDATE/DELETE from clients. State transitions via RPCs below.
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
  user_public_key text;
begin
  if caller is null or caller_email is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if public_key is null or length(trim(public_key)) = 0 then
    raise exception 'public_key required' using errcode = '22023';
  end if;

  select uc.public_key into user_public_key
  from public.user_crypto uc
  where uc.user_id = caller;

  if user_public_key is null then
    raise exception 'encryption not set up' using errcode = 'P0001';
  end if;

  -- Owners seal to whatever key lands here, so it must be the caller's own
  -- registered user public key, not an arbitrary argument.
  if public_key is distinct from user_public_key then
    raise exception 'public_key does not match user public key'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (caller)
  on conflict (id) do nothing;

  update public.workspace_invitations wi
  set
    claimed_by = caller,
    claimed_public_key = user_public_key,
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

-- Invitees may read workspace rows for their pending invitations (encrypted_blob
-- only decryptable after seal). Membership still required for encrypted entity tables, and
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
