do $$
declare
  target_tables text[] := array[
    'spotlight_content',
    'spotlight_metrics',
    'spotlight_comments',
    'notifications',
    'chat_threads',
    'chat_messages'
  ];
  target_table text;
begin
  foreach target_table in array target_tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end
$$;
