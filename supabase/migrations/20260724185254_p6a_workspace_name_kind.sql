-- P6a: plaintext workspace name + kind (Personal vs standard).

alter table public.workspaces
  add column if not exists name text,
  add column if not exists kind text;

-- Backfill existing P5 proof workspaces before NOT NULL / check.
update public.workspaces
set
  name = coalesce(nullif(name, ''), 'Workspace'),
  kind = coalesce(nullif(kind, ''), 'standard')
where name is null or kind is null;

alter table public.workspaces
  alter column name set not null,
  alter column kind set not null,
  alter column kind set default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_kind_check'
      and conrelid = 'public.workspaces'::regclass
  ) then
    alter table public.workspaces
      add constraint workspaces_kind_check
      check (kind in ('personal', 'standard'));
  end if;
end $$;

create unique index if not exists workspaces_one_personal_per_owner_idx
  on public.workspaces (created_by)
  where kind = 'personal';
