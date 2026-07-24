-- Allow invitees to read workspace name for active invitations addressed to them.

create policy workspaces_select_invitee
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
    )
  );
