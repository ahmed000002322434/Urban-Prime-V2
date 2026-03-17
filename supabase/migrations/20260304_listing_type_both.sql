do $$
begin
  alter type public.listing_type add value if not exists 'both';
exception
  when duplicate_object then null;
end
$$;
