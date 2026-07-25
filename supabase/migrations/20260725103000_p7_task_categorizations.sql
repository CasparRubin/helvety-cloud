-- P7: plaintext categorization option ids on tasks (names live in project ciphertext).

alter table public.tasks
  add column if not exists label_id uuid,
  add column if not exists stage_id uuid,
  add column if not exists priority_id uuid;

create index if not exists tasks_project_stage_idx on public.tasks (project_id, stage_id);
create index if not exists tasks_project_priority_idx on public.tasks (project_id, priority_id);
create index if not exists tasks_project_label_idx on public.tasks (project_id, label_id);
