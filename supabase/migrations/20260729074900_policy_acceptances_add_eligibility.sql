alter table public.policy_acceptances
  drop constraint policy_acceptances_policy_check,
  add constraint policy_acceptances_policy_check
    check (policy in ('tos', 'privacy', 'aup', 'e2ee', 'eligibility'));
