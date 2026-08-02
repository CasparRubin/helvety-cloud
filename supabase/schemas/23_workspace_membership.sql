-- Leave / remove-member for standard workspaces.
-- Solo leave = wipe (delete_workspace). Shared leave = soft-leave only.
-- created_by is free-slot attribution only; reassigned when that member leaves
-- or is removed. No workspace key rotation (remaining members keep wraps).

create or replace function public.purge_member_wraps(ws_id uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.wrapped_keys
  where user_id = target
    and (
      (subject_type = 'workspace' and subject_id = ws_id)
      or (
        subject_type = 'project'
        and subject_id in (
          select p.id from public.projects p where p.workspace_id = ws_id
        )
      )
    );

  -- Drop any leftover invitation seals for this member (claimed_by or email).
  update public.workspace_invitations wi
  set
    sealed_workspace_key = null,
    sealed_at = null,
    sealed_by = null
  where wi.workspace_id = ws_id
    and wi.sealed_workspace_key is not null
    and (
      wi.claimed_by = target
      or wi.email = (
        select nullif(lower(trim(u.email)), '')
        from auth.users u
        where u.id = target
      )
    );
end;
$$;

revoke all on function public.purge_member_wraps(uuid, uuid) from public;

-- Internal: point created_by at the earliest remaining member.
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

  perform set_config('helvety.allow_workspace_attr_change', '1', true);
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

  -- Solo leave = full wipe (reuses delete_workspace gates + wrap cleanup).
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

revoke all on function public.remove_workspace_member(uuid, uuid) from public;
grant execute on function public.remove_workspace_member(uuid, uuid)
  to authenticated;
