-- Super admin by e-mail only counts once that e-mail is confirmed, so a
-- signup with a listed address (one whose owner has no account yet) can
-- never grant platform access, even if e-mail confirmation is turned off.
create or replace function public.is_super_admin(check_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.super_admins where user_id = check_user_id and active = true
  ) or exists (
    select 1 from public.super_admins sa
    join auth.users u on u.id = check_user_id and lower(u.email) = lower(sa.email)
    where sa.active = true and u.email_confirmed_at is not null
  );
$$;

create or replace function public.link_super_admin(login_email text default null, login_user_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare caller_id uuid := auth.uid(); caller_email text;
begin
  if caller_id is null then return; end if;
  select email into caller_email from auth.users where id = caller_id and email_confirmed_at is not null;
  if caller_email is null then return; end if;
  update public.super_admins set user_id = caller_id, updated_at = now()
   where lower(email) = lower(caller_email) and user_id is distinct from caller_id;
end $$;
