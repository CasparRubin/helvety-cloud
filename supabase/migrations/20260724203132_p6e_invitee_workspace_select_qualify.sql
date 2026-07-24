-- Unqualified `id` inside the subquery bound to workspace_invitations.id, so the
-- invitee policy never matched and invitees saw no workspace name. Qualify it.

drop policy if exists workspaces_select_invitee on public.workspaces;

create policy workspaces_select_invitee
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = public.workspaces.id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
        and wi.accepted_at is null
    )
  );
