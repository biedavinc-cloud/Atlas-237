-- 048 · Platform keys managed from the super-admin dashboard.
--
-- The super admin can set PSP keys (Flutterwave, Paystack, Paddle, PayUnit,
-- CinetPay, Korapay), platform keys (Resend, Gemini) and OAuth app
-- credentials without touching Cloudflare or Supabase secrets.
--
-- Three scopes, decided here and nowhere else:
--   public  → safe for the browser (public keys, client tokens, price IDs,
--             OAuth client IDs). Readable by anyone via get_public_platform_config().
--   server  → not secret but server-only (CinetPay site id, currencies,
--             modes, allowed origins). Visible in clear to super admins only.
--   secret  → stored ENCRYPTED in Supabase Vault (vault.secrets, name
--             'platform.<KEY>'). Never returned to any browser, not even to a
--             super admin: the dashboard only sees "set / last 4 characters".
--             Edge functions read them through platform_secrets() which only
--             service_role may execute.
-- Edge functions fall back to their environment variable when a key is not
-- set here, so nothing that works today stops working.

create table if not exists public.platform_setting_defs (
  key text primary key,
  scope text not null check (scope in ('public', 'server', 'secret')),
  pattern text,            -- regex from the provider's docs (null = free text)
  allowed text[]           -- closed list of values (modes, environments)
);

create table if not exists public.platform_settings (
  key text primary key references public.platform_setting_defs(key) on delete cascade,
  value text,              -- null for secrets (they live in Vault)
  hint text,               -- last 4 chars of a secret, for recognition
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.platform_setting_defs enable row level security;
alter table public.platform_settings enable row level security;
-- No policies: nothing is reachable through PostgREST directly; access is
-- only through the SECURITY DEFINER functions below.
revoke all on public.platform_setting_defs, public.platform_settings from anon, authenticated;

insert into public.platform_setting_defs (key, scope, pattern, allowed) values
  -- Flutterwave (v3 keys: Settings → API keys)
  ('FLW_PUBLIC_KEY', 'public', '^FLWPUBK(_TEST)?-[A-Za-z0-9]+-X$', null),
  ('FLW_SECRET_KEY', 'secret', '^FLWSECK(_TEST)?-[A-Za-z0-9]+-X$', null),
  -- Paystack (Settings → API Keys & Webhooks)
  ('PAYSTACK_PUBLIC_KEY', 'public', '^pk_(test|live)_[A-Za-z0-9]+$', null),
  ('PAYSTACK_SECRET_KEY', 'secret', '^sk_(test|live)_[A-Za-z0-9]+$', null),
  -- Paddle Billing (Developer tools → Authentication; Catalog → Prices)
  ('PADDLE_ENVIRONMENT', 'public', null, array['production', 'sandbox']),
  ('PADDLE_CLIENT_TOKEN', 'public', '^(live|test)_[A-Za-z0-9]+$', null),
  ('PADDLE_API_KEY', 'secret', '^pdl_(live|sdbx)_apikey_[A-Za-z0-9_]+$', null),
  ('PADDLE_PRICE_STARTER', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_GROWTH', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_PRO', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_ENTERPRISE', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_STARTER_ANNUAL', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_GROWTH_ANNUAL', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_PRO_ANNUAL', 'public', '^pri_[a-z0-9]+$', null),
  ('PADDLE_PRICE_ENTERPRISE_ANNUAL', 'public', '^pri_[a-z0-9]+$', null),
  -- PayUnit (dashboard → API credentials; application → Application detail)
  ('PAYUNIT_MODE', 'server', null, array['test', 'live']),
  ('PAYUNIT_API_USER', 'secret', null, null),
  ('PAYUNIT_API_PASSWORD', 'secret', null, null),
  ('PAYUNIT_API_KEY', 'secret', '^(sand|live)_[A-Za-z0-9]+$', null),
  -- CinetPay (back-office → Intégrations)
  ('CINETPAY_SITE_ID', 'server', '^[0-9]+$', null),
  ('CINETPAY_API_KEY', 'secret', null, null),
  ('CINETPAY_CURRENCY', 'server', null, array['XAF', 'XOF', 'CDF', 'GNF', 'USD']),
  -- Korapay (Settings → API Configuration)
  ('KORAPAY_SECRET_KEY', 'secret', '^sk_(test|live)_[A-Za-z0-9]+$', null),
  ('KORAPAY_CURRENCY', 'server', null, array['XAF', 'XOF', 'NGN', 'KES', 'GHS', 'ZAR', 'EGP', 'USD']),
  -- Platform
  ('RESEND_API_KEY', 'secret', '^re_[A-Za-z0-9_]+$', null),
  ('GEMINI_API_KEY', 'secret', '^AIza[0-9A-Za-z_-]{30,}$', null),
  ('APP_ORIGINS', 'server', '^https?://[^,\s]+(,\s*https?://[^,\s]+)*$', null),
  -- OAuth apps used when a customer connects their own account
  ('GOOGLE_CLIENT_ID', 'public', '\.apps\.googleusercontent\.com$', null), ('GOOGLE_CLIENT_SECRET', 'secret', null, null),
  ('MICROSOFT_CLIENT_ID', 'public', '^[0-9a-fA-F-]{36}$', null), ('MICROSOFT_CLIENT_SECRET', 'secret', null, null),
  ('SLACK_CLIENT_ID', 'public', null, null), ('SLACK_CLIENT_SECRET', 'secret', null, null),
  ('ZOOM_CLIENT_ID', 'public', null, null), ('ZOOM_CLIENT_SECRET', 'secret', null, null),
  ('FACEBOOK_CLIENT_ID', 'public', '^[0-9]+$', null), ('FACEBOOK_CLIENT_SECRET', 'secret', null, null),
  ('LINKEDIN_CLIENT_ID', 'public', null, null), ('LINKEDIN_CLIENT_SECRET', 'secret', null, null),
  ('QUICKBOOKS_CLIENT_ID', 'public', null, null), ('QUICKBOOKS_CLIENT_SECRET', 'secret', null, null),
  ('XERO_CLIENT_ID', 'public', null, null), ('XERO_CLIENT_SECRET', 'secret', null, null),
  ('PAYPAL_CLIENT_ID', 'public', null, null), ('PAYPAL_CLIENT_SECRET', 'secret', null, null),
  ('GOCARDLESS_CLIENT_ID', 'public', null, null), ('GOCARDLESS_CLIENT_SECRET', 'secret', null, null),
  ('REVOLUT_CLIENT_ID', 'public', null, null), ('REVOLUT_CLIENT_SECRET', 'secret', null, null),
  ('INTERCOM_CLIENT_ID', 'public', null, null), ('INTERCOM_CLIENT_SECRET', 'secret', null, null),
  ('DROPBOX_CLIENT_ID', 'public', null, null), ('DROPBOX_CLIENT_SECRET', 'secret', null, null),
  ('DOCUSIGN_CLIENT_ID', 'public', null, null), ('DOCUSIGN_CLIENT_SECRET', 'secret', null, null),
  ('NOTION_CLIENT_ID', 'public', null, null), ('NOTION_CLIENT_SECRET', 'secret', null, null),
  ('ASANA_CLIENT_ID', 'public', null, null), ('ASANA_CLIENT_SECRET', 'secret', null, null),
  ('TRELLO_CLIENT_ID', 'public', null, null)
on conflict (key) do update set scope = excluded.scope, pattern = excluded.pattern, allowed = excluded.allowed;

-- Super admins only (not platform-exempt staff): these keys move money.
create or replace function public.admin_platform_settings_list()
returns table (key text, scope text, pattern text, allowed text[], is_set boolean, value text, hint text, updated_at timestamptz, updated_by_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  return query
    select d.key, d.scope, d.pattern, d.allowed,
           s.key is not null,
           case when d.scope = 'secret' then null else s.value end,
           s.hint, s.updated_at,
           (select u.email::text from auth.users u where u.id = s.updated_by)
    from public.platform_setting_defs d
    left join public.platform_settings s on s.key = d.key
    order by d.key;
end $$;

create or replace function public.admin_platform_setting_set(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  d public.platform_setting_defs;
  v text := btrim(coalesce(p_value, ''));
  vid uuid;
begin
  if not public.is_super_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into d from public.platform_setting_defs where platform_setting_defs.key = p_key;
  if not found then raise exception 'Unknown key %', p_key; end if;
  if v = '' then raise exception 'Empty value, use clear instead'; end if;
  if length(v) > 4000 then raise exception 'Value too long'; end if;
  if d.allowed is not null and not (v = any(d.allowed)) then
    raise exception 'Invalid value for %: expected one of %', p_key, array_to_string(d.allowed, ', ');
  end if;
  if d.pattern is not null and v !~ d.pattern then
    raise exception 'Invalid format for % (check you copied the right key)', p_key;
  end if;

  if d.scope = 'secret' then
    select id into vid from vault.secrets where name = 'platform.' || p_key;
    if vid is null then
      perform vault.create_secret(v, 'platform.' || p_key, 'Atlas platform key, managed from the super-admin dashboard');
    else
      perform vault.update_secret(vid, v);
    end if;
    insert into public.platform_settings (key, value, hint, updated_at, updated_by)
      values (p_key, null, right(v, 4), now(), auth.uid())
      on conflict (key) do update set value = null, hint = excluded.hint, updated_at = now(), updated_by = auth.uid();
  else
    insert into public.platform_settings (key, value, hint, updated_at, updated_by)
      values (p_key, v, null, now(), auth.uid())
      on conflict (key) do update set value = excluded.value, hint = null, updated_at = now(), updated_by = auth.uid();
  end if;

  insert into public.platform_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'platform_key_set', 'platform_setting', p_key,
          jsonb_build_object('scope', d.scope));  -- never the value
end $$;

create or replace function public.admin_platform_setting_clear(p_key text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  if not public.is_super_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from vault.secrets where name = 'platform.' || p_key;
  delete from public.platform_settings where key = p_key;
  insert into public.platform_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'platform_key_cleared', 'platform_setting', p_key, '{}'::jsonb);
end $$;

-- Browser-safe values only.
create or replace function public.get_public_platform_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(s.key, s.value), '{}'::jsonb)
  from public.platform_settings s join public.platform_setting_defs d on d.key = s.key
  where d.scope = 'public' and s.value is not null;
$$;

-- Edge functions only (service_role): every value that is set, secrets decrypted.
create or replace function public.platform_secrets(p_keys text[])
returns jsonb language sql stable security definer set search_path = public, vault as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
    select s.key k, s.value v from public.platform_settings s
      join public.platform_setting_defs d on d.key = s.key
      where d.scope <> 'secret' and s.key = any(p_keys)
    union all
    select substr(ds.name, 10), ds.decrypted_secret from vault.decrypted_secrets ds
      where ds.name = any(array(select 'platform.' || x from unnest(p_keys) x))
  ) t where v is not null;
$$;

revoke all on function public.admin_platform_settings_list(), public.admin_platform_setting_set(text, text),
  public.admin_platform_setting_clear(text), public.get_public_platform_config(), public.platform_secrets(text[]) from public, anon, authenticated;
grant execute on function public.admin_platform_settings_list(), public.admin_platform_setting_set(text, text),
  public.admin_platform_setting_clear(text) to authenticated;
grant execute on function public.get_public_platform_config() to anon, authenticated;
grant execute on function public.platform_secrets(text[]) to service_role;
