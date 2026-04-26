alter table public.chat_threads
add column if not exists inbox_label text;

alter table public.chat_threads
drop constraint if exists chat_threads_inbox_label_check;

alter table public.chat_threads
add constraint chat_threads_inbox_label_check
check (inbox_label in ('primary', 'general') or inbox_label is null);
