alter table public.chat_messages
add column if not exists reply_to_message_id uuid null references public.chat_messages(id) on delete set null;

alter table public.chat_messages
add column if not exists reactions jsonb not null default '{}'::jsonb;

alter table public.chat_messages
add column if not exists edited_at timestamptz null;

alter table public.chat_messages
add column if not exists deleted_at timestamptz null;

create index if not exists idx_chat_messages_reply_to_message_id
on public.chat_messages(reply_to_message_id);
