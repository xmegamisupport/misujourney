-- Harden function security: pin search_path on every function (avoids schema
-- injection via a mutable search_path) and lock down EXECUTE grants so
-- unauthenticated (anon) callers cannot invoke RPCs, and internal helper
-- functions (prefixed with `_`) cannot be called directly by any client role.
-- Addresses Supabase security advisor warnings: function_search_path_mutable,
-- anon_security_definer_function_executable, authenticated_security_definer_function_executable.

-- ---------- Pin search_path on every function ----------

alter function public.current_role() set search_path = '';
alter function public.get_inventory_alert_status(public.product_code, integer) set search_path = '';
alter function public._check_and_update_alert(uuid, public.product_code, integer) set search_path = '';
alter function public._complete_alerts_for_repurchase(uuid, public.product_code) set search_path = '';
alter function public.init_customer_inventory(uuid, integer, integer) set search_path = '';
alter function public.init_legacy_balance(uuid, integer, integer) set search_path = '';
alter function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]) set search_path = '';
alter function public.record_repurchase(uuid, public.product_code, integer, date, text) set search_path = '';
alter function public.manual_adjustment(uuid, public.product_code, integer, text) set search_path = '';
alter function public.mark_alert_followed_up(uuid) set search_path = '';
alter function public.handle_new_user() set search_path = '';

-- ---------- Lock down EXECUTE grants ----------
-- Function CREATE implicitly grants EXECUTE to PUBLIC (which includes anon).
-- Revoke that everywhere, then re-grant only where a client role legitimately
-- needs to call the function directly.

revoke execute on function public.current_role() from public;
revoke execute on function public.get_inventory_alert_status(public.product_code, integer) from public;
revoke execute on function public._check_and_update_alert(uuid, public.product_code, integer) from public;
revoke execute on function public._complete_alerts_for_repurchase(uuid, public.product_code) from public;
revoke execute on function public.init_customer_inventory(uuid, integer, integer) from public;
revoke execute on function public.init_legacy_balance(uuid, integer, integer) from public;
revoke execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]) from public;
revoke execute on function public.record_repurchase(uuid, public.product_code, integer, date, text) from public;
revoke execute on function public.manual_adjustment(uuid, public.product_code, integer, text) from public;
revoke execute on function public.mark_alert_followed_up(uuid) from public;
revoke execute on function public.handle_new_user() from public;

-- Client-callable RPCs: authenticated only (no anon access).
grant execute on function public.current_role() to authenticated;
grant execute on function public.init_customer_inventory(uuid, integer, integer) to authenticated;
grant execute on function public.init_legacy_balance(uuid, integer, integer) to authenticated;
grant execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]) to authenticated;
grant execute on function public.record_repurchase(uuid, public.product_code, integer, date, text) to authenticated;
grant execute on function public.manual_adjustment(uuid, public.product_code, integer, text) to authenticated;
grant execute on function public.mark_alert_followed_up(uuid) to authenticated;

-- Internal-only helpers: no direct grant to any client role. They remain
-- callable from within the other SECURITY DEFINER functions above because
-- those nested calls execute under the function owner's privileges, which
-- always implicitly include EXECUTE on objects the owner itself owns.
-- (public._check_and_update_alert, public._complete_alerts_for_repurchase,
-- public.get_inventory_alert_status, public.handle_new_user intentionally
-- get no grant here.)
