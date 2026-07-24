-- P5 fix-before-E2EE: revoke helper EXECUTE + tighten vault table grants.
-- Triggers still fire as table owner; clients must not call helpers via RPC.

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

revoke truncate, references, trigger on table public.profiles from authenticated;
revoke truncate, references, trigger on table public.user_crypto from authenticated;
revoke truncate, references, trigger on table public.workspaces from authenticated;
revoke truncate, references, trigger on table public.workspace_members from authenticated;
revoke truncate, references, trigger on table public.projects from authenticated;
revoke truncate, references, trigger on table public.wrapped_keys from authenticated;
revoke truncate, references, trigger on table public.issues from authenticated;

create index if not exists workspaces_created_by_idx on public.workspaces (created_by);
