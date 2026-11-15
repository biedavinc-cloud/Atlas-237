import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ShieldCheck, FileText, Cookie, Mail, Users, Lock, BookOpen, Activity, Database, Heart, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useHreflangLinks } from '@/lib/useHreflang';

export type LegalPage = 'privacy' | 'terms' | 'cookies' | 'about' | 'security' | 'contact' | 'careers' | 'pricing' | 'docs' | 'status' | 'community' | 'blog' | 'gdpr' | 'refund' | 'legal-notice' | 'pledge' | 'sales-cloud' | 'service-cloud' | 'agentforce' | 'data-360' | 'tableau';

const PAGE_META: Record<LegalPage, { icon: typeof ShieldCheck; title: { en: string; fr: string }; updated: string }> = {
  privacy: { icon: ShieldCheck, title: { en: 'Privacy Policy', fr: 'Politique de Confidentialité' }, updated: '2026-08-08' },
  terms: { icon: FileText, title: { en: 'Terms of Service', fr: "Conditions d'Utilisation" }, updated: '2026-08-08' },
  cookies: { icon: Cookie, title: { en: 'Cookie Policy', fr: 'Politique des Cookies' }, updated: '2026-08-08' },
  about: { icon: Users, title: { en: 'About Atlas CRM', fr: 'À propos d\'Atlas CRM' }, updated: '2026-08-08' },
  security: { icon: Lock, title: { en: 'Security', fr: 'Sécurité' }, updated: '2026-08-08' },
  contact: { icon: Mail, title: { en: 'Contact Us', fr: 'Contactez-nous' }, updated: '2026-08-08' },
  careers: { icon: Users, title: { en: 'Careers', fr: 'Carrières' }, updated: '2026-08-08' },
  pricing: { icon: FileText, title: { en: 'Pricing', fr: 'Tarifs' }, updated: '2026-08-08' },
  docs: { icon: BookOpen, title: { en: 'Documentation', fr: 'Documentation' }, updated: '2026-08-08' },
  status: { icon: Activity, title: { en: 'System Status', fr: 'Statut du Système' }, updated: '2026-08-08' },
  community: { icon: Users, title: { en: 'Community', fr: 'Communauté' }, updated: '2026-08-08' },
  blog: { icon: BookOpen, title: { en: 'Blog', fr: 'Blog' }, updated: '2026-08-08' },
  gdpr: { icon: Database, title: { en: 'GDPR / RGPD Compliance', fr: 'Conformité RGPD' }, updated: '2026-08-08' },
  refund: { icon: RotateCcw, title: { en: 'Refund Policy', fr: 'Politique de Remboursement' }, updated: '2026-09-02' },
  'legal-notice': { icon: FileText, title: { en: 'Legal Notice', fr: 'Mentions Légales' }, updated: '2026-09-03' },
  pledge: { icon: Heart, title: { en: 'Pledge 1%', fr: 'Pledge 1%' }, updated: '2026-08-08' },
  'sales-cloud': { icon: Activity, title: { en: 'Atlas Sales', fr: 'Atlas Sales' }, updated: '2026-08-08' },
  'service-cloud': { icon: Activity, title: { en: 'Atlas Service', fr: 'Atlas Service' }, updated: '2026-08-08' },
  agentforce: { icon: Activity, title: { en: 'Atlas AI Workforce', fr: 'Atlas AI Workforce' }, updated: '2026-08-08' },
  'data-360': { icon: Database, title: { en: 'Atlas Data Hub', fr: 'Atlas Data Hub' }, updated: '2026-08-08' },
  tableau: { icon: BookOpen, title: { en: 'Atlas Dashboards', fr: 'Atlas Dashboards' }, updated: '2026-08-08' },
};


/** Live status: real requests to the backend from the visitor's browser (this page used to always say "operational"). */
function StatusLive({ fr }: { fr: boolean }) {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const [checks, setChecks] = useState<{ name: string; ok: boolean | null; ms?: number }[]>([
    { name: 'Auth', ok: null }, { name: 'API', ok: null }, { name: fr ? 'Application web' : 'Web app', ok: true },
  ]);
  useEffect(() => {
    if (!url || !key) { setChecks(c => c.map(x => (x.ok === null ? { ...x, ok: false } : x))); return; }
    const probe = async (name: string, path: string) => {
      const t0 = performance.now();
      try {
        const r = await fetch(`${url}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        return { name, ok: r.status < 500, ms: Math.round(performance.now() - t0) };
      } catch { return { name, ok: false, ms: Math.round(performance.now() - t0) }; }
    };
    Promise.all([probe('Auth', '/auth/v1/health'), probe('API', '/rest/v1/organizations?select=id&limit=1')])
      .then(([a, b]) => setChecks([a, b, { name: fr ? 'Application web' : 'Web app', ok: true }]));
  }, [url, key, fr]);
  const all = checks.every(c => c.ok === true);
  const pending = checks.some(c => c.ok === null);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${pending ? 'bg-ink-300 animate-pulse' : all ? 'bg-success-500' : 'bg-error-500'}`} />
        <span className={`font-semibold ${pending ? 'text-ink-600' : all ? 'text-success-700' : 'text-error-700'}`}>
          {pending ? (fr ? 'Vérification en cours…' : 'Checking…') : all ? (fr ? 'Tous les systèmes répondent' : 'All systems responding') : (fr ? 'Incident en cours sur au moins un service' : 'At least one service is having issues')}
        </span>
      </div>
      <ul>{checks.map(c => <li key={c.name}>{c.name} — {c.ok === null ? '…' : c.ok ? (fr ? 'Opérationnel' : 'Operational') : (fr ? 'Ne répond pas' : 'Not responding')}{c.ms ? ` (${c.ms} ms)` : ''}</li>)}</ul>
      <p className="mt-3 text-sm text-ink-500">{fr ? 'Ces vérifications sont faites en direct depuis votre navigateur à l’ouverture de la page.' : 'These checks run live from your browser when the page opens.'}</p>
    </>
  );
}

const PRODUCT_PAGES: Record<string, { fr: { intro: string; items: string[] }; en: { intro: string; items: string[] }; demo: string }> = {
  'sales-cloud': {
    fr: { intro: 'Tout le cycle de vente, de la première piste à la facture payée.', items: ['Pistes, contacts, entreprises et affaires reliés, avec une fiche complète par client', 'Pipeline visuel en glisser-déposer, valeur totale et pondérée par étape', 'Conversion d’une piste en contact, entreprise et affaire en un clic', 'Devis et factures avec lignes de produits, TVA et impression PDF', 'Import CSV/Excel et export CSV de chaque liste'] },
    en: { intro: 'The whole sales cycle, from first lead to paid invoice.', items: ['Linked leads, contacts, companies and deals, with a full page per customer', 'Drag-and-drop pipeline with total and weighted value per stage', 'One-click lead conversion into contact, company and deal', 'Quotes and invoices with line items, tax and PDF printing', 'CSV/Excel import and CSV export of every list'] },
    demo: '/app/pipelines',
  },
  'service-cloud': {
    fr: { intro: 'Le support client au même endroit que les ventes.', items: ['Tickets avec priorité, statut et rattachement au contact et à l’entreprise', 'Notification e-mail à l’équipe à chaque nouveau ticket (si Resend est configuré)', 'Base de connaissances lue par l’assistant Ask Atlas', 'Agent IA de support qui trie et suggère, avec validation humaine'] },
    en: { intro: 'Customer support in the same place as sales.', items: ['Tickets with priority, status and link to contact and company', 'Email notification to the team for each new ticket (when Resend is configured)', 'Knowledge base read by the Ask Atlas assistant', 'AI support agent that triages and suggests, with human approval'] },
    demo: '/app/support',
  },
  agentforce: {
    fr: { intro: 'Des employés IA qui préparent le travail et vous demandent votre accord.', items: ['Ask Atlas : questions en langage naturel sur vos propres chiffres', 'Choix du moteur : modèle de la plateforme, ou votre clé OpenAI, Anthropic ou Gemini', 'File d’approbation pour toute action sensible', 'Workflows programmés : tâches, notifications, WhatsApp, SMS, e-mail, Telegram, webhooks'] },
    en: { intro: 'AI employees that prepare the work and ask for your approval.', items: ['Ask Atlas: natural-language questions about your own numbers', 'Choice of engine: the platform model, or your own OpenAI, Anthropic or Gemini key', 'Approval queue for every sensitive action', 'Scheduled workflows: tasks, notifications, WhatsApp, SMS, email, Telegram, webhooks'] },
    demo: '/app/ask-atlas',
  },
  'data-360': {
    fr: { intro: 'Vos données entrent, sortent et circulent sans friction.', items: ['Import CSV/Excel avec correspondance des colonnes', 'Export CSV de toute liste filtrée', 'Webhooks signés HMAC-SHA256 sur les événements CRM', 'Clés API et applications personnalisées', 'Isolation stricte des données par organisation (Row-Level Security)'] },
    en: { intro: 'Your data comes in, goes out and flows without friction.', items: ['CSV/Excel import with column mapping', 'CSV export of any filtered list', 'HMAC-SHA256 signed webhooks on CRM events', 'API keys and custom apps', 'Strict per-organisation data isolation (Row-Level Security)'] },
    demo: '/app/api-webhooks',
  },
  tableau: {
    fr: { intro: 'Le pilotage en temps réel, sans tableur.', items: ['Centre de commande : chiffre d’affaires, affaires ouvertes, pistes, factures impayées', '« À traiter en priorité » : affaires en retard, tâches dépassées, tickets ouverts', 'Rapports et tableaux de bord personnalisés (plan Pro)', 'Insights IA sur les affaires à risque'] },
    en: { intro: 'Real-time steering, without spreadsheets.', items: ['Command center: revenue, open deals, leads, unpaid invoices', '“Needs your attention”: late deals, overdue tasks, open tickets', 'Reports and custom dashboards (Pro plan)', 'AI insights on deals at risk'] },
    demo: '/app/dashboards',
  },
};

function Content({ page, lang }: { page: LegalPage; lang: 'en' | 'fr' | 'es' | 'pt' | 'ar' }) {
  const fr = lang === 'fr';
  const h2 = (fr: string, en: string) => <h2 className="mt-8 text-xl font-bold text-ink-900">{fr ? fr : en}</h2>;

  switch (page) {
    case 'privacy':
      return (
        <>
          {h2(fr ? 'Introduction' : 'Introduction', '')}
          <p>{fr ? 'Atlas CRM (« nous », « notre ») respecte votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD et aux normes internationales.' : 'Atlas CRM ("we", "our") respects your privacy. This policy explains how we collect, use, and protect your personal data in compliance with GDPR and international standards.'}</p>
          {h2(fr ? 'Données collectées' : 'Data We Collect', '')}
          <ul><li>{fr ? 'Informations de compte (nom, e-mail, entreprise)' : 'Account information (name, email, company)'}</li><li>{fr ? 'Données d\'utilisation et journaux techniques' : 'Usage data and technical logs'}</li><li>{fr ? 'Cookies (voir Politique des Cookies)' : 'Cookies (see Cookie Policy)'}</li></ul>
          {h2(fr ? 'Vos droits (RGPD)' : 'Your Rights (GDPR)', '')}
          <ul><li>{fr ? 'Accès, rectification, effacement de vos données' : 'Access, rectification, erasure of your data'}</li><li>{fr ? 'Portabilité des données' : 'Data portability'}</li><li>{fr ? 'Opposition au traitement' : 'Right to object to processing'}</li><li>{fr ? 'Réclamation auprès de l\'autorité de protection' : 'Lodge a complaint with a supervisory authority'}</li></ul>
          <p>{fr ? 'Pour exercer vos droits : privacy@liafrik.com' : 'To exercise your rights: privacy@liafrik.com'}</p>
        </>
      );
    case 'terms':
      return (
        <>
          {h2(fr ? 'Acceptation des conditions' : 'Acceptance of Terms', '')}
          <p>{fr ? 'En utilisant Atlas CRM, vous acceptez les présentes conditions. Si vous n\'acceptez pas, n\'utilisez pas le service.' : 'By using Atlas CRM, you agree to these terms. If you do not agree, do not use the service.'}</p>
          {h2(fr ? 'Essai et abonnement' : 'Trial and Subscription', '')}
          <p>{fr ? 'Un essai gratuit de 14 jours est offert. Après l\'essai, un abonnement payant est requis (19 $, 49 $, 119 $ ou 219 $ par mois, ou dix fois ce montant par an). L\'accès est suspendu si le paiement n\'est pas effectué.' : 'A 14-day free trial is offered. After the trial, a paid subscription is required ($19, $49, $119 or $219 per month, or ten times that per year). Access is suspended if payment is not made.'}</p>
          {h2(fr ? 'Utilisation acceptable' : 'Acceptable Use', '')}
          <p>{fr ? 'Vous vous engagez à ne pas utiliser la plateforme à des fins illégales ou abusives.' : 'You agree not to use the platform for illegal or abusive purposes.'}</p>
          {h2(fr ? 'Limitation de responsabilité' : 'Limitation of Liability', '')}
          <p>{fr ? 'Atlas CRM n\'est pas responsable des dommages indirects résultant de l\'utilisation du service.' : 'Atlas CRM is not liable for indirect damages resulting from the use of the service.'}</p>
        </>
      );
    case 'cookies':
      return (
        <>
          {h2(fr ? 'Utilisation des cookies' : 'Cookie Usage', '')}
          <p>{fr ? 'Nous utilisons des cookies essentiels (authentification, sécurité) et analytiques (amélioration du service). Vous pouvez gérer vos préférences à tout moment.' : 'We use essential cookies (authentication, security) and analytics cookies (service improvement). You can manage your preferences at any time.'}</p>
          {h2(fr ? 'Gestion' : 'Management', '')}
          <p>{fr ? 'Vous pouvez désactiver les cookies dans votre navigateur, mais cela peut affecter les fonctionnalités.' : 'You can disable cookies in your browser, but this may affect functionality.'}</p>
        </>
      );
    case 'about':
      return (
        <>
          {h2(fr ? 'Notre mission' : 'Our Mission', '')}
          <p>{fr ? 'Atlas CRM est un CRM avec IA intégrée, développé par Liafrik Tech entre Dubaï et Yaoundé, pensé pour les entreprises d\'Afrique et du Moyen-Orient. Notre mission : réunir les ventes, le service client et l\'IA dans un seul outil, au prix d\'une entreprise et non par utilisateur.' : 'Atlas CRM is a CRM with built-in AI, built by Liafrik Tech between Dubai and Yaoundé for businesses in Africa and the Middle East. Our mission: bring sales, customer service and AI together in one tool, priced per company rather than per user.'}</p>
          {h2(fr ? 'Nos valeurs' : 'Our Values', '')}
          <ul><li>{fr ? 'Confiance et sécurité' : 'Trust and security'}</li><li>{fr ? 'Réussite client' : 'Customer success'}</li><li>{fr ? 'Innovation par l\'IA' : 'Innovation through AI'}</li><li>{fr ? 'Durabilité (Pledge 1%)' : 'Sustainability (Pledge 1%)'}</li></ul>
        </>
      );
    case 'security':
      return (
        <>
          {h2(fr ? 'Sécurité de la plateforme' : 'Platform Security', '')}
          <ul><li>{fr ? 'Chiffrement TLS 1.3 en transit, AES-256 au repos' : 'TLS 1.3 encryption in transit, AES-256 at rest'}</li><li>{fr ? 'Double authentification (TOTP), connexion Google, SSO/SAML sur les plans Pro et Enterprise (activation accompagnée)' : 'Two-factor authentication (TOTP), Google sign-in, SSO/SAML on Pro and Enterprise plans (assisted setup)'}</li><li>{fr ? 'Row-Level Security (RLS) sur toutes les données, isolation stricte par organisation' : 'Row-Level Security (RLS) on all data, strict per-organization isolation'}</li><li>{fr ? 'Audit logs complets et traçabilité' : 'Comprehensive audit logs and traceability'}</li><li>{fr ? 'Pratiques conformes au RGPD/GDPR' : 'GDPR-aligned practices'}</li></ul>
          <p className="mt-4 text-sm text-ink-500">{fr ? 'Une certification SOC 2 Type II n\'est pas encore obtenue ; elle fait partie de notre feuille de route sécurité.' : 'SOC 2 Type II certification has not yet been obtained; it is on our security roadmap.'}</p>
          {h2(fr ? 'Signaler une vulnérabilité' : 'Report a Vulnerability', '')}
          <p>{fr ? 'Contactez security@liafrik.com pour signaler une faille de sécurité.' : 'Contact security@liafrik.com to report a security vulnerability.'}</p>
        </>
      );
    case 'contact':
      return (
        <>
          {h2(fr ? 'Nous contacter' : 'Contact Us', '')}
          <ul><li>Email: hello@liafrik.com</li><li>{fr ? 'Ventes : sales@liafrik.com' : 'Sales: sales@liafrik.com'}</li><li>{fr ? 'Support : support@liafrik.com' : 'Support: support@liafrik.com'}</li><li>{fr ? 'Service client : cs@liafrik.com / help@liafrik.com' : 'Customer service: cs@liafrik.com / help@liafrik.com'}</li><li>{fr ? 'Sécurité : security@liafrik.com' : 'Security: security@liafrik.com'}</li></ul>
          <p>{fr ? 'Dubai · Afrique · Monde' : 'Dubai · Africa · Worldwide'}</p>
        </>
      );
    case 'careers':
      return (
        <>
          {h2(fr ? 'Rejoignez l\'équipe' : 'Join the Team', '')}
          <p>{fr ? 'Nous recrutons des talents passionnés par l\'IA, le CRM et l\'expérience client. Postes ouverts : Ingénieur Full-Stack, Designer UX/UI, Data Scientist, Customer Success Manager.' : 'We hire passionate talent in AI, CRM, and customer experience. Open roles: Full-Stack Engineer, UX/UI Designer, Data Scientist, Customer Success Manager.'}</p>
          <p>{fr ? 'Candidatures : careers@liafrik.com' : 'Applications: careers@liafrik.com'}</p>
        </>
      );
    case 'pricing':
      return (
        <>
          {h2(fr ? 'Nos tarifs' : 'Our Pricing', '')}
          <ul><li>Starter — $19/{fr ? 'mois' : 'mo'}</li><li>Growth — $49/{fr ? 'mois' : 'mo'}</li><li>Pro — $119/{fr ? 'mois' : 'mo'}</li><li>Enterprise — $219/{fr ? 'mois' : 'mo'}</li></ul>
          <p>{fr ? 'Essai gratuit de 14 jours. Sans carte bancaire. Paiement via Flutterwave, Paystack, PayUnit (Mobile Money) ou Paddle selon votre région.' : '14-day free trial. No credit card. Payment via Flutterwave, Paystack, PayUnit (Mobile Money), or Paddle, depending on your region.'}</p>
          <Link to="/auth" className="btn-primary btn-sm mt-4 inline-flex">{fr ? 'Commencer' : 'Get started'}</Link>
        </>
      );
    case 'docs':
      return (
        <>
          {h2(fr ? 'Documentation' : 'Documentation', '')}
          <p>{fr ? 'Atlas CRM est construit sur une architecture Postgres (Supabase) avec sécurité au niveau des lignes (RLS) : chaque organisation n\'a accès qu\'à ses propres données, isolées de celles des autres tenants.' : 'Atlas CRM runs on a Postgres (Supabase) architecture with row-level security (RLS): every organization can only ever access its own data, isolated from other tenants.'}</p>

          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Démarrage rapide' : 'Getting started'}</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{fr ? 'Créez votre compte (essai gratuit de 14 jours, aucune carte requise).' : 'Create your account (14-day free trial, no card required).'}</li>
            <li>{fr ? 'Depuis Paramètres → Intégrations, connectez les applications de votre marketplace (voir ci-dessous).' : 'From Settings → Integrations, connect the apps from your marketplace (see below).'}</li>
            <li>{fr ? 'Créez un flux dans IA → Workflows pour automatiser une action réelle (tâche, notification, webhook, message).' : 'Create a workflow under AI → Workflows to automate a real action (task, notification, webhook, message).'}</li>
            <li>{fr ? "Suivez la consommation de votre organisation dans Paramètres → Utilisation." : "Track your organization's usage under Settings → Usage."}</li>
          </ol>

          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Connecter une intégration' : 'Connecting an integration'}</h3>
          <p>{fr ? 'Depuis Paramètres → Intégrations, choisissez une application et connectez-la avec votre propre clé API (stockée chiffrée, par organisation) ou via OAuth pour les apps qui le proposent (Google, Microsoft, Meta, Slack, PayPal, Xero, Notion, etc.). Chaque carte affiche un lien "Docs" vers la documentation officielle du fournisseur.' : 'From Settings → Integrations, pick an app and connect it with your own API key (stored encrypted, per organization) or via OAuth for apps that support it (Google, Microsoft, Meta, Slack, PayPal, Xero, Notion, and more). Each card links out to the provider\'s official "Docs" for that integration.'}</p>
          <p>{fr ? 'Certaines intégrations sont directement actionnables par vos flux automatisés : Telegram, Twilio (SMS), WhatsApp, Mailchimp, HubSpot, Freshdesk, Shopify, WooCommerce, Mollie, CinetPay, Wave, Chapa, CamPay, et toute app personnalisée que vous enregistrez (appel REST authentifié vers votre propre URL). Les autres apps (Slack, Gmail, Notion, Zendesk...) nécessitent une authentification OAuth et stockent vos identifiants pour un usage à venir, mais ne sont pas encore actionnables depuis un flux.' : 'Some integrations can be triggered directly from your workflows: Telegram, Twilio (SMS), WhatsApp, Mailchimp, HubSpot, Freshdesk, Shopify, WooCommerce, Mollie, CinetPay, Wave, Chapa, CamPay, and any Custom App you register (an authenticated REST call to your own URL). Other apps (Slack, Gmail, Notion, Zendesk...) require OAuth and store your credentials for future use, but aren\'t yet callable from a workflow.'}</p>
          <p>{fr ? 'Vous n\'avez pas besoin de créer un flux pour un envoi ponctuel : une icône de message apparaît directement sur chaque ligne de Contacts et Leads (si WhatsApp ou Twilio est connecté), et une icône de paiement apparaît sur chaque facture (si un fournisseur de paiement compatible est connecté) pour créer un lien à la volée.' : 'You don\'t need to build a workflow for a one-off send: a message icon appears directly on each Contacts and Leads row (if WhatsApp or Twilio is connected), and a payment icon appears on each invoice (if a compatible payment gateway is connected) to generate a link on the spot.'}</p>

          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Workflows & actions' : 'Workflows & actions'}</h3>
          <p>{fr ? 'Un flux (IA → Workflows) exécute, dans l\'ordre, une ou plusieurs actions réelles quand vous cliquez sur "Exécuter" :' : 'A workflow (AI → Workflows) runs, in order, one or more real actions when you click "Run now":'}</p>
          <ul>
            <li><code>create_task</code> — {fr ? 'crée une tâche réelle dans votre CRM' : 'creates a real task in your CRM'}</li>
            <li><code>create_notification</code> — {fr ? 'crée une notification in-app' : 'creates an in-app notification'}</li>
            <li><code>trigger_webhook</code> — {fr ? 'déclenche vos webhooks abonnés à un événement donné' : "fires your webhooks subscribed to a given event"}</li>
            <li><code>send_telegram</code>, <code>send_sms</code>, <code>send_whatsapp</code>, <code>mailchimp_subscribe</code>, <code>hubspot_upsert_contact</code>, <code>freshdesk_create_ticket</code>, <code>shopify_create_customer</code>, <code>woocommerce_create_customer</code>, <code>mollie_create_payment</code>, <code>cinetpay_create_payment</code>, <code>wave_create_checkout</code>, <code>chapa_initialize</code>, <code>campay_collect</code>, <code>call_custom_app</code> — {fr ? 'appellent réellement l\'application connectée correspondante' : 'call the matching connected app for real'}</li>
          </ul>
          <p className="text-sm text-ink-500">{fr ? 'Seul le déclenchement manuel exécute un flux aujourd\'hui ; les déclencheurs planifiés ou par événement sont enregistrés mais pas encore automatisés.' : "Only the manual trigger runs a workflow today; scheduled or event-based triggers are stored but not yet automated."}</p>

          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Webhooks sortants' : 'Outgoing webhooks'}</h3>
          <p>{fr ? 'Configurez vos webhooks dans Paramètres → API & Webhooks, en choisissant les événements à recevoir : ' : 'Configure your webhooks under Settings → API & Webhooks, choosing which events to receive: '}<code>contact.created</code>, <code>contact.updated</code>, <code>contact.deleted</code>, <code>lead.created</code>, <code>lead.updated</code>, <code>lead.converted</code>, <code>deal.created</code>, <code>deal.updated</code>, <code>deal.won</code>, <code>deal.lost</code>, <code>invoice.created</code>, <code>invoice.paid</code>, <code>payment.received</code>, <code>activity.created</code>.</p>
          <p>{fr ? 'Chaque livraison POST un payload JSON de cette forme, avec une signature HMAC-SHA256 du corps de la requête dans l\'en-tête ' : 'Each delivery POSTs a JSON payload shaped like this, with an HMAC-SHA256 signature of the request body in the '}<code>X-Atlas-Signature</code>{fr ? ' (calculée avec votre secret de webhook — recalculez-la de votre côté pour vérifier l\'authenticité ; le secret lui-même ne transite jamais sur le réseau) :' : ' header (computed with your webhook secret — recompute it on your end to verify authenticity; the secret itself is never sent over the wire):'}</p>
          <pre className="overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs text-white"><code>{`{
  "event": "deal.won",
  "timestamp": "2026-09-02T10:15:00.000Z",
  "data": { "id": "...", "table": "deals", "status": "won", ... }
}`}</code></pre>
          <p>{fr ? 'Un test d\'envoi (ping signé) est disponible directement depuis la carte de webhook pour vérifier que votre endpoint répond correctement avant de l\'activer.' : "A signed test ping is available right from the webhook card, so you can verify your endpoint responds correctly before turning it on."}</p>

          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Accès aux données' : 'Data access'}</h3>
          <p>{fr ? 'L\'accès API est une fonctionnalité de plan (Growth et supérieur) qui autorise l\'usage programmatique de vos données CRM (contacts, deals, factures) via l\'infrastructure Supabase de votre organisation ; la consommation est visible dans Paramètres → Utilisation.' : 'API access is a plan feature (Growth and above) that enables programmatic use of your CRM data (contacts, deals, invoices) through your organization\'s Supabase infrastructure; consumption is visible under Settings → Usage.'}</p>
          <p>{fr ? 'Besoin d\'un accompagnement technique pour votre intégration ? Contactez-nous à support@liafrik.com.' : 'Need help with a custom integration? Reach us at support@liafrik.com.'}</p>
        </>
      );
    case 'status':
      return (
        <>
          {h2(fr ? 'Statut du système' : 'System Status', '')}
          <StatusLive fr={fr} />
        </>
      );
    case 'community':
      return (
        <>
          {h2(fr ? 'Communauté Atlas' : 'Atlas Community', '')}
          <p>{fr ? 'Rejoignez les utilisateurs Atlas CRM. Partagez vos best practices, posez vos questions et collaborez.' : 'Join fellow Atlas CRM users. Share best practices, ask questions, and collaborate.'}</p>
          <p className="mt-2 text-sm text-ink-500">{fr ? 'community@liafrik.com' : 'community@liafrik.com'}</p>
        </>
      );
    case 'blog':
      return (
        <>
          {h2(fr ? 'Blog Atlas CRM' : 'Atlas CRM Blog', '')}
          <p>{fr ? 'Actualités, tutoriels et insights sur le CRM agentique, l\'IA et la croissance commerciale.' : 'News, tutorials, and insights on agentic CRM, AI, and business growth.'}</p>
        </>
      );
    case 'gdpr':
      return (
        <>
          {h2(fr ? 'Conformité RGPD' : 'GDPR Compliance', '')}
          <p>{fr ? 'Atlas CRM est pleinement conforme au Règlement Général sur la Protection des Données (RGPD/GDPR).' : 'Atlas CRM is fully compliant with the General Data Protection Regulation (GDPR).'}</p>
          <ul><li>{fr ? 'Base légale du traitement' : 'Legal basis for processing'}</li><li>{fr ? 'Droits des personnes concernées' : 'Rights of data subjects'}</li><li>{fr ? 'Notification de violation (72h)' : 'Breach notification (72h)'}</li><li>{fr ? 'Transferts internationaux de données' : 'International data transfers'}</li><li>{fr ? 'DPO : dpo@liafrik.com' : 'DPO: dpo@liafrik.com'}</li></ul>
        </>
      );
    case 'refund':
      return (
        <>
          {h2(fr ? 'Politique de Remboursement' : 'Refund Policy', '')}
          <p>{fr ? "Atlas CRM propose un essai gratuit de 14 jours sur tous les plans, sans carte bancaire requise : vous pouvez tester la plateforme en conditions réelles avant tout engagement." : 'Atlas CRM offers a 14-day free trial on every plan, no card required — you can test the platform under real conditions before committing to anything.'}</p>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Abonnements mensuels et annuels' : 'Monthly and annual subscriptions'}</h3>
          <p>{fr ? "Les abonnements sont facturés à l'avance (mensuellement ou annuellement selon votre choix). Vous pouvez annuler à tout moment depuis Paramètres → Facturation ; l'annulation prend effet à la fin de la période déjà payée, et aucun remboursement au prorata n'est effectué pour la période en cours." : 'Subscriptions are billed in advance (monthly or annually, depending on your choice). You can cancel anytime from Settings → Billing; cancellation takes effect at the end of the period already paid for, and no prorated refund is issued for the current period.'}</p>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Erreurs de facturation et remboursements exceptionnels' : 'Billing errors and exceptional refunds'}</h3>
          <p>{fr ? "En cas de double prélèvement, d'erreur de facturation, ou si vous estimez avoir été facturé à tort, contactez-nous à support@liafrik.com dans les 14 jours suivant la transaction. Nous examinons chaque demande individuellement et, si elle est justifiée, procédons au remboursement sur le moyen de paiement d'origine, via le prestataire de paiement utilisé pour la transaction (Flutterwave, Paystack, PayUnit ou Paddle selon votre région)." : 'If you\'re double-charged, billed in error, or believe a charge was made incorrectly, contact us at support@liafrik.com within 14 days of the transaction. We review each request individually and, where justified, issue a refund to the original payment method through the payment provider used for that transaction (Flutterwave, Paystack, PayUnit, or Paddle, depending on your region).'}</p>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Délai de traitement' : 'Processing time'}</h3>
          <p>{fr ? "Une fois approuvé, un remboursement apparaît généralement sur votre relevé sous 5 à 10 jours ouvrés, selon votre banque ou opérateur de paiement mobile." : 'Once approved, a refund typically appears on your statement within 5 to 10 business days, depending on your bank or mobile money operator.'}</p>
        </>
      );
    case 'legal-notice':
      return (
        <>
          {h2(fr ? 'Mentions Légales' : 'Legal Notice', '')}
          <p>{fr ? "Le site et la plateforme Atlas CRM sont édités par Liafrik (SPC FZC), société immatriculée à Dubaï, Émirats Arabes Unis, sous le numéro de licence 4425201.01, avec des activités en Afrique et à l'international. Tous droits réservés." : 'The Atlas CRM site and platform are published by Liafrik (SPC FZC), a company registered in Dubai, United Arab Emirates, under license number 4425201.01, with operations across Africa and internationally. All rights reserved.'}</p>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Contact' : 'Contact'}</h3>
          <ul><li>Email: hello@liafrik.com</li><li>{fr ? 'Site : ' : 'Site: '}<a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">liafrik.com</a></li></ul>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Hébergement' : 'Hosting'}</h3>
          <p>{fr ? "Le site est hébergé par Cloudflare, Inc. La base de données et les fonctions serveur sont hébergées par Supabase." : 'The site is hosted by Cloudflare, Inc. The database and server functions are hosted by Supabase.'}</p>
          <h3 className="mt-6 text-lg font-bold text-ink-900">{fr ? 'Propriété intellectuelle' : 'Intellectual property'}</h3>
          <p>{fr ? "L'ensemble du contenu de ce site (textes, logos, marques, code) est la propriété de Liafrik, sauf mention contraire, et ne peut être reproduit sans autorisation écrite préalable." : 'All content on this site (text, logos, trademarks, code) is the property of Liafrik, unless otherwise stated, and may not be reproduced without prior written authorization.'}</p>
        </>
      );
    case 'pledge':
      return (
        <>
          {h2(fr ? 'Pledge 1%' : 'Pledge 1%', '')}
          <p>{fr ? 'Nous investissons 1% de notre équité, technologie et temps pour créer un changement durable dans nos communautés.' : 'We invest 1% of our equity, technology, and time to create lasting change in our communities.'}</p>
        </>
      );
    default: {
      const prod = PRODUCT_PAGES[page];
      const c = prod ? prod[fr ? 'fr' : 'en'] : null;
      return (
        <>
          {h2(fr ? 'Ce que vous obtenez' : 'What you get', '')}
          {c ? (
            <>
              <p>{c.intro}</p>
              <ul>{c.items.map(i => <li key={i}>{i}</li>)}</ul>
            </>
          ) : <p>{fr ? 'Découvrez ce module dans la démo.' : 'Explore this module in the demo.'}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={fr ? '/demo' : '/en/demo'} className="btn-secondary btn-sm">{fr ? 'Voir dans la démo' : 'See it in the demo'}</a>
            <Link to="/auth" className="btn-primary btn-sm">{fr ? 'Essayer gratuitement' : 'Try for free'}</Link>
          </div>
        </>
      );
    }
  }
}

export function LegalPage({ page }: { page: LegalPage }) {
  const { language } = useAuth();
  useHreflangLinks(`/legal/${page}`);
  const lang = language === 'fr' ? 'fr' : 'en';
  useScrollReveal();
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const meta = PAGE_META[page];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-white text-ink-900">
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-tight">Atlas CRM</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-ink-600 hover:text-primary-700">{lang === 'fr' ? '← Retour' : '← Back'}</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16 md:px-10">
        <div className="reveal flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Icon size={24} /></div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-950">{meta.title[lang]}</h1>
        </div>
        <p className="reveal mt-2 text-sm text-ink-400">{lang === 'fr' ? 'Dernière mise à jour' : 'Last updated'}: {meta.updated}</p>

        <div className="reveal mt-8 space-y-3 text-base leading-7 text-ink-700">
          <Content page={page} lang={language} />
        </div>

        <div className="reveal mt-12 rounded-2xl bg-primary-50 p-6 text-center">
          <p className="font-semibold text-ink-800">{lang === 'fr' ? 'Prêt à commencer ?' : 'Ready to get started?'}</p>
          <Link to="/auth" className="btn-primary mt-4 inline-flex">{lang === 'fr' ? 'Essai gratuit de 14 jours' : '14-day free trial'}</Link>
        </div>
      </div>

      <footer className="border-t border-ink-100 bg-ink-950 py-8 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Atlas CRM · {lang === 'fr' ? 'développé par Liafrik Tech · Dubaï – Yaoundé' : 'built by Liafrik Tech · Dubai – Yaoundé'}
      </footer>
    </div>
  );
}
