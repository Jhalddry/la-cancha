-- Fix: add explicit search_path to SECURITY DEFINER function.
-- Supabase requires this to prevent privilege escalation attacks.
-- Without it, newer Supabase projects block the function execution.

create or replace function handle_new_user()
returns trigger language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
