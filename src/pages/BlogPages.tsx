import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Globe, GraduationCap, Layers, Link2,
  Linkedin, MessageCircle, PlayCircle, ShoppingBag, ShoppingCart, Sparkles, Store,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { POSTS, PRODUCT_INFO, PRODUCT_LABEL, getPost, type Block, type Post, type Product } from '@/lib/blog/posts';
import { useCanonical } from '@/lib/useCanonical';
import { useHreflangLinks } from '@/lib/useHreflang';
import { useLandingMotion } from '@/lib/landingMotion';
import { SplitReveal } from '@/components/landing/SplitReveal';
import type { Language } from '@/lib/i18n';

type Lang = 'fr' | 'en';

function useBlogLang(forced?: Language): Lang {
  const { language, setLanguage } = useAuth();
  useEffect(() => { if (forced && forced !== language) setLanguage(forced); }, [forced, language, setLanguage]);
  const l = forced || language;
  return l === 'en' ? 'en' : 'fr';
}

const base = (lang: Lang) => (lang === 'en' ? '/en' : '');

/* ───────────────────────── Product identity ───────────────────────── */

/** Official icon when Liafrik provided one (public/brands), otherwise a neutral pictogram. */
function ProductIcon({ product, size = 22, className = '' }: { product: Product; size?: number; className?: string }) {
  if (product === 'atlas') return <Logo size={size + 4} className={className} />;
  const icon = PRODUCT_INFO[product].icon;
  if (icon) return <img src={icon} alt="" width={size + 6} height={size + 6} loading="lazy" className={`object-contain ${className}`} style={{ width: size + 6, height: size + 6 }} />;
  const Icon = { pos: Store, sukulu: GraduationCap, zanldo: ShoppingBag, liafrik: Layers, libooks: BookOpen, sellia: ShoppingCart, healthcloud: Layers, nutro: Store, stella: Sparkles }[product];
  return <Icon size={size} className={className} />;
}

/** Link to the product itself: the Atlas sign-up inside this app, or the product's official site. */
function ProductLink({ product, lang, className, style, children }: { product: Product; lang: Lang; className?: string; style?: CSSProperties; children: ReactNode }) {
  const info = PRODUCT_INFO[product];
  if (info.internal) return <Link to={`${base(lang)}${info.url}`} className={className} style={style}>{children}</Link>;
  return <a href={info.url} target="_blank" rel="noopener" className={className} style={style}>{children}</a>;
}

/* Turns the official product addresses written in an article into real links. */
const URL_RE = /((?:https?:\/\/)?(?:(?:[a-z0-9-]+\.)?liafrik\.com|gosukulu\.com|zanldo\.com)(?:\/[\w\-./]*[\w/])?)/g;

function linkify(text: string, lang: Lang): ReactNode[] {
  return text.split(URL_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const clean = part.replace(/^https?:\/\//, '');
    if (clean.startsWith('atlas.liafrik.com')) {
      return <Link key={i} to={base(lang) || '/'} className="font-semibold text-primary-700 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-700">{clean}</Link>;
    }
    return (
      <a key={i} href={`https://${clean}`} target="_blank" rel="noopener" className="font-semibold text-primary-700 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-700">
        {clean}<ArrowUpRight size={14} className="ms-0.5 inline align-[-1px]" />
      </a>
    );
  });
}

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ───────────────────────── Covers ───────────────────────── */

function Motif({ kind }: { kind: Post['cover']['motif'] }) {
  if (kind === 'grid') {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden>
        <defs><pattern id="blog-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#blog-grid)" />
      </svg>
    );
  }
  if (kind === 'rings') {
    return (
      <svg className="absolute -end-16 -bottom-16 h-[140%] w-auto opacity-25" viewBox="0 0 200 200" aria-hidden>
        {[90, 72, 54, 36, 18].map(r => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeWidth="1" />)}
      </svg>
    );
  }
  if (kind === 'waves') {
    return (
      <svg className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-25" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        {[0, 18, 36, 54].map(y => <path key={y} d={`M0 ${60 + y * 0.4}c50-30 100 30 150 0s100-30 150 0 100 30 100 0`} fill="none" stroke="white" strokeWidth="1.2" transform={`translate(0 ${y - 20})`} />)}
      </svg>
    );
  }
  return <div className="absolute inset-0 contour opacity-100" aria-hidden />;
}

function Cover({ post, size, lang }: { post: Post; size: 'lg' | 'sm' | 'wide'; lang: Lang }) {
  const info = PRODUCT_INFO[post.product];
  const big = size !== 'sm';
  return (
    <div
      className={`relative overflow-hidden ${size === 'lg' ? 'aspect-[4/3] rounded-2xl' : size === 'wide' ? 'aspect-[16/9] rounded-2xl sm:aspect-[21/8]' : 'aspect-[16/9] rounded-xl'}`}
      style={{ background: `linear-gradient(135deg, ${post.cover.from} 0%, ${post.cover.to} 100%)` }}
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"><Motif kind={post.cover.motif} /></div>
      <div className="absolute -end-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <span className={`absolute start-4 top-4 flex items-center justify-center rounded-xl bg-white/95 text-ink-900 shadow-lg ${big ? 'h-14 w-14' : 'h-10 w-10'}`} style={{ color: info.accent }}>
        <ProductIcon product={post.product} size={big ? 26 : 18} />
      </span>
      <div className={`absolute inset-x-4 bottom-4 ${big ? 'sm:inset-x-6 sm:bottom-6' : ''}`}>
        <p className={`font-bold tracking-tight text-white ${big ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>{PRODUCT_LABEL[post.product]}</p>
        {big && <p className="mt-1 max-w-md text-sm text-white/80 sm:text-base">{info.tagline[lang]}</p>}
      </div>
    </div>
  );
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ───────────────────────── Shell ───────────────────────── */

function BlogChrome({ lang, children, path }: { lang: Lang; children: ReactNode; path: string }) {
  const navigate = useNavigate();
  const { setLanguage } = useAuth();
  const fr = lang === 'fr';
  useLandingMotion();
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link to={base(lang) || '/'} className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-base font-bold tracking-tight">Atlas <span className="font-normal text-ink-400">/ Blog</span></span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link to={`${base(lang)}/blog`} className="hidden rounded-lg px-3 py-2 text-ink-700 hover:bg-ink-50 sm:inline-flex">{fr ? 'Articles' : 'Articles'}</Link>
            <a href={`${base(lang)}/demo`} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 sm:inline-flex"><PlayCircle size={15} /> {fr ? 'Démo Atlas' : 'Atlas demo'}</a>
            <button
              onClick={() => { const next: Lang = fr ? 'en' : 'fr'; setLanguage(next); navigate(`${next === 'en' ? '/en' : ''}${path}`); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50"
              aria-label={fr ? 'Read in English' : 'Lire en français'}
            >
              <Globe size={15} /> {fr ? 'EN' : 'FR'}
            </button>
            <Link to={`${base(lang)}/auth`} className="rounded-lg bg-primary-600 px-3.5 py-2 font-semibold text-white hover:bg-primary-700">{fr ? 'Essai gratuit' : 'Free trial'}</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-ink-100 bg-navy-900 text-navy-200">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_2fr]">
          <div>
            <span className="inline-flex rounded-lg bg-white px-3 py-2"><img src="/brands/liafrik-logo.png" alt="Liafrik" className="h-8 w-auto" loading="lazy" /></span>
            <p className="mt-3 text-base font-bold text-white">Liafrik Tech</p>
            <p className="mt-1 text-sm">{fr ? 'Des logiciels conçus en Afrique, prêts pour le monde' : 'Software built in Africa, ready for the world'} · {fr ? 'Dubaï – Yaoundé' : 'Dubai – Yaoundé'}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-white">{fr ? 'Produits' : 'Products'}</p>
              {(['atlas', 'pos', 'sukulu', 'zanldo', 'healthcloud', 'nutro', 'stella'] as Product[]).map(p => (
                <ProductLink key={p} product={p} lang={lang} className="block hover:text-white">{PRODUCT_LABEL[p]}</ProductLink>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Atlas</p>
              <Link to={base(lang) || '/'} className="block hover:text-white">{fr ? 'Accueil' : 'Home'}</Link>
              <a href={`${base(lang)}/demo`} className="block hover:text-white">{fr ? 'Démo' : 'Demo'}</a>
              <Link to={`${base(lang)}/legal/pricing`} className="block hover:text-white">{fr ? 'Tarifs' : 'Pricing'}</Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Liafrik</p>
              <a href="https://liafrik.com" target="_blank" rel="noopener" className="block hover:text-white">liafrik.com</a>
              <Link to={`${base(lang)}/legal/contact`} className="block hover:text-white">Contact</Link>
              <Link to={`${base(lang)}/legal/privacy`} className="block hover:text-white">{fr ? 'Confidentialité' : 'Privacy'}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function useMeta(title: string, description: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    return () => { document.title = prev; if (meta && prevDesc !== undefined) meta.content = prevDesc; };
  }, [title, description]);
}

/* ───────────────────────── Index ───────────────────────── */

const SHOWCASE: Product[] = ['atlas', 'pos', 'sukulu', 'zanldo', 'healthcloud', 'nutro', 'stella', 'libooks', 'sellia'];

export function BlogIndexPage({ lang: forced = 'fr' }: { lang?: Language }) {
  const lang = useBlogLang(forced);
  const fr = lang === 'fr';
  const [params, setParams] = useSearchParams();
  useHreflangLinks('/blog');
  useCanonical(fr ? '/blog' : '/en/blog');
  useMeta(fr ? 'Blog Liafrik Tech — Atlas, POS, Sukulu, Zanldo' : 'Liafrik Tech blog — Atlas, POS, Sukulu, Zanldo',
    fr ? 'Articles sur les produits Liafrik : Atlas CRM, la caisse POS, la plateforme scolaire Sukulu et la marketplace Zanldo, conçus en Afrique.' : 'Articles on Liafrik products: Atlas CRM, the POS till, the Sukulu school platform and the Zanldo marketplace, built in Africa.');

  const filter = (params.get('product') as Product | null) || null;
  const sorted = useMemo(() => [...POSTS].sort((a, b) => b.date.localeCompare(a.date)), []);
  const products = useMemo(() => Array.from(new Set(sorted.map(p => p.product))), [sorted]);
  const list = filter ? sorted.filter(p => p.product === filter) : sorted;
  const [featured, ...rest] = list;
  const setFilter = (p: Product | null) => { const n = new URLSearchParams(params); if (p) n.set('product', p); else n.delete('product'); setParams(n, { replace: true }); };

  return (
    <BlogChrome lang={lang} path="/blog">
      <main>
        <section className="relative overflow-hidden border-b border-ink-100 bg-gradient-to-b from-primary-50/70 to-white">
          <div className="lp-grid" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-12 sm:px-8 sm:pt-20">
            <SplitReveal
              as="h1"
              trigger="load"
              key={lang}
              className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-6xl"
              parts={fr ? 'La tech africaine qui vend, enseigne, encaisse et automatise.' : 'African tech that sells, teaches, collects and automates.'}
            />
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-600">
              {fr ? 'Le blog de Liafrik Tech. Chaque article parle d’un produit que vous pouvez ouvrir tout de suite.' : 'The Liafrik Tech blog. Every article covers a product you can open right now.'}
            </p>
            <p className="mt-10 text-sm font-semibold text-ink-500">{fr ? 'La suite Liafrik' : 'The Liafrik suite'}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SHOWCASE.map(p => {
                const info = PRODUCT_INFO[p];
                return (
                  <ProductLink key={p} product={p} lang={lang} className="lp-tilt group flex items-start gap-3 rounded-2xl border border-ink-100 bg-white/90 p-4 shadow-sm hover:border-ink-200 hover:shadow-md">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${info.accent}14`, color: info.accent }}>
                      <ProductIcon product={p} size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-bold text-ink-900">{PRODUCT_LABEL[p]} <ArrowUpRight size={14} className="text-ink-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-700 rtl:-scale-x-100" /></span>
                      <span className="mt-0.5 block text-sm leading-5 text-ink-600">{info.tagline[lang]}</span>
                      <span className="mt-1.5 block text-xs font-semibold" style={{ color: info.accent }}>{info.domain}</span>
                    </span>
                  </ProductLink>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={fr ? 'Filtrer par produit' : 'Filter by product'}>
            {[null, ...products].map(p => {
              const on = filter === p;
              return (
                <button key={p || 'all'} role="tab" aria-selected={on} onClick={() => setFilter(p)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${on ? 'bg-navy-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}>
                  {p ? PRODUCT_LABEL[p] : (fr ? 'Tous les articles' : 'All articles')}
                </button>
              );
            })}
          </div>
        </section>

        {featured && (
          <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8" aria-label={fr ? 'À la une' : 'Featured'}>
            <Link to={`${base(lang)}/blog/${featured.slug}`} className="group grid gap-8 rounded-3xl border border-ink-200/70 p-4 transition hover:border-ink-300 hover:shadow-lg sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <Cover post={featured} size="lg" lang={lang} />
              <div className="lg:pe-6">
                <p className="text-sm font-semibold" style={{ color: PRODUCT_INFO[featured.product].accent }}>{PRODUCT_LABEL[featured.product]} · {fmtDate(featured.date, lang)} · {featured.readMin} min</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink-900 group-hover:text-primary-800 sm:text-4xl">{featured[lang].title}</h2>
                <p className="mt-4 text-lg leading-8 text-ink-600 blog-serif">{featured[lang].dek}</p>
                <p className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-700">{fr ? 'Lire l’article' : 'Read the article'} <ArrowRight size={16} className="transition group-hover:translate-x-1 rtl:rotate-180" /></p>
              </div>
            </Link>
          </section>
        )}

        <section className="mx-auto grid max-w-6xl gap-x-8 gap-y-12 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {rest.map(p => (
            <Link key={p.slug} to={`${base(lang)}/blog/${p.slug}`} className="group">
              <Cover post={p} size="sm" lang={lang} />
              <p className="mt-4 text-xs font-semibold" style={{ color: PRODUCT_INFO[p.product].accent }}>{PRODUCT_LABEL[p.product]} <span className="text-ink-400">· {fmtDate(p.date, lang)} · {p.readMin} min</span></p>
              <h3 className="mt-1.5 text-xl font-bold leading-snug text-ink-900 group-hover:text-primary-800">{p[lang].title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-600 blog-serif">{p[lang].dek}</p>
            </Link>
          ))}
        </section>

        <ProductCta product={filter || 'atlas'} lang={lang} />
      </main>
    </BlogChrome>
  );
}

/* ───────────────────────── Product calls to action ───────────────────────── */

function ProductCta({ product, lang }: { product: Product; lang: Lang }) {
  const fr = lang === 'fr';
  const info = PRODUCT_INFO[product];
  const isAtlas = product === 'atlas';
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl px-6 py-12 text-white sm:px-12" style={{ background: `linear-gradient(135deg, #0d1c33 0%, ${info.accent} 140%)` }}>
        <div className="absolute inset-0 contour" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl items-start gap-4">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white shadow-lg" style={{ color: info.accent }}><ProductIcon product={product} size={26} /></span>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{isAtlas ? (fr ? 'Assez lu. Essayez.' : 'Enough reading. Try it.') : PRODUCT_LABEL[product]}</h2>
              <p className="mt-2 text-white/80">{isAtlas ? (fr ? 'La démo Atlas s’ouvre sans compte, avec une entreprise fictive complète à piloter.' : 'The Atlas demo opens without an account, with a complete fictional company to run.') : info.tagline[lang]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAtlas ? (
              <>
                <a href={`${base(lang)}/demo`} className="lp-cta lp-magnetic inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-navy-900 hover:bg-primary-50"><PlayCircle size={18} /> {fr ? 'Ouvrir la démo' : 'Open the demo'}</a>
                <Link to={`${base(lang)}/auth`} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">{fr ? 'Essai gratuit 14 jours' : '14-day free trial'}</Link>
              </>
            ) : (
              <ProductLink product={product} lang={lang} className="lp-cta lp-magnetic inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-navy-900 hover:bg-primary-50">
                {info.cta[lang]} <ArrowUpRight size={18} className="rtl:-scale-x-100" />
              </ProductLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, lang, compact }: { product: Product; lang: Lang; compact?: boolean }) {
  const fr = lang === 'fr';
  const info = PRODUCT_INFO[product];
  return (
    <div className={`rounded-2xl border border-ink-100 bg-white p-5 shadow-sm ${compact ? '' : 'ring-1 ring-black/[0.02]'}`}>
      {info.logo ? (
        <div>
          <img src={info.logo} alt={PRODUCT_LABEL[product]} className={`${info.logoTall ? 'h-24' : 'h-10'} w-auto max-w-full object-contain object-left`} loading="lazy" />
          <p className="mt-2 text-xs font-semibold" style={{ color: info.accent }}>{info.domain}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${info.accent}14`, color: info.accent }}><ProductIcon product={product} size={20} /></span>
          <div className="min-w-0">
            <p className="font-bold text-ink-900">{PRODUCT_LABEL[product]}</p>
            <p className="text-xs font-semibold" style={{ color: info.accent }}>{info.domain}</p>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-ink-600">{info.tagline[lang]}</p>
      <ProductLink product={product} lang={lang} style={{ backgroundColor: info.accent }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
        {info.cta[lang]} {info.internal ? <ArrowRight size={15} className="rtl:rotate-180" /> : <ArrowUpRight size={15} className="rtl:-scale-x-100" />}
      </ProductLink>
      {product === 'atlas' && (
        <a href={`${base(lang)}/demo`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"><PlayCircle size={15} /> {fr ? 'Voir la démo sans compte' : 'See the demo, no account'}</a>
      )}
    </div>
  );
}

/* ───────────────────────── Article ───────────────────────── */

function renderBlock(b: Block, i: number, lang: Lang) {
  switch (b.t) {
    case 'h2': return <h2 key={i} id={slugify(b.text)} className="mt-12 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">{b.text}</h2>;
    case 'ul': return <ul key={i} className="my-6 space-y-3 ps-6 list-disc marker:text-primary-500">{b.items.map((it, j) => <li key={j}>{linkify(it, lang)}</li>)}</ul>;
    case 'quote': return <blockquote key={i} className="my-10 border-s-4 border-primary-500 ps-6 text-2xl font-bold leading-snug tracking-tight text-navy-900 not-italic" style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}>{b.text}</blockquote>;
    case 'callout': return (
      <aside key={i} className="my-8 rounded-2xl bg-primary-50 p-6 ring-1 ring-inset ring-primary-100">
        <p className="text-base font-bold text-primary-900" style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}>{b.title}</p>
        <p className="mt-1 text-primary-900/80">{linkify(b.text, lang)}</p>
      </aside>
    );
    default: return <p key={i} className="my-5">{linkify(b.text, lang)}</p>;
  }
}

function ShareBar({ title, lang }: { title: string; lang: Lang }) {
  const fr = lang === 'fr';
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const enc = encodeURIComponent;
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900';
  return (
    <div className="flex items-center gap-2">
      <span className="me-1 text-xs font-semibold text-ink-500">{fr ? 'Partager' : 'Share'}</span>
      <a className={btn} href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener" aria-label="WhatsApp"><MessageCircle size={16} /></a>
      <a className={btn} href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener" aria-label="LinkedIn"><Linkedin size={16} /></a>
      <button className={btn} onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }} aria-label={fr ? 'Copier le lien' : 'Copy link'}>
        {copied ? <Check size={16} className="text-success-600" /> : <Link2 size={16} />}
      </button>
    </div>
  );
}

function ReadingProgress() {
  useEffect(() => {
    const bar = document.getElementById('blog-progress');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div id="blog-progress" className="lp-progress" aria-hidden="true" />;
}

export function BlogArticlePage({ lang: forced = 'fr' }: { lang?: Language }) {
  const { slug } = useParams();
  const lang = useBlogLang(forced);
  const fr = lang === 'fr';
  const post = getPost(slug);
  useHreflangLinks(`/blog/${slug || ''}`);
  useCanonical(`${lang === 'fr' ? '' : '/en'}/blog/${post?.slug || slug || ''}`);
  useMeta(post ? `${post[lang].title} — Blog Liafrik` : 'Blog Liafrik', post ? post[lang].dek : '');
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  if (!post) return <Navigate to={`${base(lang)}/blog`} replace />;
  if (slug !== post.slug) return <Navigate to={`${base(lang)}/blog/${post.slug}`} replace />;

  const info = PRODUCT_INFO[post.product];
  const toc = post[lang].body.filter((b): b is Extract<Block, { t: 'h2' }> => b.t === 'h2');
  const others = [
    ...POSTS.filter(p => p.slug !== post.slug && p.product === post.product),
    ...POSTS.filter(p => p.slug !== post.slug && p.product !== post.product).sort((a, b) => b.date.localeCompare(a.date)),
  ].slice(0, 3);

  return (
    <BlogChrome lang={lang} path={`/blog/${post.slug}`}>
      <ReadingProgress />
      <main>
        <article>
          <header className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
            <div className="max-w-3xl">
              <Link to={`${base(lang)}/blog`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800"><ArrowLeft size={15} className="rtl:rotate-180" /> Blog</Link>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
                <ProductLink product={post.product} lang={lang} style={{ backgroundColor: `${info.accent}14`, color: info.accent }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition hover:opacity-80">
                  <ProductIcon product={post.product} size={14} /> {PRODUCT_LABEL[post.product]}
                </ProductLink>
                <span className="text-ink-500">{fmtDate(post.date, lang)} · {post.readMin} min {fr ? 'de lecture' : 'read'}</span>
              </div>
              <SplitReveal as="h1" trigger="load" key={`${post.slug}-${lang}`} className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl" parts={post[lang].title} />
              <p className="mt-5 text-xl leading-8 text-ink-600 blog-serif">{post[lang].dek}</p>
            </div>
          </header>
          <div className="mx-auto mt-10 max-w-6xl px-5 sm:px-8"><Cover post={post} size="wide" lang={lang} /></div>

          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="mb-8 lg:hidden"><ProductCard product={post.product} lang={lang} compact /></div>
              <div className="blog-serif max-w-[68ch] text-[19px] leading-[1.8] text-ink-800">
                {post[lang].body.map((b, i) => renderBlock(b, i, lang))}
              </div>
              <div className="mt-12 flex max-w-[68ch] flex-col gap-4 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-500">
                  {fr ? 'Écrit par l’équipe' : 'Written by the'} <a href="https://liafrik.com" target="_blank" rel="noopener" className="font-semibold text-ink-800 hover:underline">Liafrik Tech</a>{fr ? ', Dubaï – Yaoundé.' : ' team, Dubai – Yaoundé.'}
                </p>
                <ShareBar title={post[lang].title} lang={lang} />
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <ProductCard product={post.product} lang={lang} />
                {toc.length > 1 && (
                  <nav aria-label={fr ? 'Sommaire' : 'Contents'} className="rounded-2xl border border-ink-100 p-5">
                    <p className="text-xs font-semibold text-ink-500">{fr ? 'Dans cet article' : 'In this article'}</p>
                    <ol className="mt-3 space-y-2 text-sm">
                      {toc.map(h => <li key={h.text}><a href={`#${slugify(h.text)}`} className="text-ink-700 hover:text-primary-700">{h.text}</a></li>)}
                    </ol>
                  </nav>
                )}
              </div>
            </aside>
          </div>
        </article>

        <ProductCta product={post.product} lang={lang} />

        <section className="border-t border-ink-100 bg-ink-50/60">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight">{fr ? 'À lire ensuite' : 'Read next'}</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {others.map(p => (
                <Link key={p.slug} to={`${base(lang)}/blog/${p.slug}`} className="group">
                  <Cover post={p} size="sm" lang={lang} />
                  <p className="mt-3 text-xs font-semibold" style={{ color: PRODUCT_INFO[p.product].accent }}>{PRODUCT_LABEL[p.product]}</p>
                  <h3 className="mt-1 text-lg font-bold leading-snug text-ink-900 group-hover:text-primary-800">{p[lang].title}</h3>
                </Link>
              ))}
            </div>
            {post.product !== 'atlas' && (
              <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                  <p className="text-sm text-ink-700"><span className="font-bold text-ink-900">Atlas CRM</span> — {PRODUCT_INFO.atlas.tagline[lang]}</p>
                </div>
                <a href={`${base(lang)}/demo`} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"><PlayCircle size={16} /> {fr ? 'Ouvrir la démo' : 'Open the demo'}</a>
              </div>
            )}
          </div>
        </section>
      </main>
    </BlogChrome>
  );
}
