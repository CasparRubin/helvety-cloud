-- P6f: billing (plaintext entitlements only — never vault keys or content).
-- Stripe webhook (service_role) is the sole writer; members get SELECT on
-- subscriptions for paywall UX. Absence of a row = free plan (in code).

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
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
