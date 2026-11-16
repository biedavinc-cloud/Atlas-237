-- 053 · Applied after the frontend reads contacts_v / leads_v (052).
-- Column-level privacy: e-mail/phone columns are readable only through the views.
revoke select on public.contacts from authenticated, anon;
grant select (id, org_id, first_name, last_name, job_title, company_id, role, address, country, city, language, timezone,
  lead_source, status, lead_score, customer_value, tags, notes, custom_fields, owner_id, deleted_at, created_at, updated_at, company)
  on public.contacts to authenticated;
revoke select on public.leads from authenticated, anon;
grant select (id, org_id, first_name, last_name, company_name, title, source, status, temperature, qualification, lead_score,
  potential_value, conversion_probability, assigned_to, ai_agent_id, last_activity_at, next_activity_at, notes, tags,
  custom_fields, converted_contact_id, converted_at, deleted_at, created_at, updated_at)
  on public.leads to authenticated;

