-- P6b: project names are always encrypted; disallow null blobs (match issues).
delete from public.projects where encrypted_blob is null;

alter table public.projects
  alter column encrypted_blob set not null;
