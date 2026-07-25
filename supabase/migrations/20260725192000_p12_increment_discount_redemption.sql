-- P12 follow-up: atomic discount redemption increment (service_role only).

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
