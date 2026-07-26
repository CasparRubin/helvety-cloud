-- Wipe vault data, then replace workspaces.name with encrypted_blob.
-- Fresh Personal workspace is created on next vault unlock.

delete from public.workspaces;

alter table public.workspaces drop column name;

alter table public.workspaces
  add column encrypted_blob jsonb not null;
