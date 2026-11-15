import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Globe, PlayCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { POSTS, PRODUCT_LABEL, getPost, type Block, type Post } from '@/lib/blog/posts';
import { useHreflangLinks } from '@/lib/useHreflang';
import type { Language } from '@/lib/i18n';

type Lang = 'fr' | 'en';

function useBlogLang(forced?: Language): Lang {
  const { language, setLanguage } = useAuth();
  useEffect(() => { if (forced && forced !== language) setLanguage(forced); }, [forced, language, setLanguage]);
  const l = forced || language;
  return l === 'en' ? 'en' : 'fr';
}

const base = (lang: Lang) => (lang === 'en' ? '/en' : '');

function Motif({ kind }: { kind: Post['cover']['motif'] }) {
  if (kind === 'grid') {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
        <defs><pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)" />
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

function Cover({ post, size }: { post: Post; size: 'lg' | 'sm' | 'wide' }) {
  return (
    <div
      className={`relative overflow-hidden ${size === 'lg' ? 'aspect-[4/3] rounded-2xl' : size === 'wide' ? 'aspect-[21/8] rounded-2xl' : 'aspect-[16/9] rounded-xl'}`}
      style={{ background: `linear-gradient(135deg, ${post.cover.from} 0%, ${post.cover.to} 100%)` }}
    >
      <Motif kind={post.cover.motif} />
      <span className={`absolute start-5 bottom-4 font-bold tracking-tight text-white/90 ${size === 'sm' ? 'text-xl' : 'text-3xl sm:text-4xl'}`}>
        {PRODUCT_LABEL[post.product]}
      </span>
    </div>
  );
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BlogChrome({ lang, children, path }: { lang: Lang; children: React.ReactNode; path: string }) {
  const navigate = useNavigate();
  const { setLanguage } = useAuth();
  const fr = lang === 'fr';
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link to={base(lang) || '/'} className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-base font-bold tracking-tight">Atlas CRM</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <Link to={`${base(lang)}/blog`} className="hidden rounded-lg px-3 py-2 text-ink-900 sm:inline-flex">Blog</Link>
            <a href={`${base(lang)}/demo`} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-50 sm:inline-flex"><PlayCircle size={15} /> {fr ? 'Démo' : 'Demo'}</a>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-base font-bold text-white">Atlas CRM</p>
            <p className="mt-1 text-sm">{fr ? 'Développé par' : 'Built by'} <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:underline">Liafrik Tech</a> · {fr ? 'Dubaï – Yaoundé' : 'Dubai – Yaoundé'}</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <Link to={base(lang) || '/'} className="hover:text-white">{fr ? 'Accueil' : 'Home'}</Link>
            <Link to={`${base(lang)}/legal/pricing`} className="hover:text-white">{fr ? 'Tarifs' : 'Pricing'}</Link>
            <Link to={`${base(lang)}/legal/contact`} className="hover:text-white">Contact</Link>
            <Link to={`${base(lang)}/legal/privacy`} className="hover:text-white">{fr ? 'Confidentialité' : 'Privacy'}</Link>
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

export function BlogIndexPage({ lang: forced = 'fr' }: { lang?: Language }) {
  const lang = useBlogLang(forced);
  const fr = lang === 'fr';
  useHreflangLinks('/blog');
  useMeta(fr ? 'Blog Atlas — la tech Liafrik pour les entreprises africaines' : 'Atlas blog — Liafrik technology for African businesses',
    fr ? 'Articles sur Atlas CRM et les produits Liafrik : vente, paiements Mobile Money, IA et automatisation pour les entreprises d’Afrique et du Golfe.' : 'Articles on Atlas CRM and Liafrik products: sales, mobile money payments, AI and automation for businesses in Africa and the Gulf.');
  const [featured, ...rest] = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <BlogChrome lang={lang} path="/blog">
      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-10 sm:px-8 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-6xl">
            {fr ? 'La tech qui vend, encaisse et automatise en Afrique.' : 'Tech that sells, collects and automates in Africa.'}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-600">
            {fr ? 'Le blog d’Atlas et des produits Liafrik. Ce qu’on construit, pourquoi on le construit, et comment s’en servir.' : 'The blog of Atlas and Liafrik’s products. What we build, why we build it, and how to use it.'}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-5 sm:px-8" aria-label={fr ? 'À la une' : 'Featured'}>
          <Link to={`${base(lang)}/blog/${featured.slug}`} className="group grid gap-8 rounded-3xl border border-ink-200/70 p-4 transition-colors hover:border-ink-300 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <Cover post={featured} size="lg" />
            <div className="lg:pe-6">
              <p className="text-sm font-semibold text-primary-700">{PRODUCT_LABEL[featured.product]} · {fmtDate(featured.date, lang)}</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink-900 group-hover:text-primary-800 sm:text-4xl">{featured[lang].title}</h2>
              <p className="mt-4 text-lg leading-8 text-ink-600 blog-serif">{featured[lang].dek}</p>
              <p className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-700">{fr ? 'Lire l’article' : 'Read the article'} <ArrowRight size={16} className="transition group-hover:translate-x-1 rtl:rotate-180" /></p>
            </div>
          </Link>
        </section>

        <section className="mx-auto grid max-w-6xl gap-x-8 gap-y-12 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {rest.map(p => (
            <Link key={p.slug} to={`${base(lang)}/blog/${p.slug}`} className="group">
              <Cover post={p} size="sm" />
              <p className="mt-4 text-xs font-semibold text-ink-500">{PRODUCT_LABEL[p.product]} · {fmtDate(p.date, lang)} · {p.readMin} min</p>
              <h3 className="mt-1.5 text-xl font-bold leading-snug text-ink-900 group-hover:text-primary-800">{p[lang].title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-600 blog-serif">{p[lang].dek}</p>
            </Link>
          ))}
        </section>

        <DemoCta lang={lang} />
      </main>
    </BlogChrome>
  );
}

function DemoCta({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-12 text-white sm:px-12">
        <div className="absolute inset-0 contour" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight">{fr ? 'Assez lu. Essayez.' : 'Enough reading. Try it.'}</h2>
            <p className="mt-2 text-navy-200">{fr ? 'La démo Atlas s’ouvre sans compte, avec une vraie entreprise fictive à piloter.' : 'The Atlas demo opens without an account, with a real fictional company to run.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`${base(lang)}/demo`} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-navy-900 hover:bg-primary-50"><PlayCircle size={18} /> {fr ? 'Ouvrir la démo' : 'Open the demo'}</a>
            <Link to={`${base(lang)}/auth`} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">{fr ? 'Essai gratuit 14 jours' : '14-day free trial'}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function renderBlock(b: Block, i: number) {
  switch (b.t) {
    case 'h2': return <h2 key={i} className="mt-12 mb-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">{b.text}</h2>;
    case 'ul': return <ul key={i} className="my-6 space-y-3 ps-6 list-disc marker:text-primary-500">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
    case 'quote': return <blockquote key={i} className="my-10 border-s-4 border-primary-500 ps-6 text-2xl font-bold leading-snug tracking-tight text-navy-900 not-italic" style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}>{b.text}</blockquote>;
    case 'callout': return (
      <aside key={i} className="my-8 rounded-2xl bg-primary-50 p-6 ring-1 ring-inset ring-primary-100">
        <p className="text-base font-bold text-primary-900" style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}>{b.title}</p>
        <p className="mt-1 text-primary-900/80">{b.text}</p>
      </aside>
    );
    default: return <p key={i} className="my-5">{b.text}</p>;
  }
}

export function BlogArticlePage({ lang: forced = 'fr' }: { lang?: Language }) {
  const { slug } = useParams();
  const lang = useBlogLang(forced);
  const fr = lang === 'fr';
  const post = getPost(slug);
  useHreflangLinks(`/blog/${slug || ''}`);
  useMeta(post ? `${post[lang].title} — Blog Atlas` : 'Blog Atlas', post ? post[lang].dek : '');
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  if (!post) return <Navigate to={`${base(lang)}/blog`} replace />;

  const others = POSTS.filter(p => p.slug !== post.slug).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <BlogChrome lang={lang} path={`/blog/${post.slug}`}>
      <main>
        <article>
          <header className="mx-auto max-w-3xl px-5 pt-10 sm:px-8 sm:pt-14">
            <Link to={`${base(lang)}/blog`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800"><ArrowLeft size={15} className="rtl:rotate-180" /> Blog</Link>
            <p className="mt-8 text-sm font-semibold text-primary-700">{PRODUCT_LABEL[post.product]} · {fmtDate(post.date, lang)} · {post.readMin} min {fr ? 'de lecture' : 'read'}</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl">{post[lang].title}</h1>
            <p className="mt-5 text-xl leading-8 text-ink-600 blog-serif">{post[lang].dek}</p>
          </header>
          <div className="mx-auto mt-10 max-w-4xl px-5 sm:px-8"><Cover post={post} size="wide" /></div>
          <div className="blog-serif mx-auto max-w-[68ch] px-5 py-12 text-[19px] leading-[1.8] text-ink-800 sm:px-0">
            {post[lang].body.map(renderBlock)}
            <p className="mt-12 border-t border-ink-100 pt-6 text-sm text-ink-500" style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}>
              {fr ? 'Écrit par l’équipe' : 'Written by the'} <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-800 hover:underline">Liafrik Tech</a>{fr ? ', Dubaï – Yaoundé.' : ' team, Dubai – Yaoundé.'}
            </p>
          </div>
        </article>

        <section className="border-t border-ink-100 bg-ink-50/60">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight">{fr ? 'À lire ensuite' : 'Read next'}</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {others.map(p => (
                <Link key={p.slug} to={`${base(lang)}/blog/${p.slug}`} className="group">
                  <Cover post={p} size="sm" />
                  <h3 className="mt-3 text-lg font-bold leading-snug text-ink-900 group-hover:text-primary-800">{p[lang].title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <div className="pt-16"><DemoCta lang={lang} /></div>
      </main>
    </BlogChrome>
  );
}
