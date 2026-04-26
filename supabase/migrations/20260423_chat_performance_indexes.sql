create index if not exists idx_chat_messages_thread_created_at
on public.chat_messages(thread_id, created_at desc, id desc);

create index if not exists idx_chat_threads_buyer_last_message_at
on public.chat_threads(buyer_id, last_message_at desc);

create index if not exists idx_chat_threads_seller_last_message_at
on public.chat_threads(seller_id, last_message_at desc);

create index if not exists idx_chat_threads_inbox_last_message_at
on public.chat_threads(inbox_label, last_message_at desc)
where inbox_label is not null;
