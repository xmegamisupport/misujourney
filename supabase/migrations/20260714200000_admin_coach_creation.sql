-- ---------- Security fix: role must never come from client-supplied signup data ----------
-- handle_new_user() previously read role from raw_user_meta_data, which any
-- caller can set directly via the public supabase-js signUp() API (bypassing
-- the /register UI entirely) — e.g. `options: { data: { role: 'admin' } }`
-- would silently create an admin profile. raw_app_meta_data is only
-- settable via the Auth Admin API (service-role key), never by the client
-- itself, so it's the only safe place to read an authorization-sensitive
-- field like role from.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, role, name, avatar)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar'
  );
  return new;
end;
$$;
