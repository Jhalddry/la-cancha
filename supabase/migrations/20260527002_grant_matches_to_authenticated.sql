-- Grant table-level privileges to authenticated role.
-- RLS policies alone are not enough — the role also needs base DML grants.

grant select, insert, update, delete on table matches to authenticated;
-- match_players was dropped in 20260527001; grant removed to avoid "relation does not exist" error
