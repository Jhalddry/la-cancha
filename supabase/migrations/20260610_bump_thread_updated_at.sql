-- Keep chat_threads.updated_at in sync with latest message so the
-- chats list (ordered by updated_at desc) puts active threads on top.
create or replace function public.bump_chat_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_chat_thread_updated_at on public.chat_messages;
create trigger trg_bump_chat_thread_updated_at
after insert on public.chat_messages
for each row execute function public.bump_chat_thread_updated_at();
