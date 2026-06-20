-- Swipe-to-reply: add reply_to_id to both message tables
alter table chat_messages
  add column if not exists reply_to_id uuid references chat_messages(id) on delete set null;

alter table private_messages
  add column if not exists reply_to_id uuid references private_messages(id) on delete set null;
