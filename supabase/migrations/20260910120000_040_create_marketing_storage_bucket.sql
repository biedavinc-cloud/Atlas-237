-- Public bucket for marketing assets (demo video, promotional images).
-- Public read (that's the point — anyone visiting the Demo page can play
-- the video without logging in); write/update/delete restricted to super
-- admins only, since this bucket has no per-org isolation (it's a single
-- shared public space, not tenant data).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('marketing', 'marketing', true, 524288000, ARRAY['video/mp4','video/webm','video/quicktime','image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "marketing_public_read" ON storage.objects;
CREATE POLICY "marketing_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'marketing');

DROP POLICY IF EXISTS "marketing_admin_write" ON storage.objects;
CREATE POLICY "marketing_admin_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketing' AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "marketing_admin_update" ON storage.objects;
CREATE POLICY "marketing_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marketing' AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "marketing_admin_delete" ON storage.objects;
CREATE POLICY "marketing_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marketing' AND public.is_super_admin(auth.uid()));
