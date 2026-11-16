import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GlobalFooter, FlagsMarquee } from '@/components/landing/GlobalSections';
import { SEO_PAGES, SITE_ORIGIN, seoPageByPath } from '@/lib/seoPages';
import { useCanonical } from '@/lib/useCanonical';
import { useAuth } from '@/context/AuthContext';
import { useLandingMotion } from '@/lib/landingMotion';
import { useScrollReveal } from '@/lib/useScrollReveal';

/** Keyword landing page (see src/lib/seoPages.ts); also pre-rendered at build time. */
export function SeoLandingPage() {
  const { pathname } = useLocation();
  const page = seoPageByPath(pathname.replace(/\/$/, '') || '/');
  const { language, setLanguage } = useAuth();
  useScrollReveal();
  useLandingMotion();
  useCanonical(page?.path || '/');

  useEffect(() => {
    if (!page) return;
    if (page.lang !== language) setLanguage(page.lang);
    const prevTitle = document.title;
    document.title = page.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content;
    if (meta) meta.content = page.description;
    const added: HTMLElement[] = [];
    const alt = (hreflang: string, href: string) => { const l = document.createElement('link'); l.rel = 'alternate'; l.hreflang = hreflang; l.href = `${SITE_ORIGIN}${href}`; document.head.appendChild(l); added.push(l); };
    alt(page.lang, page.path); alt(page.lang === 'fr' ? 'en' : 'fr', page.alt); alt('x-default', page.lang === 'fr' ? page.path : page.alt);
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    document.head.appendChild(ld); added.push(ld);
    return () => { document.title = prevTitle; if (meta && prevDesc) meta.content = prevDesc; added.forEach((e) => e.remove()); };
    // setLanguage identity is not stable; run per page only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!page) return <Navigate to="/" replace />;
  const fr = page.lang === 'fr';
  const others = SEO_PAGES.filter((p) => p.lang === page.lang && p.path !== page.path);

  return (
    <div className="min-h-screen bg-white font-glacial text-ink-900">
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link to={fr ? '/' : '/en'} className="flex items-center gap-2.5"><Logo size={32} /><span className="text-lg font-bold">Atlas CRM</span></Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to={page.alt} className="hidden text-ink-600 hover:text-ink-900 sm:inline">{fr ? 'English' : 'Français'}</Link>
            <Link to={fr ? '/auth' : '/en/auth'} className="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700">{fr ? 'Essai gratuit' : 'Free trial'}</Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="bg-gradient-to-b from-primary-50 to-white px-6 py-20 md:px-10 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-6xl">{page.h1}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-600">{page.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={fr ? '/auth' : '/en/auth'} className="lp-cta inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700">{fr ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight size={16} className="rtl:rotate-180" /></Link>
              <a href={fr ? '/demo' : '/en/demo'} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-6 py-3 font-semibold text-ink-800 hover:bg-ink-50"><PlayCircle size={16} /> {fr ? 'Essayer la démo' : 'Try the demo'}</a>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-4xl space-y-14 px-6 py-16 md:px-10">
          {page.sections.map((s) => (
            <div key={s.h2} className="reveal">
              <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{s.h2}</h2>
              <p className="mt-3 text-lg leading-8 text-ink-600">{s.p}</p>
              {s.items && <ul className="mt-5 grid gap-3 sm:grid-cols-2">{s.items.map((it) => <li key={it} className="flex gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-ink-700"><CheckCircle2 size={18} className="mt-0.5 flex-none text-success-600" />{it}</li>)}</ul>}
            </div>
          ))}
          <div className="reveal">
            <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{fr ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
            <div className="mt-5 space-y-3">
              {page.faq.map((f) => (
                <details key={f.q} className="group rounded-xl border border-ink-100 p-5 open:shadow-sm">
                  <summary className="cursor-pointer font-semibold text-ink-900">{f.q}</summary>
                  <p className="mt-3 leading-7 text-ink-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <nav className="reveal border-t border-ink-100 pt-8" aria-label={fr ? 'À lire aussi' : 'See also'}>
            <p className="font-semibold text-ink-900">{fr ? 'À lire aussi' : 'See also'}</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {others.map((o) => <li key={o.path}><Link to={o.path} className="inline-flex rounded-full border border-ink-200 px-4 py-2 text-sm text-ink-700 hover:border-primary-300 hover:text-primary-700">{o.h1}</Link></li>)}
              <li><Link to={fr ? '/blog' : '/en/blog'} className="inline-flex rounded-full border border-ink-200 px-4 py-2 text-sm text-ink-700 hover:border-primary-300 hover:text-primary-700">Blog</Link></li>
            </ul>
          </nav>
        </section>
        <FlagsMarquee lang={page.lang} />
      </main>
      <GlobalFooter lang={page.lang} />
    </div>
  );
}
