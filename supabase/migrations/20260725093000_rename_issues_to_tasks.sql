-- Rename issues → tasks (hard cut; pre-launch).

alter table public.issues rename to tasks;

alter index public.issues_project_id_idx rename to tasks_project_id_idx;
alter index public.issues_project_updated_idx rename to tasks_project_updated_idx;

alter trigger issues_set_updated_at on public.tasks rename to tasks_set_updated_at;

alter table public.tasks rename constraint issues_pkey to tasks_pkey;
alter table public.tasks rename constraint issues_project_id_fkey to tasks_project_id_fkey;

alter policy issues_select_member on public.tasks rename to tasks_select_member;
alter policy issues_insert_member on public.tasks rename to tasks_insert_member;
alter policy issues_update_member on public.tasks rename to tasks_update_member;
alter policy issues_delete_member on public.tasks rename to tasks_delete_member;

alter table public.notes rename column issue_id to task_id;
alter index public.notes_workspace_issue_idx rename to notes_workspace_task_idx;
alter table public.notes rename constraint notes_issue_id_fkey to notes_task_id_fkey;
