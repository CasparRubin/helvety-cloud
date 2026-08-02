-- Stale Auth cleanup: delete OTP accounts with no encryption setup after 24h.

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

select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-stale-auth-without-crypto';

select cron.schedule(
  'purge-stale-auth-without-crypto',
  '15 * * * *',
  $$select public.purge_stale_auth_without_crypto()$$
);
