-- wrapped_keys: per-member sealed workspace/project keys.

create table public.wrapped_keys (
  subject_type text not null,
  subject_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  wrapped_key jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (subject_type, subject_id, user_id),
  constraint wrapped_keys_subject_type_check check (subject_type in ('workspace', 'project'))
);

create index wrapped_keys_user_id_idx on public.wrapped_keys (user_id);

create trigger wrapped_keys_set_updated_at
  before update on public.wrapped_keys
  for each row execute function public.set_updated_at();

alter table public.wrapped_keys enable row level security;
alter table public.wrapped_keys force row level security;
