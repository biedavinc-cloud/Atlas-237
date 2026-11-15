import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, TrendingUp, Bot, BarChart3,
  CheckCircle2, X, ArrowRight, Cloud, Globe2, Zap,
  MessageSquare, Database, Workflow, PlayCircle, Building2, Globe,
  Facebook, Instagram, Linkedin, Youtube,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { POSTS, PRODUCT_LABEL } from '@/lib/blog/posts';
import { InstagramFeed } from '@/components/InstagramFeed';
import { useHreflangLinks } from '@/lib/useHreflang';

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="TikTok">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}
import { BrandLogo } from '@/components/BrandLogos';
import { VideoBackground } from '@/components/VideoBackground';
import { HERO_VIDEO_SOURCES, HERO_VIDEO_POSTER, FINAL_CTA_VIDEO_SOURCES, FINAL_CTA_VIDEO_POSTER } from '@/lib/media';
import { useAuth } from '@/context/AuthContext';
import { useScrollReveal } from '@/lib/useScrollReveal';

/**
 * Every id here must exist in AVAILABLE_APPS (src/pages/IntegrationPages.tsx)
 * and resolve to a real logo in src/components/BrandLogos.tsx — this section
 * shows actual marketplace apps, not placeholder art. Picked for visual
 * variety across categories (CRM, messaging, automation, payments, AI,
 * commerce) rather than showing all ~70.
 */
const INTEGRATION_LOGOS = [
  'slack', 'google_drive', 'whatsapp', 'notion', 'hubspot', 'shopify',
  'zapier', 'make', 'n8n', 'mailchimp', 'calendly', 'zoom',
  'microsoft_teams', 'twilio', 'asana', 'trello', 'docusign', 'dropbox',
  'telegram', 'xero', 'quickbooks', 'zendesk', 'intercom', 'freshdesk',
  'stripe', 'paypal', 'openai',
];

const cloudProducts = [
  { icon: MessageSquare, name: { fr: 'Atlas Connect', en: 'Atlas Connect' }, desc: { fr: 'WhatsApp, SMS, e-mail, Telegram et paiements Mobile Money branchés sur vos fiches clients.', en: 'WhatsApp, SMS, email, Telegram and mobile money payments wired into your customer records.' } },
  { icon: BarChart3, name: { fr: 'Atlas Dashboards', en: 'Atlas Dashboards' }, desc: { fr: 'Transformez l’analytique agentique en intelligence actionable.', en: 'Turn agentic analytics into actionable intelligence.' } },
  { icon: Bot, name: { fr: 'Atlas AI Workforce', en: 'Atlas AI Workforce' }, desc: { fr: 'Créez des expériences agentiques de confiance qui agissent avec intention.', en: 'Build trusted agentic experiences that act with intention.' } },
  { icon: Cloud, name: { fr: 'Atlas 360', en: 'Atlas 360' }, desc: { fr: 'Une fiche par client : affaires, devis, factures, tickets et historique au même endroit.', en: 'One page per customer: deals, quotes, invoices, tickets and history in one place.' } },
  { icon: Database, name: { fr: 'Atlas Data Hub', en: 'Atlas Data Hub' }, desc: { fr: 'Une fondation de données gouvernée, unifiée et fiable.', en: 'A governed, unified, and trusted data foundation.' } },
];

const industries = [
  { icon: Building2, name: { fr: 'Services financiers', en: 'Financial Services' }, desc: { fr: 'Connectez-vous proactivement aux clients pour des expériences IA à forte valeur.', en: 'Proactively connect with clients for high-value AI experiences.' } },
  { icon: TrendingUp, name: { fr: 'Retail', en: 'Retail' }, desc: { fr: 'Acquérez des clients rentables plus vite avec des données unifiées en temps réel.', en: 'Acquire profitable customers faster with unified real-time data.' } },
  { icon: ShieldCheck, name: { fr: 'Santé & Sciences de la vie', en: 'Health & Life Sciences' }, desc: { fr: 'Élevez vos équipes avec des agents IA pour des communautés plus saines.', en: 'Empower your teams with AI agents for healthier communities.' } },
  { icon: Building2, name: { fr: 'Construction & Immobilier', en: 'Construction & Real Estate' }, desc: { fr: 'Fluidifiez vos processus et atteignez l’excellence opérationnelle.', en: 'Streamline your processes and reach operational excellence.' } },
  { icon: Bot, name: { fr: 'Éducation', en: 'Education' }, desc: { fr: 'Boostez la productivité et le support étudiant 24/7 avec une IA dédiée.', en: 'Boost productivity and 24/7 student support with dedicated AI.' } },
  { icon: Workflow, name: { fr: 'Services pro', en: 'Professional Services' }, desc: { fr: 'Renforcez la confiance client, recrutez les bons talents et bâtissez la culture.', en: 'Strengthen client trust, hire the right talent, and build culture.' } },
  { icon: Cloud, name: { fr: 'Technologie', en: 'Technology' }, desc: { fr: 'Automatisez les workflows, unifiez les données et prospérez avec une IA fiable.', en: 'Automate workflows, unify data, and thrive with trusted AI.' } },
  { icon: Workflow, name: { fr: 'Industrie', en: 'Manufacturing' }, desc: { fr: 'Intégrez toutes vos données sur une chaîne de valeur unifiée.', en: 'Integrate all your data on a unified value chain.' } },
];

// Resource cards point to real blog articles (src/lib/blog/posts.ts).
const reports = POSTS.slice().sort((x, y) => y.date.localeCompare(x.date)).slice(0, 3).map((p) => ({
  slug: p.slug,
  tag: { fr: PRODUCT_LABEL[p.product], en: PRODUCT_LABEL[p.product] },
  title: { fr: p.fr.title, en: p.en.title },
  cta: { fr: 'Lire l’article', en: 'Read the article' },
}));

const plans = [
  { name: 'Starter', monthly: 19, annual: 190, tagline: { fr: 'Pour démarrer', en: 'To get started' }, desc: { fr: 'Ventes, service et marketing avec des agents pré-construits.', en: 'Sales, service and marketing with pre-built agents.' }, cta: { fr: 'Commencer', en: 'Get started' }, popular: false },
  { name: 'Growth', monthly: 49, annual: 490, tagline: { fr: 'Le plus populaire', en: 'Most popular' }, desc: { fr: 'Automatisation, campagnes et croissance commerciale.', en: 'Automation, campaigns and business growth.' }, cta: { fr: 'Choisir Growth', en: 'Choose Growth' }, popular: true },
  { name: 'Pro', monthly: 119, annual: 1190, tagline: { fr: 'Haute performance', en: 'High performance' }, desc: { fr: 'Analyses IA, support prioritaire et workflows avancés.', en: 'AI analytics, priority support and advanced workflows.' }, cta: { fr: 'Choisir Pro', en: 'Choose Pro' }, popular: false },
  { name: 'Enterprise', monthly: 219, annual: 2190, tagline: { fr: 'Le plus complet', en: 'Most complete' }, desc: { fr: 'Solution dédiée, API illimitée et accompagnement.', en: 'Dedicated solution, unlimited API and support.' }, cta: { fr: 'Choisir Enterprise', en: 'Choose Enterprise' }, popular: false },
];

type Row = { label: { fr: string; en: string }; values: (boolean | string)[] };

const faqs = [
  { q: 'Qu’est-ce qu’Atlas CRM ?', qEn: 'What is Atlas CRM?', a: 'Atlas CRM est la plateforme de gestion de la relation client de Liafrik Tech, propulsée par l’IA agentique. Elle réunit entreprises et clients via un ensemble unifié d’applications — alimentées par l’IA agentique et la donnée — qui aident chaque département (ventes, service, marketing, commerce, IT) à travailler comme un seul.', aEn: 'Atlas CRM is Liafrik Tech’s customer relationship management platform, powered by agentic AI. It brings together companies and customers through a unified suite of applications — powered by agentic AI and data — that helps every department (sales, service, marketing, commerce, IT) work as one.' },
  { q: 'Qu’est-ce qu’un CRM et pourquoi en ai-je besoin ?', qEn: 'What is a CRM and why do I need one?', a: 'Un CRM gère toutes les relations et interactions de votre entreprise avec ses clients. Il vous aide à organiser les contacts, automatiser les tâches (logs d’appels, relances) et analyser les données pour comprendre le comportement client — vous donnant une vue à 360° de chaque client.', aEn: 'A CRM manages all your company’s relationships and interactions with customers. It helps you organize contacts, automate tasks (call logs, follow-ups), and analyze data to understand customer behavior — giving you a 360° view of every customer.' },
  { q: 'Qu’est-ce que l’IA agentique et comment l’utilise Atlas CRM ?', qEn: 'What is agentic AI and how does Atlas CRM use it?', a: 'L’IA agentique désigne des systèmes d’IA capables d’agir de manière autonome pour atteindre un objectif. Dans Atlas CRM (via Atlas AI Workforce), elle automatise des workflows complexes (qualification de leads, résolution de tickets), prédit les résultats et personnalise chaque interaction client.', aEn: 'Agentic AI refers to AI systems capable of acting autonomously to achieve a goal. In Atlas CRM (via Atlas AI Workforce), it automates complex workflows (lead qualification, ticket resolution), predicts outcomes, and personalizes every customer interaction.' },
  { q: 'Comment Atlas CRM aide-t-il ma PME à grandir ?', qEn: 'How does Atlas CRM help my SMB grow?', a: 'Atlas CRM propose des solutions adaptées à toutes les tailles. La plateforme flexible vous permet de démarrer avec l’essentiel (ventes, service, marketing) puis d’ajouter des fonctions à mesure que vous grandissez — vous ne payez que ce que vous utilisez.', aEn: 'Atlas CRM offers solutions for all sizes. The flexible platform lets you start with the essentials (sales, service, marketing) and add capabilities as you grow — you only pay for what you use.' },
];

function Check({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle2 size={18} className="mx-auto text-primary-600" />;
  if (value === false) return <X size={16} className="mx-auto text-ink-300" />;
  return <span className="text-sm font-semibold text-ink-900">{value}</span>;
}

export function LandingPage() {
  const { language, setLanguage } = useAuth();
  const navigate = useNavigate();
  useHreflangLinks('');
  const lang = language;
  // La page d'accueil n'a de copy qu'en fr/en ; on retombe sur 'en' pour les autres langues
  // pour éviter un contenu vide si le profil utilisateur est en es/pt/ar.
  const contentLang: 'fr' | 'en' = lang === 'fr' ? 'fr' : 'en';
  // Pricing is a flat amount per organization. Annual billing (2 months
  // free, i.e. annual = monthly x10) is real end to end for Flutterwave,
  // Paystack, and PayUnit — see src/lib/plans.ts PLAN_PRICES and each
  // PSP's verify function, which validates the actually-charged amount
  // against the right tier before activating anything. Paddle annual is
  // NOT live yet (needs 4 more Price IDs created in Paddle's dashboard —
  // see AGENTS.md); Paddle still works fine for monthly. If you touch
  // this toggle, keep it wired to something real — this replaced an
  // earlier version that showed a discounted annual price with zero
  // connection to what a customer was actually charged at checkout.
  useScrollReveal();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const price = (m: number | null) => (m === null ? (lang === 'fr' ? 'Sur devis' : 'Custom') : `$${m}/${billingCycle === 'annual' ? (lang === 'fr' ? 'an' : 'yr') : (lang === 'fr' ? 'mois' : 'mo')}`);

  const matrixGroups: { group: { fr: string; en: string }; rows: Row[] }[] = [
    {
      group: { fr: 'Ventes & CRM', en: 'Sales & CRM' },
      rows: [
        { label: { fr: 'Contacts illimités', en: 'Unlimited contacts' }, values: [true, true, true, true] },
        { label: { fr: 'Pipelines de ventes', en: 'Sales pipelines' }, values: [true, true, true, true] },
        { label: { fr: 'Devis & facturation', en: 'Quotes & invoicing' }, values: [false, true, true, true] },
        { label: { fr: 'Utilisateurs inclus', en: 'Included users' }, values: ['3', '10', '25', lang === 'fr' ? 'Illimité' : 'Unlimited'] },
      ],
    },
    {
      group: { fr: 'Automatisation & IA', en: 'Automation & AI' },
      rows: [
        { label: { fr: 'Agents IA pré-construits' , en: 'Pre-built AI agents' }, values: [true, true, true, true] },
        { label: { fr: 'Automations / workflows', en: 'Automations / workflows' }, values: [false, true, true, true] },
        { label: { fr: 'Accès API & Webhooks', en: 'API access & Webhooks' }, values: [false, true, true, true] },
        { label: { fr: 'Analyses prédictives', en: 'Predictive analytics' }, values: [false, false, true, true] },
        { label: { fr: 'Tableaux de bord personnalisés', en: 'Custom dashboards' }, values: [false, false, true, true] },
        { label: { fr: 'IA personnalisée', en: 'Custom AI training' }, values: [false, false, false, true] },
      ],
    },
    {
      group: { fr: 'Service & Support', en: 'Service & Support' },
      rows: [
        { label: { fr: 'Tickets clients', en: 'Customer tickets' }, values: [false, true, true, true] },
        { label: { fr: 'Base de connaissances', en: 'Knowledge base' }, values: [false, false, true, true] },
        { label: { fr: 'SLA & escalade', en: 'SLA & escalation' }, values: [false, false, true, true] },
      ],
    },
    {
      group: { fr: 'Sécurité & Administration', en: 'Security & Administration' },
      rows: [
        { label: { fr: 'Marque personnalisée', en: 'Custom branding' }, values: [false, true, true, true] },
        { label: { fr: 'Rôles & permissions personnalisés', en: 'Custom roles & permissions' }, values: [false, true, true, true] },
        { label: { fr: 'SSO / SAML', en: 'SSO / SAML' }, values: [false, false, true, true] },
        { label: { fr: 'Journal d\'audit', en: 'Audit log' }, values: [false, true, true, true] },
        { label: { fr: 'Support dédié', en: 'Dedicated support' }, values: ['Email', lang === 'fr' ? 'Prioritaire' : 'Priority', '24/7', lang === 'fr' ? 'Délégué' : 'Dedicated'] },
      ],
    },
  ];

  return (
    <div className="bg-white text-ink-900">
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 md:px-10">
          <Link to="/" className="flex items-center gap-2.5 animate-fade-in">
            <Logo size={36} />
            <span className="text-lg font-bold tracking-tight">Atlas CRM</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-600 lg:flex">
            <a href="#products" className="hover:text-primary-700 transition">{lang === 'fr' ? 'Produits' : 'Products'}</a>
            <a href="#pricing" className="hover:text-primary-700 transition">{lang === 'fr' ? 'Tarifs' : 'Pricing'}</a>
            <a href="#industries" className="hover:text-primary-700 transition">{lang === 'fr' ? 'Industries' : 'Industries'}</a>
            <a href="#faq" className="hover:text-primary-700 transition">FAQ</a>
            <Link to={lang === 'fr' ? '/blog' : '/en/blog'} className="hover:text-primary-700 transition">Blog</Link>
            <a href={lang === 'fr' ? '/demo' : '/en/demo'} className="hover:text-primary-700 transition">{lang === 'fr' ? 'Démo' : 'Demo'}</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { const next = lang === 'fr' ? 'en' : 'fr'; setLanguage(next); navigate(next === 'en' ? '/en' : '/'); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
              title={lang === 'fr' ? 'Switch to English' : 'Passer au français'}
            >
              <Globe size={16} />
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            <Link to="/auth" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 sm:inline-flex">
              {lang === 'fr' ? 'Se connecter' : 'Sign in'}
            </Link>
            <Link to="/auth" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
              {lang === 'fr' ? 'Essai gratuit' : 'Free trial'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ───────── Hero ───────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
          <VideoBackground
            sources={HERO_VIDEO_SOURCES}
            poster={HERO_VIDEO_POSTER}
            overlayClassName="bg-gradient-to-b from-white/92 via-white/90 to-white"
          />
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl animate-pulse-slow" />
          <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-accent-200/20 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-14 text-center md:px-10 lg:pt-28 lg:pb-16">
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-sm backdrop-blur-sm">
              <Zap size={13} className="text-primary-600" /> {lang === 'fr' ? 'Propulsé par l’IA agentique' : 'Powered by agentic AI'}
            </span>
            <h1 className="animate-fade-in-up mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl" style={{ animationDelay: '0.05s' }}>
              {lang === 'fr' ? <>Le CRM agentique conçu pour <span className="text-primary-600">l’Afrique et le Golfe</span></> : <>The agentic CRM built for <span className="text-primary-600">Africa and the Gulf</span></>}
            </h1>
            <p className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg leading-8 text-ink-600" style={{ animationDelay: '0.1s' }}>
              {lang === 'fr'
                ? 'Là où les personnes, les agents, les applications et les données se rejoignent sur une plateforme intégrée et fiable, qui travaille au cœur des systèmes qui font tourner votre entreprise.'
                : 'Where people, agents, apps, and data come together on a unified, trusted platform that works at the heart of the systems running your business.'}
            </p>
            <div className="animate-fade-in-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth" className="group inline-flex items-center gap-2 rounded-lg bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30">
                {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
              <a href={lang === 'fr' ? '/demo' : '/en/demo'} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-7 py-3.5 text-base font-semibold text-ink-800 transition hover:bg-ink-50 hover:border-ink-300">
                <PlayCircle size={18} /> {lang === 'fr' ? 'Essayer la démo' : 'Try the live demo'}
              </a>
            </div>
            <p className="mt-5 text-xs text-ink-500">{lang === 'fr' ? 'Rien à installer · Sans carte bancaire · 14 jours gratuits' : 'Nothing to install · No credit card · 14-day free trial'}</p>
          </div>
          <div className="reveal relative border-t border-ink-100/80 bg-white/60 py-8 backdrop-blur-sm">
            <div className="mx-auto max-w-5xl px-6 md:px-10">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
                {lang === 'fr' ? 'Prêt pour vos marchés dès le premier jour' : 'Ready for your markets from day one'}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  // Product facts only (verifiable in the app), no invented traction numbers.
                  { v: '195', l: { fr: 'Pays pris en charge', en: 'Countries supported' } },
                  { v: '50+', l: { fr: 'Devises, dont FCFA', en: 'Currencies, incl. CFA' } },
                  { v: '5', l: { fr: 'Langues, dont l’arabe', en: 'Languages, incl. Arabic' } },
                  { v: '14 j', l: { fr: 'D’essai, sans carte', en: 'Trial days, no card' } },
                ].map((stat) => (
                  <div key={stat.v} className="text-center">
                    <p className="text-2xl font-bold text-ink-950 sm:text-3xl">{stat.v}</p>
                    <p className="mt-1 text-xs text-ink-500">{stat.l[contentLang]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Agentic Enterprise / product cloud grid ───────── */}
        <section id="products" className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
          <div className="mx-auto max-w-2xl text-center reveal">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Bienvenue dans l’Entreprise Agentique' : 'Welcome to the Agentic Enterprise'}</h2>
            <p className="mt-3 text-lg text-ink-600">{lang === 'fr' ? 'Là où les humains, les agents et les plateformes conduisent ensemble la réussite client.' : 'Where humans, agents, and platforms drive customer success together.'}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cloudProducts.map((p) => (
              <div key={p.name[contentLang]} className="group reveal flex gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-600/5">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white">
                  <p.icon size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink-900">{p.name[contentLang]}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-600">{p.desc[contentLang]}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="reveal mx-auto mt-14 max-w-4xl rounded-2xl bg-primary-50 p-8 text-center md:p-12">
            <p className="text-lg leading-8 text-ink-700">
              {lang === 'fr'
                ? <>Les humains et les <Link to="/auth" className="font-semibold text-primary-700 underline-offset-2 hover:underline">agents</Link> travaillent au cœur des systèmes qui font tourner votre entreprise. Résultat : des décisions plus rapides, des relations client plus fortes et une croissance continue.</>
                : <>Humans and <Link to="/auth" className="font-semibold text-primary-700 underline-offset-2 hover:underline">agents</Link> work at the heart of the systems running your business. The result: faster decisions, stronger customer relationships, and continuous growth.</>}
            </p>
          </div>
        </section>

        {/* ───────── Proof you can check yourself (no invented testimonials) ───────── */}
        <section className="bg-ink-50 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <h2 className="reveal text-center text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Jugez sur pièces, pas sur promesses' : 'Judge for yourself, not by promises'}</h2>
            <p className="reveal mx-auto mt-4 max-w-2xl text-center text-ink-600">{lang === 'fr' ? 'Tout ce qui est écrit sur cette page se vérifie en quelques minutes dans la démo, sans compte.' : 'Everything on this page can be checked in a few minutes in the demo, without an account.'}</p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { h: lang === 'fr' ? 'Essayez avant de parler à qui que ce soit' : 'Try it before talking to anyone', d: lang === 'fr' ? 'La démo ouvre une entreprise fictive complète : pipeline, factures, tickets, agents IA. Rien à installer.' : 'The demo opens a complete fictional company: pipeline, invoices, tickets, AI agents. Nothing to install.', cta: lang === 'fr' ? 'Ouvrir la démo' : 'Open the demo', href: lang === 'fr' ? '/demo' : '/en/demo' },
                { h: lang === 'fr' ? 'Vos données restent les vôtres' : 'Your data stays yours', d: lang === 'fr' ? 'Import CSV / Excel à l’arrivée, export CSV de chaque liste à tout moment. Aucune donnée prise en otage.' : 'CSV / Excel import on the way in, CSV export of every list at any time. No data held hostage.', cta: lang === 'fr' ? 'Voir la sécurité' : 'See security', href: lang === 'fr' ? '/legal/security' : '/en/legal/security' },
                { h: lang === 'fr' ? 'Un prix clair, sans engagement' : 'Clear pricing, no lock-in', d: lang === 'fr' ? 'Un tarif fixe par entreprise, pas par utilisateur. 14 jours gratuits sans carte, paiement par carte ou Mobile Money.' : 'One flat price per company, not per user. 14 days free with no card, pay by card or mobile money.', cta: lang === 'fr' ? 'Voir les tarifs' : 'See pricing', href: '#matrix' },
              ].map((c) => (
                <div key={c.h} className="reveal flex flex-col rounded-2xl border border-ink-100 bg-white p-7 shadow-sm">
                  <h3 className="text-lg font-bold text-ink-900">{c.h}</h3>
                  <p className="mt-3 flex-1 text-base leading-7 text-ink-600">{c.d}</p>
                  <a href={c.href} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">{c.cta} <ArrowRight size={14} /></a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Built-in AI / Starter Suite ───────── */}
        <section id="pricing" className="relative overflow-hidden bg-primary-700 py-20 text-white lg:py-24">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-pulse-slow" />
          <div className="relative mx-auto max-w-7xl px-6 md:px-10">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="reveal">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{lang === 'fr' ? 'Une IA intégrée pour chaque partie de votre entreprise' : 'Built-in AI for every part of your business'}</h2>
                <p className="mt-4 text-lg leading-8 text-primary-100">
                  {lang === 'fr'
                    ? <>Mettez l’IA au travail sur les ventes, le service et le marketing avec <strong className="text-white">Starter Suite</strong> — un CRM qui connaît votre métier et automatise des expériences client dont vous serez fier. Démarrez simplement avec une configuration rapide et des agents pré-construits.</>
                    : <>Put AI to work across sales, service, and marketing with <strong className="text-white">Starter Suite</strong> — a CRM that knows your business and automates customer experiences you’ll be proud of. Get started fast with quick setup and pre-built agents.</>}
                </p>
                <p className="mt-4 text-sm text-primary-200"><em>{lang === 'fr' ? '19 $ USD/mois.' : '$19 USD/month.'}</em> <a href="#matrix" className="font-semibold text-white underline-offset-2 hover:underline">{lang === 'fr' ? 'Voir tous les tarifs' : 'See all pricing'}</a></p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link to="/auth" className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">
                    {lang === 'fr' ? 'Commencer gratuitement' : 'Start for free'} <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </Link>
                  <a href={lang === 'fr' ? '/demo' : '/en/demo'} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    <PlayCircle size={16} /> {lang === 'fr' ? 'Essayer la démo' : 'Try the live demo'}
                  </a>
                </div>
              </div>
              <div className="reveal rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
                <div className="grid gap-4">
                  {[
                    // What the product actually includes (see src/lib/workflows.ts, ai-assistant).
                    [lang === 'fr' ? 'Moteurs d’IA au choix' : 'AI engines to choose from', '4'],
                    [lang === 'fr' ? 'Actions de workflow prêtes à l’emploi' : 'Ready-made workflow actions', '18'],
                    [lang === 'fr' ? 'Validation humaine des actions sensibles' : 'Human approval for sensitive actions', lang === 'fr' ? 'Oui' : 'Yes'],
                    [lang === 'fr' ? 'Canaux : WhatsApp, SMS, email, Telegram' : 'Channels: WhatsApp, SMS, email, Telegram', '4'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between rounded-xl bg-white/10 px-5 py-4 transition hover:bg-white/20">
                      <span className="text-sm text-primary-100">{l}</span>
                      <span className="text-2xl font-bold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Integrations showcase ───────── */}
        <section id="integrations" className="mx-auto max-w-7xl px-6 py-20 text-center md:px-10 lg:py-24">
          <div className="reveal mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              {lang === 'fr' ? 'Connectez-vous à des centaines d’apps.' : 'Sync with hundreds of apps.'}
              <br />
              {lang === 'fr' ? 'Débloquez des possibilités illimitées.' : 'Unleash limitless possibilities.'}
            </h2>
            <p className="mt-5 text-lg text-ink-600">
              {lang === 'fr'
                ? 'Connectez Atlas à vos applications favorites pour ne plus perdre de temps à jongler entre elles. Choisissez dans notre marketplace ou construisez vos propres intégrations avec notre API ouverte.'
                : 'Connect Atlas to your favorite applications to save time switching between them. Select from our marketplace or build your own integrations with our open API.'}
            </p>
            <Link to="/auth" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
              {lang === 'fr' ? 'Voir toutes les intégrations' : 'See all integrations'} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="reveal mx-auto mt-14 grid max-w-5xl grid-cols-4 gap-4 sm:grid-cols-6 sm:gap-5 md:grid-cols-9">
            {INTEGRATION_LOGOS.map((provider, i) => (
              <div
                key={provider}
                className="flex aspect-square items-center justify-center rounded-2xl border border-ink-100 bg-white p-3 shadow-card animate-dance sm:p-4"
                style={{ animationDelay: `${(i % 9) * 0.18}s`, animationDuration: `${3.6 + (i % 5) * 0.35}s` }}
              >
                <BrandLogo provider={provider} size={32} />
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Platform / architecture ───────── */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Atlas CRM est la plateforme' : 'Atlas CRM is the platform'}</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-primary-600 sm:text-4xl">{lang === 'fr' ? 'pour l’Entreprise Agentique' : 'for the Agentic Enterprise'}</p>
            <p className="mt-5 text-lg text-ink-600">{lang === 'fr' ? 'Notre plateforme profondément unifiée réunit applications, données, agents et métadonnées pour la réussite client et employé. Avec la confiance et la gouvernance intégrées, votre IA et votre entreprise passent à l’échelle de façon sécurisée et fiable.' : 'Our deeply unified platform brings together apps, data, agents, and metadata for customer and employee success. With trust and governance built in, your AI and your business scale securely and reliably.'}</p>
            <Link to="/auth" className="group mt-7 inline-flex items-center gap-2 rounded-lg bg-ink-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800">
              {lang === 'fr' ? 'Voir tous les produits' : 'See all products'} <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          {/* Layered architecture diagram */}
          <div className="reveal mx-auto mt-14 max-w-3xl space-y-3">
            {[
              { label: lang === 'fr' ? 'Atlas AI Workforce' : 'Atlas AI Workforce', desc: lang === 'fr' ? 'IA agentique au-dessus de tout' : 'Agentic AI on top of everything', color: 'bg-primary-600 text-white' },
              { label: lang === 'fr' ? 'Produits (Ventes, Service, Marketing, Commerce)' : 'Products (Sales, Service, Marketing, Commerce)', desc: lang === 'fr' ? 'Bâtis sur la donnée et la confiance' : 'Built on data and trust', color: 'bg-primary-100 text-primary-800' },
              { label: lang === 'fr' ? 'Atlas Data Hub' : 'Atlas Data Hub', desc: lang === 'fr' ? 'Fondation de données gouvernée et unifiée' : 'Governed, unified data foundation', color: 'bg-primary-50 text-primary-800' },
              { label: lang === 'fr' ? 'Plateforme Atlas' : 'Atlas Platform', desc: lang === 'fr' ? 'Workflows, IA, sécurité & métadonnées' : 'Workflows, AI, security & metadata', color: 'bg-ink-100 text-ink-700' },
            ].map((layer) => (
              <div key={layer.label} className={`rounded-xl px-6 py-4 transition hover:scale-[1.02] ${layer.color}`}>
                <p className="font-bold">{layer.label}</p>
                <p className="text-sm opacity-80">{layer.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Industries ───────── */}
        <section id="industries" className="bg-ink-50 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="reveal mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Démarrez plus vite avec 16+ solutions, conçues pour votre industrie' : 'Start faster with 16+ solutions, designed for your industry'}</h2>
              <p className="mt-4 text-ink-600">{lang === 'fr' ? 'Conçues avec une expertise métier, ces solutions prêtes à l’emploi s’alignent sur vos workflows, données et besoins client.' : 'Built with industry expertise, these ready-to-use solutions align with your workflows, data, and customer needs.'}</p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {industries.map((ind) => (
                <div key={ind.name[contentLang]} className="group reveal rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white">
                    <ind.icon size={20} />
                  </div>
                  <h3 className="mt-4 font-bold text-ink-900">{ind.name[contentLang]}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-600">{ind.desc[contentLang]}</p>
                  <Link to="/auth" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">
                    {lang === 'fr' ? 'En savoir plus' : 'Learn more'} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
            <div className="reveal mt-10 text-center">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition hover:bg-ink-100">
                {lang === 'fr' ? 'Voir toutes les industries' : 'See all industries'} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ───────── Resources ───────── */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Découvrez Atlas CRM en profondeur' : 'Go deeper with Atlas CRM'}</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {reports.map((r) => (
              <div key={r.title[contentLang]} className="reveal flex flex-col rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition hover:shadow-lg">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 self-start">{r.tag[contentLang]}</span>
                <h3 className="mt-4 flex-1 text-lg font-bold leading-7 text-ink-900">{r.title[contentLang]}</h3>
                <Link to={`${contentLang === 'en' ? '/en' : ''}/blog/${r.slug}`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">{r.cta[contentLang]} <ArrowRight size={14} /></Link>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Pricing + comparison matrix ───────── */}
        <section className="bg-ink-50 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="reveal mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Une tarification claire et transparente' : 'Clear and transparent pricing'}</h2>
              <p className="mt-4 text-ink-600">{lang === 'fr' ? 'Choisissez le plan adapté à votre croissance.' : 'Choose the plan that fits your growth.'}</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${billingCycle === 'monthly' ? 'bg-primary-600 text-white' : 'text-ink-500 hover:text-ink-800'}`}
                >
                  {lang === 'fr' ? 'Mensuel' : 'Monthly'}
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${billingCycle === 'annual' ? 'bg-primary-600 text-white' : 'text-ink-500 hover:text-ink-800'}`}
                >
                  {lang === 'fr' ? 'Annuel' : 'Annual'}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${billingCycle === 'annual' ? 'bg-white text-primary-700' : 'bg-success-100 text-success-700'}`}>
                    {lang === 'fr' ? '2 mois offerts' : '2 months free'}
                  </span>
                </button>
              </div>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-4">
              {plans.map((plan) => (
                <div key={plan.name} className={`reveal relative flex flex-col rounded-2xl border p-7 transition ${plan.popular ? 'border-primary-600 bg-white shadow-2xl shadow-primary-600/10 lg:-translate-y-3' : 'border-ink-100 bg-white shadow-sm hover:shadow-lg hover:border-ink-200'}`}>
                  {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">{plan.tagline[contentLang]}</span>}
                  <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
                  {!plan.popular && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary-600">{plan.tagline[contentLang]}</p>}
                  <p className="mt-3 min-h-[2.5rem] text-sm leading-6 text-ink-600">{plan.desc[contentLang]}</p>
                  <div className="mt-5">
                    <p className="text-3xl font-bold text-ink-950">{price(billingCycle === 'annual' ? plan.annual : plan.monthly)}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {billingCycle === 'annual'
                        ? (lang === 'fr' ? `par organisation, facturation annuelle (soit $${(plan.annual / 12).toFixed(0)}/mois)` : `per organization, billed annually (≈ $${(plan.annual / 12).toFixed(0)}/mo)`)
                        : (lang === 'fr' ? 'par organisation, facturation mensuelle' : 'per organization, billed monthly')}
                    </p>
                  </div>
                  <Link to="/auth" className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${plan.popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-ink-950 text-white hover:bg-ink-800'}`}>{plan.cta[contentLang]} <ArrowRight size={14} /></Link>
                </div>
              ))}
            </div>

            {/* Comparison matrix */}
            <div id="matrix" className="reveal mt-16">
              <h3 className="text-center text-2xl font-bold text-ink-950">{lang === 'fr' ? 'Comparatif détaillé des forfaits' : 'Detailed plan comparison'}</h3>
              <div className="mt-8 overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-sm">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-ink-50">
                      <th className="sticky left-0 bg-ink-50 px-6 py-4 text-left font-semibold text-ink-700">{lang === 'fr' ? 'Fonctionnalité' : 'Feature'}</th>
                      {plans.map((p) => (
                        <th key={p.name} className={`px-6 py-4 text-center font-semibold ${p.popular ? 'text-primary-700' : 'text-ink-700'}`}>
                          {p.name}
                          {p.popular && <span className="block text-[10px] font-bold uppercase text-primary-500">{lang === 'fr' ? 'Populaire' : 'Popular'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixGroups.map((group) => (
                      <Fragment key={group.group[contentLang]}>
                        <tr className="bg-primary-50/50">
                          <td colSpan={5} className="px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-primary-700">{group.group[contentLang]}</td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={row.label[contentLang]} className="border-t border-ink-100 hover:bg-ink-50/50">
                            <td className="px-6 py-3.5 text-left text-ink-700">{row.label[contentLang]}</td>
                            {row.values.map((v, i) => (
                              <td key={i} className="px-6 py-3.5 text-center"><Check value={v} /></td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Values ───────── */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="reveal">
              <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Nous croyons que l’entreprise est la plus grande plateforme de changement' : 'We believe business is the greatest platform for change'}</h2>
              <p className="mt-4 text-ink-600">{lang === 'fr' ? 'Fondés sur la confiance, la réussite client, l’innovation, l’égalité et la durabilité, nous nous engageons à bien faire en affaires et à faire le bien dans le monde — en investissant 1% de notre équité, technologie et temps pour créer un changement durable.' : 'Founded on trust, customer success, innovation, equality, and sustainability, we are committed to doing well in business and doing good in the world — investing 1% of our equity, technology, and time to create lasting change.'}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/legal/about" className="group inline-flex items-center gap-2 rounded-lg bg-ink-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800">{lang === 'fr' ? 'Voir ce qui nous anime' : 'See what drives us'} <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
                <Link to="/legal/pledge" className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 transition hover:bg-ink-50">{lang === 'fr' ? "Prendre l'engagement" : 'Take the pledge'}</Link>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, t: lang === 'fr' ? 'Confiance' : 'Trust', d: lang === 'fr' ? 'Sécurité et gouvernance au cœur de tout.' : 'Security and governance at the core.' },
                { icon: TrendingUp, t: lang === 'fr' ? 'Réussite client' : 'Customer success', d: lang === 'fr' ? 'La croissance de nos clients drive la nôtre.' : 'Our customers’ growth drives ours.' },
                { icon: Zap, t: lang === 'fr' ? 'Innovation' : 'Innovation', d: lang === 'fr' ? 'L’IA agentique au service de tous.' : 'Agentic AI for everyone.' },
                { icon: Globe2, t: lang === 'fr' ? 'Durabilité' : 'Sustainability', d: lang === 'fr' ? 'Investir 1% pour un changement durable.' : 'Investing 1% for lasting change.' },
              ].map((v) => (
                <li key={v.t} className="reveal group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white"><v.icon size={18} /></div>
                  <p className="mt-3 font-bold text-ink-900">{v.t}</p>
                  <p className="mt-1 text-sm text-ink-500">{v.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── Final CTA ───────── */}
        <section className="bg-primary-700 py-20 text-white">
          <div className="reveal mx-auto max-w-3xl px-6 text-center md:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{lang === 'fr' ? 'Commencez dès aujourd’hui' : 'Get started today'}</h2>
            <p className="mt-4 text-lg text-primary-100">{lang === 'fr' ? 'Rien à installer. Sans carte bancaire. 14 jours gratuits.' : 'Nothing to install. No credit card. 14-day free trial.'}</p>
            <Link to="/auth" className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50">
              {lang === 'fr' ? 'Essayer gratuitement' : 'Try for free'} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* ───────── FAQ ───────── */}
        <section id="faq" className="mx-auto max-w-3xl px-6 py-20 md:px-10 lg:py-24">
          <div className="reveal text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">{lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="group reveal rounded-xl border border-ink-100 bg-white p-5 open:shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink-900">
                  {lang === 'fr' ? f.q : f.qEn}
                  <span className="text-primary-600 transition group-open:rotate-45"><ArrowRight size={18} /></span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-ink-600">{lang === 'fr' ? f.a : f.aEn}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ───────── Pre-footer hero (premium enterprise video) ───────── */}
        <section className="relative overflow-hidden py-24 text-white lg:py-32">
          <VideoBackground
            sources={FINAL_CTA_VIDEO_SOURCES}
            poster={FINAL_CTA_VIDEO_POSTER}
            overlayClassName="bg-gradient-to-br from-ink-950/92 via-primary-950/88 to-ink-950/95"
          />
          <div className="reveal relative mx-auto max-w-3xl px-6 text-center md:px-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
              <Building2 size={13} /> {lang === 'fr' ? 'Fait pour l’entreprise' : 'Built for the enterprise'}
            </span>
            <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {lang === 'fr' ? 'Votre entreprise mérite un CRM à la hauteur' : 'Your business deserves a CRM built to match it'}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
              {lang === 'fr'
                ? 'Rejoignez les équipes qui pilotent leur croissance avec Atlas — sécurité, fiabilité et performance de niveau entreprise.'
                : 'Join the teams running their growth on Atlas — enterprise-grade security, reliability, and performance.'}
            </p>
            <Link to="/auth" className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-ink-950 shadow-lg transition hover:bg-white/90">
              {lang === 'fr' ? 'Demander une démo' : 'Request a demo'} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-ink-100 bg-ink-950 text-ink-300">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <Logo size={36} />
                <span className="text-lg font-bold text-white">Atlas CRM</span>
              </Link>
              <p className="mt-4 text-sm leading-6 text-ink-400">{lang === 'fr' ? 'Le CRM agentique de Liafrik Tech. Ventes, service, marketing et IA réunis sur un seul cloud, pensé à Dubaï et Yaoundé.' : 'Liafrik Tech’s agentic CRM. Sales, service, marketing, and AI united on a single cloud — for Dubai, Africa, and the world.'}</p>
            </div>
            {[
              { h: lang === 'fr' ? 'Produit' : 'Product', links: [
                { l: lang === 'fr' ? 'Atlas Sales' : 'Atlas Sales', to: '/legal/sales-cloud' },
                { l: lang === 'fr' ? 'Atlas Service' : 'Atlas Service', to: '/legal/service-cloud' },
                { l: lang === 'fr' ? 'Atlas AI Workforce' : 'Atlas AI Workforce', to: '/legal/agentforce' },
                { l: lang === 'fr' ? 'Atlas Data Hub' : 'Atlas Data Hub', to: '/legal/data-360' },
                { l: lang === 'fr' ? 'Atlas Dashboards' : 'Atlas Dashboards', to: '/legal/tableau' },
              ] },
              { h: lang === 'fr' ? 'Ressources' : 'Resources', links: [
                { l: lang === 'fr' ? 'Tarifs' : 'Pricing', to: '/legal/pricing' },
                { l: lang === 'fr' ? 'Documentation' : 'Documentation', to: '/legal/docs' },
                { l: 'Statut', to: '/legal/status' },
                { l: lang === 'fr' ? 'Communauté' : 'Community', to: '/legal/community' },
                { l: 'Blog', to: lang === 'fr' ? '/blog' : '/en/blog' },
                { l: lang === 'fr' ? 'Démo en ligne' : 'Live demo', to: lang === 'fr' ? '/demo' : '/en/demo' },
              ] },
              { h: lang === 'fr' ? 'Entreprise' : 'Company', links: [
                { l: lang === 'fr' ? 'À propos' : 'About', to: '/legal/about' },
                { l: lang === 'fr' ? 'Sécurité' : 'Security', to: '/legal/security' },
                { l: lang === 'fr' ? 'Contact' : 'Contact', to: '/legal/contact' },
                { l: lang === 'fr' ? 'Carrières' : 'Careers', to: '/legal/careers' },
                { l: 'Pledge 1%', to: '/legal/pledge' },
              ] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-sm font-bold text-white">{col.h}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.l}><Link to={link.to} className="text-sm text-ink-400 transition hover:text-white">{link.l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-ink-800 pt-8">
            <div className="mx-auto max-w-3xl">
              <InstagramFeed lang={lang} />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-6 pt-0 sm:flex-row">
            <p className="text-xs text-ink-500">© {new Date().getFullYear()} Atlas CRM · {lang === 'fr' ? 'développé par' : 'built by'} <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Liafrik Tech</a> · {lang === 'fr' ? 'Dubaï – Yaoundé' : 'Dubai – Yaoundé'}. {lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
            <div className="flex items-center gap-4">
              <a href="https://www.tiktok.com/@liyahgroup" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-ink-500 transition hover:text-white"><TikTokIcon size={18} /></a>
              <a href="https://www.facebook.com/share/1LMAGqsy3n/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-ink-500 transition hover:text-white"><Facebook size={18} /></a>
              <a href="https://www.instagram.com/liafrik_tech" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-ink-500 transition hover:text-white"><Instagram size={18} /></a>
              <a href="https://www.linkedin.com/company/liafrik/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-ink-500 transition hover:text-white"><Linkedin size={18} /></a>
              <a href="https://youtube.com/@liyah-n" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-ink-500 transition hover:text-white"><Youtube size={18} /></a>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-xs text-ink-500">
              <Link to="/legal/privacy" className="hover:text-white transition">{lang === 'fr' ? 'Confidentialité' : 'Privacy'}</Link>
              <Link to="/legal/terms" className="hover:text-white transition">{lang === 'fr' ? 'Conditions' : 'Terms'}</Link>
              <Link to="/legal/refund" className="hover:text-white transition">{lang === 'fr' ? 'Remboursement' : 'Refund Policy'}</Link>
              <Link to="/legal/legal-notice" className="hover:text-white transition">{lang === 'fr' ? 'Mentions légales' : 'Legal Notice'}</Link>
              <Link to="/legal/cookies" className="hover:text-white transition">Cookies</Link>
              <Link to="/legal/gdpr" className="hover:text-white transition">RGPD / GDPR</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
