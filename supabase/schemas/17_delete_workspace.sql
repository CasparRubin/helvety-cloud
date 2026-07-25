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

  select s.status into sub_status
  from public.subscriptions s
  where s.workspace_id = ws_id
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
