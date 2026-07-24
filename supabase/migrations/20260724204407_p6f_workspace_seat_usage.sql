-- Seat usage for entitlement gates. Members and active invitees may read the
-- member count + plan (plaintext metadata only); limits stay in app code.
create or replace function public.workspace_seat_usage(ws_id uuid)
returns table (member_count bigint, plan text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.workspace_members wm
      where wm.workspace_id = ws_id
    ) as member_count,
    coalesce(s.plan, 'free') as plan,
    coalesce(s.status, 'active') as status
  from (select 1) as one
  left join public.subscriptions s on s.workspace_id = ws_id
  where public.is_workspace_member(ws_id)
    or exists (
      select 1
      from public.workspace_invitations wi
      where wi.workspace_id = ws_id
        and wi.email = public.normalized_auth_email()
        and wi.cancelled_at is null
        and wi.accepted_at is null
    );
$$;

revoke all on function public.workspace_seat_usage(uuid) from public;
grant execute on function public.workspace_seat_usage(uuid) to authenticated;
