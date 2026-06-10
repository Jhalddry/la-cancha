-- ============================================================
-- 1. Drop the redundant match_players table and its RPCs
--    (real schema uses match_participants with profile_id)
-- ============================================================

drop table if exists match_players cascade;

drop function if exists decrement_missing_count(uuid);
drop function if exists increment_missing_count(uuid);

-- ============================================================
-- 2. Grant table-level DML privileges to authenticated role
--    (RLS policies alone are not enough — base grants required)
-- ============================================================

grant select, insert, update, delete on matches           to authenticated;
grant select, insert, update, delete on match_participants to authenticated;
grant select, insert, update, delete on chat_threads      to authenticated;
grant select, insert, update, delete on chat_messages     to authenticated;
grant select, insert, update, delete on chat_reads        to authenticated;
grant select, insert, update, delete on ratings           to authenticated;
grant select                          on venues            to authenticated;
grant select                          on exchange_rate     to authenticated;
grant select, insert, update, delete on notifications     to authenticated;

-- ============================================================
-- 3. Make the chat-thread trigger security definer so it runs
--    as postgres (not as the calling authenticated user)
-- ============================================================

create or replace function create_chat_thread_for_match()
returns trigger language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.chat_threads (match_id) values (new.id);
  return new;
end;
$$;
