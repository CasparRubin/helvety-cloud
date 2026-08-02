-- Security audit hardening:
-- 1) Clear invitation seals on accept; drop accept_requires_seal
-- 2) Clear leftover seals on leave/remove (purge_member_wraps)
-- 3) Freeze workspaces.created_by / kind except definer reassignment

alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_accept_requires_seal;

create or replace function public.accept_workspace_invitation(invitation_id uuid)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
  caller_email text := public.normalized_auth_email();
begin
  if caller is null or caller_email is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into row
  from public.workspace_invitations wi
  where wi.id = invitation_id
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if row.cancelled_at is not null
     or row.accepted_at is not null
     or row.claimed_by is distinct from caller
     or row.email is distinct from caller_email
     or row.sealed_workspace_key is null then
    raise exception 'invitation not acceptable' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = row.workspace_id
      and wm.user_id = caller
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.profiles (id)
  values (caller)
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (row.workspace_id, caller, row.role);

  insert into public.wrapped_keys (
    subject_type,
    subject_id,
    user_id,
    wrapped_key
  )
  values (
    'workspace',
    row.workspace_id,
    caller,
    row.sealed_workspace_key
  );

  -- Clear seal after copy so leave/remove wrap purge has no durable second copy.
  update public.workspace_invitations wi
  set
    accepted_at = now(),
    sealed_workspace_key = null,
    sealed_at = null,
    sealed_by = null
  where wi.id = invitation_id
  returning * into row;

  return row;
end;
$$;

create or replace function public.purge_member_wraps(ws_id uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.wrapped_keys
  where user_id = target
    and (
      (subject_type = 'workspace' and subject_id = ws_id)
      or (
        subject_type = 'project'
        and subject_id in (
          select p.id from public.projects p where p.workspace_id = ws_id
        )
      )
    );

  -- Drop any leftover invitation seals for this member (claimed_by or email).
  update public.workspace_invitations wi
  set
    sealed_workspace_key = null,
    sealed_at = null,
    sealed_by = null
  where wi.workspace_id = ws_id
    and wi.sealed_workspace_key is not null
    and (
      wi.claimed_by = target
      or wi.email = (
        select nullif(lower(trim(u.email)), '')
        from auth.users u
        where u.id = target
      )
    );
end;
$$;

create or replace function public.workspaces_freeze_created_by_and_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('helvety.allow_workspace_attr_change', true) = '1' then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'workspaces.created_by is immutable'
      using errcode = 'P0001';
  end if;
  if new.kind is distinct from old.kind then
    raise exception 'workspaces.kind is immutable'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.workspaces_freeze_created_by_and_kind()
  from public, anon, authenticated;

drop trigger if exists workspaces_freeze_created_by_and_kind on public.workspaces;
create trigger workspaces_freeze_created_by_and_kind
  before update on public.workspaces
  for each row execute function public.workspaces_freeze_created_by_and_kind();

create or replace function public.reassign_workspace_created_by(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_owner uuid;
begin
  select wm.user_id into next_owner
  from public.workspace_members wm
  where wm.workspace_id = ws_id
  order by wm.created_at asc
  limit 1;

  if next_owner is null then
    return;
  end if;

  perform set_config('helvety.allow_workspace_attr_change', '1', true);
  update public.workspaces
  set created_by = next_owner
  where id = ws_id
    and created_by is distinct from next_owner;
end;
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  solo record;
  shared record;
  next_owner uuid;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  for shared in
    select w.id as workspace_id
    from public.workspaces w
    where w.created_by = caller
      and (
        select count(*)
        from public.workspace_members wm
        where wm.workspace_id = w.id
      ) > 1
  loop
    select wm.user_id into next_owner
    from public.workspace_members wm
    where wm.workspace_id = shared.workspace_id
      and wm.user_id <> caller
    order by wm.created_at asc
    limit 1;

    if next_owner is not null then
      perform set_config('helvety.allow_workspace_attr_change', '1', true);
      update public.workspaces
      set created_by = next_owner
      where id = shared.workspace_id;
    end if;
  end loop;

  for solo in
    select wm.workspace_id as id
    from public.workspace_members wm
    where wm.user_id = caller
      and (
        select count(*)
        from public.workspace_members wm2
        where wm2.workspace_id = wm.workspace_id
      ) = 1
  loop
    perform public.purge_workspace_wraps(solo.id);

    delete from public.workspaces
    where id = solo.id;
  end loop;

  delete from public.workspace_invitations
  where invited_by = caller
     or claimed_by = caller
     or sealed_by = caller;
end;
$$;
