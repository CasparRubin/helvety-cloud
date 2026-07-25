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
