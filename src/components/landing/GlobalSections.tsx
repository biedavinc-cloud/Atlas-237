import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, KanbanSquare, PhoneCall, Radio, Receipt, Star, Sparkles, EyeOff, CheckCircle2,
  Facebook, Instagram, Linkedin, Youtube,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { InstagramFeed } from '@/components/InstagramFeed';
import { INDUSTRY_PRESETS } from '@/lib/workspace';

type Lang = 'fr' | 'en';
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Writes the element's scroll progress (0 → 1 while it crosses the
 * viewport, or while a tall pinned section scrolls) into --p on the element.
 * One passive listener + rAF per section, transforms only, nothing on
 * reduced motion.
 */
function useScrollVar(ref: React.RefObject<HTMLElement>, mode: 'pin' | 'cross' = 'cross') {
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = mode === 'pin' ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (vh + r.height);
      el.style.setProperty('--p', String(Math.min(1, Math.max(0, p))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [ref, mode]);
}

const FLAG = (c: string) => `/brand-flags/1x1/${c}.svg`;

/* ─────────────── 1. Pinned story: giant text behind glass, stacking cards ─────────────── */

export function StackStory({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLElement>(null);
  useScrollVar(ref, 'pin');
  const fr = lang === 'fr';
  const cards: { n: string; t: string; d: string; extra: ReactNode; tone: string }[] = [
    { n: '195', t: fr ? 'pays à l’inscription' : 'countries at sign-up', d: fr ? 'Pays, devise et fuseau proposés dès la création du compte.' : 'Country, currency and time zone offered when you sign up.', tone: 'lp2-card-blue',
      extra: <div className="lp2-flags">{['cm', 'ci', 'ng', 'ke', 'sn', 'gh', 'ma', 'za', 'ae', 'fr', 'us', 'br'].map((c) => <img key={c} src={FLAG(c)} alt="" width={30} height={30} loading="lazy" />)}</div> },
    { n: '50+', t: fr ? 'devises' : 'currencies', d: fr ? 'Devis, factures et paiements dans la monnaie de vos clients.' : 'Quotes, invoices and payments in your customers’ currency.', tone: 'lp2-card-white',
      extra: <div className="lp2-chips">{['XAF', 'XOF', 'NGN', 'KES', 'GHS', 'ZAR', 'MAD', 'AED', 'EUR', 'USD', 'BRL'].map((c, i) => <span key={c} className={i % 3 === 0 ? 'is-dark' : i % 3 === 1 ? 'is-mid' : ''}>{c}</span>)}</div> },
    { n: '5', t: fr ? 'langues' : 'languages', d: fr ? 'Français, anglais, espagnol, portugais et arabe, de droite à gauche compris.' : 'French, English, Spanish, Portuguese and Arabic, right-to-left included.', tone: 'lp2-card-ink',
      extra: <div className="lp2-langs"><span>Bonjour</span><span>Hello</span><span>Hola</span><span>Olá</span><span dir="rtl">مرحبا</span></div> },
    { n: '4', t: fr ? 'moteurs d’IA au choix' : 'AI engines to choose from', d: fr ? 'Ask Atlas répond sur vos données, avec l’IA offerte ou votre propre clé.' : 'Ask Atlas answers on your data, with the free AI or your own key.', tone: 'lp2-card-sky',
      extra: <div className="lp2-chips">{['Atlas', 'Gemini', 'GPT', 'Claude'].map((c) => <span key={c} className="is-mid">{c}</span>)}</div> },
  ];
  return (
    <section ref={ref} className="lp2-story" aria-label={fr ? 'Atlas en quatre chiffres vérifiables' : 'Atlas in four checkable numbers'}>
      <div className="lp2-story-pin">
        <p className="lp2-story-giant" aria-hidden="true">{fr ? 'Un seul CRM. Toute votre entreprise. Partout.' : 'One CRM. Your whole business. Anywhere.'}</p>
        <div className="lp2-story-glass" aria-hidden="true" />
        <ol className="lp2-story-cards">
          {cards.map((c, i) => (
            <li key={c.n} className={`lp2-story-card ${c.tone}`} style={{ ['--i' as string]: i }}>
              <div className="min-w-0">
                <p className="lp2-story-n">{c.n}</p>
                <p className="lp2-story-t">{c.t}</p>
                <p className="lp2-story-d">{c.d}</p>
              </div>
              {c.extra}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────────── 2. Products: list on the left, live preview on the right ─────────────── */

function Preview({ id, fr }: { id: string; fr: boolean }) {
  if (id === 'sales') return (
    <div className="lp2-mock">
      <p className="lp2-mock-h">{fr ? 'Pipeline' : 'Pipeline'}</p>
      {[[fr ? 'Proposition' : 'Proposal', 'Savane Distribution', '2 400 000 FCFA'], [fr ? 'Négociation' : 'Negotiation', 'Kivu Logistics', '1 150 000 FCFA'], [fr ? 'Gagnée' : 'Won', 'Baobab Pharma', '3 800 000 FCFA']].map(([s, n, v], i) => (
        <div key={n} className="lp2-mock-row"><span className={`lp2-dot ${i === 2 ? 'is-ok' : ''}`} /><span className="flex-1"><b>{n}</b><small>{s}</small></span><span className="tabular text-xs font-semibold">{v}</span></div>
      ))}
    </div>
  );
  if (id === 'calls') return (
    <div className="lp2-mock">
      <p className="lp2-mock-h">{fr ? 'Fiche client · vue agent' : 'Customer record · agent view'}</p>
      <div className="lp2-mock-row"><EyeOff size={15} /><span className="flex-1"><b>Awa Ndiaye</b><small>a•••@g•••.com · +237 ••• ••56</small></span></div>
      <div className="lp2-mock-row"><PhoneCall size={15} /><span className="flex-1"><b>{fr ? 'Appel relayé' : 'Bridged call'}</b><small>{fr ? 'Numéro jamais affiché · enregistré' : 'Number never shown · recorded'}</small></span><span className="lp2-pill">04:12</span></div>
      <div className="lp2-mock-row"><CheckCircle2 size={15} /><span className="flex-1"><b>{fr ? 'Portefeuille de Paul' : 'Paul’s portfolio'}</b><small>{fr ? 'Visible par Paul, son manager et le QC' : 'Seen by Paul, his manager and QC'}</small></span></div>
    </div>
  );
  if (id === 'live') return (
    <div className="lp2-mock">
      <p className="lp2-mock-h"><Radio size={13} className="inline text-success-600" /> {fr ? 'En direct' : 'Live'}</p>
      {[[fr ? 'Dépôt' : 'Deposit', 'MT5 · Kofi Mensah', '500 USD'], [fr ? 'Commande' : 'Order', 'Zanldo · Grace Ade', '45 000 FCFA'], [fr ? 'Appel terminé' : 'Call ended', 'Aircall · 6 min', '']].map(([t, s, v]) => (
        <div key={s} className="lp2-mock-row lp2-live"><span className="lp2-dot is-ok" /><span className="flex-1"><b>{t}</b><small>{s}</small></span><span className="tabular text-xs font-semibold">{v}</span></div>
      ))}
    </div>
  );
  if (id === 'billing') return (
    <div className="lp2-mock">
      <p className="lp2-mock-h">{fr ? 'Facture INV-0042' : 'Invoice INV-0042'}</p>
      <div className="lp2-mock-row"><Receipt size={15} /><span className="flex-1"><b>{fr ? 'Reste à payer' : 'Amount due'}</b><small>{fr ? 'Lien de paiement prêt' : 'Payment link ready'}</small></span><span className="tabular text-xs font-semibold">185 000 FCFA</span></div>
      <div className="lp2-chips mt-3">{['Mobile Money', 'Paystack', 'Flutterwave', 'Stripe', 'Wave'].map((c) => <span key={c} className="is-mid">{c}</span>)}</div>
    </div>
  );
  if (id === 'reviews') return (
    <div className="lp2-mock">
      <p className="lp2-mock-h">{fr ? 'Avis reçu' : 'Review received'}</p>
      <div className="flex gap-0.5 text-warning-500">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} className="fill-current" />)}</div>
      <p className="mt-2 text-sm text-ink-700">{fr ? '« Accueil rapide, consultation claire. »' : '"Quick welcome, clear consultation."'}</p>
      <p className="mt-1 text-xs text-ink-500">{fr ? 'Clinique · lien envoyé après le rendez-vous' : 'Clinic · link sent after the visit'}</p>
    </div>
  );
  return (
    <div className="lp2-mock">
      <p className="lp2-mock-h"><Sparkles size={13} className="inline text-primary-600" /> Ask Atlas</p>
      <p className="lp2-bubble is-me">{fr ? 'Quelles factures sont impayées ?' : 'Which invoices are unpaid?'}</p>
      <p className="lp2-bubble">{fr ? '4 factures, 1,2 M FCFA au total. La plus ancienne : Kivu Logistics, 18 jours.' : '4 invoices, 1.2M FCFA in total. Oldest: Kivu Logistics, 18 days.'}</p>
    </div>
  );
}

export function ProductShowcase({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const items = [
    { id: 'sales', icon: KanbanSquare, t: fr ? 'Ventes & pipeline' : 'Sales & pipeline', d: fr ? 'Leads, contacts, affaires, devis : glissez une affaire, la probabilité suit.' : 'Leads, contacts, deals, quotes: drag a deal, probability follows.', to: '/app/pipelines' },
    { id: 'calls', icon: PhoneCall, t: fr ? 'Centre d’appels' : 'Call center', d: fr ? 'Coordonnées masquées, portefeuilles par agent, appels relayés et enregistrés.' : 'Hidden contact details, per-agent portfolios, bridged and recorded calls.', to: '/app/workspace' },
    { id: 'live', icon: Radio, t: fr ? 'Activité client en direct' : 'Live customer activity', d: fr ? 'Dépôts, ordres, commandes et appels d’autres plateformes, sur la fiche, en temps réel.' : 'Deposits, trades, orders and calls from other platforms, on the record, in real time.', to: '/app/live' },
    { id: 'billing', icon: Receipt, t: fr ? 'Factures & paiements' : 'Invoices & payments', d: fr ? 'Facture en FCFA ou autre devise, lien Mobile Money, Paystack, Flutterwave ou Stripe.' : 'Invoice in any currency, Mobile Money, Paystack, Flutterwave or Stripe link.', to: '/app/invoices' },
    { id: 'reviews', icon: Star, t: fr ? 'Avis clients' : 'Customer reviews', d: fr ? 'Un lien après la commande, la visite ou l’appel ; la note arrive sur la fiche.' : 'A link after the order, visit or call; the rating lands on the record.', to: '/app/reviews' },
    { id: 'ai', icon: Sparkles, t: 'Ask Atlas', d: fr ? 'Posez une question en français, la réponse vient de vos chiffres.' : 'Ask in plain words, the answer comes from your numbers.', to: '/app/ask-atlas' },
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reducedMotion()) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % items.length), 5200);
    return () => window.clearTimeout(t);
  }, [active, paused, items.length]);
  const demo = (to: string) => `${fr ? '/demo' : '/en/demo'}?to=${to}`;

  return (
    <div className="lp2-products reveal" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ul className="lp2-products-list" role="tablist" aria-label={fr ? 'Produits' : 'Products'}>
        {items.map((it, i) => (
          <li key={it.id} className={`lp2-product ${i === active ? 'is-active' : ''}`}>
            <button role="tab" aria-selected={i === active} aria-controls="lp2-preview" onClick={() => setActive(i)} onFocus={() => setActive(i)} className="lp2-product-btn">
              <it.icon size={20} className="lp2-product-ic" />
              <span className="min-w-0 flex-1 text-start">
                <span className="lp2-product-t">{it.t}</span>
                <span className="lp2-product-d">{it.d}</span>
              </span>
              <span className="lp2-product-go" aria-hidden="true"><ArrowUpRight size={16} /></span>
            </button>
            {i === active && !paused && <span className="lp2-product-bar" aria-hidden="true" />}
          </li>
        ))}
      </ul>
      <div id="lp2-preview" role="tabpanel" className="lp2-preview">
        <div key={items[active].id} className="lp2-preview-inner"><Preview id={items[active].id} fr={fr} /></div>
        <a href={demo(items[active].to)} className="lp2-preview-tag">{items[active].t} · {fr ? 'voir dans la démo' : 'see it in the demo'} <ArrowRight size={12} className="rtl:rotate-180" /></a>
        <p className="lp2-preview-note">{fr ? 'Aperçu, données fictives' : 'Preview, fictional data'}</p>
      </div>
    </div>
  );
}

/* ─────────────── 3. Coverage ─────────────── */

// Hand-placed around the headline: [left, top, rotation, blur, parallax distance].
const COUNTRY_POS = ([
  [4, 7, -8, 0, 120], [78, 8, 6, 0, -90], [2, 42, 4, 0, 80], [82, 40, -5, 0, -120], [8, 76, -6, 1.5, 140], [74, 76, 7, 1.5, -70],
  [17, 22, 9, 3, 60], [64, 20, -9, 3, -50], [40, 1, 3, 3, 90], [90, 63, -4, 2, 70], [-6, 62, 6, 2, -60], [43, 91, -3, 4, 50],
] as const).map(([x, y, r, b, d], i) => ({ ['--i' as string]: i, ['--x' as string]: `${x}%`, ['--y' as string]: `${y}%`, ['--r' as string]: `${r}deg`, ['--b' as string]: `${b}px`, ['--o' as string]: b > 2 ? .55 : b > 1 ? .8 : 1, ['--d' as string]: `${d}px` }) as React.CSSProperties);

export function CoverageSection({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLElement>(null);
  useScrollVar(ref);
  const fr = lang === 'fr';
  const cards: [string, string, string, string][] = [
    ['cm', fr ? 'Cameroun' : 'Cameroon', 'XAF', 'FR · EN'], ['ng', 'Nigeria', 'NGN', 'EN'], ['ci', fr ? 'Côte d’Ivoire' : 'Côte d’Ivoire', 'XOF', 'FR'],
    ['ke', 'Kenya', 'KES', 'EN'], ['ae', fr ? 'Émirats' : 'UAE', 'AED', 'EN · AR'], ['sn', fr ? 'Sénégal' : 'Senegal', 'XOF', 'FR'],
    ['ma', fr ? 'Maroc' : 'Morocco', 'MAD', 'FR · AR'], ['gh', 'Ghana', 'GHS', 'EN'], ['za', fr ? 'Afrique du Sud' : 'South Africa', 'ZAR', 'EN'],
    ['fr', 'France', 'EUR', 'FR'], ['br', fr ? 'Brésil' : 'Brazil', 'BRL', 'PT'], ['us', fr ? 'États-Unis' : 'United States', 'USD', 'EN · ES'],
  ];
  return (
    <section ref={ref} id="coverage" className="lp2-coverage">
      <div className="lp2-coverage-cards" aria-hidden="true">
        {cards.map(([c, n, cur, l], i) => (
          <div key={c} className="lp2-country" style={COUNTRY_POS[i]}>
            <span className="flex items-center gap-2"><img src={FLAG(c)} alt="" width={26} height={26} loading="lazy" /><b>{n}</b></span>
            <span className="lp2-country-tags"><span>{cur}</span><span>{l}</span></span>
          </div>
        ))}
      </div>
      <div className="lp2-coverage-copy reveal">
        <p className="lp2-kicker">{fr ? 'Couverture' : 'Coverage'}</p>
        <h2 className="lp2-coverage-h"><span>{fr ? '195 pays.' : '195 countries.'}</span><span className="lp2-thin">{fr ? '50+ devises.' : '50+ currencies.'}</span></h2>
        <p className="lp2-coverage-p">{fr ? 'Créez votre espace depuis n’importe quel pays, facturez dans votre devise et travaillez dans votre langue. Les moyens de paiement dépendent des partenaires disponibles dans chaque pays.' : 'Open your workspace from any country, invoice in your currency and work in your language. Payment methods depend on the partners available in each country.'}</p>
      </div>
    </section>
  );
}

/* ─────────────── 4. Industries: fan of phones ─────────────── */

export function IndustriesFan({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollVar(ref as React.RefObject<HTMLElement>);
  const fr = lang === 'fr';
  const phones = [
    { k: fr ? 'Trading & finance' : 'Trading & finance', t: fr ? 'Dépôt reçu' : 'Deposit received', s: 'MT5 · 500 USD' },
    { k: fr ? 'Centre d’appels' : 'Call center', t: fr ? 'Lead attribué' : 'Lead assigned', s: fr ? 'à Awa · appel relayé' : 'to Awa · bridged call' },
    { k: fr ? 'E-commerce' : 'E-commerce', t: fr ? 'Commande payée' : 'Order paid', s: 'Zanldo · 45 000 FCFA' },
    { k: fr ? 'Clinique' : 'Clinic', t: fr ? 'Avis 5/5' : 'Review 5/5', s: fr ? 'après la consultation' : 'after the visit' },
    { k: fr ? 'Immobilier' : 'Real estate', t: fr ? 'Visite planifiée' : 'Viewing booked', s: fr ? 'demain, 10 h' : 'tomorrow, 10 am' },
  ];
  return (
    <div className="lp2-industries">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <p className="lp2-kicker reveal">{fr ? 'Secteurs' : 'Industries'}</p>
        <h2 className="lp2-ind-h reveal">{fr ? <>Pensé pour votre métier, <span className="lp2-thin">quel qu’il soit.</span></> : <>Built for your trade, <span className="lp2-thin">whatever it is.</span></>}</h2>
        <p className="reveal mt-4 max-w-2xl text-lg text-primary-100">{fr ? 'Choisissez votre secteur dans l’espace de travail : Atlas ajoute les bons champs à vos fiches, sans changer d’outil.' : 'Pick your industry in the workspace: Atlas adds the right fields to your records, without switching tools.'}</p>
      </div>
      <div ref={ref} className="lp2-fan" aria-hidden="true">
        {phones.map((p, i) => (
          <div key={p.k} className="lp2-phone" style={{ ['--i' as string]: i - 2 }}>
            <div className="lp2-phone-screen">
              <p className="lp2-phone-k">{p.k}</p>
              <div className="lp2-notif"><CheckCircle2 size={16} /><span><b>{p.t}</b><small>{p.s}</small></span></div>
            </div>
          </div>
        ))}
      </div>
      <ul className="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-2 px-6">
        {INDUSTRY_PRESETS.map((p) => <li key={p.id}><Link to="/auth" className="lp2-ind-chip">{fr ? p.fr : p.en}</Link></li>)}
      </ul>
    </div>
  );
}

/* ─────────────── 5. Giant outlined marquee ─────────────── */

export function GiantMarquee({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let x = 0, last = window.scrollY, boost = 0, raf = 0, visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }, { rootMargin: '100px' });
    io.observe(el);
    const rows = Array.from(el.querySelectorAll<HTMLElement>('.lp2-giant-row'));
    function tick() {
      raf = 0;
      if (!visible) return;
      const y = window.scrollY; boost = boost * 0.9 + Math.min(40, Math.abs(y - last)) * 0.12; last = y;
      x = (x + 0.06 + boost * 0.08) % 50;
      rows.forEach((r, i) => { r.style.transform = `translate3d(${i % 2 ? x - 50 : -x}%,0,0)`; });
      raf = requestAnimationFrame(tick);
    }
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const a = lang === 'fr' ? 'ATLAS CRM ✦ DÉVELOPPÉ PAR LIAFRIK TECH ✦ ' : 'ATLAS CRM ✦ DEVELOPED BY LIAFRIK TECH ✦ ';
  const b = lang === 'fr' ? 'CONÇU EN AFRIQUE ✦ PRÊT POUR LE MONDE ✦ ' : 'BUILT IN AFRICA ✦ READY FOR THE WORLD ✦ ';
  return (
    <div ref={ref} className="lp2-giant">
      <p className="sr-only">{lang === 'fr' ? 'Atlas CRM, développé par Liafrik Tech. Conçu en Afrique, prêt pour le monde.' : 'Atlas CRM, developed by Liafrik Tech. Built in Africa, ready for the world.'}</p>
      {[a, b].map((t, i) => (
        <div key={i} className={`lp2-giant-row ${i ? 'is-alt' : ''}`} aria-hidden="true"><span>{t.repeat(3)}</span><span>{t.repeat(3)}</span></div>
      ))}
    </div>
  );
}

/* ─────────────── 6. Flags marquee (195 countries, one image) ─────────────── */

export function FlagsMarquee({ lang }: { lang: Lang }) {
  return (
    <div className="lp2-flagsbar">
      <p className="sr-only">{lang === 'fr' ? 'Atlas est proposé dans 195 pays.' : 'Atlas is offered in 195 countries.'}</p>
      <div className="lp2-flagsbar-track" aria-hidden="true">
        <img src="/brand-flags/flags-strip.webp" alt="" width={7020} height={24} loading="lazy" decoding="async" />
        <img src="/brand-flags/flags-strip.webp" alt="" width={7020} height={24} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}

/* ─────────────── 7. Footer ─────────────── */

function TikTokIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
}

export function GlobalFooter({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const wordRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = wordRef.current;
    if (!el || reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`); };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);
  const L = (p: string) => (fr ? p : `/en${p}`);
  const cols = [
    { h: fr ? 'Produit' : 'Product', links: [
      { l: fr ? 'Ventes & pipeline' : 'Sales & pipeline', to: L('/legal/sales-cloud') },
      { l: fr ? 'Service client' : 'Customer service', to: L('/legal/service-cloud') },
      { l: 'Atlas AI Workforce', to: L('/legal/agentforce') },
      { l: fr ? 'Tableaux de bord' : 'Dashboards', to: L('/legal/tableau') },
      { l: fr ? 'Démo en ligne' : 'Live demo', to: fr ? '/demo' : '/en/demo' },
    ] },
    { h: fr ? 'Secteurs' : 'Industries', links: [
      { l: fr ? 'Trading & finance' : 'Trading & finance', to: '#industries' },
      { l: fr ? 'Centres d’appels' : 'Call centers', to: '#industries' },
      { l: 'E-commerce', to: '#industries' },
      { l: fr ? 'Santé' : 'Health', to: '#industries' },
      { l: fr ? 'Immobilier' : 'Real estate', to: '#industries' },
    ] },
    { h: fr ? 'Ressources' : 'Resources', links: [
      { l: fr ? 'CRM en ligne' : 'Online CRM', to: fr ? '/crm-en-ligne' : '/en/online-crm' },
      { l: fr ? 'CRM pour l’Afrique' : 'CRM for Africa', to: fr ? '/crm-afrique' : '/en/crm-for-africa' },
      { l: fr ? 'CRM centre d’appels' : 'Call center CRM', to: fr ? '/crm-centre-appels' : '/en/call-center-crm' },
      { l: 'Documentation', to: L('/legal/docs') },
      { l: fr ? 'Tarifs' : 'Pricing', to: L('/legal/pricing') },
      { l: 'Blog', to: fr ? '/blog' : '/en/blog' },
    ] },
    { h: fr ? 'Entreprise' : 'Company', links: [
      { l: fr ? 'À propos' : 'About', to: L('/legal/about') },
      { l: fr ? 'Sécurité' : 'Security', to: L('/legal/security') },
      { l: 'Contact', to: L('/legal/contact') },
      { l: fr ? 'Carrières' : 'Careers', to: L('/legal/careers') },
      { l: fr ? 'Mentions légales' : 'Legal notice', to: L('/legal/legal-notice') },
    ] },
  ];
  const ring = fr ? 'ATLAS CRM • CONÇU EN AFRIQUE • PRÊT POUR LE MONDE • ' : 'ATLAS CRM • BUILT IN AFRICA • READY FOR THE WORLD • ';
  return (
    <footer className="lp2-footer">
      <div className="mx-auto max-w-7xl px-6 pt-16 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <p className="text-lg font-bold text-white">{fr ? 'Un projet, une équipe à équiper ? Parlons-en.' : 'A project, a team to equip? Let’s talk.'}</p>
            <p className="mt-2 text-primary-100">{fr ? 'Une vraie personne vous répond.' : 'A real person answers.'}</p>
            <a href="mailto:hello@liafrik.com" className="lp2-footer-mail">hello@liafrik.com <ArrowUpRight size={26} /></a>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={fr ? '/auth' : '/en/auth'} className="lp-cta inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-800 hover:bg-primary-50">{fr ? 'Essai gratuit 14 jours' : '14-day free trial'} <ArrowRight size={16} className="rtl:rotate-180" /></Link>
              <a href={fr ? '/demo' : '/en/demo'} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">{fr ? 'Ouvrir la démo' : 'Open the demo'}</a>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label={fr ? 'Pied de page' : 'Footer'}>
            {cols.map((c) => (
              <div key={c.h}>
                <p className="text-sm font-bold text-white">{c.h}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => <li key={l.l}>{l.to.startsWith('#') ? <a href={l.to} className="lp2-footer-link">{l.l}</a> : <Link to={l.to} className="lp2-footer-link">{l.l}</Link>}</li>)}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-white/15 pt-8"><div className="mx-auto max-w-3xl"><InstagramFeed lang={lang} /></div></div>

        <div className="mt-8 flex flex-col gap-6 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <a href="https://www.tiktok.com/@liyahgroup" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="lp2-footer-link"><TikTokIcon /></a>
            <a href="https://www.facebook.com/share/1LMAGqsy3n/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="lp2-footer-link"><Facebook size={18} /></a>
            <a href="https://www.instagram.com/liafrik_tech" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="lp2-footer-link"><Instagram size={18} /></a>
            <a href="https://www.linkedin.com/company/liafrik/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="lp2-footer-link"><Linkedin size={18} /></a>
            <a href="https://youtube.com/@liyah-n" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="lp2-footer-link"><Youtube size={18} /></a>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {[[fr ? 'Confidentialité' : 'Privacy', '/legal/privacy'], [fr ? 'Conditions' : 'Terms', '/legal/terms'], [fr ? 'Remboursement' : 'Refund policy', '/legal/refund'], ['Cookies', '/legal/cookies'], ['RGPD / GDPR', '/legal/gdpr']].map(([l, to]) => <Link key={to} to={L(to)} className="lp2-footer-link">{l}</Link>)}
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-6">
          <p className="text-xs text-primary-200">© {new Date().getFullYear()} Atlas CRM · {fr ? 'développé par' : 'built by'} <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">Liafrik Tech</a> · {fr ? 'Dubaï – Yaoundé' : 'Dubai – Yaoundé'}. {fr ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          <div className="lp2-ring" aria-hidden="true">
            <svg viewBox="0 0 120 120"><defs><path id="lp2-ring-path" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs><text><textPath href="#lp2-ring-path" textLength="286" lengthAdjust="spacing">{ring}</textPath></text></svg>
            <span className="lp2-ring-logo"><Logo size={34} /></span>
          </div>
        </div>
      </div>
      <p ref={wordRef} className="lp2-wordmark" aria-hidden="true">atlas</p>
    </footer>
  );
}
