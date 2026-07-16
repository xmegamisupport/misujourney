-- Pre-launch hardening. generate_journey_nutrition_target() is an internal
-- helper only ever called by complete_registration_goals() (SECURITY DEFINER,
-- runs as its owner). It has no caller guard, and the security advisor flagged
-- it as directly executable by anon/authenticated via /rest/v1/rpc, which would
-- let anyone insert or overwrite a nutrition target for an arbitrary customer.
-- Revoke direct EXECUTE — the internal call is unaffected because the calling
-- definer function runs as owner, not as the REST caller.
revoke execute on function public.generate_journey_nutrition_target(
  p_customer_id uuid, p_journey_id uuid, p_gender text, p_age integer,
  p_height_cm numeric, p_journey_start_weight_kg numeric, p_activity_level public.activity_level
) from anon, authenticated, public;
