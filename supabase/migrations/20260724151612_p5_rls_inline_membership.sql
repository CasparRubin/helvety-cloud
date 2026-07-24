-- Inline membership EXISTS; own-row workspace_members SELECT; drop SECURITY DEFINER helper.

drop policy if exists workspaces_select_member on public.workspaces;
drop policy if exists workspaces_update_member on public.workspaces;
drop policy if exists workspace_members_select_member on public.workspace_members;
drop policy if exists workspace_members_select_own on public.workspace_members;
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
    or exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = id
        and m.user_id = (select auth.uid())
    )
  );

create policy workspaces_update_member
  on public.workspaces
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = id
        and m.user_id = (select auth.uid())
    )
  );

create policy workspace_members_select_own
  on public.workspace_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy projects_select_member
  on public.projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy projects_insert_member
  on public.projects
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy projects_update_member
  on public.projects
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy projects_delete_member
  on public.projects
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy wrapped_keys_insert_own
  on public.wrapped_keys
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        subject_type = 'workspace'
        and exists (
          select 1
          from public.workspace_members m
          where m.workspace_id = subject_id
            and m.user_id = (select auth.uid())
        )
      )
      or (
        subject_type = 'project'
        and exists (
          select 1
          from public.projects p
          join public.workspace_members m
            on m.workspace_id = p.workspace_id
           and m.user_id = (select auth.uid())
          where p.id = subject_id
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
      join public.workspace_members m
        on m.workspace_id = p.workspace_id
       and m.user_id = (select auth.uid())
      where p.id = project_id
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
      join public.workspace_members m
        on m.workspace_id = p.workspace_id
       and m.user_id = (select auth.uid())
      where p.id = project_id
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
      join public.workspace_members m
        on m.workspace_id = p.workspace_id
       and m.user_id = (select auth.uid())
      where p.id = project_id
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspace_members m
        on m.workspace_id = p.workspace_id
       and m.user_id = (select auth.uid())
      where p.id = project_id
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
      join public.workspace_members m
        on m.workspace_id = p.workspace_id
       and m.user_id = (select auth.uid())
      where p.id = project_id
    )
  );

drop function if exists public.is_workspace_member(uuid);
