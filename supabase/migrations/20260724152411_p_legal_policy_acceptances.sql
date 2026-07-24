-- P-legal: policy_acceptances for ToS / Privacy / AUP / E2EE version logging.

create table public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy text not null
    check (policy in ('tos', 'privacy', 'aup', 'e2ee')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy, version)
);

create index policy_acceptances_user_id_idx
  on public.policy_acceptances (user_id);

alter table public.policy_acceptances enable row level security;
alter table public.policy_acceptances force row level security;

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

revoke all on table public.policy_acceptances from anon, public;
grant select, insert on table public.policy_acceptances to authenticated;
revoke truncate, references, trigger on table public.policy_acceptances from authenticated;
