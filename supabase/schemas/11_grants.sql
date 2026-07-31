-- Explicit GRANTs (Data API auto-expose is OFF). No encrypted-entity access for anon.
--
-- PostgREST gap (future hardening): the `authenticated` role has full DML on encrypted
-- entity tables (projects, tasks, notes, contacts, boards, comments). An authenticated user can
-- therefore bypass the Next.js /api/v1 layer and hit PostgREST directly with their JWT.
-- RLS still enforces workspace membership, so they only ever receive ciphertext for
-- workspaces they legitimately belong to. Closing this gap properly requires a dedicated
-- Postgres role for the API layer (separate from `authenticated`) and is tracked as a
-- future hardening phase. service_role / MCP admin access is unaffected by either approach.

revoke all on table public.profiles from anon, public;
revoke all on table public.user_crypto from anon, public;
revoke all on table public.workspaces from anon, public;
revoke all on table public.workspace_members from anon, public;
revoke all on table public.projects from anon, public;
revoke all on table public.wrapped_keys from anon, public;
revoke all on table public.tasks from anon, public;
revoke all on table public.policy_acceptances from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_crypto to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.wrapped_keys to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert on table public.policy_acceptances to authenticated;

-- Match intended privileges: no TRUNCATE / REFERENCES / TRIGGER for clients.
revoke truncate, references, trigger on table public.profiles from authenticated;
revoke truncate, references, trigger on table public.user_crypto from authenticated;
revoke truncate, references, trigger on table public.workspaces from authenticated;
revoke truncate, references, trigger on table public.workspace_members from authenticated;
revoke truncate, references, trigger on table public.projects from authenticated;
revoke truncate, references, trigger on table public.wrapped_keys from authenticated;
revoke truncate, references, trigger on table public.tasks from authenticated;
revoke truncate, references, trigger on table public.policy_acceptances from authenticated;

-- Platform helper (not defined here); clients must not call it via RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
