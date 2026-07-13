-- ---------- WhatsApp contact for the customer's bound Coach ----------
--
-- whatsapp_number is stored normalized (country code + digits only, e.g.
-- "60123456789" — no "+", spaces, dashes, or parentheses) so it can be
-- dropped straight into a wa.me link. Normalization itself happens in the
-- app layer (normalizeWhatsAppNumber()); the column just stores the result.

alter table public.profiles add column whatsapp_number text;

-- A customer needs their bound coach's name/avatar/whatsapp_number, but the
-- existing profiles RLS only lets a row's own owner, that customer's coach,
-- or an admin read it — there's no policy letting a customer read their
-- coach's row (the reverse direction), and a blanket one would over-expose
-- the coach's whole profile row. This function returns only whitelisted
-- public-contact columns for exactly the caller's own bound coach — no
-- coach_id parameter, so a customer can never look up any other coach.
create function public.get_my_coach_contact()
returns table (coach_id uuid, name text, avatar text, whatsapp_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar, p.whatsapp_number
  from public.profiles p
  where p.id = (select coach_id from public.profiles where id = auth.uid());
$$;

revoke execute on function public.get_my_coach_contact() from public;
grant execute on function public.get_my_coach_contact() to authenticated;
