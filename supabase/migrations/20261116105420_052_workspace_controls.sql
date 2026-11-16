-- 052 · Workspace controls (Pro & Enterprise), live customer events, reviews.
--
-- * organizations.workspace_settings: industry preset, PII masking, portfolio
--   mode, which roles see real contact details / every portfolio, custom
--   fields. organizations.slug: <slug>.liafrik.com dedicated address.
-- * Roles: owner, admin, manager, qc, agent, member (profiles.role, free text).
-- * PII masking is enforced by the database: authenticated users can no
--   longer SELECT contacts.email/phone/whatsapp or leads.email/phone from the
--   tables; the app reads contacts_v / leads_v, which return the real value or
--   a masked one depending on can_view_pii(). Writes still go to the tables.
-- * Portfolio mode: agents only see contacts/leads/deals assigned to them;
--   owner/admin/manager/qc (configurable) see everything. Enforced by RLS.
-- * customer_events + event_sources: any external platform (trading, e-commerce,
--   Zanldo, call tools, anything that can POST JSON) streams customer activity
--   into Atlas through the events-ingest function. Realtime-enabled.
-- * reviews: review requests with a public token link; submit_review() is the
--   only anonymous entry point.

alter table public.organizations
  add column if not exists slug text,
  add column if not exists workspace_settings jsonb not null default '{}'::jsonb;
create unique index if not exists organizations_slug_key on public.organizations (slug) where slug is not null;
do $$ begin
  alter table public.organizations add constraint organizations_slug_format
    check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');
exception when duplicate_object then null; end $$;

-- Plan features (mirror src/lib/plans.ts PLAN_FEATURES).
create or replace function public.org_plan_has_feature(target_org_id uuid, feature text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select
    public.is_super_admin(auth.uid())
    or public.is_platform_exempt(auth.uid())
    or case (select plan from public.organizations where id = target_org_id)
         when 'starter' then false
         when 'growth' then feature in ('quotesInvoicing', 'tickets', 'workflowAutomation', 'webhooks', 'apiAccess', 'reviews')
         when 'pro' then feature in ('quotesInvoicing', 'tickets', 'workflowAutomation', 'webhooks', 'apiAccess', 'knowledgeBase', 'reviews', 'workspaceControls', 'liveEvents')
         when 'enterprise' then true
         else false
       end;
$$;

-- The caller's workspace context, computed once per query.
create or replace function public.my_workspace()
returns table (org_id uuid, role text, pii boolean, see_all boolean)
language sql stable security definer set search_path = public as $$
  select p.org_id,
         coalesce(p.role, 'member'),
         -- real contact details?
         case
           when not public.org_plan_has_feature(o.id, 'workspaceControls') then true
           when coalesce((o.workspace_settings->>'mask_pii')::boolean, false) = false then true
           else coalesce(p.role, 'member') = any (coalesce(
             array(select jsonb_array_elements_text(o.workspace_settings->'pii_roles')),
             array['owner', 'admin', 'manager', 'qc']))
         end,
         -- every portfolio?
         case
           when not public.org_plan_has_feature(o.id, 'workspaceControls') then true
           when coalesce((o.workspace_settings->>'portfolio_mode')::boolean, false) = false then true
           else coalesce(p.role, 'member') = any (coalesce(
             array(select jsonb_array_elements_text(o.workspace_settings->'supervisor_roles')),
             array['owner', 'admin', 'manager', 'qc']))
         end
  from public.profiles p join public.organizations o on o.id = p.org_id
  where p.id = auth.uid();
$$;

create or replace function public.can_view_pii()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select pii from public.my_workspace()), false);
$$;

create or replace function public.can_see_record(record_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select see_all from public.my_workspace()), false) or record_owner = auth.uid();
$$;

create or replace function public.mask_email(v text) returns text language sql immutable as $$
  select case when v is null or v = '' then v
              when position('@' in v) = 0 then left(v, 1) || '•••'
              else left(split_part(v, '@', 1), 1) || '•••@' || left(split_part(v, '@', 2), 1) || '•••' ||
                   coalesce('.' || nullif(reverse(split_part(reverse(split_part(v, '@', 2)), '.', 1)), split_part(v, '@', 2)), '')
         end;
$$;

create or replace function public.mask_phone(v text) returns text language sql immutable as $$
  select case when v is null or v = '' then v
              when length(regexp_replace(v, '\D', '', 'g')) <= 4 then '•••'
              else left(v, 4) || ' ••• ••' || right(regexp_replace(v, '\D', '', 'g'), 2)
         end;
$$;

-- New records belong to whoever creates them (portfolio).
create or replace function public.set_record_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'leads' then
    if new.assigned_to is null then new.assigned_to := auth.uid(); end if;
  else
    if new.owner_id is null then new.owner_id := auth.uid(); end if;
  end if;
  return new;
end $$;
drop trigger if exists contacts_set_owner on public.contacts;
create trigger contacts_set_owner before insert on public.contacts for each row execute function public.set_record_owner();
drop trigger if exists leads_set_owner on public.leads;
create trigger leads_set_owner before insert on public.leads for each row execute function public.set_record_owner();
drop trigger if exists deals_set_owner on public.deals;
create trigger deals_set_owner before insert on public.deals for each row execute function public.set_record_owner();

-- Portfolio RLS on contacts / leads / deals (select, update, delete).
drop policy if exists contacts_select_own on public.contacts;
create policy contacts_select_own on public.contacts for select using (org_id = public.user_org_id() and public.can_see_record(owner_id));
drop policy if exists contacts_update_own on public.contacts;
create policy contacts_update_own on public.contacts for update using (org_id = public.user_org_id() and public.can_see_record(owner_id));
drop policy if exists contacts_delete_own on public.contacts;
create policy contacts_delete_own on public.contacts for delete using (org_id = public.user_org_id() and public.can_see_record(owner_id));

drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads for select using (org_id = public.user_org_id() and public.can_see_record(assigned_to));
drop policy if exists leads_update_own on public.leads;
create policy leads_update_own on public.leads for update using (org_id = public.user_org_id() and public.can_see_record(assigned_to));
drop policy if exists leads_delete_own on public.leads;
create policy leads_delete_own on public.leads for delete using (org_id = public.user_org_id() and public.can_see_record(assigned_to));

drop policy if exists deals_select_own on public.deals;
drop policy if exists deals_update_own on public.deals;
drop policy if exists deals_delete_own on public.deals;
create policy deals_select_own on public.deals for select using (org_id = public.user_org_id() and public.can_see_record(owner_id));
create policy deals_update_own on public.deals for update using (org_id = public.user_org_id() and public.can_see_record(owner_id));
create policy deals_delete_own on public.deals for delete using (org_id = public.user_org_id() and public.can_see_record(owner_id));

-- Activities tied to a contact/lead follow its portfolio.
drop policy if exists activities_portfolio on public.activities;
create policy activities_portfolio on public.activities as restrictive for select using (
  (contact_id is null or exists (select 1 from public.contacts c where c.id = activities.contact_id))
  and (lead_id is null or exists (select 1 from public.leads l where l.id = activities.lead_id))
);

create or replace view public.contacts_v with (security_barrier = true) as
  select c.id, c.org_id, c.first_name, c.last_name,
         case when me.pii then c.email else public.mask_email(c.email) end as email,
         case when me.pii then c.phone else public.mask_phone(c.phone) end as phone,
         case when me.pii then c.whatsapp else public.mask_phone(c.whatsapp) end as whatsapp,
         c.job_title, c.company_id, c.role, c.address, c.country, c.city, c.language, c.timezone, c.lead_source, c.status,
         c.lead_score, c.customer_value, c.tags, c.notes, c.custom_fields, c.owner_id, c.deleted_at, c.created_at, c.updated_at,
         c.company, not me.pii as pii_masked
  from public.contacts c
  cross join lateral (select * from public.my_workspace()) me
  where c.org_id = me.org_id and (me.see_all or c.owner_id = auth.uid());

create or replace view public.leads_v with (security_barrier = true) as
  select l.id, l.org_id, l.first_name, l.last_name,
         case when me.pii then l.email else public.mask_email(l.email) end as email,
         case when me.pii then l.phone else public.mask_phone(l.phone) end as phone,
         l.company_name, l.title, l.source, l.status, l.temperature, l.qualification, l.lead_score, l.potential_value,
         l.conversion_probability, l.assigned_to, l.ai_agent_id, l.last_activity_at, l.next_activity_at, l.notes, l.tags,
         l.custom_fields, l.converted_contact_id, l.converted_at, l.deleted_at, l.created_at, l.updated_at,
         not me.pii as pii_masked
  from public.leads l
  cross join lateral (select * from public.my_workspace()) me
  where l.org_id = me.org_id and (me.see_all or l.assigned_to = auth.uid());

revoke all on public.contacts_v, public.leads_v from anon;
grant select on public.contacts_v, public.leads_v to authenticated;

-- Workspace settings: only owner/admin, only on plans with the feature.
create or replace function public.update_workspace_settings(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); v_role text; v_out jsonb;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_org is null or coalesce(v_role, '') not in ('owner', 'admin') then raise exception 'Only an owner or admin can change workspace settings'; end if;
  if not public.org_plan_has_feature(v_org, 'workspaceControls') then raise exception 'Workspace controls are part of the Pro and Enterprise plans'; end if;
  update public.organizations
     set workspace_settings = coalesce(workspace_settings, '{}'::jsonb) || (p_settings - 'slug'), updated_at = now()
   where id = v_org returning workspace_settings into v_out;
  return v_out;
end $$;

create or replace function public.set_org_slug(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); v_role text; v text := lower(btrim(coalesce(p_slug, '')));
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_org is null or coalesce(v_role, '') not in ('owner', 'admin') then raise exception 'Only an owner or admin can set the workspace address'; end if;
  if not public.org_plan_has_feature(v_org, 'workspaceControls') then raise exception 'A dedicated address is part of the Pro and Enterprise plans'; end if;
  if v = '' then update public.organizations set slug = null where id = v_org; return null; end if;
  if v !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' then raise exception 'Use 3 to 32 lowercase letters, digits or dashes'; end if;
  if v = any (array['www','atlas','app','api','admin','mail','email','smtp','in','inbound','blog','help','support','status','docs','health','nutro','stella','pos','posflow','sukulu','zanldo','libooks','sellia','liafrik','dev','staging','test','cdn','static','assets','login','auth','dashboard','billing','pay','secure']) then
    raise exception 'This address is reserved';
  end if;
  if exists (select 1 from public.organizations where slug = v and id <> v_org) then raise exception 'This address is already taken'; end if;
  update public.organizations set slug = v, updated_at = now() where id = v_org;
  return v;
end $$;

-- Public, minimal profile for a tenant address (branded sign-in page).
create or replace function public.get_org_public_profile(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', o.name, 'logo_url', case when o.branding_enabled then o.logo_url end, 'slug', o.slug)
  from public.organizations o
  where o.slug = lower(p_slug) and o.plan in ('pro', 'enterprise');
$$;

-- Lead / contact distribution (manager tools).
create or replace function public.assign_records(p_table text, p_ids uuid[], p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.user_org_id(); v_role text; n int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_org is null or coalesce(v_role, '') not in ('owner', 'admin', 'manager') then raise exception 'Only an owner, admin or manager can distribute records'; end if;
  if not public.org_plan_has_feature(v_org, 'workspaceControls') then raise exception 'Distribution is part of the Pro and Enterprise plans'; end if;
  if p_user is not null and not exists (select 1 from public.profiles where id = p_user and org_id = v_org) then raise exception 'That person is not in your organization'; end if;
  if p_table = 'leads' then
    update public.leads set assigned_to = p_user, updated_at = now() where org_id = v_org and id = any (p_ids);
  elsif p_table = 'contacts' then
    update public.contacts set owner_id = p_user, updated_at = now() where org_id = v_org and id = any (p_ids);
  elsif p_table = 'deals' then
    update public.deals set owner_id = p_user, updated_at = now() where org_id = v_org and id = any (p_ids);
  else raise exception 'Unknown table';
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

-- Team performance (counts over a period).
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
  select p.id,
    (select count(*) from public.leads l where l.org_id = v_org and l.assigned_to = p.id and l.created_at between p_from and p_to),
    (select count(*) from public.leads l where l.org_id = v_org and l.assigned_to = p.id and l.converted_at between p_from and p_to),
    (select count(*) from public.deals d where d.org_id = v_org and d.owner_id = p.id and d.status = 'won' and d.updated_at between p_from and p_to),
    (select coalesce(sum(d.value), 0) from public.deals d where d.org_id = v_org and d.owner_id = p.id and d.status = 'won' and d.updated_at between p_from and p_to),
    (select count(*) from public.activities a where a.org_id = v_org and coalesce(a.user_id, a.performed_by) = p.id and a.created_at between p_from and p_to),
    (select count(*) from public.activities a where a.org_id = v_org and coalesce(a.user_id, a.performed_by) = p.id and a.type = 'call' and a.created_at between p_from and p_to),
    (select count(*) from public.activities a where a.org_id = v_org and coalesce(a.user_id, a.performed_by) = p.id and a.type = 'email' and a.created_at between p_from and p_to),
    (select count(*) from public.tickets t where t.org_id = v_org and t.assigned_to = p.id and t.resolved_at between p_from and p_to),
    (select coalesce(sum((a.metadata->>'duration')::bigint), 0) from public.activities a where a.org_id = v_org and coalesce(a.user_id, a.performed_by) = p.id and a.type = 'call' and a.metadata ? 'duration' and a.created_at between p_from and p_to)
  from public.profiles p where p.org_id = v_org;
end $$;

-- ───────── Live customer events ─────────
create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'custom',
  key_prefix text not null,
  key_hash text not null unique,
  active boolean not null default true,
  auto_create_contacts boolean not null default true,
  last_event_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists event_sources_org_idx on public.event_sources(org_id);
alter table public.event_sources enable row level security;
drop policy if exists event_sources_rw on public.event_sources;
create policy event_sources_rw on public.event_sources for all
  using (org_id = public.user_org_id() and (select role from public.profiles where id = auth.uid()) in ('owner', 'admin', 'manager'))
  with check (org_id = public.user_org_id() and (select role from public.profiles where id = auth.uid()) in ('owner', 'admin', 'manager')
              and public.org_plan_has_feature(org_id, 'liveEvents'));
grant select, insert, update, delete on public.event_sources to authenticated;

create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.event_sources(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete cascade,
  event_type text not null,
  title text,
  amount numeric,
  currency text,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists customer_events_dedupe on public.customer_events(source_id, external_id) where external_id is not null;
create index if not exists customer_events_org_time on public.customer_events(org_id, occurred_at desc);
create index if not exists customer_events_contact_time on public.customer_events(contact_id, occurred_at desc);
alter table public.customer_events enable row level security;
drop policy if exists customer_events_select on public.customer_events;
create policy customer_events_select on public.customer_events for select using (
  org_id = public.user_org_id()
  and (contact_id is null or exists (select 1 from public.contacts c where c.id = customer_events.contact_id))
);
grant select on public.customer_events to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.customer_events;
exception when others then null; end $$;

-- ───────── Reviews ─────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  requested_by uuid,
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  topic text,
  channel text,
  rating int check (rating between 1 and 5),
  comment text,
  reviewer_name text,
  source text not null default 'link',
  status text not null default 'requested' check (status in ('requested', 'received')),
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reviews_org_idx on public.reviews(org_id, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (org_id = public.user_org_id());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (org_id = public.user_org_id() and public.org_plan_has_feature(org_id, 'reviews'));
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update using (org_id = public.user_org_id());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete using (org_id = public.user_org_id());
grant select, insert, update, delete on public.reviews to authenticated;

create or replace function public.get_review_request(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('org', o.name, 'logo_url', case when o.branding_enabled then o.logo_url end,
                            'first_name', c.first_name, 'topic', r.topic, 'status', r.status)
  from public.reviews r join public.organizations o on o.id = r.org_id
  left join public.contacts c on c.id = r.contact_id
  where r.token = p_token;
$$;

create or replace function public.submit_review(p_token text, p_rating int, p_comment text, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.reviews;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  select * into r from public.reviews where token = p_token for update;
  if not found then raise exception 'Unknown review link'; end if;
  if r.status = 'received' then raise exception 'This review was already submitted'; end if;
  update public.reviews set rating = p_rating, comment = left(nullif(btrim(p_comment), ''), 2000),
         reviewer_name = left(nullif(btrim(p_name), ''), 120), status = 'received', received_at = now()
   where id = r.id;
  insert into public.notifications (org_id, user_id, title, message, type)
    select r.org_id, r.requested_by, 'Nouvel avis client : ' || p_rating || '/5', left(coalesce(p_comment, ''), 200), 'info'
    where r.requested_by is not null;
  return true;
end $$;

revoke all on function public.get_review_request(text), public.submit_review(text, int, text, text) from public;
grant execute on function public.get_review_request(text), public.submit_review(text, int, text, text) to anon, authenticated;
revoke all on function public.get_org_public_profile(text) from public;
grant execute on function public.get_org_public_profile(text) to anon, authenticated;
revoke all on function public.update_workspace_settings(jsonb), public.set_org_slug(text), public.assign_records(text, uuid[], uuid),
  public.team_performance(timestamptz, timestamptz), public.my_workspace(), public.can_view_pii(), public.can_see_record(uuid) from public, anon;
grant execute on function public.update_workspace_settings(jsonb), public.set_org_slug(text), public.assign_records(text, uuid[], uuid),
  public.team_performance(timestamptz, timestamptz), public.my_workspace(), public.can_view_pii(), public.can_see_record(uuid) to authenticated;

-- Platform keys used by inbound e-mail and tenant addresses.
insert into public.platform_setting_defs (key, scope, pattern, allowed) values
  ('INBOUND_EMAIL_DOMAIN', 'server', '^[a-z0-9.-]+\.[a-z]{2,}$', null),
  ('INBOUND_EMAIL_SECRET', 'secret', null, null),
  ('TENANT_ROOT_DOMAIN', 'server', '^[a-z0-9.-]+\.[a-z]{2,}$', null),
  ('CLOUDFLARE_API_TOKEN', 'secret', null, null),
  ('CLOUDFLARE_ACCOUNT_ID', 'server', '^[a-f0-9]{32}$', null),
  ('CLOUDFLARE_ZONE_ID', 'server', '^[a-f0-9]{32}$', null),
  ('CLOUDFLARE_PAGES_PROJECT', 'server', '^[a-z0-9-]+$', null)
on conflict (key) do update set scope = excluded.scope, pattern = excluded.pattern, allowed = excluded.allowed;
