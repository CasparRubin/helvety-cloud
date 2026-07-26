-- Index notes list by creation date (newest first).
create index notes_workspace_created_idx on public.notes (workspace_id, created_at desc);
