-- Freeze attachments.storage_path and workspace_id after insert so members
-- cannot redirect service-role signed download URLs via PostgREST UPDATE.

create or replace function public.attachments_freeze_path_and_workspace()
returns trigger
language plpgsql
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

create trigger attachments_freeze_path_and_workspace
  before update on public.attachments
  for each row execute function public.attachments_freeze_path_and_workspace();
