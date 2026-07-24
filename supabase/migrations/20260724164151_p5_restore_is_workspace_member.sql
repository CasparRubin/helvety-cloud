-- Restore is_workspace_member (SECURITY DEFINER) and use it in RLS policies
-- to break infinite recursion on workspace_members insert.

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

drop policy if exists workspaces_select_member on public.workspaces;
drop policy if exists workspaces_update_member on public.workspaces;
drop policy if exists projects_select_member on public.projects;
drop policy if exists projects_insert_member on public.projects;
drop policy if exists projects_update_member on public.projects;
drop policy if exists projects_delete_member on public.projects;
drop policy if exists wrapped_keys_insert_own on public.wrapped_keys;
drop policy if exists issues_select_member on public.issues;
drop policy if exists issues_insert_member on public.issues;
drop policy if exists issues_update_member on public.issues;
drop policy if exists issues_delete_member on public.issues;

create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_workspace_member(id)
  );

create policy workspaces_update_member
  on public.workspaces
  for update
  to authenticated
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

create policy projects_select_member
  on public.projects
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy projects_insert_member
  on public.projects
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy projects_update_member
  on public.projects
  for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy projects_delete_member
  on public.projects
  for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy wrapped_keys_insert_own
  on public.wrapped_keys
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        subject_type = 'workspace'
        and public.is_workspace_member(subject_id)
      )
      or (
        subject_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = subject_id
            and public.is_workspace_member(p.workspace_id)
        )
      )
    )
  );

create policy issues_select_member
  on public.issues
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_insert_member
  on public.issues
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_update_member
  on public.issues
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy issues_delete_member
  on public.issues
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );
