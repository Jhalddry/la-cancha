-- ============================================================
-- Security constraints + avatars storage bucket
-- ============================================================

-- ------------------------------------------------------------
-- Profiles: tighter constraints (idempotent)
-- ------------------------------------------------------------

-- Username: lowercase alphanumeric + underscore, 3–20 chars
do $$ begin
  alter table profiles add constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$');
exception when duplicate_object then null;
end $$;

-- Name: non-empty after trim, max 60 chars
do $$ begin
  alter table profiles add constraint profiles_name_length
    check (char_length(trim(name)) >= 2 and char_length(name) <= 60);
exception when duplicate_object then null;
end $$;

-- Bio: max 300 chars
do $$ begin
  alter table profiles add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 300);
exception when duplicate_object then null;
end $$;

-- Avatar URL: must start with https if present
do $$ begin
  alter table profiles add constraint profiles_avatar_url_https
    check (avatar_url is null or avatar_url like 'https://%');
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Avatars storage bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,                          -- public: URLs readable without auth
  5242880,                       -- 5 MB max
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage RLS: anyone can read (bucket is public, but RLS still applies)
do $$ begin
  create policy "avatars: public read"
    on storage.objects for select
    using (bucket_id = 'avatars');
exception when duplicate_object then null;
end $$;

-- Storage RLS: only authenticated users can upload their own avatar
-- Path convention: avatars/<user_id>/<filename>
do $$ begin
  create policy "avatars: owner upload"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

-- Storage RLS: owner can update/replace own file
do $$ begin
  create policy "avatars: owner update"
    on storage.objects for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

-- Storage RLS: owner can delete own file
do $$ begin
  create policy "avatars: owner delete"
    on storage.objects for delete
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
