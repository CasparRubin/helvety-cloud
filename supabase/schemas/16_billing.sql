-- P6f + P12: billing (plaintext entitlements only, never encryption keys or content).
-- Stripe webhook (service_role) writes subscriptions; members SELECT.
-- Absence of a row = free plan (in code). Discounts live in Stripe only.

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Pack quantities keyed by addon meter (e.g. {"capacity": 2}). Plaintext only.
  addon_quantities jsonb not null default '{}'::jsonb,
  -- Set when this workspace loses Pro while the owner exceeds free owned slots.
  -- Soft-lock is computed dynamically from these tags (newest first).
  free_overflowed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan in ('free', 'pro')),
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
grant select, insert, update, delete on table public.subscriptions to service_role;

-- Append-only audit of Stripe webhook events (idempotency + debugging).
-- Payload is the raw Stripe event: billing metadata only, never encrypted data.
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

-- No policies/grants for clients. Auto-expose is off → explicit service_role grants.
revoke all on table public.billing_events from anon, public;
revoke all on table public.billing_events from authenticated;
grant select, insert, update, delete on table public.billing_events to service_role;

-- Seat usage for entitlement gates. Members and active invitees may read the
-- member count + plan (plaintext metadata only); limits stay in app code.
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
