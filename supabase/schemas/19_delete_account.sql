-- Account hard-delete prep: wipe solo-member workspaces and clear FK
-- blockers so auth.admin.deleteUser can cascade the rest.
-- Shared workspaces with other members stay; membership and per-user wraps
-- cascade when the auth user is deleted. created_by is reassigned first so
-- deleteUser is not blocked by workspaces.created_by.
--
-- Invariant: created_by always points at a current member (leave/remove
-- reassign it). Solo-member workspaces are deleted here.

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

  -- Reassign created_by on shared workspaces before auth user delete.
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

  -- Clear invitation FK blockers on surviving (shared) workspaces.
  delete from public.workspace_invitations
  where invited_by = caller
     or claimed_by = caller
     or sealed_by = caller;
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
