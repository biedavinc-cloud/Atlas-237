-- One provider payment = one subscription period. Before this, the
-- verify functions (Flutterwave, Paystack, Paddle, PayUnit) re-activated
-- the subscription every time they were called with the same successful
-- transaction, so one payment could be replayed for unlimited periods.
create table if not exists public.payment_receipts (
  provider text not null,
  reference text not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  plan text not null,
  billing_cycle text not null,
  created_at timestamptz not null default now(),
  primary key (provider, reference)
);
create index if not exists payment_receipts_org_idx on public.payment_receipts(org_id);
alter table public.payment_receipts enable row level security;
revoke all on public.payment_receipts from anon, authenticated;
create policy payment_receipts_read_own on public.payment_receipts for select to authenticated using (org_id = public.user_org_id());
grant select on public.payment_receipts to authenticated;

-- Returns 'new' (first time: caller may extend the subscription), 'same'
-- (already applied to this org: do nothing, report success) or 'other'
-- (reference already used by another organization: refuse).
create or replace function public.claim_payment_receipt(p_provider text, p_reference text, p_org uuid, p_plan text, p_cycle text)
returns text language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  insert into public.payment_receipts (provider, reference, org_id, plan, billing_cycle)
    values (p_provider, p_reference, p_org, p_plan, p_cycle)
    on conflict (provider, reference) do nothing;
  if found then return 'new'; end if;
  select org_id into existing from public.payment_receipts where provider = p_provider and reference = p_reference;
  return case when existing = p_org then 'same' else 'other' end;
end $$;
revoke all on function public.claim_payment_receipt(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_payment_receipt(text, text, uuid, text, text) to service_role;

-- References already applied before this migration can't be replayed either.
insert into public.payment_receipts (provider, reference, org_id, plan, billing_cycle)
select p, r, org_id, plan, coalesce(billing_cycle, 'monthly') from (
  select 'flutterwave' p, flutterwave_payment_id r, org_id, plan, billing_cycle from public.subscriptions where flutterwave_payment_id is not null
  union all select 'paystack', paystack_reference, org_id, plan, billing_cycle from public.subscriptions where paystack_reference is not null and status = 'active'
  union all select 'paddle', paddle_transaction_id, org_id, plan, billing_cycle from public.subscriptions where paddle_transaction_id is not null and status = 'active'
  union all select 'payunit', payunit_transaction_id, org_id, plan, billing_cycle from public.subscriptions where payunit_transaction_id is not null and status = 'active'
) t on conflict do nothing;
