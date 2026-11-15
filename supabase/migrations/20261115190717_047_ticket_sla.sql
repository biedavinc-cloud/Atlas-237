-- "SLA & escalation" (Pro and Enterprise on the pricing matrix) was sold
-- with nothing behind it. This makes it real at the database level, so it
-- applies to tickets created in the app AND through the public API:
--   * Pro/Enterprise: sla_due_at is set from the priority when a ticket is
--     created (urgent 4 h, high 24 h, medium 48 h, low 72 h) and recomputed
--     from created_at when the priority changes on an open ticket.
--   * Every plan: resolved_at is stamped when a ticket becomes resolved or
--     closed, and cleared if it is reopened.
-- The Support page shows the time left / breach; escalation to Freshdesk is
-- a quick action on each ticket.

CREATE OR REPLACE FUNCTION public.ticket_sla_hours(p text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p WHEN 'urgent' THEN 4 WHEN 'high' THEN 24 WHEN 'low' THEN 72 ELSE 48 END;
$$;

CREATE OR REPLACE FUNCTION public.tickets_apply_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_plan text;
BEGIN
  SELECT plan INTO org_plan FROM public.organizations WHERE id = NEW.org_id;

  IF org_plan IN ('pro', 'enterprise') THEN
    IF TG_OP = 'INSERT' AND NEW.sla_due_at IS NULL THEN
      NEW.sla_due_at := COALESCE(NEW.created_at, now()) + make_interval(hours => public.ticket_sla_hours(NEW.priority));
    ELSIF TG_OP = 'UPDATE' AND NEW.priority IS DISTINCT FROM OLD.priority
          AND NEW.status NOT IN ('resolved', 'closed')
          AND NEW.sla_due_at IS NOT DISTINCT FROM OLD.sla_due_at THEN
      NEW.sla_due_at := COALESCE(NEW.created_at, now()) + make_interval(hours => public.ticket_sla_hours(NEW.priority));
    END IF;
  END IF;

  IF NEW.status IN ('resolved', 'closed') THEN
    IF TG_OP = 'INSERT' OR OLD.status NOT IN ('resolved', 'closed') THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, now());
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('resolved', 'closed') THEN
    NEW.resolved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tickets_apply_sla() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tickets_apply_sla ON public.tickets;
CREATE TRIGGER tickets_apply_sla
  BEFORE INSERT OR UPDATE OF priority, status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_apply_sla();
