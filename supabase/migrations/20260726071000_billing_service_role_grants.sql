-- P12 fix: auto-expose off — service_role needs explicit grants for billing tables.
grant select, insert, update, delete on table public.discount_codes to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.billing_events to service_role;
grant execute on function public.increment_discount_redemption(uuid) to service_role;
