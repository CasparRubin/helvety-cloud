-- Leave / transfer / remove-member for standard workspaces.
-- Leave-centric: solo leave = wipe (delete_workspace); owner + others must
-- hand over then soft-leave; non-owners soft-leave only.
-- No workspace key rotation on leave/remove (remaining members keep wraps).

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
end;
$$;

revoke all on function public.purge_member_wraps(uuid, uuid) from public;

create or replace function public.transfer_workspace_ownership(
  ws_id uuid,
  new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  ws_kind text;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if new_owner_id is null or new_owner_id = caller then
    raise exception 'invalid new owner' using errcode = 'P0001';
  end if;

  select kind into ws_kind
  from public.workspaces
  where id = ws_id;

  if not found then
    raise exception 'workspace not found' using errcode = 'P0002';
  end if;

  if ws_kind = 'personal' then
    raise exception 'cannot transfer personal workspace' using errcode = 'P0001';
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

  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = new_owner_id
  ) then
    raise exception 'new owner is not a member' using errcode = 'P0001';
  end if;

  update public.workspace_members
  set role = 'admin'
  where workspace_id = ws_id
    and user_id = caller;

  update public.workspace_members
  set role = 'owner'
  where workspace_id = ws_id
    and user_id = new_owner_id;

  update public.workspaces
  set created_by = new_owner_id
  where id = ws_id;
end;
$$;

revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public;
grant execute on function public.transfer_workspace_ownership(uuid, uuid)
  to authenticated;

create or replace function public.leave_workspace(
  ws_id uuid,
  new_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  ws_kind text;
  member_count int;
  caller_role text;
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

  select role into caller_role
  from public.workspace_members
  where workspace_id = ws_id
    and user_id = caller;

  if not found then
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

  if caller_role = 'owner' then
    if new_owner_id is null then
      raise exception 'owner transfer required' using errcode = 'P0001';
    end if;

    -- Transfer then soft-leave in one transaction.
    perform public.transfer_workspace_ownership(ws_id, new_owner_id);

    perform public.purge_member_wraps(ws_id, caller);

    delete from public.workspace_members
    where workspace_id = ws_id
      and user_id = caller;
    return;
  end if;

  if new_owner_id is not null then
    raise exception 'new owner only valid for owners' using errcode = 'P0001';
  end if;

  perform public.purge_member_wraps(ws_id, caller);

  delete from public.workspace_members
  where workspace_id = ws_id
    and user_id = caller;
end;
$$;

revoke all on function public.leave_workspace(uuid, uuid) from public;
grant execute on function public.leave_workspace(uuid, uuid) to authenticated;

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
  target_role text;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if target_user_id is null or target_user_id = caller then
    raise exception 'use leave for self' using errcode = 'P0001';
  end if;

  if not public.is_workspace_admin(ws_id) then
    raise exception 'not workspace admin' using errcode = '42501';
  end if;

  select role into target_role
  from public.workspace_members
  where workspace_id = ws_id
    and user_id = target_user_id;

  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if target_role = 'owner' then
    raise exception 'cannot remove owner' using errcode = 'P0001';
  end if;

  perform public.purge_member_wraps(ws_id, target_user_id);

  delete from public.workspace_members
  where workspace_id = ws_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.remove_workspace_member(uuid, uuid) from public;
grant execute on function public.remove_workspace_member(uuid, uuid)
  to authenticated;
