-- Explicit GRANTs (Data API auto-expose is OFF). No vault access for anon.

revoke all on table public.profiles from anon, public;
revoke all on table public.user_crypto from anon, public;
revoke all on table public.workspaces from anon, public;
revoke all on table public.workspace_members from anon, public;
revoke all on table public.projects from anon, public;
revoke all on table public.wrapped_keys from anon, public;
revoke all on table public.issues from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_crypto to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.wrapped_keys to authenticated;
grant select, insert, update, delete on table public.issues to authenticated;
