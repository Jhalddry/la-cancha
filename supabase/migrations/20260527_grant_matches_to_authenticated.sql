-- Grant table-level privileges to authenticated role.
-- RLS policies alone are not enough — the role also needs base DML grants.

grant select, insert, update, delete on table matches        to authenticated;
grant select, insert, update, delete on table match_players  to authenticated;
