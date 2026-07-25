-- milestones: project-scoped ciphertext; title/description/targetDate in blob.
-- Must load before 09_tasks.sql (tasks.milestone_id FK).

create table public.milestones (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  encrypted_blob jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index milestones_project_id_idx on public.milestones (project_id);
create index milestones_project_updated_idx on public.milestones (project_id, updated_at);

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

alter table public.milestones enable row level security;
alter table public.milestones force row level security;

create policy milestones_select_member
  on public.milestones
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy milestones_insert_member
  on public.milestones
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy milestones_update_member
  on public.milestones
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy milestones_delete_member
  on public.milestones
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

revoke all on table public.milestones from anon, public;
grant select, insert, update, delete on table public.milestones to authenticated;
revoke truncate, references, trigger on table public.milestones from authenticated;
