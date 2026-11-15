-- Reconstructed from supabase_migrations.schema_migrations (applied directly
-- to production on 2026-08-31, never committed). Kept so repo == database.
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_org_id ON public.invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_org_id ON public.knowledge_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON public.order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org_id ON public.pipeline_stages(org_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_org_id ON public.pipelines(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_org_id ON public.platform_revenue(org_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_org_id ON public.quote_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_code_conversions_org_id ON public.sales_code_conversions(org_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org_id ON public.webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_id ON public.workflow_runs(org_id);
