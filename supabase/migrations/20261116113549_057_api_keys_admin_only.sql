-- 057 · API keys give server-side (unmasked) access to contacts and leads.
-- Any member could create one, which would let an agent read the e-mails
-- and phones that contact masking hides. Only owners and admins may create,
-- change or delete keys from now on.
drop policy if exists api_keys_admin_only on public.api_keys;
create policy api_keys_admin_only on public.api_keys as restrictive for all
  using ((select role from public.profiles where id = auth.uid()) in ('owner', 'admin'))
  with check ((select role from public.profiles where id = auth.uid()) in ('owner', 'admin'));
