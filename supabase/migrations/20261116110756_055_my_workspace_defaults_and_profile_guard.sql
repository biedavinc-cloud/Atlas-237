-- 055 · my_workspace(): an empty role list fell through as '{}' (not NULL),
-- so coalesce() never used the default list — turning masking on with no
-- roles picked would have hidden details from everyone, owners included.
-- Owners and admins now always see everything (they set the rules).
create or replace function public.my_workspace()
returns table (org_id uuid, role text, pii boolean, see_all boolean)
language sql stable security definer set search_path = public as $$
  select p.org_id,
         coalesce(p.role, 'member'),
         case
           when coalesce(p.role, 'member') in ('owner', 'admin') then true
           when not public.org_plan_has_feature(o.id, 'workspaceControls') then true
           when coalesce((o.workspace_settings->>'mask_pii')::boolean, false) = false then true
           else coalesce(p.role, 'member') = any (coalesce(
             nullif(array(select jsonb_array_elements_text(case when jsonb_typeof(o.workspace_settings->'pii_roles') = 'array' then o.workspace_settings->'pii_roles' end)), '{}'::text[]),
             array['owner', 'admin', 'manager', 'qc']))
         end,
         case
           when coalesce(p.role, 'member') in ('owner', 'admin') then true
           when not public.org_plan_has_feature(o.id, 'workspaceControls') then true
           when coalesce((o.workspace_settings->>'portfolio_mode')::boolean, false) = false then true
           else coalesce(p.role, 'member') = any (coalesce(
             nullif(array(select jsonb_array_elements_text(case when jsonb_typeof(o.workspace_settings->'supervisor_roles') = 'array' then o.workspace_settings->'supervisor_roles' end)), '{}'::text[]),
             array['owner', 'admin', 'manager', 'qc']))
         end
  from public.profiles p join public.organizations o on o.id = p.org_id
  where p.id = auth.uid();
$$;

-- SECURITY: the "profile_update_own" policy let any signed-in user change
-- their own role (agent → owner, defeating masking/portfolios) and even
-- their org_id (joining another tenant). Guard both columns in a trigger:
-- org_id never changes from the API; role only changes when an owner/admin
-- of the same org does it, and only an owner can grant or remove 'owner'.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare me_role text;
begin
  if auth.uid() is null then return new; end if; -- service role / SQL / triggers
  if new.org_id is distinct from old.org_id then
    raise exception 'The organization of a profile cannot be changed';
  end if;
  if new.role is distinct from old.role then
    select role into me_role from public.profiles where id = auth.uid() and org_id = old.org_id;
    if coalesce(me_role, '') not in ('owner', 'admin') then raise exception 'Only an owner or admin can change roles'; end if;
    if (new.role = 'owner' or old.role = 'owner') and me_role <> 'owner' then raise exception 'Only an owner can grant or remove the owner role'; end if;
    if old.id = auth.uid() and old.role = 'owner' and not exists (
      select 1 from public.profiles where org_id = old.org_id and role = 'owner' and id <> old.id and coalesce(active, true)) then
      raise exception 'Keep at least one owner in the organization';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_changes on public.profiles;
create trigger guard_profile_changes before update on public.profiles
  for each row execute function public.guard_profile_changes();
