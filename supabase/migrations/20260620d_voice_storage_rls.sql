-- Allow authenticated users to upload voice messages to their own folder
create policy "voice_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'voice-messages'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read (bucket is public, but RLS still applies to objects table)
create policy "voice_read_public"
  on storage.objects for select
  to public
  using (bucket_id = 'voice-messages');
