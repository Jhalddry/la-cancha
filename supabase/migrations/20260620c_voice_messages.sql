-- Voice messages: add voice_url and voice_duration_sec to both message tables
-- voice_url: public Supabase Storage URL (bucket: voice-messages, must be created manually)
-- voice_duration_sec: duration in seconds (integer)
alter table chat_messages
  add column if not exists voice_url text,
  add column if not exists voice_duration_sec integer;

alter table private_messages
  add column if not exists voice_url text,
  add column if not exists voice_duration_sec integer;
