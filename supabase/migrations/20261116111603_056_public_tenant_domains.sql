-- 056 · The tenant root domain and inbound e-mail domain are shown to org
-- owners in Workspace settings (no secret in them): make them public keys.
update public.platform_setting_defs set scope = 'public' where key in ('TENANT_ROOT_DOMAIN', 'INBOUND_EMAIL_DOMAIN');
