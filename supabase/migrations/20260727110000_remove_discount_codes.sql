-- Remove custom discount / complimentary billing: discounts live in Stripe only.
-- Drop discount_codes and related subscription columns; simplify seat-usage RPC.

drop function if exists public.increment_discount_redemption(uuid);

alter table public.subscriptions
  drop constraint if exists subscriptions_discount_code_id_fkey;

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_source_check;

alter table public.subscriptions
  drop constraint if exists subscriptions_discount_percent_off_check;

alter table public.subscriptions
  drop column if exists discount_code_id,
  drop column if exists discount_percent_off,
  drop column if exists stripe_coupon_id,
  drop column if exists unmetered,
  drop column if exists billing_source,
  drop column if exists applied_at,
  drop column if exists applied_by_user_id;

drop table if exists public.discount_codes;

drop function if exists public.workspace_seat_usage(uuid);

create or replace function public.workspace_seat_usage(ws_id uuid)
returns table (
  member_count bigint,
  plan text,
  status text,
  addon_quantities jsonb
)
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
    coalesce(s.status, 'active') as status,
    coalesce(s.addon_quantities, '{}'::jsonb) as addon_quantities
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

  -- Active Stripe subscriptions must be cancelled in the Portal first.
  select s.status into sub_status
  from public.subscriptions s
  where s.workspace_id = ws_id
    and s.stripe_subscription_id is not null
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
