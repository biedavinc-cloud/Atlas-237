-- Korapay + CinetPay as subscription PSPs (alongside Flutterwave, PayUnit,
-- Paystack and Paddle).
--
-- Both are redirect checkouts: the browser leaves Atlas, pays on the
-- provider's hosted page, and comes back. The provider may also notify us
-- server-to-server (webhook) before or instead of the browser returning.
-- So the expected price/plan/cycle of each checkout is recorded here, BEFORE
-- redirecting, and every confirmation path (return or webhook) re-queries the
-- provider and compares against this row — never against anything the
-- browser or the webhook body claims.
--
-- Writing a pending row here (instead of upserting a "pending" subscription,
-- as the PayUnit flow does) means starting a checkout can never downgrade an
-- org's currently active subscription.

CREATE TABLE IF NOT EXISTS public.billing_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('korapay', 'cinetpay')),
  reference text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('starter', 'growth', 'pro', 'enterprise')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  price_usd numeric(12,2) NOT NULL,
  charge_amount numeric(14,2) NOT NULL,
  charge_currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider_status text,
  checkout_url text,
  -- Where to send the customer back to (validated against an allow-list
  -- of Atlas origins when the checkout is created).
  return_url text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_intents_org ON public.billing_payment_intents(org_id, created_at DESC);

ALTER TABLE public.billing_payment_intents ENABLE ROW LEVEL SECURITY;

-- Members can see their own org's checkout attempts (billing history).
-- There are deliberately NO insert/update/delete policies: only the
-- billing-* edge functions (service role) write here.
DROP POLICY IF EXISTS "billing_intents_select_own_org" ON public.billing_payment_intents;
CREATE POLICY "billing_intents_select_own_org" ON public.billing_payment_intents
  FOR SELECT TO authenticated
  USING (org_id = (SELECT public.user_org_id()));

REVOKE INSERT, UPDATE, DELETE ON public.billing_payment_intents FROM anon, authenticated;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS korapay_reference text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cinetpay_transaction_id text;
