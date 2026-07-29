-- policy_acceptances: plaintext signup gates (ToS, Privacy, AUP, E2EE ack, eligibility).
-- Append-only: users may insert/select own rows; no update/delete for clients.

create table public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy text not null
    check (policy in ('tos', 'privacy', 'aup', 'e2ee', 'eligibility')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy, version)
);

create index policy_acceptances_user_id_idx
  on public.policy_acceptances (user_id);

alter table public.policy_acceptances enable row level security;
alter table public.policy_acceptances force row level security;
