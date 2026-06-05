
-- has_role is only used inside RLS policies; revoke direct execution
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- claim_admin_if_first: only authenticated users (already enforced by auth.uid() check inside)
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_first() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_first() TO authenticated;
