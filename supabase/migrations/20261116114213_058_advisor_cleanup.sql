-- 058 · Security advisor follow-up for 052/055: pin search_path on the mask
-- helpers and stop exposing trigger-only functions as RPCs. contacts_v /
-- leads_v stay definer views on purpose (they are how masking reads the
-- e-mail/phone columns that 053 revoked); they filter by my_workspace().
alter function public.mask_email(text) set search_path = public;
alter function public.mask_phone(text) set search_path = public;
revoke execute on function public.guard_profile_changes(), public.set_record_owner() from public, anon, authenticated;
