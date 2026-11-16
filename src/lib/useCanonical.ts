import { useEffect } from 'react';
import { SITE_ORIGIN } from '@/lib/seoPages';

/** Points <link rel="canonical"> and og:url at this page (they default to "/"). */
export function useCanonical(path: string) {
  useEffect(() => {
    const href = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const og = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    const prev = [link?.href, og?.content];
    if (link) link.href = href;
    if (og) og.content = href;
    return () => { if (link && prev[0]) link.href = prev[0]; if (og && prev[1]) og.content = prev[1]; };
  }, [path]);
}
