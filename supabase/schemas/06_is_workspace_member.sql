-- SECURITY DEFINER membership check. Bypasses RLS on workspace_members so
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
