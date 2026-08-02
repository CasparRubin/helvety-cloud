-- Stale Auth cleanup: OTP sessions that never finished encryption setup
-- (no user_crypto) are deleted after a grace window. Unlock passkeys are
-- client-only; user_crypto is the durable server signal for “setup done.”
-- Scheduled via pg_cron (Free tier). Not callable by authenticated clients.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.purge_stale_auth_without_crypto()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  -- Grace: 24h so a real user can finish PRF setup after OTP.
  -- Skip anyone who already has crypto, membership, or workspace attribution
  -- (those need the normal leave/delete_account paths).
  with doomed as (
    select u.id
    from auth.users u
    where u.created_at < (now() - interval '24 hours')
      and not exists (
        select 1 from public.user_crypto uc where uc.user_id = u.id
      )
      and not exists (
        select 1 from public.workspace_members wm where wm.user_id = u.id
      )
      and not exists (
        select 1 from public.workspaces w where w.created_by = u.id
      )
      and not exists (
        select 1
        from public.workspace_invitations wi
        where wi.invited_by = u.id
           or wi.claimed_by = u.id
           or wi.sealed_by = u.id
      )
  ),
  gone as (
    delete from auth.users au
    using doomed d
    where au.id = d.id
    returning au.id
  )
  select count(*)::integer into deleted_count from gone;

  return deleted_count;
end;
$$;

revoke all on function public.purge_stale_auth_without_crypto() from public;
revoke all on function public.purge_stale_auth_without_crypto()
  from anon, authenticated;

-- Hourly; re-schedule is idempotent by name.
select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-stale-auth-without-crypto';

select cron.schedule(
  'purge-stale-auth-without-crypto',
  '15 * * * *',
  $$select public.purge_stale_auth_without_crypto()$$
);
