-- Multi-project filing via entity_links: drop notes.project_id, allow note↔project.
-- Demo data wipe: no backfill.

truncate table public.entity_links;

drop index if exists public.notes_workspace_project_idx;

alter table public.notes drop column if exists project_id;

alter table public.entity_links drop constraint entity_links_allowed_pair;

alter table public.entity_links
  add constraint entity_links_allowed_pair check (
    (least(source_kind, target_kind), greatest(source_kind, target_kind)) in (
      ('contact', 'note'),
      ('contact', 'project'),
      ('contact', 'task'),
      ('note', 'project'),
      ('note', 'task')
    )
  );
