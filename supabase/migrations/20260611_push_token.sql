-- Add push notification token storage to profiles.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
