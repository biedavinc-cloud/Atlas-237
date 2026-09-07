-- Removes the @liafrik.com domain-based auto-admin rule (a deliberate but
-- now-reversed decision from an earlier session). The org explicitly
-- wants @liafrik.com reserved for customer service / other staff roles,
-- with super admin granted ONLY by manually adding someone via the Super
-- Admin module (which writes to public.super_admins).
--
-- Two mechanisms are removed:
-- 1. A trigger on auth.users that auto-inserted a super_admins row for
--    ANY new @liafrik.com signup.
-- 2. The domain-based branch inside is_super_admin() itself, which also
--    granted admin status to any confirmed @liafrik.com email even
--    without a super_admins row.
DROP TRIGGER IF EXISTS on_auth_user_created_liafrik_admin ON auth.users;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = check_user_id AND active = true
  ) OR EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE email = (SELECT email FROM auth.users WHERE id = check_user_id) AND active = true
  );
$function$;
