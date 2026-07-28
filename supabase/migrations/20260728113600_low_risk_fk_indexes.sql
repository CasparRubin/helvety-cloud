create index if not exists tasks_milestone_id_idx
  on public.tasks (milestone_id)
  where milestone_id is not null;

create index if not exists workspace_invitations_invited_by_idx
  on public.workspace_invitations (invited_by);

create index if not exists workspace_invitations_sealed_by_idx
  on public.workspace_invitations (sealed_by)
  where sealed_by is not null;

create index if not exists comments_author_id_idx
  on public.comments (author_id);
