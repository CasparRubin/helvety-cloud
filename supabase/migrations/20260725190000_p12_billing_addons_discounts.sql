-- P12: discount codes, comp grants, addon quantities on subscriptions.

drop function if exists public.workspace_seat_usage(uuid);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent_off integer not null,
  active boolean not null default true,
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz,
  note text,
  stripe_coupon_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_percent_off_check check (
    percent_off >= 1 and percent_off <= 100
  ),
  constraint discount_codes_max_redemptions_check check (
    max_redemptions is null or max_redemptions > 0
  ),
  constraint discount_codes_redemption_count_check check (redemption_count >= 0)
);

create unique index if not exists discount_codes_code_uidx
  on public.discount_codes (code);

drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

alter table public.discount_codes enable row level security;
alter table public.discount_codes force row level security;

revoke all on table public.discount_codes from anon, public;
revoke all on table public.discount_codes from authenticated;

alter table public.subscriptions
  add column if not exists billing_source text not null default 'stripe',
  add column if not exists discount_code_id uuid,
  add column if not exists discount_percent_off integer,
  add column if not exists stripe_coupon_id text,
  add column if not exists unmetered boolean not null default false,
  add column if not exists addon_quantities jsonb not null default '{}'::jsonb,
  add column if not exists applied_at timestamptz,
  add column if not exists applied_by_user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_billing_source_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_billing_source_check
      check (billing_source in ('stripe', 'comp'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_discount_percent_off_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_discount_percent_off_check
      check (
        discount_percent_off is null
        or (discount_percent_off >= 1 and discount_percent_off <= 100)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_discount_code_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_discount_code_id_fkey
      foreign key (discount_code_id)
      references public.discount_codes (id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_applied_by_user_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_applied_by_user_id_fkey
      foreign key (applied_by_user_id)
      references auth.users (id)
      on delete set null;
  end if;
end $$;

create function public.workspace_seat_usage(ws_id uuid)
returns table (
  member_count bigint,
  plan text,
  status text,
  billing_source text,
  unmetered boolean,
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
    coalesce(s.billing_source, 'stripe') as billing_source,
    coalesce(s.unmetered, false) as unmetered,
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

-- delete_workspace: only Stripe-paid active subs block delete (not comps).
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
    and s.billing_source = 'stripe'
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
