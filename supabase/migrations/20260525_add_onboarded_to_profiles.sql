-- Add onboarded flag to profiles.
-- Existing users who already have sports configured are marked as onboarded
-- so they bypass the onboarding flow on next login.

alter table profiles
  add column if not exists onboarded boolean not null default false;

-- Backfill: any profile that already has at least one sport is considered onboarded
update profiles
set onboarded = true
where cardinality(sports) > 0;
