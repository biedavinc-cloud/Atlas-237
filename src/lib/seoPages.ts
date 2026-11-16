/**
 * Keyword landing pages ("CRM en ligne", "CRM Afrique", "CRM centre
 * d'appels"…). Each one is a real page with its own content, rendered by
 * SeoLandingPage and pre-rendered to static HTML at build time
 * (scripts/prerender.mjs) so search engines read it without running JS.
 * Every claim must match the product in this repository — no rankings,
 * no invented figures.
 */
export interface SeoPage {
  path: string;
  lang: 'fr' | 'en';
  alt: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: { h2: string; p: string; items?: string[] }[];
  faq: { q: string; a: string }[];
}

export const SITE_ORIGIN = 'https://atlas.liafrik.com';

export const SEO_PAGES: SeoPage[] = [
  {
    path: '/crm-en-ligne', lang: 'fr', alt: '/en/online-crm',
    title: 'CRM en ligne avec IA — Atlas CRM, essai gratuit 14 jours',
    description: 'Atlas est un CRM en ligne : contacts, pipeline, devis, factures, paiements Mobile Money et IA, dans le navigateur, sans installation. 14 jours gratuits, sans carte.',
    h1: 'Un CRM en ligne, prêt en cinq minutes',
    intro: 'Atlas CRM fonctionne entièrement dans le navigateur : rien à installer, vos données sont hébergées et sauvegardées, et votre équipe se connecte depuis un ordinateur ou un téléphone. Vous pouvez aussi l’installer comme une application.',
    sections: [
      { h2: 'Ce que fait le CRM en ligne Atlas', p: 'Tout ce qu’il faut pour vendre, servir et encaisser, au même endroit.', items: [
        'Contacts, entreprises, leads et affaires, avec import CSV ou Excel et export à tout moment',
        'Pipeline de ventes en glisser-déposer, devis et factures imprimables en PDF',
        'Liens de paiement Mobile Money, Paystack, Flutterwave ou Stripe depuis la facture',
        'WhatsApp, SMS et e-mail depuis la fiche client, avec l’historique sur la fiche',
        'Ask Atlas : posez une question, la réponse vient de vos propres chiffres',
        'Tickets support, tâches, workflows automatiques, tableaux de bord',
      ] },
      { h2: 'Vos données restent les vôtres', p: 'Chaque entreprise travaille dans son propre espace, cloisonné par la base de données elle-même. Les managers peuvent masquer les e-mails et téléphones des clients aux agents, qui continuent pourtant à les appeler et leur écrire depuis Atlas.' },
      { h2: 'Un prix fixe par entreprise', p: 'Starter 19 $, Growth 49 $, Pro 119 $, Enterprise 219 $ par mois et par entreprise, pas par utilisateur. 14 jours d’essai gratuit sans carte bancaire, puis paiement par carte ou Mobile Money.' },
    ],
    faq: [
      { q: 'Faut-il installer quelque chose ?', a: 'Non. Atlas s’utilise dans le navigateur. Sur Chrome, Edge ou Android, vous pouvez aussi l’installer comme une application (PWA).' },
      { q: 'Puis-je importer mes contacts existants ?', a: 'Oui, depuis un fichier CSV ou Excel. Vous pouvez aussi exporter vos données en CSV à tout moment.' },
      { q: 'Le CRM fonctionne-t-il sur téléphone ?', a: 'Oui, l’interface s’adapte au mobile et peut être ajoutée à l’écran d’accueil.' },
    ],
  },
  {
    path: '/en/online-crm', lang: 'en', alt: '/crm-en-ligne',
    title: 'Online CRM with AI — Atlas CRM, 14-day free trial',
    description: 'Atlas is an online CRM: contacts, pipeline, quotes, invoices, mobile money payments and AI, in the browser, nothing to install. 14 days free, no card.',
    h1: 'An online CRM, ready in five minutes',
    intro: 'Atlas CRM runs entirely in the browser: nothing to install, your data is hosted and backed up, and your team signs in from a computer or a phone. You can also install it as an app.',
    sections: [
      { h2: 'What the Atlas online CRM does', p: 'Everything you need to sell, serve and get paid, in one place.', items: [
        'Contacts, companies, leads and deals, with CSV or Excel import and export at any time',
        'Drag-and-drop sales pipeline, printable PDF quotes and invoices',
        'Mobile money, Paystack, Flutterwave or Stripe payment links from the invoice',
        'WhatsApp, SMS and e-mail from the customer record, with the history on the record',
        'Ask Atlas: ask a question, the answer comes from your own numbers',
        'Support tickets, tasks, automated workflows, dashboards',
      ] },
      { h2: 'Your data stays yours', p: 'Each company works in its own workspace, isolated by the database itself. Managers can hide customer e-mails and phone numbers from agents, who can still call and message them from Atlas.' },
      { h2: 'One flat price per company', p: 'Starter $19, Growth $49, Pro $119, Enterprise $219 a month per company, not per user. 14-day free trial with no card, then card or mobile money.' },
    ],
    faq: [
      { q: 'Do I need to install anything?', a: 'No. Atlas runs in the browser. In Chrome, Edge or on Android you can also install it as an app (PWA).' },
      { q: 'Can I import my existing contacts?', a: 'Yes, from a CSV or Excel file. You can also export your data to CSV at any time.' },
      { q: 'Does it work on a phone?', a: 'Yes, the interface adapts to mobile and can be added to the home screen.' },
    ],
  },
  {
    path: '/crm-afrique', lang: 'fr', alt: '/en/crm-for-africa',
    title: 'CRM pour l’Afrique : FCFA, Mobile Money, WhatsApp — Atlas CRM',
    description: 'Atlas, CRM conçu en Afrique par Liafrik Tech : factures en FCFA, naira ou shilling, liens de paiement Mobile Money, WhatsApp et SMS depuis la fiche client. Essai gratuit.',
    h1: 'Le CRM conçu en Afrique, prêt pour le monde',
    intro: 'Atlas est développé par Liafrik Tech, entre Dubaï et Yaoundé. Il part des réalités du terrain : clients joignables sur WhatsApp, paiements en Mobile Money, plusieurs devises et plusieurs langues dans la même équipe.',
    sections: [
      { h2: 'Pensé pour la façon dont on vend en Afrique', p: 'Les outils dont vos équipes se servent déjà, branchés sur la fiche client.', items: [
        'Devis et factures en XAF, XOF, NGN, KES, GHS, ZAR, MAD et plus de 50 devises',
        'Liens de paiement Mobile Money (CinetPay, CamPay, Wave), Paystack et Flutterwave',
        'WhatsApp, SMS et e-mail en un clic depuis le contact',
        'Interface en français, anglais, espagnol, portugais et arabe',
        'Inscription depuis 195 pays, avec la devise et le fuseau horaire proposés',
      ] },
      { h2: 'Pour les centres d’appels, la finance et le commerce', p: 'Coordonnées clients masquées aux agents, portefeuilles par agent, distribution des leads, écoute des appels enregistrés, activité en direct des plateformes de trading ou des boutiques en ligne comme Zanldo.' },
      { h2: 'Sans engagement', p: '14 jours gratuits sans carte bancaire, puis un prix fixe par entreprise payable par carte ou Mobile Money.' },
    ],
    faq: [
      { q: 'Puis-je facturer en FCFA ?', a: 'Oui. La devise de votre entreprise est choisie à l’inscription, et les montants sont affichés sans décimales pour les francs CFA.' },
      { q: 'Quels moyens de paiement mes clients peuvent-ils utiliser ?', a: 'Ceux de vos comptes connectés : Mobile Money via CinetPay, CamPay ou Wave, cartes et virements via Paystack, Flutterwave ou Stripe, selon les pays couverts par chaque partenaire.' },
      { q: 'Qui développe Atlas ?', a: 'Liafrik Tech (Liafrik SPC FZC), avec des équipes à Dubaï et à Yaoundé.' },
    ],
  },
  {
    path: '/en/crm-for-africa', lang: 'en', alt: '/crm-afrique',
    title: 'CRM for Africa: mobile money, WhatsApp, local currencies — Atlas CRM',
    description: 'Atlas, the CRM built in Africa by Liafrik Tech: invoices in CFA francs, naira or shillings, mobile money payment links, WhatsApp and SMS from the customer record. Free trial.',
    h1: 'The CRM built in Africa, ready for the world',
    intro: 'Atlas is developed by Liafrik Tech, between Dubai and Yaoundé. It starts from how business really works on the ground: customers reachable on WhatsApp, mobile money payments, several currencies and languages in one team.',
    sections: [
      { h2: 'Built for how business sells in Africa', p: 'The tools your teams already use, wired into the customer record.', items: [
        'Quotes and invoices in XAF, XOF, NGN, KES, GHS, ZAR, MAD and 50+ currencies',
        'Mobile money (CinetPay, CamPay, Wave), Paystack and Flutterwave payment links',
        'WhatsApp, SMS and e-mail in one click from the contact',
        'Interface in French, English, Spanish, Portuguese and Arabic',
        'Sign-up from 195 countries, with currency and time zone suggested',
      ] },
      { h2: 'For call centers, finance and commerce', p: 'Customer details hidden from agents, per-agent portfolios, lead distribution, recorded calls to listen to, live activity from trading platforms or online stores such as Zanldo.' },
      { h2: 'No lock-in', p: '14 days free with no card, then one flat price per company, payable by card or mobile money.' },
    ],
    faq: [
      { q: 'Can I invoice in CFA francs?', a: 'Yes. Your company currency is picked at sign-up, and CFA franc amounts are shown without decimals.' },
      { q: 'Which payment methods can my customers use?', a: 'Those of your connected accounts: mobile money via CinetPay, CamPay or Wave, cards and transfers via Paystack, Flutterwave or Stripe, depending on the countries each partner covers.' },
      { q: 'Who builds Atlas?', a: 'Liafrik Tech (Liafrik SPC FZC), with teams in Dubai and Yaoundé.' },
    ],
  },
  {
    path: '/crm-centre-appels', lang: 'fr', alt: '/en/call-center-crm',
    title: 'CRM pour centre d’appels : contacts masqués, portefeuilles, écoute — Atlas',
    description: 'CRM pour centres d’appels et courtiers : masquez e-mails et téléphones aux agents, portefeuilles par agent, distribution des leads, appels relayés et enregistrés, performance.',
    h1: 'Le CRM des centres d’appels qui protège vos fichiers clients',
    intro: 'Vos agents appellent, écrivent et relancent depuis Atlas sans jamais voir le numéro ni l’e-mail du client, si vous le décidez. Chaque agent ne voit que son portefeuille ; son manager, le QC et le CRM manager voient tout.',
    sections: [
      { h2: 'Ce qui est inclus (plans Pro et Enterprise)', p: 'Des règles appliquées par la base de données, pas seulement cachées à l’écran.', items: [
        'Masquage des e-mails et téléphones selon le rôle (agent, QC, manager…)',
        'Portefeuilles : un agent ne voit que ses contacts, leads, affaires et e-mails',
        'Distribution des leads à la main, à tour de rôle ou par import de fichier',
        'Appels relayés avec Twilio (numéro jamais affiché) ou lancés dans Aircall, enregistrements sur la fiche',
        'Écoute des appels et performance par agent : leads reçus, convertis, appels, temps d’appel',
        'E-mails des clients reçus directement chez l’agent qui suit le client',
      ] },
      { h2: 'Pour le courtage et le trading', p: 'Branchez votre back-office ou votre pont MT4/MT5/cTrader sur Atlas : dépôts, retraits et ordres de vos clients s’affichent en direct sur leur fiche.' },
    ],
    faq: [
      { q: 'Un agent peut-il contourner le masquage en exportant ?', a: 'Non. L’export CSV lit les mêmes données masquées que l’écran ; seul le serveur utilise le vrai numéro pour appeler ou écrire. Les clés API, elles, sont créées par les administrateurs.' },
      { q: 'Peut-on écouter les appels ?', a: 'Oui, quand l’appel est enregistré (Twilio avec la case « Enregistrer », ou Aircall / Ringover connectés). Pensez à informer vos clients selon la loi de votre pays.' },
    ],
  },
  {
    path: '/en/call-center-crm', lang: 'en', alt: '/crm-centre-appels',
    title: 'Call center CRM: hidden contacts, portfolios, call listening — Atlas',
    description: 'CRM for call centers and brokers: hide e-mails and phone numbers from agents, per-agent portfolios, lead distribution, bridged and recorded calls, performance.',
    h1: 'The call center CRM that protects your customer files',
    intro: 'Your agents call, message and follow up from Atlas without ever seeing the customer’s number or e-mail, if you decide so. Each agent only sees their portfolio; their manager, QC and the CRM manager see everything.',
    sections: [
      { h2: 'What is included (Pro and Enterprise plans)', p: 'Rules enforced by the database, not just hidden on screen.', items: [
        'E-mail and phone masking by role (agent, QC, manager…)',
        'Portfolios: an agent only sees their own contacts, leads, deals and e-mails',
        'Lead distribution by hand, in turn or by importing a file',
        'Calls bridged with Twilio (number never shown) or started in Aircall, recordings on the record',
        'Call listening and per-agent performance: leads received, converted, calls, talk time',
        'Customer e-mails delivered straight to the agent who owns the customer',
      ] },
      { h2: 'For brokerage and trading', p: 'Plug your back office or your MT4/MT5/cTrader bridge into Atlas: your clients’ deposits, withdrawals and trades show up live on their record.' },
    ],
    faq: [
      { q: 'Can an agent get around masking by exporting?', a: 'No. The CSV export reads the same masked data as the screen; only the server uses the real number to call or message. API keys are created by admins.' },
      { q: 'Can we listen to calls?', a: 'Yes, when the call is recorded (Twilio with "Record" ticked, or Aircall / Ringover connected). Tell your customers as the law of your country requires.' },
    ],
  },
];

export const seoPageByPath = (path: string) => SEO_PAGES.find((p) => p.path === path);
