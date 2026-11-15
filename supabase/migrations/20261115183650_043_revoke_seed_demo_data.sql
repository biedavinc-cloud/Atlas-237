-- SECURITY FIX (cross-tenant write).
-- seed_demo_data(new_org_id, owner_id) is SECURITY DEFINER and was
-- executable by every signed-in user through /rest/v1/rpc/seed_demo_data.
-- It takes the target org as a parameter and checks nothing, so any user
-- could inject sample contacts, deals, invoices… into ANY other tenant.
-- Its only legitimate caller is the handle_new_user() trigger, which runs
-- as the function owner and is unaffected by this revoke.
REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
