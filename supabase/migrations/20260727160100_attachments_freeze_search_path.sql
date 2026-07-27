-- Harden attachments_freeze_path_and_workspace: fixed search_path + no RPC execute.

create or replace function public.attachments_freeze_path_and_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.storage_path is distinct from old.storage_path then
    raise exception 'attachments.storage_path is immutable'
      using errcode = 'P0001';
  end if;
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'attachments.workspace_id is immutable'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.attachments_freeze_path_and_workspace()
  from public, anon, authenticated;
