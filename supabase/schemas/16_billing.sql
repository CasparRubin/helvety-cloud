-- P6f + P12: billing (plaintext entitlements only — never vault keys or content).
-- Stripe webhook / redeem API (service_role) write subscriptions; members SELECT.
-- Absence of a row = free plan (in code). Comp grants = billing_source=comp, no Stripe.

-- Admin-managed discount / complimentary codes (Dashboard / service_role only).
create table public.discount_codes (
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

-- Store codes uppercase; uniqueness is case-insensitive via unique index on code.
create unique index discount_codes_code_uidx on public.discount_codes (code);

create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

alter table public.discount_codes enable row level security;
alter table public.discount_codes force row level security;

-- No client policies/grants: service_role (and Dashboard) only.
revoke all on table public.discount_codes from anon, public;
revoke all on table public.discount_codes from authenticated;

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  billing_source text not null default 'stripe',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  discount_code_id uuid references public.discount_codes (id) on delete set null,
  discount_percent_off integer,
  stripe_coupon_id text,
  unmetered boolean not null default false,
  -- Pack quantities keyed by addon meter (e.g. {"projects": 2}). Plaintext only.
  addon_quantities jsonb not null default '{}'::jsonb,
  applied_at timestamptz,
  applied_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan in ('free', 'pro')),
  constraint subscriptions_billing_source_check check (
    billing_source in ('stripe', 'comp')
  ),
  constraint subscriptions_discount_percent_off_check check (
    discount_percent_off is null
    or (discount_percent_off >= 1 and discount_percent_off <= 100)
  ),
  constraint subscriptions_status_check check (
    status in (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  )
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

-- Members may read their workspace plan/entitlements; no client writes.
create policy subscriptions_select_member
  on public.subscriptions
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on table public.subscriptions from anon, public;
grant select on table public.subscriptions to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.subscriptions from authenticated;

-- Append-only audit of Stripe webhook events (idempotency + debugging).
-- Payload is the raw Stripe event: billing metadata only, never vault data.
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type text not null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index billing_events_workspace_id_idx on public.billing_events (workspace_id);
create index billing_events_type_idx on public.billing_events (type);

alter table public.billing_events enable row level security;
alter table public.billing_events force row level security;

-- No policies and no grants for clients: service_role only.
revoke all on table public.billing_events from anon, public;
revoke all on table public.billing_events from authenticated;

-- Seat usage for entitlement gates. Members and active invitees may read the
-- member count + plan (plaintext metadata only); limits stay in app code.
create or replace function public.workspace_seat_usage(ws_id uuid)
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

-- Atomic redemption bump for discount codes (service_role / redeem API only).
create or replace function public.increment_discount_redemption(code_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.discount_codes
  set redemption_count = redemption_count + 1
  where id = code_id
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.increment_discount_redemption(uuid) from public;
revoke all on function public.increment_discount_redemption(uuid) from authenticated;
-- No grant to authenticated: service_role only.
