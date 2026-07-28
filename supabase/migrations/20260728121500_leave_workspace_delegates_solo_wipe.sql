-- Solo leave reuses delete_workspace instead of duplicating wipe logic.
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

  if member_count = 1 then
    perform public.delete_workspace(ws_id);
    return;
  end if;

  if caller_role = 'owner' then
    if new_owner_id is null then
      raise exception 'owner transfer required' using errcode = 'P0001';
    end if;

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
