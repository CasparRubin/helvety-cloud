-- workspaces: client-generated UUIDs; encrypted_blob stores workspace name plus
-- workspace-scoped task categorizations (labels / stages / priorities).

create table public.workspaces (
  id uuid primary key,
  created_by uuid not null references public.profiles (id),
  encrypted_blob jsonb not null,
  kind text not null default 'standard'
    check (kind in ('personal', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_created_by_idx on public.workspaces (created_by);

-- At most one Personal workspace per created_by.
create unique index workspaces_one_personal_per_owner_idx
  on public.workspaces (created_by)
  where kind = 'personal';

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- created_by / kind are attribution invariants. Members may update
-- encrypted_blob via PostgREST; intentional reassignment uses
-- set_config('helvety.allow_workspace_attr_change', '1', true) in definer RPCs.
create or replace function public.workspaces_freeze_created_by_and_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('helvety.allow_workspace_attr_change', true) = '1' then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'workspaces.created_by is immutable'
      using errcode = 'P0001';
  end if;
  if new.kind is distinct from old.kind then
    raise exception 'workspaces.kind is immutable'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.workspaces_freeze_created_by_and_kind()
  from public, anon, authenticated;

create trigger workspaces_freeze_created_by_and_kind
  before update on public.workspaces
  for each row execute function public.workspaces_freeze_created_by_and_kind();

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
