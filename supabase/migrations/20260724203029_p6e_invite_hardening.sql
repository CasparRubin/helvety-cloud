-- P6e hardening: bind claim to the caller's registered vault public key,
-- drop the seal when an invitation is cancelled, and stop granting workspace
-- metadata reads through an already-accepted invitation row.

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

drop policy if exists workspaces_select_invitee on public.workspaces;

create policy workspaces_select_invitee
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
        and wi.accepted_at is null
    )
  );
