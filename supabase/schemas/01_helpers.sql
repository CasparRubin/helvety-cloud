-- Shared helpers for P4 schema (timestamps).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers keep working as table owner; clients must not call this via RPC.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
