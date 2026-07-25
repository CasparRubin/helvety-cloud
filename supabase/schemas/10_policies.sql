-- RLS policies. Membership via is_workspace_member (SECURITY DEFINER).
-- workspace_members SELECT is own-row only.

-- profiles
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_crypto
create policy user_crypto_select_own
  on public.user_crypto
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy user_crypto_insert_own
  on public.user_crypto
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy user_crypto_update_own
  on public.user_crypto
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- workspaces (created_by allows owner read before membership row exists)
create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_workspace_member(id)
  );

create policy workspaces_insert_self
  on public.workspaces
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy workspaces_update_member
  on public.workspaces
  for update
  to authenticated
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

-- workspace_members (own row only — do not call is_workspace_member here)
create policy workspace_members_select_own
  on public.workspace_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy workspace_members_insert_self_owner
  on public.workspace_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.created_by = (select auth.uid())
    )
  );

create policy workspace_members_delete_self
  on public.workspace_members
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- projects
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

-- wrapped_keys
create policy wrapped_keys_select_own
  on public.wrapped_keys
  for select
  to authenticated
  using (user_id = (select auth.uid()));

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

create policy wrapped_keys_update_own
  on public.wrapped_keys
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wrapped_keys_delete_own
  on public.wrapped_keys
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- tasks
create policy tasks_select_member
  on public.tasks
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

create policy tasks_insert_member
  on public.tasks
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

create policy tasks_update_member
  on public.tasks
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

create policy tasks_delete_member
  on public.tasks
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

-- policy_acceptances (own rows only; append-only)
create policy policy_acceptances_select_own
  on public.policy_acceptances
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy policy_acceptances_insert_own
  on public.policy_acceptances
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
