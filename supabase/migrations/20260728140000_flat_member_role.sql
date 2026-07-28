-- Flatten workspace roles to a single equal "member".
-- Drop ownership transfer; leave is wipe-or-go; any member may manage invites,
-- remove peers, and delete the workspace. created_by remains free-slot attribution.

-- 1) Normalize existing role values before tightening CHECKs.
update public.workspace_members
set role = 'member'
where role is distinct from 'member';

update public.workspace_invitations
set role = 'member'
where role is distinct from 'member';

alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;

alter table public.workspace_members
  add constraint workspace_members_role_check check (role in ('member'));

alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_role_check;

alter table public.workspace_invitations
  add constraint workspace_invitations_role_check check (role in ('member'));

-- 2) Membership self-insert on workspace create: member, not owner.
drop policy if exists workspace_members_insert_self_owner on public.workspace_members;

create policy workspace_members_insert_self_creator
  on public.workspace_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.created_by = (select auth.uid())
    )
  );

-- 3) Invitation policies: any member (drop admin helper after).
drop policy if exists workspace_invitations_select on public.workspace_invitations;
drop policy if exists workspace_invitations_insert_admin on public.workspace_invitations;

create policy workspace_invitations_select
  on public.workspace_invitations
  for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or email = public.normalized_auth_email()
  );

create policy workspace_invitations_insert_member
  on public.workspace_invitations
  for insert
  to authenticated
  with check (
    invited_by = (select auth.uid())
    and public.is_workspace_member(workspace_id)
    and role = 'member'
    and claimed_by is null
    and sealed_workspace_key is null
    and accepted_at is null
    and cancelled_at is null
  );

-- 4) Seal / cancel: membership instead of admin.
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
    and public.is_workspace_member(wi.workspace_id)
  returning * into row;

  if not found then
    raise exception 'invitation not sealable' using errcode = 'P0002';
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

  update public.workspace_invitations wi
  set
    cancelled_at = now(),
    sealed_workspace_key = null,
    sealed_at = null,
    sealed_by = null
  where wi.id = invitation_id
    and wi.cancelled_at is null
    and wi.accepted_at is null
    and public.is_workspace_member(wi.workspace_id)
  returning * into row;

  if not found then
    raise exception 'invitation not cancellable' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

drop function if exists public.is_workspace_admin(uuid);

-- 5) Delete workspace: any member.
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

  if not public.is_workspace_member(ws_id) then
    raise exception 'not a workspace member' using errcode = '42501';
  end if;

  if ws.kind = 'personal' then
    raise exception 'cannot delete personal workspace' using errcode = 'P0001';
  end if;

  select s.status into sub_status
  from public.subscriptions s
  where s.workspace_id = ws_id
    and s.stripe_subscription_id is not null
    and s.status in ('active', 'trialing', 'past_due', 'unpaid', 'paused')
    and s.cancel_at_period_end = false;

  if found then
    raise exception 'active subscription; cancel billing first'
      using errcode = 'P0001';
  end if;

  perform public.purge_workspace_wraps(ws_id);

  delete from public.workspaces
  where id = ws_id;
end;
$$;

-- 6) Membership helpers: drop transfer; flatten leave/remove; reassign created_by.
drop function if exists public.transfer_workspace_ownership(uuid, uuid);
drop function if exists public.leave_workspace(uuid, uuid);

create or replace function public.reassign_workspace_created_by(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_owner uuid;
begin
  select wm.user_id into next_owner
  from public.workspace_members wm
  where wm.workspace_id = ws_id
  order by wm.created_at asc
  limit 1;

  if next_owner is null then
    return;
  end if;

  update public.workspaces
  set created_by = next_owner
  where id = ws_id
    and created_by is distinct from next_owner;
end;
$$;

revoke all on function public.reassign_workspace_created_by(uuid) from public;

create or replace function public.leave_workspace(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  ws_kind text;
  member_count int;
  was_created_by boolean;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select kind into ws_kind
  from public.workspaces
  where id = ws_id;

  if not found then
    raise exception 'workspace not found' using errcode = 'P0002';
  end if;

  if ws_kind = 'personal' then
    raise exception 'cannot leave personal workspace' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = caller
  ) then
    raise exception 'not a workspace member' using errcode = '42501';
  end if;

  select count(*)::int into member_count
  from public.workspace_members
  where workspace_id = ws_id;

  if member_count = 1 then
    perform public.delete_workspace(ws_id);
    return;
  end if;

  select (created_by = caller) into was_created_by
  from public.workspaces
  where id = ws_id;

  perform public.purge_member_wraps(ws_id, caller);

  delete from public.workspace_members
  where workspace_id = ws_id
    and user_id = caller;

  if was_created_by then
    perform public.reassign_workspace_created_by(ws_id);
  end if;
end;
$$;

revoke all on function public.leave_workspace(uuid) from public;
grant execute on function public.leave_workspace(uuid) to authenticated;

create or replace function public.remove_workspace_member(
  ws_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  was_created_by boolean;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if target_user_id is null or target_user_id = caller then
    raise exception 'use leave for self' using errcode = 'P0001';
  end if;

  if not public.is_workspace_member(ws_id) then
    raise exception 'not a workspace member' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = target_user_id
  ) then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  select (created_by = target_user_id) into was_created_by
  from public.workspaces
  where id = ws_id;

  perform public.purge_member_wraps(ws_id, target_user_id);

  delete from public.workspace_members
  where workspace_id = ws_id
    and user_id = target_user_id;

  if was_created_by then
    perform public.reassign_workspace_created_by(ws_id);
  end if;
end;
$$;

-- 7) Account delete: no shared-owner block; reassign created_by then wipe solos.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  solo record;
  shared record;
  next_owner uuid;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  for shared in
    select w.id as workspace_id
    from public.workspaces w
    where w.created_by = caller
      and (
        select count(*)
        from public.workspace_members wm
        where wm.workspace_id = w.id
      ) > 1
  loop
    select wm.user_id into next_owner
    from public.workspace_members wm
    where wm.workspace_id = shared.workspace_id
      and wm.user_id <> caller
    order by wm.created_at asc
    limit 1;

    if next_owner is not null then
      update public.workspaces
      set created_by = next_owner
      where id = shared.workspace_id;
    end if;
  end loop;

  for solo in
    select wm.workspace_id as id
    from public.workspace_members wm
    where wm.user_id = caller
      and (
        select count(*)
        from public.workspace_members wm2
        where wm2.workspace_id = wm.workspace_id
      ) = 1
  loop
    perform public.purge_workspace_wraps(solo.id);

    delete from public.workspaces
    where id = solo.id;
  end loop;

  delete from public.workspace_invitations
  where invited_by = caller
     or claimed_by = caller
     or sealed_by = caller;
end;
$$;
