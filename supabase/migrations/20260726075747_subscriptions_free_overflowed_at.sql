-- Soft-lock overflow: tag workspaces that lose Pro while the owner exceeds
-- the free owned-workspace allowance. Create gates read this dynamically.
alter table public.subscriptions
  add column if not exists free_overflowed_at timestamptz;
