-- workspace_members: membership for RLS. Single equal role: member.

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('member'))
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

alter table public.workspace_members enable row level security;
alter table public.workspace_members force row level security;
