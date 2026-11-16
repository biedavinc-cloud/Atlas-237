-- 054 · Team tools fixes and helpers
-- * team_performance: activities.performed_by is text, user_id uuid — the
--   coalesce() mixed both types; durations are read as numeric.
-- * distribute_records: round-robin a batch of leads/contacts/deals over
--   several agents (manager tool, same rules as assign_records).
-- * copy_lead_pii: when an agent who can't see contact details converts a
--   lead, the new contact gets the lead's real e-mail/phone server side.

create or replace function public.team_performance(p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, leads_assigned bigint, leads_converted bigint, deals_won bigint, won_value numeric,
               activities bigint, calls bigint, emails bigint, tickets_resolved bigint, call_seconds bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_org is null or coalesce(v_role, '') not in ('owner', 'admin', 'manager', 'qc') then raise exception 'Only managers can see team performance'; end if;
  if not public.org_plan_has_feature(v_org, 'workspaceControls') then raise exception 'Team performance is part of the Pro and Enterprise plans'; end if;
  return query
  with acts as (
    select coalesce(a.user_id::text, a.performed_by) as uid, a.type,
           case when jsonb_typeof(a.metadata->'duration') = 'number' then (a.metadata->>'duration')::numeric else 0 end as dur
    from public.activities a
    where a.org_id = v_org and a.created_at between p_from and p_to
  )
  select p.id,
    (select count(*) from public.leads l where l.org_id = v_org and l.assigned_to = p.id and l.created_at between p_from and p_to),
    (select count(*) from public.leads l where l.org_id = v_org and l.assigned_to = p.id and l.converted_at between p_from and p_to),
    (select count(*) from public.deals d where d.org_id = v_org and d.owner_id = p.id and d.status = 'won' and d.updated_at between p_from and p_to),
    (select coalesce(sum(d.value), 0) from public.deals d where d.org_id = v_org and d.owner_id = p.id and d.status = 'won' and d.updated_at between p_from and p_to),
    (select count(*) from acts where acts.uid = p.id::text),
    (select count(*) from acts where acts.uid = p.id::text and acts.type = 'call'),
    (select count(*) from acts where acts.uid = p.id::text and acts.type = 'email'),
    (select count(*) from public.tickets t where t.org_id = v_org and t.assigned_to = p.id and t.resolved_at between p_from and p_to),
    (select coalesce(sum(acts.dur), 0)::bigint from acts where acts.uid = p.id::text and acts.type = 'call')
  from public.profiles p where p.org_id = v_org and coalesce(p.active, true);
end $$;

create or replace function public.distribute_records(p_table text, p_ids uuid[], p_users uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); v_role text; n int := 0; i int; k int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_org is null or coalesce(v_role, '') not in ('owner', 'admin', 'manager') then raise exception 'Only an owner, admin or manager can distribute records'; end if;
  if not public.org_plan_has_feature(v_org, 'workspaceControls') then raise exception 'Distribution is part of the Pro and Enterprise plans'; end if;
  if p_table not in ('leads', 'contacts', 'deals') then raise exception 'Unknown table'; end if;
  if coalesce(array_length(p_users, 1), 0) = 0 then raise exception 'Pick at least one person'; end if;
  if exists (select 1 from unnest(p_users) u where not exists (select 1 from public.profiles where id = u and org_id = v_org)) then
    raise exception 'Someone in the list is not in your organization';
  end if;
  k := array_length(p_users, 1);
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    if p_table = 'leads' then
      update public.leads set assigned_to = p_users[((i - 1) % k) + 1], updated_at = now() where org_id = v_org and id = p_ids[i];
    elsif p_table = 'contacts' then
      update public.contacts set owner_id = p_users[((i - 1) % k) + 1], updated_at = now() where org_id = v_org and id = p_ids[i];
    else
      update public.deals set owner_id = p_users[((i - 1) % k) + 1], updated_at = now() where org_id = v_org and id = p_ids[i];
    end if;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

create or replace function public.copy_lead_pii(p_lead uuid, p_contact uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); l record;
begin
  if v_org is null then raise exception 'Not signed in'; end if;
  -- Caller must be able to see both records (same rules as the views).
  if not exists (select 1 from public.leads_v where id = p_lead) or not exists (select 1 from public.contacts_v where id = p_contact) then
    raise exception 'You do not have access to these records';
  end if;
  select email, phone into l from public.leads where id = p_lead and org_id = v_org;
  update public.contacts set email = coalesce(contacts.email, l.email), phone = coalesce(contacts.phone, l.phone), updated_at = now()
   where id = p_contact and org_id = v_org;
  return true;
end $$;

revoke all on function public.distribute_records(text, uuid[], uuid[]), public.copy_lead_pii(uuid, uuid) from public, anon;
grant execute on function public.distribute_records(text, uuid[], uuid[]), public.copy_lead_pii(uuid, uuid) to authenticated;
