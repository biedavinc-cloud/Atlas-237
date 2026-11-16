import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound, ShieldCheck, Lock, Globe2, Server, CheckCircle2, XCircle, Loader2, ExternalLink,
  Eye, EyeOff, Trash2, PlugZap, AlertTriangle, Copy, Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { resetPublicConfig } from '@/lib/platformConfig';
import { Loading } from '@/components/Loading';
import { paddleBuildValues } from '@/lib/paddle';

/** Browser-side values already in this build (Cloudflare VITE_* or code defaults). */
const BUILD_VALUES: Record<string, string | undefined> = {
  FLW_PUBLIC_KEY: import.meta.env.VITE_FLW_PUBLIC_KEY as string | undefined,
  PAYSTACK_PUBLIC_KEY: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined,
  ...paddleBuildValues(),
};
/** Set somewhere other than this dashboard: server env var or build value. */
const elsewhere = (key: string, env: Record<string, boolean>) => Boolean(env[key] || BUILD_VALUES[key]);

/**
 * /super-admin/keys — PSP, platform and OAuth keys, managed without
 * touching Cloudflare or Supabase secrets. Fields follow each provider's
 * own docs (linked on every card). Secrets go to Supabase Vault through
 * admin_platform_setting_set() and are never sent back to the browser:
 * once saved, only "set · …last 4" is shown. Test buttons call the
 * platform-keys edge function, which hits the provider's API.
 */

type Scope = 'public' | 'server' | 'secret';
type L = { fr: string; en: string };

interface Row {
  key: string; scope: Scope; pattern: string | null; allowed: string[] | null;
  is_set: boolean; value: string | null; hint: string | null; updated_at: string | null; updated_by_email: string | null;
}
interface FieldDef { key: string; label: L; help?: L; placeholder?: string }
interface Group {
  id: string; title: string; kind: 'psp' | 'platform' | 'oauth';
  what: L; where: L; doc: string; test?: string; webhook?: string; fields: FieldDef[];
}

const FN = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1`;

const GROUPS: Group[] = [
  {
    id: 'flutterwave', title: 'Flutterwave', kind: 'psp', test: 'flutterwave',
    what: { fr: 'Carte et virement, paiement des abonnements dans la fenêtre Flutterwave.', en: 'Card and bank transfer, subscription checkout in the Flutterwave window.' },
    where: { fr: 'Tableau de bord Flutterwave → Paramètres → API keys (clés v3). Basculez en mode Live pour les clés de production.', en: 'Flutterwave dashboard → Settings → API keys (v3 keys). Switch to Live mode for production keys.' },
    doc: 'https://developer.flutterwave.com/docs/authentication',
    fields: [
      { key: 'FLW_PUBLIC_KEY', label: { fr: 'Clé publique', en: 'Public key' }, placeholder: 'FLWPUBK-xxxxxxxx-X', help: { fr: 'Utilisée dans le navigateur pour ouvrir le paiement.', en: 'Used in the browser to open checkout.' } },
      { key: 'FLW_SECRET_KEY', label: { fr: 'Clé secrète', en: 'Secret key' }, placeholder: 'FLWSECK-xxxxxxxx-X', help: { fr: 'Vérifie chaque paiement côté serveur avant d’activer l’abonnement.', en: 'Verifies every payment server-side before activating the subscription.' } },
    ],
  },
  {
    id: 'paystack', title: 'Paystack', kind: 'psp', test: 'paystack',
    what: { fr: 'Carte, virement et mobile money (Nigeria, Ghana, Kenya, Afrique du Sud, Côte d’Ivoire).', en: 'Card, bank and mobile money (Nigeria, Ghana, Kenya, South Africa, Côte d’Ivoire).' },
    where: { fr: 'Paystack → Settings → API Keys & Webhooks. Les clés test et live sont séparées.', en: 'Paystack → Settings → API Keys & Webhooks. Test and live keys are separate.' },
    doc: 'https://paystack.com/docs/developer-tools/api-keys/',
    fields: [
      { key: 'PAYSTACK_PUBLIC_KEY', label: { fr: 'Clé publique', en: 'Public key' }, placeholder: 'pk_live_…' },
      { key: 'PAYSTACK_SECRET_KEY', label: { fr: 'Clé secrète', en: 'Secret key' }, placeholder: 'sk_live_…', help: { fr: 'Sert aussi à vérifier la signature x-paystack-signature des webhooks.', en: 'Also used to verify the x-paystack-signature on webhooks.' } },
    ],
  },
  {
    id: 'paddle', title: 'Paddle Billing', kind: 'psp', test: 'paddle',
    what: { fr: 'Carte, PayPal, Apple Pay dans le monde entier. Paddle est marchand officiel (TVA gérée).', en: 'Card, PayPal, Apple Pay worldwide. Paddle is merchant of record (handles VAT).' },
    where: { fr: 'Paddle → Developer tools → Authentication (clé API et jeton client), Catalog → Prices (un prix par plan, mensuel et annuel).', en: 'Paddle → Developer tools → Authentication (API key and client-side token), Catalog → Prices (one price per plan, monthly and yearly).' },
    doc: 'https://developer.paddle.com/api-reference/about/api-keys',
    fields: [
      { key: 'PADDLE_ENVIRONMENT', label: { fr: 'Environnement', en: 'Environment' }, help: { fr: 'Doit correspondre aux clés : sandbox ↔ pdl_sdbx_ / test_, production ↔ pdl_live_ / live_.', en: 'Must match the keys: sandbox ↔ pdl_sdbx_ / test_, production ↔ pdl_live_ / live_.' } },
      { key: 'PADDLE_CLIENT_TOKEN', label: { fr: 'Jeton côté client', en: 'Client-side token' }, placeholder: 'live_…' },
      { key: 'PADDLE_API_KEY', label: { fr: 'Clé API', en: 'API key' }, placeholder: 'pdl_live_apikey_…', help: { fr: 'Vérifie la transaction côté serveur. Permission « transaction.read » suffisante.', en: 'Verifies the transaction server-side. “transaction.read” permission is enough.' } },
      { key: 'PADDLE_PRICE_STARTER', label: { fr: 'Prix Starter mensuel', en: 'Starter monthly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_GROWTH', label: { fr: 'Prix Growth mensuel', en: 'Growth monthly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_PRO', label: { fr: 'Prix Pro mensuel', en: 'Pro monthly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_ENTERPRISE', label: { fr: 'Prix Enterprise mensuel', en: 'Enterprise monthly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_STARTER_ANNUAL', label: { fr: 'Prix Starter annuel', en: 'Starter yearly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_GROWTH_ANNUAL', label: { fr: 'Prix Growth annuel', en: 'Growth yearly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_PRO_ANNUAL', label: { fr: 'Prix Pro annuel', en: 'Pro yearly price' }, placeholder: 'pri_…' },
      { key: 'PADDLE_PRICE_ENTERPRISE_ANNUAL', label: { fr: 'Prix Enterprise annuel', en: 'Enterprise yearly price' }, placeholder: 'pri_…' },
    ],
  },
  {
    id: 'payunit', title: 'PayUnit', kind: 'psp', test: 'payunit', webhook: `${FN}/payunit-webhook`,
    what: { fr: 'Mobile money au Cameroun : MTN, Orange, Express Union, YUP.', en: 'Mobile money in Cameroon: MTN, Orange, Express Union, YUP.' },
    where: { fr: 'Tableau marchand PayUnit → paramètres utilisateur → API CREDENTIALS (utilisateur et mot de passe API), puis votre application → APPLICATION DETAIL (clé d’application sandbox ou live).', en: 'PayUnit merchant dashboard → user settings → API CREDENTIALS (API user and password), then your application → APPLICATION DETAIL (sandbox or live application key).' },
    doc: 'https://developer.payunit.net/getting-started',
    fields: [
      { key: 'PAYUNIT_MODE', label: { fr: 'Mode', en: 'Mode' }, help: { fr: 'test avec une clé sand_…, live avec une clé live_….', en: 'test with a sand_… key, live with a live_… key.' } },
      { key: 'PAYUNIT_API_USER', label: { fr: 'Utilisateur API', en: 'API user' } },
      { key: 'PAYUNIT_API_PASSWORD', label: { fr: 'Mot de passe API', en: 'API password' } },
      { key: 'PAYUNIT_API_KEY', label: { fr: 'Clé d’application (x-api-key)', en: 'Application key (x-api-key)' }, placeholder: 'live_…' },
    ],
  },
  {
    id: 'cinetpay', title: 'CinetPay', kind: 'psp', test: 'cinetpay', webhook: `${FN}/billing-webhook?provider=cinetpay`,
    what: { fr: 'Mobile money et carte en zone CFA (Orange, MTN, Moov, Wave).', en: 'Mobile money and card in the CFA zone (Orange, MTN, Moov, Wave).' },
    where: { fr: 'Back-office CinetPay → Intégrations : apikey et site_id.', en: 'CinetPay back-office → Integrations: apikey and site_id.' },
    doc: 'https://docs.cinetpay.com/api/1.0-en/checkout/initialisation',
    fields: [
      { key: 'CINETPAY_SITE_ID', label: { fr: 'Site ID', en: 'Site ID' } },
      { key: 'CINETPAY_API_KEY', label: { fr: 'Clé API (apikey)', en: 'API key (apikey)' } },
      { key: 'CINETPAY_CURRENCY', label: { fr: 'Devise encaissée', en: 'Settlement currency' }, help: { fr: 'Le prix USD est converti au taux du jour (multiple de 5 en XAF/XOF).', en: 'The USD price is converted at the live rate (multiple of 5 in XAF/XOF).' } },
    ],
  },
  {
    id: 'korapay', title: 'Korapay', kind: 'psp', test: 'korapay', webhook: `${FN}/billing-webhook?provider=korapay`,
    what: { fr: 'Carte, mobile money et virement en Afrique.', en: 'Card, mobile money and bank transfer across Africa.' },
    where: { fr: 'Korapay → Settings → API Configuration. Enregistrez aussi l’URL de webhook ci-dessous dans Korapay.', en: 'Korapay → Settings → API Configuration. Also register the webhook URL below in Korapay.' },
    doc: 'https://developers.korapay.com/docs/api-keys',
    fields: [
      { key: 'KORAPAY_SECRET_KEY', label: { fr: 'Clé secrète', en: 'Secret key' }, placeholder: 'sk_live_…', help: { fr: 'Sert aussi à vérifier la signature x-korapay-signature des webhooks.', en: 'Also used to verify the x-korapay-signature on webhooks.' } },
      { key: 'KORAPAY_CURRENCY', label: { fr: 'Devise encaissée', en: 'Settlement currency' } },
    ],
  },
  {
    id: 'resend', title: 'Resend (e-mails de la plateforme)', kind: 'platform', test: 'resend',
    what: { fr: 'Notifications de tickets envoyées au support. Le domaine d’envoi doit être vérifié dans Resend.', en: 'Ticket notifications sent to support. The sending domain must be verified in Resend.' },
    where: { fr: 'resend.com → API Keys → Create API key.', en: 'resend.com → API Keys → Create API key.' },
    doc: 'https://resend.com/docs/dashboard/api-keys/introduction',
    fields: [{ key: 'RESEND_API_KEY', label: { fr: 'Clé API', en: 'API key' }, placeholder: 're_…' }],
  },
  {
    id: 'gemini', title: 'Google Gemini (Ask Atlas gratuit)', kind: 'platform', test: 'gemini',
    what: { fr: 'Moteur d’IA offert à toutes les organisations qui n’ont pas branché leur propre clé.', en: 'AI engine offered to every organization that has not connected its own key.' },
    where: { fr: 'Google AI Studio → Get API key.', en: 'Google AI Studio → Get API key.' },
    doc: 'https://ai.google.dev/gemini-api/docs/api-key',
    fields: [{ key: 'GEMINI_API_KEY', label: { fr: 'Clé API', en: 'API key' }, placeholder: 'AIza…' }],
  },
  {
    id: 'tenants', title: 'Adresses entreprise (societe.liafrik.com)', kind: 'platform',
    what: { fr: 'Permet aux organisations Pro/Enterprise d’activer elles-mêmes leur adresse dédiée : Atlas ajoute le sous-domaine au projet Cloudflare Pages et crée l’enregistrement DNS.', en: 'Lets Pro/Enterprise organizations activate their own address: Atlas adds the subdomain to the Cloudflare Pages project and creates the DNS record.' },
    where: { fr: 'Cloudflare → My Profile → API Tokens → Create token avec « Cloudflare Pages: Edit » (compte) et « DNS: Edit » (zone liafrik.com). Account ID et Zone ID : page d’aperçu de la zone. Ajoutez aussi https://*.liafrik.com/** dans Supabase → Auth → URL Configuration.', en: 'Cloudflare → My Profile → API Tokens → Create token with "Cloudflare Pages: Edit" (account) and "DNS: Edit" (liafrik.com zone). Account ID and Zone ID: zone overview page. Also add https://*.liafrik.com/** in Supabase → Auth → URL Configuration.' },
    doc: 'https://developers.cloudflare.com/pages/configuration/custom-domains/',
    fields: [
      { key: 'TENANT_ROOT_DOMAIN', label: { fr: 'Domaine racine', en: 'Root domain' }, placeholder: 'liafrik.com' },
      { key: 'CLOUDFLARE_API_TOKEN', label: { fr: 'Jeton API Cloudflare', en: 'Cloudflare API token' } },
      { key: 'CLOUDFLARE_ACCOUNT_ID', label: { fr: 'Account ID', en: 'Account ID' } },
      { key: 'CLOUDFLARE_ZONE_ID', label: { fr: 'Zone ID', en: 'Zone ID' } },
      { key: 'CLOUDFLARE_PAGES_PROJECT', label: { fr: 'Projet Pages', en: 'Pages project' }, placeholder: 'atlas-237' },
    ],
  },
  {
    id: 'inbound', title: 'E-mails entrants des clients', kind: 'platform',
    what: { fr: 'Chaque organisation reçoit <adresse>@domaine : les e-mails de ses clients arrivent sur la bonne fiche et chez le bon agent.', en: 'Each organization gets <address>@domain: its customers’ e-mails land on the right record and with the right agent.' },
    where: { fr: 'Cloudflare → Email Routing sur le domaine choisi → règle catch-all « Send to a Worker » vers atlas-inbound-email (dossier cloudflare/email-worker du dépôt). Même secret ici et dans le Worker.', en: 'Cloudflare → Email Routing on the chosen domain → catch-all rule "Send to a Worker" to atlas-inbound-email (repo folder cloudflare/email-worker). Same secret here and in the Worker.' },
    doc: 'https://developers.cloudflare.com/email-routing/email-workers/',
    fields: [
      { key: 'INBOUND_EMAIL_DOMAIN', label: { fr: 'Domaine de réception', en: 'Receiving domain' }, placeholder: 'in.liafrik.com' },
      { key: 'INBOUND_EMAIL_SECRET', label: { fr: 'Secret partagé', en: 'Shared secret' } },
    ],
  },
  {
    id: 'origins', title: 'Domaines autorisés', kind: 'platform',
    what: { fr: 'Adresses vers lesquelles un paiement peut revenir, en plus de atlas.liafrik.com.', en: 'Addresses a checkout may return to, in addition to atlas.liafrik.com.' },
    where: { fr: 'Séparez par des virgules, ex. https://crm.mondomaine.com', en: 'Comma separated, e.g. https://crm.mydomain.com' },
    doc: 'https://atlas.liafrik.com',
    fields: [{ key: 'APP_ORIGINS', label: { fr: 'Origines supplémentaires', en: 'Extra origins' }, placeholder: 'https://…' }],
  },
  ...([
    ['GOOGLE', 'Google (Gmail, Agenda, Drive, Meet, Ads)', 'https://developers.google.com/identity/protocols/oauth2'],
    ['MICROSOFT', 'Microsoft (Outlook, Teams)', 'https://learn.microsoft.com/entra/identity-platform/quickstart-register-app'],
    ['SLACK', 'Slack', 'https://api.slack.com/authentication/oauth-v2'],
    ['ZOOM', 'Zoom', 'https://developers.zoom.us/docs/integrations/oauth/'],
    ['FACEBOOK', 'Meta (Messenger, Instagram, Ads)', 'https://developers.facebook.com/docs/facebook-login/'],
    ['LINKEDIN', 'LinkedIn Ads', 'https://learn.microsoft.com/linkedin/shared/authentication/authorization-code-flow'],
    ['QUICKBOOKS', 'QuickBooks', 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0'],
    ['XERO', 'Xero', 'https://developer.xero.com/documentation/guides/oauth2/auth-flow'],
    ['PAYPAL', 'PayPal', 'https://developer.paypal.com/api/rest/'],
    ['GOCARDLESS', 'GoCardless', 'https://developer.gocardless.com/getting-started/partners/building-an-authorisation-flow'],
    ['REVOLUT', 'Revolut Business', 'https://developer.revolut.com/docs/business/business-api'],
    ['INTERCOM', 'Intercom', 'https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/setting-up-oauth'],
    ['DROPBOX', 'Dropbox', 'https://developers.dropbox.com/oauth-guide'],
    ['DOCUSIGN', 'DocuSign', 'https://developers.docusign.com/platform/auth/authcode/'],
    ['NOTION', 'Notion', 'https://developers.notion.com/docs/authorization'],
    ['ASANA', 'Asana', 'https://developers.asana.com/docs/oauth'],
    ['TRELLO', 'Trello', 'https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/'],
  ] as const).map(([p, title, doc]): Group => ({
    id: p.toLowerCase(), title, kind: 'oauth', doc,
    what: { fr: 'Application OAuth utilisée quand un client connecte son propre compte.', en: 'OAuth app used when a customer connects their own account.' },
    where: { fr: `Console développeur ${title} → créez une application, URL de redirection : https://atlas.liafrik.com/auth/callback`, en: `${title} developer console → create an app, redirect URL: https://atlas.liafrik.com/auth/callback` },
    fields: [
      { key: `${p}_CLIENT_ID`, label: { fr: 'Client ID', en: 'Client ID' } },
      ...(p === 'TRELLO' ? [] : [{ key: `${p}_CLIENT_SECRET`, label: { fr: 'Client secret', en: 'Client secret' } }]),
    ],
  })),
];

const SCOPE_META: Record<Scope, { icon: typeof Lock; fr: string; en: string; cls: string }> = {
  secret: { icon: Lock, fr: 'Secrète · chiffrée', en: 'Secret · encrypted', cls: 'badge-error' },
  server: { icon: Server, fr: 'Serveur', en: 'Server', cls: 'badge-neutral' },
  public: { icon: Globe2, fr: 'Publique', en: 'Public', cls: 'badge-primary' },
};

type TestResult = { ok: boolean; mode?: 'test' | 'live'; detail: string };

export function PlatformKeysPage() {
  const { language } = useAuth();
  const fr = language === 'fr';
  const tr = (l: L) => (fr ? l.fr : l.en);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [env, setEnv] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'psp' | 'platform' | 'oauth'>('psp');
  const [tests, setTests] = useState<Record<string, TestResult | 'running'>>({});

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_platform_settings_list');
    if (err) { setError(getErrorMessage(err)); setLoading(false); return; }
    const map: Record<string, Row> = {};
    for (const r of (data || []) as Row[]) map[r.key] = r;
    setRows(map);
    setLoading(false);
    const keys = Object.keys(map);
    const { data: st } = await supabase.functions.invoke('platform-keys', { body: { action: 'status', keys } });
    if (st?.ok) setEnv(st.env || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function runTest(provider: string) {
    setTests((t) => ({ ...t, [provider]: 'running' }));
    const { data, error: err } = await supabase.functions.invoke('platform-keys', { body: { action: 'test', provider } });
    setTests((t) => ({ ...t, [provider]: err || !data?.ok ? { ok: false, detail: getErrorMessage(err) || data?.msg || 'Error' } : data.result }));
  }

  const groups = useMemo(() => GROUPS.filter((g) => g.kind === tab), [tab]);
  const pspReady = GROUPS.filter((g) => g.kind === 'psp').map((g) => ({ g, ready: g.fields.every((f) => !isRequired(f.key) || rows[f.key]?.is_set || elsewhere(f.key, env)) }));

  if (loading) return <Loading />;
  if (error) return <div className="card p-6 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden border-0 bg-gradient-to-r from-ink-950 to-ink-800 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{fr ? 'Clés de la plateforme' : 'Platform keys'}</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-300">
              {fr
                ? 'Moyens de paiement, e-mails, IA et applications OAuth. Les clés secrètes sont chiffrées dans Supabase Vault et ne sont plus jamais affichées après l’enregistrement. Une valeur saisie ici remplace la variable d’environnement du serveur.'
                : 'Payment methods, e-mail, AI and OAuth apps. Secret keys are encrypted in Supabase Vault and never shown again once saved. A value set here overrides the server environment variable.'}
            </p>
          </div>
          <KeyRound size={40} className="hidden flex-none text-primary-400 sm:block" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {pspReady.map(({ g, ready }) => (
            <span key={g.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? 'bg-success-500/15 text-success-200' : 'bg-white/10 text-ink-300'}`}>
              {ready ? <CheckCircle2 size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />}{g.title}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-ink-100 p-1 text-sm font-semibold sm:w-fit">
        {([['psp', fr ? 'Paiements' : 'Payments'], ['platform', fr ? 'Plateforme' : 'Platform'], ['oauth', fr ? 'Applications OAuth' : 'OAuth apps']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-md px-4 py-1.5 transition sm:flex-none ${tab === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'oauth' && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-[13px] text-warning-800 ring-1 ring-warning-200">
          <AlertTriangle size={16} className="mt-0.5 flex-none" />
          {fr
            ? 'Ces applications ne sont pas encore proposées dans la marketplace (Atlas ne liste que les apps qui ont une vraie action). Renseigner leurs identifiants prépare la connexion OAuth, sans les afficher aux clients.'
            : 'These apps are not offered in the marketplace yet (Atlas only lists apps with a real action). Filling in their credentials prepares the OAuth connection without showing them to customers.'}
        </p>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {groups.map((g) => (
          <GroupCard key={g.id} g={g} rows={rows} env={env} fr={fr} tr={tr} test={g.test ? tests[g.test] : undefined} onTest={g.test ? () => runTest(g.test!) : undefined} onSaved={load} />
        ))}
      </div>

      <p className="text-xs text-ink-400">
        {fr ? 'Chaque enregistrement et suppression est inscrit au ' : 'Every save and removal is written to the '}
        <Link to="/super-admin/audit" className="font-semibold text-primary-700 hover:underline">{fr ? 'journal d’audit' : 'audit log'}</Link>
        {fr ? ' (sans la valeur).' : ' (without the value).'}
      </p>
    </div>
  );
}

/** Keys a provider cannot work without (others are optional/defaulted). */
function isRequired(key: string) {
  return !/(_CURRENCY|_MODE|_ENVIRONMENT|_ANNUAL)$/.test(key);
}

function GroupCard({ g, rows, env, fr, tr, test, onTest, onSaved }: {
  g: Group; rows: Record<string, Row>; env: Record<string, boolean>; fr: boolean; tr: (l: L) => string;
  test?: TestResult | 'running'; onTest?: () => void; onSaved: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const configured = g.fields.filter((f) => isRequired(f.key)).every((f) => rows[f.key]?.is_set || elsewhere(f.key, env));
  return (
    <section className="card flex min-w-0 flex-col">
      <div className="card-header items-start">
        <div className="min-w-0 flex-1">
          <h2 className="card-title flex items-center gap-2">{g.title}
            {configured ? <span className="badge-success"><CheckCircle2 size={12} />{fr ? 'Configuré' : 'Configured'}</span> : <span className="badge-neutral">{fr ? 'À configurer' : 'Not set'}</span>}
          </h2>
          <p className="mt-1 text-[13px] text-ink-500">{tr(g.what)}</p>
        </div>
        <a href={g.doc} target="_blank" rel="noreferrer" className="btn-ghost btn-sm flex-none">{fr ? 'Doc' : 'Docs'} <ExternalLink size={12} /></a>
      </div>
      <div className="flex-1 space-y-4 p-5">
        <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs leading-5 text-ink-600"><span className="font-semibold text-ink-800">{fr ? 'Où les trouver : ' : 'Where to find them: '}</span>{tr(g.where)}</p>
        {g.fields.map((f) => rows[f.key] && <KeyField key={f.key} f={f} row={rows[f.key]} envSet={Boolean(env[f.key])} buildValue={BUILD_VALUES[f.key]} fr={fr} tr={tr} onSaved={onSaved} />)}
        {g.webhook && (
          <div>
            <p className="label">{fr ? 'URL de notification (webhook)' : 'Notification URL (webhook)'}</p>
            <div className="flex gap-2">
              <code className="input truncate bg-ink-50 font-mono text-xs">{g.webhook}</code>
              <button type="button" className="btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(g.webhook!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} aria-label="Copy">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
      {onTest && (
        <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 px-5 py-3">
          <button type="button" onClick={onTest} disabled={test === 'running'} className="btn-secondary btn-sm">
            {test === 'running' ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}{fr ? 'Tester la connexion' : 'Test connection'}
          </button>
          {test && test !== 'running' && (
            <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs font-medium ${test.ok ? 'text-success-700' : 'text-error-700'}`}>
              {test.ok ? <CheckCircle2 size={14} className="flex-none" /> : <XCircle size={14} className="flex-none" />}
              <span className="truncate">{test.detail}</span>
              {test.mode && <span className={test.mode === 'live' ? 'badge-success' : 'badge-warning'}>{test.mode === 'live' ? 'LIVE' : 'TEST'}</span>}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function KeyField({ f, row, envSet, buildValue, fr, tr, onSaved }: { f: FieldDef; row: Row; envSet: boolean; buildValue?: string; fr: boolean; tr: (l: L) => string; onSaved: () => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(!row.is_set);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setEditing(!row.is_set); setValue(row.allowed && row.value ? row.value : ''); }, [row.is_set, row.value, row.allowed]);

  const meta = SCOPE_META[row.scope];
  const formatOk = !value || !row.pattern || new RegExp(row.pattern).test(value.trim());

  async function save(v = value) {
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('admin_platform_setting_set', { p_key: row.key, p_value: v });
    setBusy(false);
    if (error) { setErr(getErrorMessage(error)); return; }
    if (row.scope === 'public') resetPublicConfig();
    setValue(''); onSaved();
  }
  async function clear() {
    if (!window.confirm(fr ? `Supprimer ${row.key} ?` : `Remove ${row.key}?`)) return;
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('admin_platform_setting_clear', { p_key: row.key });
    setBusy(false);
    if (error) { setErr(getErrorMessage(error)); return; }
    if (row.scope === 'public') resetPublicConfig();
    onSaved();
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={`k-${row.key}`} className="text-[13px] font-semibold text-ink-700">{tr(f.label)}</label>
        <span className={meta.cls}><meta.icon size={11} />{fr ? meta.fr : meta.en}</span>
        {!row.is_set && envSet && <span className="badge-neutral" title={row.key}>{fr ? 'Défini sur le serveur' : 'Set on the server'}</span>}
        {!row.is_set && !envSet && buildValue && <span className="badge-neutral" title={buildValue}>{fr ? 'Valeur actuelle du site' : 'Current site value'}</span>}
        <code className="ms-auto font-mono text-[10px] text-ink-400">{row.key}</code>
      </div>

      {row.allowed ? (
        <div className="flex min-w-0 gap-2">
          <select id={`k-${row.key}`} className="input" value={value} onChange={(e) => setValue(e.target.value)} disabled={busy}>
            <option value="">{fr ? '— par défaut —' : '— default —'}</option>
            {row.allowed.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {value && value !== row.value && <button className="btn-primary btn-sm" onClick={() => save()} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : (fr ? 'Enregistrer' : 'Save')}</button>}
          {row.is_set && !value && <button className="btn-ghost btn-sm" onClick={clear} disabled={busy}><Trash2 size={14} /></button>}
          {row.is_set && value === row.value && <button className="btn-ghost btn-sm" onClick={clear} disabled={busy} aria-label={fr ? 'Réinitialiser' : 'Reset'}><Trash2 size={14} /></button>}
        </div>
      ) : !editing ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="input flex min-w-0 items-center gap-2 bg-ink-50 font-mono text-xs text-ink-700">
            {row.scope === 'secret' ? <><ShieldCheck size={14} className="text-success-600" />{fr ? 'Enregistrée' : 'Saved'} · ••••{row.hint}</> : <span className="truncate">{row.value}</span>}
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setEditing(true)} disabled={busy}>{fr ? 'Remplacer' : 'Replace'}</button>
          <button className="btn-ghost btn-sm" onClick={clear} disabled={busy} aria-label={fr ? 'Supprimer' : 'Remove'}><Trash2 size={14} /></button>
        </div>
      ) : (
        <form className="flex min-w-0 gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim() && formatOk) save(value.trim()); }}>
          <div className="relative min-w-0 flex-1">
            <input
              id={`k-${row.key}`} className={`input font-mono text-xs ${row.scope === 'secret' ? 'pe-9' : ''} ${!formatOk ? 'border-error-400 focus:border-error-500 focus:ring-error-100' : ''}`}
              type={row.scope === 'secret' && !show ? 'password' : 'text'} autoComplete="off" spellCheck={false}
              placeholder={buildValue && row.scope === 'public' ? buildValue : f.placeholder} value={value} onChange={(e) => setValue(e.target.value)} disabled={busy}
            />
            {row.scope === 'secret' && (
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide' : 'Show'}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={busy || !value.trim() || !formatOk}>{busy ? <Loader2 size={14} className="animate-spin" /> : (fr ? 'Enregistrer' : 'Save')}</button>
          {row.is_set && <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditing(false); setValue(''); }}>{fr ? 'Annuler' : 'Cancel'}</button>}
        </form>
      )}

      {!formatOk && <p className="mt-1 text-xs text-error-700">{fr ? 'Ce format ne correspond pas à la doc du fournisseur. Vérifiez que vous avez copié la bonne clé.' : 'This format does not match the provider docs. Check you copied the right key.'}</p>}
      {f.help && <p className="mt-1 text-xs text-ink-500">{tr(f.help)}</p>}
      {row.is_set && row.updated_at && <p className="mt-1 text-[11px] text-ink-400">{fr ? 'Modifiée le ' : 'Updated '}{new Date(row.updated_at).toLocaleString(fr ? 'fr-FR' : 'en-GB')}{row.updated_by_email ? ` · ${row.updated_by_email}` : ''}</p>}
      {err && <p className="mt-1 text-xs text-error-700">{err}</p>}
    </div>
  );
}
