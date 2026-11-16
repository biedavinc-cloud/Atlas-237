import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadPublicConfig, publicKey } from '@/lib/platformConfig';

/**
 * <slug>.liafrik.com (Pro/Enterprise "dedicated address"): the same app,
 * served on the organization's own subdomain. The landing page is skipped
 * and the sign-in page shows the organization's name and logo
 * (get_org_public_profile, which only answers for Pro/Enterprise orgs).
 */
const NOT_TENANT = new Set(['atlas', 'www', 'app', 'api', 'in', 'mail']);

export function tenantSlugFromHost(host = typeof window !== 'undefined' ? window.location.hostname : ''): string | null {
  const root = publicKey('TENANT_ROOT_DOMAIN', 'liafrik.com')!.toLowerCase();
  const h = host.toLowerCase();
  if (!h.endsWith(`.${root}`)) return null;
  const sub = h.slice(0, -(root.length + 1));
  if (!sub || sub.includes('.') || NOT_TENANT.has(sub)) return null;
  return sub;
}

export interface TenantProfile { name: string; logo_url: string | null; slug: string }

export function useTenantHost(): { slug: string | null; profile: TenantProfile | null; ready: boolean } {
  const [state, setState] = useState<{ slug: string | null; profile: TenantProfile | null; ready: boolean }>({ slug: tenantSlugFromHost(), profile: null, ready: !tenantSlugFromHost() });
  useEffect(() => {
    let alive = true;
    loadPublicConfig().then(async () => {
      const slug = tenantSlugFromHost();
      if (!slug) { if (alive) setState({ slug: null, profile: null, ready: true }); return; }
      const { data } = await supabase.rpc('get_org_public_profile', { p_slug: slug });
      if (alive) setState({ slug, profile: (data as TenantProfile) || null, ready: true });
    });
    return () => { alive = false; };
  }, []);
  return state;
}
