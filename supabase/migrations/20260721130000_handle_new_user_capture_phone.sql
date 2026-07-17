-- Registration UX: capture the phone number at sign-up.
--
-- The registration form now collects a required phone number and passes it in
-- the sign-up user_metadata (alongside the existing name / referral_code).
-- handle_new_user() already seeds the profile row from that metadata at
-- auth.users insert time; this only adds `phone` to the columns it copies.
-- Purely additive: no schema change (profiles.phone already exists, nullable),
-- and name/role/avatar seeding is byte-for-byte unchanged. Onboarding's
-- complete_registration_goals() still sets phone exactly as before.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, role, name, avatar, phone)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;
