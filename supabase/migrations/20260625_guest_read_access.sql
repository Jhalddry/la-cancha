-- Guest browsing: let unauthenticated (anon) clients read public match data.
-- Writes stay authenticated-only. Sensitive profile columns (push_token) are
-- NOT exposed: anon gets a column-level SELECT grant instead of the table grant.

-- matches ---------------------------------------------------------------------
grant select on public.matches to anon;
drop policy if exists "matches: anon read" on public.matches;
create policy "matches: anon read"
  on public.matches for select to anon using (true);

-- match_participants: only accepted players, never pending/rejected requests --
grant select on public.match_participants to anon;
drop policy if exists "match_participants: anon read joined" on public.match_participants;
create policy "match_participants: anon read joined"
  on public.match_participants for select to anon using (status = 'joined');

-- profiles: public fields only (matches PROFILE_FIELDS in lib/matchesApi.ts) ---
revoke select on public.profiles from anon;
grant select (
  id, name, username, avatar_url, skill_level, sports, positions, bio,
  verified, reputation, matches_played, matches_organized, attendance_pct,
  badges, city, onboarded
) on public.profiles to anon;
-- initial schema already has "profiles: public read" (no role restriction).

-- ratings: aggregate inputs for profile stats ---------------------------------
grant select (ratee_id, stars, tags) on public.ratings to anon;
drop policy if exists "ratings: anon read" on public.ratings;
create policy "ratings: anon read"
  on public.ratings for select to anon using (true);
