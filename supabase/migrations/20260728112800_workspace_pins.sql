alter table public.projects
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pin_sort_order bigint;

alter table public.notes
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pin_sort_order bigint;

alter table public.contacts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pin_sort_order bigint;
