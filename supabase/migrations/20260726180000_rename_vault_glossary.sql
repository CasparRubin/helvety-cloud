-- Rename product glossary: vault → encrypted data.
-- 1) Invitation claim errors: "encryption not set up" / "user public key"
-- 2) Storage bucket: vault-attachments → encrypted-attachments (copy objects)

create or replace function public.claim_workspace_invitation(
  invitation_id uuid,
  public_key text
)
returns public.workspace_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.workspace_invitations;
  caller uuid := (select auth.uid());
  caller_email text := public.normalized_auth_email();
  user_public_key text;
begin
  if caller is null or caller_email is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if public_key is null or length(trim(public_key)) = 0 then
    raise exception 'public_key required' using errcode = '22023';
  end if;

  select uc.public_key into user_public_key
  from public.user_crypto uc
  where uc.user_id = caller;

  if user_public_key is null then
    raise exception 'encryption not set up' using errcode = 'P0001';
  end if;

  -- Owners seal to whatever key lands here, so it must be the caller's own
  -- registered user public key, not an arbitrary argument.
  if public_key is distinct from user_public_key then
    raise exception 'public_key does not match user public key'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (caller)
  on conflict (id) do nothing;

  update public.workspace_invitations wi
  set
    claimed_by = caller,
    claimed_public_key = user_public_key,
    claimed_at = now()
  where wi.id = invitation_id
    and wi.email = caller_email
    and wi.cancelled_at is null
    and wi.accepted_at is null
    and wi.claimed_by is null
  returning * into row;

  if not found then
    raise exception 'invitation not claimable' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

-- Storage bucket rename (formerly vault-attachments).
insert into storage.buckets (id, name, public, file_size_limit)
values ('encrypted-attachments', 'encrypted-attachments', false, 26214400)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Move existing objects if any (same storage backend).
update storage.objects
set bucket_id = 'encrypted-attachments'
where bucket_id = 'vault-attachments';

drop policy if exists vault_attachments_no_select on storage.objects;
drop policy if exists vault_attachments_no_insert on storage.objects;
drop policy if exists vault_attachments_no_update on storage.objects;
drop policy if exists vault_attachments_no_delete on storage.objects;
drop policy if exists encrypted_attachments_no_select on storage.objects;
drop policy if exists encrypted_attachments_no_insert on storage.objects;
drop policy if exists encrypted_attachments_no_update on storage.objects;
drop policy if exists encrypted_attachments_no_delete on storage.objects;

create policy encrypted_attachments_no_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'encrypted-attachments' and false);

create policy encrypted_attachments_no_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'encrypted-attachments' and false);

create policy encrypted_attachments_no_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'encrypted-attachments' and false)
  with check (bucket_id = 'encrypted-attachments' and false);

create policy encrypted_attachments_no_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'encrypted-attachments' and false);

-- Leave empty legacy bucket `vault-attachments` in place; Storage API blocks
-- direct DELETE FROM storage.buckets. App now uses encrypted-attachments only.
