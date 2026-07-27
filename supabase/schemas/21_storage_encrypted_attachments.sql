-- Private Storage bucket for E2EE attachment ciphertext (P11).
-- Objects are opaque; access is via API-minted signed URLs after membership
-- + entitlement checks. Direct client list/upload without a signed URL is denied.
insert into storage.buckets (id, name, public, file_size_limit)
values ('encrypted-attachments', 'encrypted-attachments', false, 26214400)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- No authenticated grants for this bucket; /api/v1 mints signed URLs with
-- the service role after plan/membership checks.
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
