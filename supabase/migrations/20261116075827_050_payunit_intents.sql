-- PayUnit checkouts are recorded as payment intents (like Korapay/CinetPay)
-- instead of overwriting the org's subscription row with status 'pending',
-- which cut off a paying customer as soon as they opened a PayUnit checkout.
alter table public.billing_payment_intents drop constraint if exists billing_payment_intents_provider_check;
alter table public.billing_payment_intents add constraint billing_payment_intents_provider_check
  check (provider = any (array['korapay', 'cinetpay', 'payunit']));
