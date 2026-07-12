-- Correction: Supabase grants EXECUTE on newly created public-schema functions
-- to anon/authenticated/service_role via an explicit per-role ACL entry (set
-- through database-level default privileges), not through the PUBLIC
-- pseudo-role. The prior migration's `revoke ... from public` therefore did
-- not remove anon's access. Revoke explicitly from anon/authenticated here.

-- Internal-only helpers and the auth trigger function: no client role should
-- ever call these directly.
revoke execute on function public._check_and_update_alert(uuid, public.product_code, integer) from anon, authenticated;
revoke execute on function public._complete_alerts_for_repurchase(uuid, public.product_code) from anon, authenticated;
revoke execute on function public.get_inventory_alert_status(public.product_code, integer) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Client-callable RPCs: authenticated only, never anon.
revoke execute on function public.current_role() from anon;
revoke execute on function public.init_customer_inventory(uuid, integer, integer) from anon;
revoke execute on function public.init_legacy_balance(uuid, integer, integer) from anon;
revoke execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]) from anon;
revoke execute on function public.record_repurchase(uuid, public.product_code, integer, date, text) from anon;
revoke execute on function public.manual_adjustment(uuid, public.product_code, integer, text) from anon;
revoke execute on function public.mark_alert_followed_up(uuid) from anon;
