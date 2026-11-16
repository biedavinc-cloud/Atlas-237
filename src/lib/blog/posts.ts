/**
 * Blog content. Every article is about a Liafrik product and every claim
 * about a feature must match what the product really does (for Atlas, what
 * is in this repository). No invented customers, figures or quotes.
 */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h2'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'callout'; title: string; text: string };

export type Product = 'atlas' | 'libooks' | 'sellia' | 'liafrik' | 'pos' | 'sukulu' | 'zanldo' | 'healthcloud' | 'nutro' | 'stella';

export interface Post {
  slug: string;
  product: Product;
  date: string; // ISO
  readMin: number;
  cover: { from: string; to: string; motif: 'contour' | 'grid' | 'waves' | 'rings' };
  fr: { title: string; dek: string; body: Block[] };
  en: { title: string; dek: string; body: Block[] };
}

export const PRODUCT_LABEL: Record<Product, string> = {
  atlas: 'Atlas CRM',
  libooks: 'Libooks',
  sellia: 'Sellia',
  liafrik: 'Liafrik',
  pos: 'POS Flow',
  sukulu: 'Sukulu',
  zanldo: 'Zanldo',
  healthcloud: 'Health Cloud',
  nutro: 'Nutro',
  stella: 'Stella Art',
};

/**
 * Where each product lives, so every article leads to the product it talks
 * about. Only official addresses: Atlas (this app), liafrik.com product
 * pages, gosukulu.com, zanldo.com. Libooks and Sellia have no public page
 * yet, so they point to liafrik.com.
 */
export interface ProductInfo {
  url: string;
  /** Square icon and full wordmark in public/brands/ (official files provided by Liafrik). */
  icon?: string;
  logo?: string;
  /** Logos that are taller than wide need more height to stay legible. */
  logoTall?: boolean;
  /** Internal route (Atlas) vs. external site. */
  internal: boolean;
  domain: string;
  tagline: { fr: string; en: string };
  cta: { fr: string; en: string };
  accent: string;
}

export const PRODUCT_INFO: Record<Product, ProductInfo> = {
  atlas: {
    url: '/auth', internal: true, domain: 'atlas.liafrik.com', accent: '#0176d3',
    tagline: { fr: 'Le CRM avec IA intégrée, pensé pour l’Afrique et le Golfe.', en: 'The CRM with built-in AI, built for Africa and the Gulf.' },
    cta: { fr: 'Essayer Atlas gratuitement', en: 'Try Atlas for free' },
  },
  pos: {
    url: 'https://liafrik.com/en/products/pos', internal: false, domain: 'liafrik.com', accent: '#1150b0',
    icon: '/brands/posflow-icon.png', logo: '/brands/posflow-logo.png',
    tagline: { fr: 'La caisse qui continue de vendre quand le réseau tombe.', en: 'The till that keeps selling when the network drops.' },
    cta: { fr: 'Découvrir POS Flow', en: 'Discover POS Flow' },
  },
  sukulu: {
    url: 'https://gosukulu.com', internal: false, domain: 'gosukulu.com', accent: '#0a8f9a',
    icon: '/brands/sukulu-icon.png',
    tagline: { fr: 'Toute l’école sur une seule plateforme.', en: 'The whole school on one platform.' },
    cta: { fr: 'Découvrir Sukulu', en: 'Discover Sukulu' },
  },
  zanldo: {
    url: 'https://zanldo.com', internal: false, domain: 'zanldo.com', accent: '#ea7a12',
    icon: '/brands/zanldo-icon.png', logo: '/brands/zanldo-logo.png',
    tagline: { fr: 'Vendez en ligne, payé directement, sans commission.', en: 'Sell online, get paid directly, no commission.' },
    cta: { fr: 'Ouvrir ma boutique sur Zanldo', en: 'Open my Zanldo store' },
  },
  liafrik: {
    url: 'https://liafrik.com', internal: false, domain: 'liafrik.com', accent: '#06173a',
    icon: '/brands/liafrik-icon.png', logo: '/brands/liafrik-logo.png',
    tagline: { fr: 'La suite logicielle de Liafrik Tech, Dubaï – Yaoundé.', en: 'The Liafrik Tech software suite, Dubai – Yaoundé.' },
    cta: { fr: 'Voir toute la suite Liafrik', en: 'See the whole Liafrik suite' },
  },
  libooks: {
    url: 'https://liafrik.com', internal: false, domain: 'liafrik.com', accent: '#0f766e',
    icon: '/brands/libooks-icon.png',
    tagline: { fr: 'La comptabilité de la suite Liafrik.', en: 'Accounting in the Liafrik suite.' },
    cta: { fr: 'En savoir plus sur liafrik.com', en: 'Learn more on liafrik.com' },
  },
  sellia: {
    url: 'https://liafrik.com', internal: false, domain: 'liafrik.com', accent: '#037557',
    icon: '/brands/sellia-icon.png', logo: '/brands/sellia-logo.png',
    tagline: { fr: 'Le commerce de la suite Liafrik.', en: 'Commerce in the Liafrik suite.' },
    cta: { fr: 'En savoir plus sur liafrik.com', en: 'Learn more on liafrik.com' },
  },
  healthcloud: {
    url: 'https://health.liafrik.com', internal: false, domain: 'health.liafrik.com', accent: '#ff3b62',
    icon: '/brands/healthcloud-icon.png', logo: '/brands/healthcloud-logo.png',
    tagline: { fr: 'La gestion des hôpitaux et des cliniques, dans le cloud.', en: 'Hospital and clinic management, in the cloud.' },
    cta: { fr: 'Découvrir Health Cloud', en: 'Discover Health Cloud' },
  },
  nutro: {
    url: 'https://nutro.liafrik.com', internal: false, domain: 'nutro.liafrik.com', accent: '#d97706',
    icon: '/brands/nutro-icon.png',
    tagline: { fr: 'Carte sur tablette, caisse, écran cuisine et stock pour restaurants.', en: 'Tablet menu, POS, kitchen display and stock for restaurants.' },
    cta: { fr: 'Découvrir Nutro', en: 'Discover Nutro' },
  },
  stella: {
    url: 'https://stella.liafrik.com', internal: false, domain: 'stella.liafrik.com', accent: '#6f4cff',
    icon: '/brands/stella-icon.png', logo: '/brands/stella-logo.png', logoTall: true,
    tagline: { fr: 'Réservez salons de beauté, barbiers et spas en Afrique.', en: 'Book beauty salons, barbers and spas in Africa.' },
    cta: { fr: 'Découvrir Stella Art', en: 'Discover Stella Art' },
  },
};

export const POSTS: Post[] = [
  {
    slug: 'nutro-la-tech-restaurant-reinventee',
    product: 'nutro',
    date: '2026-11-16',
    readMin: 5,
    cover: { from: '#1f2937', to: '#d97706', motif: 'grid' },
    fr: {
      title: 'Nutro : la carte, la caisse et la cuisine du restaurant enfin reliées',
      dek: 'Une tablette pour commander, une caisse pour encaisser, un écran pour la cuisine et des chiffres pour le gérant. Nutro réunit tout ça dans le navigateur, sans matériel spécial.',
      body: [
        { t: 'p', text: 'Dans un restaurant, la commande passe par trois mains avant d’arriver dans l’assiette : la salle, la caisse, la cuisine. Chaque passage est une occasion de perdre une note, d’oublier une allergie ou de servir en retard. Nutro, le logiciel restaurant de Liafrik Tech, branche ces trois étapes sur le même système.' },
        { t: 'h2', text: 'Six modules, un seul outil' },
        { t: 'ul', items: [
          'Un menu interactif sur tablette, avec filtrage des allergènes en temps réel et suivi des macros.',
          'Une caisse cloud : gestion des tables, paiement fractionné, plusieurs moyens de paiement et rapport de service en direct.',
          'Un écran cuisine (KDS) avec minuteurs en couleur, alertes allergènes et priorisation des commandes.',
          'Des analyses multi-établissements : rapports financiers consolidés, chiffre d’affaires en direct et comparaison entre sites.',
          'Des accès par rôle, du super-administrateur au personnel de cuisine, avec des droits adaptés à chaque site.',
          'Le multilingue et le multidevise : anglais, français et arabe, avec USD, EUR, AED, XAF, NGN, GBP et d’autres devises.',
        ] },
        { t: 'p', text: 'La gestion du stock fait aussi partie de l’outil.' },
        { t: 'h2', text: 'Pas de matériel à acheter' },
        { t: 'p', text: 'Nutro fonctionne dans le navigateur, sur la tablette, l’ordinateur ou le téléphone que le restaurant possède déjà. Il s’ajoute à l’écran d’accueil comme une application, et les données se synchronisent en temps réel entre les postes.' },
        { t: 'h2', text: 'Trois formules' },
        { t: 'ul', items: [
          'Starter, 29 $ par mois : 1 établissement, jusqu’à 10 tables et 3 comptes du personnel.',
          'Premium, 69 $ par mois : jusqu’à 3 établissements, 30 tables et 10 comptes du personnel.',
          'Enterprise, 189 $ par mois : établissements, tables, comptes et caisses illimités, assistant IA Gemini, comptabilité multi-sites centralisée et support prioritaire.',
        ] },
        { t: 'callout', title: 'Inclus partout', text: 'L’écran cuisine, les tickets thermiques, la carte numérique, le multidevise et la comptabilité multi-sites sont dans toutes les formules. Le paiement annuel fait économiser 20 %, et chaque formule s’essaie 14 jours sans carte bancaire.' },
        { t: 'h2', text: 'Et avec Atlas ?' },
        { t: 'p', text: 'Nutro gère la salle et la cuisine. Pour les clients professionnels, les traiteurs, les devis d’événements et les relances, Atlas prend le relais côté relation client.' },
        { t: 'p', text: 'Pour essayer Nutro ou voir la démo : nutro.liafrik.com.' },
      ],
    },
    en: {
      title: 'Nutro: the restaurant’s menu, till and kitchen, finally connected',
      dek: 'A tablet to order, a till to take payment, a screen for the kitchen and numbers for the manager. Nutro brings it all together in the browser, with no special hardware.',
      body: [
        { t: 'p', text: 'In a restaurant, an order goes through three hands before it reaches the plate: the floor, the till and the kitchen. Each handover is a chance to lose a note, forget an allergy or serve late. Nutro, Liafrik Tech’s restaurant software, puts those three steps on the same system.' },
        { t: 'h2', text: 'Six modules, one tool' },
        { t: 'ul', items: [
          'An interactive tablet menu, with real-time allergen filtering and macro tracking.',
          'A cloud POS: table management, split payments, multiple payment methods and live shift reporting.',
          'A kitchen display system (KDS) with colour timers, allergen alerts and priority routing.',
          'Multi-branch analytics: consolidated financial reports, live revenue and benchmarking across sites.',
          'Role-based access, from Super Admin to kitchen staff, with per-site permissions.',
          'Multi-language and multi-currency: English, French and Arabic, with USD, EUR, AED, XAF, NGN, GBP and more.',
        ] },
        { t: 'p', text: 'Stock management is part of the tool too.' },
        { t: 'h2', text: 'No hardware to buy' },
        { t: 'p', text: 'Nutro runs in the browser, on the tablet, computer or phone the restaurant already owns. It can be added to the home screen as an app, and data syncs in real time across terminals.' },
        { t: 'h2', text: 'Three plans' },
        { t: 'ul', items: [
          'Starter, $29 a month: 1 site, up to 10 tables and 3 staff accounts.',
          'Premium, $69 a month: up to 3 sites, 30 tables and 10 staff accounts.',
          'Enterprise, $189 a month: unlimited sites, tables, accounts and POS terminals, Gemini AI assistant, centralised multi-branch accounting and priority support.',
        ] },
        { t: 'callout', title: 'Included in every plan', text: 'The kitchen display, thermal receipts, the digital menu, multi-currency and multi-branch accounting are in every plan. Annual billing saves 20%, and every plan comes with a 14-day trial, no credit card.' },
        { t: 'h2', text: 'And with Atlas?' },
        { t: 'p', text: 'Nutro runs the floor and the kitchen. For business customers, caterers, event quotes and follow-ups, Atlas takes over on the customer-relationship side.' },
        { t: 'p', text: 'To try Nutro or see the demo: nutro.liafrik.com.' },
      ],
    },
  },
  {
    slug: 'health-cloud-l-hopital-dans-le-cloud',
    product: 'healthcloud',
    date: '2026-11-15',
    readMin: 3,
    cover: { from: '#3b0715', to: '#ff3b62', motif: 'rings' },
    fr: {
      title: 'Health Cloud : l’hôpital et la clinique gérés depuis le cloud',
      dek: 'Patients, rendez-vous, dossiers, facturation, pharmacie, laboratoire : Health Cloud rassemble la gestion d’un établissement de santé sur une seule plateforme en ligne.',
      body: [
        { t: 'p', text: 'Dans beaucoup d’établissements de santé, le dossier d’un patient est réparti entre l’accueil, le cabinet, la pharmacie et le laboratoire, souvent sur papier. Health Cloud, la plateforme de Liafrik Tech, propose de tout réunir dans le cloud.' },
        { t: 'h2', text: 'Ce que couvre Health Cloud' },
        { t: 'ul', items: [
          'Les patients et leurs dossiers.',
          'Les rendez-vous.',
          'La facturation.',
          'La pharmacie.',
          'Le laboratoire.',
        ] },
        { t: 'h2', text: 'Pour les établissements d’Afrique et d’ailleurs' },
        { t: 'p', text: 'Health Cloud s’adresse aux hôpitaux et aux cliniques, en Afrique comme dans le reste du monde. La plateforme est disponible en français et en anglais, et s’utilise depuis le navigateur, sur ordinateur comme sur mobile.' },
        { t: 'callout', title: 'Un dossier, plusieurs services', text: 'L’intérêt d’une plateforme unique : l’accueil, le médecin, la pharmacie et le laboratoire travaillent sur les mêmes informations, au lieu de se les transmettre.' },
        { t: 'p', text: 'Pour découvrir Health Cloud : health.liafrik.com.' },
      ],
    },
    en: {
      title: 'Health Cloud: hospitals and clinics run from the cloud',
      dek: 'Patients, appointments, records, billing, pharmacy, lab: Health Cloud brings the management of a healthcare institution onto a single online platform.',
      body: [
        { t: 'p', text: 'In many healthcare institutions, a patient’s file is split between reception, the consulting room, the pharmacy and the lab, often on paper. Health Cloud, Liafrik Tech’s platform, brings it all together in the cloud.' },
        { t: 'h2', text: 'What Health Cloud covers' },
        { t: 'ul', items: [
          'Patients and their records.',
          'Appointments.',
          'Billing.',
          'Pharmacy.',
          'Laboratory.',
        ] },
        { t: 'h2', text: 'For institutions in Africa and beyond' },
        { t: 'p', text: 'Health Cloud is built for hospitals and clinics, in Africa and around the world. The platform is available in French and English, and runs in the browser, on desktop and mobile.' },
        { t: 'callout', title: 'One record, several departments', text: 'The point of a single platform: reception, the doctor, the pharmacy and the lab work from the same information instead of passing it along.' },
        { t: 'p', text: 'To discover Health Cloud: health.liafrik.com.' },
      ],
    },
  },
  {
    slug: 'stella-art-reserver-son-salon-en-afrique',
    product: 'stella',
    date: '2026-11-15',
    readMin: 3,
    cover: { from: '#1e1147', to: '#6f4cff', motif: 'waves' },
    fr: {
      title: 'Stella Art : réserver son salon, son barbier ou son spa en quelques secondes',
      dek: 'Coiffure, tresses, barbier, onglerie, massage, soin du visage : Stella Art permet de réserver en ligne, avec acompte en Mobile Money et rappel sur WhatsApp.',
      body: [
        { t: 'p', text: 'Prendre rendez-vous dans un salon, c’est souvent appeler, rappeler, ou se déplacer pour découvrir que la coiffeuse est prise. Stella Art, de Liafrik Tech, met les disponibilités en ligne.' },
        { t: 'h2', text: 'Tous les soins, au même endroit' },
        { t: 'p', text: 'Stella Art s’adresse aux salons de beauté, aux barbiers et aux spas en Afrique. On y réserve la coiffure, les tresses, le barbier, l’onglerie, le massage et le soin du visage.' },
        { t: 'h2', text: 'Pensé pour la façon dont on paie et on communique' },
        { t: 'ul', items: [
          'Les disponibilités en temps réel.',
          'L’acompte payé en Mobile Money.',
          'Le rappel du rendez-vous sur WhatsApp.',
        ] },
        { t: 'callout', title: 'Moins de rendez-vous manqués', text: 'Un acompte et un rappel au bon moment : deux gestes simples qui protègent l’agenda du salon.' },
        { t: 'p', text: 'Stella Art s’utilise depuis le navigateur et s’ajoute à l’écran d’accueil du téléphone comme une application.' },
        { t: 'p', text: 'Pour réserver ou inscrire votre salon : stella.liafrik.com.' },
      ],
    },
    en: {
      title: 'Stella Art: book your salon, barber or spa in seconds',
      dek: 'Hairstyling, braids, barbering, nails, massage, facials: Stella Art lets clients book online, with a Mobile Money deposit and a WhatsApp reminder.',
      body: [
        { t: 'p', text: 'Booking a salon often means calling, calling back, or showing up to find the stylist is busy. Stella Art, from Liafrik Tech, puts availability online.' },
        { t: 'h2', text: 'Every treatment in one place' },
        { t: 'p', text: 'Stella Art is for beauty salons, barbers and spas in Africa. Clients can book hairstyling, braids, barbering, nail care, massage and facials.' },
        { t: 'h2', text: 'Built for how people pay and talk' },
        { t: 'ul', items: [
          'Real-time availability.',
          'Deposits paid by Mobile Money.',
          'Appointment reminders on WhatsApp.',
        ] },
        { t: 'callout', title: 'Fewer missed appointments', text: 'A deposit and a reminder at the right time: two simple steps that protect the salon’s diary.' },
        { t: 'p', text: 'Stella Art runs in the browser and can be added to the phone’s home screen as an app.' },
        { t: 'p', text: 'To book or list your salon: stella.liafrik.com.' },
      ],
    },
  },
  {
    slug: 'pos-flow-la-caisse-qui-ne-lache-pas',
    product: 'pos',
    date: '2026-11-14',
    readMin: 4,
    cover: { from: '#0d1c33', to: '#16a34a', motif: 'grid' },
    fr: {
      title: 'POS Flow : la caisse qui continue de vendre quand le réseau tombe',
      dek: 'Une boutique africaine ne peut pas fermer parce que la connexion a sauté. POS Flow a été pensé pour ça, et pour le reste de la journée du commerçant.',
      body: [
        { t: 'p', text: 'Il est 18 h, la file s’allonge devant la caisse, et la connexion décroche. Avec une caisse cloud classique, la vente s’arrête. Avec POS Flow, elle continue : le mode hors ligne enregistre chaque vente et tout se resynchronise dès que le réseau revient.' },
        { t: 'h2', text: 'Une caisse, un stock, des chiffres en direct' },
        { t: 'p', text: 'POS Flow réunit ce qu’un commerçant gère aujourd’hui avec trois outils et un cahier : encaisser, suivre le stock et comprendre ses ventes.' },
        { t: 'ul', items: [
          'Un tableau de bord des ventes en temps réel.',
          'Un suivi de stock intelligent pour éviter les ruptures.',
          'Les paiements par carte et par mobile.',
          'Des rapports de ventes détaillés.',
          'Le mode hors ligne avec synchronisation automatique.',
          'La gestion de plusieurs points de vente.',
        ] },
        { t: 'h2', text: 'Fait pour le commerce de tous les jours' },
        { t: 'p', text: 'Boutiques, supermarchés, pharmacies, PME : POS Flow vise les commerces où chaque minute de file d’attente coûte une vente. Le soir, une seule action suffit pour clôturer la journée.' },
        { t: 'callout', title: 'Des prix lisibles', text: 'Liafrik annonce deux formules : Starter à 19 $ par mois et Growth à 49 $ par mois.' },
        { t: 'h2', text: 'Et avec Atlas ?' },
        { t: 'p', text: 'La caisse sait ce qui se vend. Le CRM sait à qui. Dans l’écosystème Liafrik, POS gère le comptoir pendant qu’Atlas suit les clients professionnels, les devis et les relances.' },
        { t: 'p', text: 'Pour découvrir la caisse : liafrik.com/en/products/pos.' },
      ],
    },
    en: {
      title: 'POS Flow: the till that keeps selling when the network drops',
      dek: 'An African shop can’t close because the connection went down. POS Flow was built for that, and for the rest of the shopkeeper’s day.',
      body: [
        { t: 'p', text: 'It’s 6 pm, the queue is growing at the till, and the connection drops. With a typical cloud till, sales stop. With POS Flow they carry on: offline mode records every sale and everything syncs back as soon as the network returns.' },
        { t: 'h2', text: 'One till, one stock, live numbers' },
        { t: 'p', text: 'POS Flow brings together what a shopkeeper handles today with three tools and a notebook: taking payment, tracking stock and understanding sales.' },
        { t: 'ul', items: [
          'A real-time sales dashboard.',
          'Smart inventory tracking to avoid stockouts.',
          'Card and mobile payments.',
          'Detailed sales reports.',
          'Offline mode with automatic sync.',
          'Multi-branch support.',
        ] },
        { t: 'h2', text: 'Built for everyday retail' },
        { t: 'p', text: 'Shops, supermarkets, pharmacies, SMEs: POS Flow targets businesses where every minute in the queue costs a sale. In the evening, a single action closes the day.' },
        { t: 'callout', title: 'Readable prices', text: 'Liafrik lists two plans: Starter at $19 a month and Growth at $49 a month.' },
        { t: 'h2', text: 'And with Atlas?' },
        { t: 'p', text: 'The till knows what sells. The CRM knows who buys. In the Liafrik ecosystem, POS runs the counter while Atlas follows business customers, quotes and follow-ups.' },
        { t: 'p', text: 'To discover the till: liafrik.com/en/products/pos.' },
      ],
    },
  },
  {
    slug: 'sukulu-toute-l-ecole-sur-une-seule-plateforme',
    product: 'sukulu',
    date: '2026-11-13',
    readMin: 5,
    cover: { from: '#031d58', to: '#0176d3', motif: 'rings' },
    fr: {
      title: 'Sukulu : toute l’école sur une seule plateforme, parents compris',
      dek: 'Bulletins, présences, frais de scolarité, inscriptions, messages aux familles : Sukulu, la plateforme scolaire de Liafrik Tech, remplace les registres et les relances par téléphone.',
      body: [
        { t: 'p', text: 'Dans beaucoup d’établissements, la fin de trimestre ressemble à une course : moyennes calculées à la main, bulletins recopiés, parents appelés un par un pour les frais en retard. Sukulu a été construit pour que cette course n’existe plus.' },
        { t: 'h2', text: 'Ce que fait Sukulu' },
        { t: 'ul', items: [
          'Notes, moyennes et bulletins calculés automatiquement.',
          'Appel et suivi des présences.',
          'Frais scolaires, paiements et reçus.',
          'Inscriptions et admissions en ligne.',
          'Messages aux parents par l’application, SMS, WhatsApp et e-mail.',
          'Emploi du temps, devoirs, bibliothèque, transport et paie.',
        ] },
        { t: 'h2', text: 'Quatre publics, une seule plateforme' },
        { t: 'p', text: 'La direction pilote l’établissement, les enseignants saisissent notes et présences, les élèves suivent leurs cours et leurs résultats, et les parents voient ce qui se passe sans attendre la réunion de fin de trimestre. Sukulu gère aussi plusieurs établissements depuis un même compte.' },
        { t: 'quote', text: 'Un parent bien informé est un parent qui paie à temps et qui fait confiance à l’école.' },
        { t: 'h2', text: 'Pour qui ?' },
        { t: 'p', text: 'Écoles primaires, collèges, lycées, universités, centres de formation professionnelle : Sukulu s’utilise sur ordinateur comme sur mobile, pour des établissements du monde entier.' },
        { t: 'callout', title: 'Gratuit pour les familles', text: 'Les familles utilisent Sukulu gratuitement. Ce sont les établissements qui s’abonnent.' },
        { t: 'p', text: 'Pour découvrir Sukulu ou trouver une école : gosukulu.com.' },
      ],
    },
    en: {
      title: 'Sukulu: the whole school on one platform, parents included',
      dek: 'Report cards, attendance, school fees, admissions, messages to families: Sukulu, Liafrik Tech’s school platform, replaces paper registers and chasing parents by phone.',
      body: [
        { t: 'p', text: 'In many schools the end of term is a race: averages computed by hand, report cards copied out, parents called one by one about late fees. Sukulu was built so that race no longer exists.' },
        { t: 'h2', text: 'What Sukulu does' },
        { t: 'ul', items: [
          'Grades, averages and report cards computed automatically.',
          'Roll call and attendance tracking.',
          'School fees, payments and receipts.',
          'Online registration and admissions.',
          'Messages to parents through the app, SMS, WhatsApp and email.',
          'Timetable, homework, library, transport and payroll.',
        ] },
        { t: 'h2', text: 'Four audiences, one platform' },
        { t: 'p', text: 'Leadership runs the school, teachers enter grades and attendance, students follow their classes and results, and parents see what is happening without waiting for the end-of-term meeting. Sukulu also manages several schools from one account.' },
        { t: 'quote', text: 'A well-informed parent pays on time and trusts the school.' },
        { t: 'h2', text: 'Who is it for?' },
        { t: 'p', text: 'Primary and secondary schools, universities, vocational centres: Sukulu works on computer and mobile, for schools anywhere in the world.' },
        { t: 'callout', title: 'Free for families', text: 'Families use Sukulu for free. Schools subscribe.' },
        { t: 'p', text: 'To discover Sukulu or find a school: gosukulu.com.' },
      ],
    },
  },
  {
    slug: 'zanldo-vendre-sans-ceder-de-commission',
    product: 'zanldo',
    date: '2026-11-11',
    readMin: 4,
    cover: { from: '#3f1f02', to: '#f08c22', motif: 'waves' },
    fr: {
      title: 'Zanldo : la marketplace qui ne prend rien sur vos ventes',
      dek: 'Sur la plupart des places de marché, chaque vente laisse une commission en route. Zanldo, la marketplace de Liafrik, a choisi un autre modèle : vous êtes payé directement, en entier.',
      body: [
        { t: 'p', text: 'Pour un créateur ou une petite boutique, la commission d’une marketplace peut manger une bonne partie de la marge. Zanldo part d’une règle simple : la plateforme ne garde jamais votre argent et ne prélève jamais de part sur vos ventes. Elle se rémunère uniquement par les abonnements et la publicité.' },
        { t: 'h2', text: 'Votre boutique, votre moyen de paiement' },
        { t: 'p', text: 'Chaque vendeur connecte son propre prestataire de paiement. L’argent du client arrive directement chez vous, pas sur un compte intermédiaire.' },
        { t: 'ul', items: [
          'Des vitrines pour plusieurs vendeurs.',
          'Des catalogues sélectionnés.',
          'La livraison intégrée.',
          'Une protection pour les acheteurs.',
          'Des statistiques pour les vendeurs.',
          'Un paiement pensé d’abord pour le mobile.',
        ] },
        { t: 'h2', text: 'Mode et art de vivre' },
        { t: 'p', text: 'Zanldo s’adresse aux marques de mode, aux vendeurs indépendants, aux boutiques lifestyle et aux designers qui veulent toucher des acheteurs au-delà de leur ville, sans ouvrir leur propre site.' },
        { t: 'callout', title: 'Commencer sans payer', text: 'Le compte vendeur est gratuit. L’offre Pro Seller coûte 29 $ par mois.' },
        { t: 'quote', text: 'Une marketplace devrait gagner quand vous grandissez, pas à chaque fois que vous vendez.' },
        { t: 'p', text: 'Pour ouvrir votre vitrine : zanldo.com.' },
      ],
    },
    en: {
      title: 'Zanldo: the marketplace that takes nothing from your sales',
      dek: 'On most marketplaces every sale leaves a commission behind. Zanldo, Liafrik’s marketplace, chose another model: you get paid directly, in full.',
      body: [
        { t: 'p', text: 'For a designer or a small shop, a marketplace commission can eat a large part of the margin. Zanldo starts from a simple rule: the platform never holds your money and never takes a cut of your sales. It earns only from subscriptions and advertising.' },
        { t: 'h2', text: 'Your shop, your payment provider' },
        { t: 'p', text: 'Each seller connects their own payment provider. The customer’s money goes straight to you, not to an intermediate account.' },
        { t: 'ul', items: [
          'Storefronts for multiple vendors.',
          'Curated catalogues.',
          'Integrated delivery.',
          'Buyer protection.',
          'Seller analytics.',
          'Mobile-first checkout.',
        ] },
        { t: 'h2', text: 'Fashion and lifestyle' },
        { t: 'p', text: 'Zanldo is built for fashion brands, independent sellers, lifestyle boutiques and designers who want to reach buyers beyond their city without opening their own website.' },
        { t: 'callout', title: 'Start for free', text: 'The seller account is free. Pro Seller costs $29 a month.' },
        { t: 'quote', text: 'A marketplace should win when you grow, not every time you sell.' },
        { t: 'p', text: 'To open your storefront: zanldo.com.' },
      ],
    },
  },
  {
    slug: 'atlas-crm-pense-pour-l-afrique',
    product: 'atlas',
    date: '2026-11-12',
    readMin: 6,
    cover: { from: '#0d1c33', to: '#0176d3', motif: 'contour' },
    fr: {
      title: 'Un CRM qui parle FCFA, Mobile Money et WhatsApp',
      dek: 'Pourquoi nous avons construit Atlas entre Dubaï et Yaoundé, et ce que ça change pour une entreprise qui vend en Afrique.',
      body: [
        { t: 'p', text: 'La plupart des CRM du marché ont été dessinés pour une entreprise qui facture en dollars ou en euros, encaisse par carte et parle à ses clients par email. Dès que vous vendez à Douala, Abidjan, Dakar ou Lagos, vous passez vos journées à contourner l’outil plutôt qu’à vendre.' },
        { t: 'p', text: 'Atlas part de l’autre côté. Liafrik Tech l’a conçu entre Dubaï et Yaoundé, pour des équipes qui jonglent entre plusieurs devises, plusieurs langues et des clients qui répondent plus vite sur WhatsApp que dans leur boîte mail.' },
        { t: 'h2', text: 'Votre devise, votre langue, votre fuseau' },
        { t: 'p', text: 'À l’inscription, vous choisissez votre pays parmi 195, votre devise parmi plus de 50 et votre fuseau horaire. Chaque affaire, chaque facture et chaque produit peut ensuite avoir sa propre devise : une facture en XAF pour Yaoundé, une autre en XOF pour Abidjan, une troisième en AED pour un partenaire à Dubaï.' },
        { t: 'p', text: 'L’interface existe en français, anglais, espagnol, portugais et arabe, avec une mise en page de droite à gauche pour l’arabe. Chaque utilisateur choisit sa langue sans changer celle de ses collègues.' },
        { t: 'h2', text: 'Un prix par entreprise, pas par siège' },
        { t: 'p', text: 'Facturer chaque utilisateur pousse les entreprises à partager un seul compte entre cinq commerciaux. Atlas fait l’inverse : un tarif mensuel fixe par organisation, en dollars, de 19 $ à 219 $ selon le plan. L’abonnement annuel coûte dix mois au lieu de douze.' },
        { t: 'callout', title: 'Essayer sans risque', text: '14 jours gratuits, sans carte bancaire. Et si vous voulez juste voir l’outil, la démo en ligne s’ouvre sans aucun compte.' },
        { t: 'h2', text: 'Ce qu’on trouve dedans' },
        { t: 'ul', items: [
          'Contacts, entreprises, pistes et affaires reliés entre eux, avec une fiche par client qui rassemble tout son historique.',
          'Un pipeline visuel où l’on fait glisser les affaires d’une étape à l’autre.',
          'Devis et factures avec lignes de produits, taxes et impression en PDF.',
          'Ask Atlas, un assistant qui répond à vos questions avec vos propres chiffres.',
          'Des workflows qui créent des tâches, envoient des WhatsApp, des SMS ou des emails à votre place.',
          'Des rôles et permissions par module, un journal d’audit et la double authentification.',
        ] },
        { t: 'quote', text: 'Un bon outil ne vous demande pas de changer votre façon de vendre. Il s’adapte à la réalité de vos clients.' },
        { t: 'p', text: 'Atlas n’est pas un CRM américain traduit à la va-vite. C’est un outil pensé pour la façon dont on fait réellement des affaires sur le continent et dans le Golfe, et il ne fait que commencer.' },
      ],
    },
    en: {
      title: 'A CRM that speaks CFA francs, mobile money and WhatsApp',
      dek: 'Why we built Atlas between Dubai and Yaoundé, and what it changes for a company selling in Africa.',
      body: [
        { t: 'p', text: 'Most CRMs on the market were designed for a company that invoices in dollars or euros, gets paid by card and talks to customers by email. The moment you sell in Douala, Abidjan, Dakar or Lagos, you spend your day working around the tool instead of selling.' },
        { t: 'p', text: 'Atlas starts from the other side. Liafrik Tech built it between Dubai and Yaoundé, for teams that juggle several currencies and languages, and customers who answer faster on WhatsApp than in their inbox.' },
        { t: 'h2', text: 'Your currency, your language, your time zone' },
        { t: 'p', text: 'When you sign up you pick your country from 195, your currency from more than 50 and your time zone. Every deal, invoice and product can then carry its own currency: an invoice in XAF for Yaoundé, another in XOF for Abidjan, a third in AED for a partner in Dubai.' },
        { t: 'p', text: 'The interface comes in French, English, Spanish, Portuguese and Arabic, with a right-to-left layout for Arabic. Each user picks their own language without changing anyone else’s.' },
        { t: 'h2', text: 'One price per company, not per seat' },
        { t: 'p', text: 'Charging per user pushes companies to share one login between five sales reps. Atlas does the opposite: a flat monthly price per organisation, in dollars, from $19 to $219 depending on the plan. Paying yearly costs ten months instead of twelve.' },
        { t: 'callout', title: 'Try it with zero risk', text: '14 days free, no credit card. If you just want to look around, the live demo opens without any account.' },
        { t: 'h2', text: 'What’s inside' },
        { t: 'ul', items: [
          'Contacts, companies, leads and deals linked together, with one page per customer holding their whole history.',
          'A visual pipeline where you drag deals from one stage to the next.',
          'Quotes and invoices with line items, taxes and PDF printing.',
          'Ask Atlas, an assistant that answers your questions with your own numbers.',
          'Workflows that create tasks and send WhatsApp messages, texts or emails for you.',
          'Per-module roles and permissions, an audit log and two-factor authentication.',
        ] },
        { t: 'quote', text: 'A good tool doesn’t ask you to change how you sell. It adapts to how your customers actually work.' },
        { t: 'p', text: 'Atlas is not an American CRM hastily translated. It is built for the way business is really done across the continent and the Gulf, and it is only getting started.' },
      ],
    },
  },
  {
    slug: 'du-premier-appel-a-la-facture-payee',
    product: 'atlas',
    date: '2026-11-08',
    readMin: 5,
    cover: { from: '#132745', to: '#16a34a', motif: 'grid' },
    fr: {
      title: 'Du premier appel à la facture payée, sans changer d’outil',
      dek: 'Piste, contact, affaire, devis, facture, paiement : dans Atlas, chaque étape reprend là où la précédente s’est arrêtée.',
      body: [
        { t: 'p', text: 'Le vrai coût d’un CRM mal relié ne se voit pas sur la facture du logiciel. Il se voit quand un commercial ressaisit le nom du client dans le devis, que la comptable le ressaisit dans la facture, et que personne ne sait si le paiement est arrivé.' },
        { t: 'p', text: 'Dans Atlas, une vente est un seul fil. Voici comment il se déroule.' },
        { t: 'h2', text: '1. La piste devient un client en un clic' },
        { t: 'p', text: 'Une piste qualifiée se convertit directement. Atlas crée le contact avec ses coordonnées et ses notes, rattache ou crée l’entreprise sans doublon, et ouvre l’affaire sur la bonne étape du pipeline avec son montant. La piste garde la trace de sa conversion.' },
        { t: 'h2', text: '2. L’affaire avance sous vos yeux' },
        { t: 'p', text: 'Le pipeline affiche vos affaires en colonnes, avec le total de chaque étape et la valeur pondérée par la probabilité. Vous faites glisser une carte de « Proposition » à « Négociation » et la probabilité suit. Sur mobile, des boutons font la même chose sans glisser.' },
        { t: 'h2', text: '3. Tout l’historique au même endroit' },
        { t: 'p', text: 'Chaque contact, entreprise et affaire a sa fiche : coordonnées, affaires liées, devis, factures, tickets, tâches et une chronologie où l’on note un appel, un email ou une réunion en dix secondes. Celui qui reprend le dossier lundi matin sait exactement où on en est.' },
        { t: 'h2', text: '4. Le devis se transforme en facture' },
        { t: 'p', text: 'Vous construisez le devis depuis votre catalogue ou en lignes libres, avec remises, taxe et total calculés. Un clic l’imprime en PDF. Une fois accepté, un autre clic le convertit en facture avec les mêmes lignes et la même échéance à 30 jours.' },
        { t: 'h2', text: '5. Le paiement ferme la boucle' },
        { t: 'p', text: 'Sur la facture, vous suivez le montant payé et le reste à payer. Si une passerelle de paiement est connectée, Atlas génère un lien de paiement au bon montant. Quand le client paie, « Marquer payée » enregistre le paiement et met la facture à jour.' },
        { t: 'callout', title: 'À voir dans la démo', text: 'Ouvrez la démo, faites glisser une affaire, convertissez une piste puis imprimez une facture. Cinq minutes suffisent pour voir le fil complet.' },
        { t: 'p', text: 'Moins de ressaisie, moins d’oublis, et une question qui disparaît enfin de vos réunions : « Est-ce que quelqu’un sait où en est ce client ? »' },
      ],
    },
    en: {
      title: 'From first call to paid invoice, without switching tools',
      dek: 'Lead, contact, deal, quote, invoice, payment: in Atlas, every step picks up where the previous one left off.',
      body: [
        { t: 'p', text: 'The real cost of a poorly connected CRM never shows on the software bill. It shows when a sales rep retypes the customer’s name into a quote, accounting retypes it into the invoice, and nobody knows whether the payment arrived.' },
        { t: 'p', text: 'In Atlas a sale is a single thread. Here is how it runs.' },
        { t: 'h2', text: '1. A lead becomes a customer in one click' },
        { t: 'p', text: 'A qualified lead converts directly. Atlas creates the contact with their details and notes, links or creates the company without duplicates, and opens the deal on the right pipeline stage with its amount. The lead keeps a record of its conversion.' },
        { t: 'h2', text: '2. Deals move in front of you' },
        { t: 'p', text: 'The pipeline shows deals in columns, with each stage’s total and the probability-weighted value. Drag a card from “Proposal” to “Negotiation” and the probability follows. On mobile, buttons do the same without dragging.' },
        { t: 'h2', text: '3. The whole history in one place' },
        { t: 'p', text: 'Every contact, company and deal has its own page: details, linked deals, quotes, invoices, tickets, tasks and a timeline where logging a call, email or meeting takes ten seconds. Whoever picks up the account on Monday knows exactly where things stand.' },
        { t: 'h2', text: '4. The quote turns into an invoice' },
        { t: 'p', text: 'Build the quote from your catalogue or as free lines, with discounts, tax and totals computed for you. One click prints it to PDF. Once accepted, another click converts it into an invoice with the same lines and a 30-day due date.' },
        { t: 'h2', text: '5. Payment closes the loop' },
        { t: 'p', text: 'On the invoice you track the amount paid and the balance due. With a payment gateway connected, Atlas generates a payment link for the right amount. When the customer pays, “Mark as paid” records the payment and updates the invoice.' },
        { t: 'callout', title: 'See it in the demo', text: 'Open the demo, drag a deal, convert a lead, then print an invoice. Five minutes is enough to see the whole thread.' },
        { t: 'p', text: 'Less retyping, fewer gaps, and one question that finally disappears from your meetings: “Does anyone know where we are with this customer?”' },
      ],
    },
  },
  {
    slug: 'ask-atlas-une-ia-qui-repond-avec-vos-chiffres',
    product: 'atlas',
    date: '2026-11-03',
    readMin: 5,
    cover: { from: '#081224', to: '#7e22ce', motif: 'rings' },
    fr: {
      title: 'Ask Atlas : une IA qui répond avec vos chiffres, pas avec des généralités',
      dek: 'Une IA d’entreprise utile ne récite pas Internet. Elle connaît vos clients, vos factures et vos règles, et elle vous demande la permission avant d’agir.',
      body: [
        { t: 'p', text: '« Combien d’affaires sont en retard ? » « Quelles factures restent impayées ? » Ces questions prennent dix minutes de filtres dans un CRM classique. Dans Atlas, vous les tapez comme vous les diriez à un collègue.' },
        { t: 'h2', text: 'Des réponses tirées de vos données' },
        { t: 'p', text: 'Ask Atlas travaille avec un instantané de votre CRM : contacts, pistes, affaires, factures, tickets et chiffre d’affaires. Il lit aussi les titres et descriptions de votre base de connaissances, comme vos conditions générales ou votre grille tarifaire. Quand une réponse renvoie à un module, un lien vous y emmène directement.' },
        { t: 'h2', text: 'Votre IA, votre choix' },
        { t: 'p', text: 'Par défaut, Atlas utilise un modèle fourni par la plateforme, sans configuration. Si votre entreprise a déjà un abonnement OpenAI, Anthropic ou Google Gemini, vous connectez votre propre clé et vous la sélectionnez dans les paramètres. Si la clé est mal configurée, Atlas vous le dit clairement au lieu de faire semblant de répondre.' },
        { t: 'callout', title: 'Toujours une réponse', text: 'Si le service d’IA est injoignable, Ask Atlas bascule sur un moteur intégré qui interroge directement vos tables et répond quand même aux questions courantes.' },
        { t: 'h2', text: 'Des agents qui demandent la permission' },
        { t: 'p', text: 'Les employés IA d’Atlas préparent le travail : qualifier des pistes, rédiger une relance, trier des tickets. Dès qu’une action engage l’entreprise, comme envoyer une remise ou relancer un client en retard, elle arrive dans la file des approbations. Vous validez ou refusez en un clic, depuis le centre de commande.' },
        { t: 'ul', items: [
          'Une mémoire où vous écrivez vos règles : ton des relances, remise maximale sans validation, délais standard.',
          'Un niveau de risque par agent, et une validation obligatoire pour les actions sensibles.',
          'Un journal d’audit qui distingue ce qu’a fait un humain de ce qu’a fait l’IA.',
        ] },
        { t: 'quote', text: 'L’IA qui agit seule impressionne en démo. L’IA qui vous demande votre avis gagne votre confiance.' },
        { t: 'p', text: 'Ask Atlas ne remplace pas votre jugement. Il vous fait gagner les dix minutes qui séparent une question de sa réponse, des dizaines de fois par jour.' },
      ],
    },
    en: {
      title: 'Ask Atlas: an AI that answers with your numbers, not platitudes',
      dek: 'A useful business AI doesn’t recite the internet. It knows your customers, invoices and rules, and asks before acting.',
      body: [
        { t: 'p', text: '“How many deals are overdue?” “Which invoices are still unpaid?” Those questions take ten minutes of filtering in a traditional CRM. In Atlas you type them the way you’d ask a colleague.' },
        { t: 'h2', text: 'Answers drawn from your data' },
        { t: 'p', text: 'Ask Atlas works from a snapshot of your CRM: contacts, leads, deals, invoices, tickets and revenue. It also reads the titles and descriptions in your knowledge base, such as your terms or price list. When an answer points to a module, a link takes you straight there.' },
        { t: 'h2', text: 'Your AI, your choice' },
        { t: 'p', text: 'By default Atlas uses a model provided by the platform, with no setup. If your company already pays for OpenAI, Anthropic or Google Gemini, connect your own key and select it in settings. If the key is misconfigured, Atlas tells you plainly instead of pretending to answer.' },
        { t: 'callout', title: 'Always an answer', text: 'If the AI service can’t be reached, Ask Atlas falls back to a built-in engine that queries your tables directly and still answers common questions.' },
        { t: 'h2', text: 'Agents that ask permission' },
        { t: 'p', text: 'Atlas’s AI employees prepare the work: qualifying leads, drafting a follow-up, sorting tickets. As soon as an action commits the company, like offering a discount or chasing a late payer, it lands in the approvals queue. You approve or reject in one click from the command center.' },
        { t: 'ul', items: [
          'A memory where you write your rules: follow-up tone, maximum discount without approval, standard lead times.',
          'A risk level per agent, with mandatory approval for sensitive actions.',
          'An audit log that tells human actions apart from AI ones.',
        ] },
        { t: 'quote', text: 'AI that acts alone impresses in a demo. AI that asks for your opinion earns your trust.' },
        { t: 'p', text: 'Ask Atlas doesn’t replace your judgement. It saves you the ten minutes between a question and its answer, dozens of times a day.' },
      ],
    },
  },
  {
    slug: 'payer-son-logiciel-en-mobile-money',
    product: 'atlas',
    date: '2026-10-28',
    readMin: 4,
    cover: { from: '#0d1c33', to: '#ea580c', motif: 'waves' },
    fr: {
      title: 'Payer son logiciel en Mobile Money : on l’a rendu possible',
      dek: 'Exiger une carte Visa pour s’abonner à un logiciel, c’est fermer la porte à une grande partie des entreprises africaines. Atlas a pris le problème à l’envers.',
      body: [
        { t: 'p', text: 'Beaucoup de PME du continent paient leurs fournisseurs par Mobile Money ou par virement local, pas par carte internationale. Un SaaS qui n’accepte que Visa et Mastercard les exclut avant même la première démo.' },
        { t: 'h2', text: 'Plusieurs moyens de paiement, choisis par le client' },
        { t: 'p', text: 'La page de facturation d’Atlas propose les moyens de paiement réellement configurés, et seulement ceux-là :' },
        { t: 'ul', items: [
          'PayUnit pour le Mobile Money : MTN, Orange, Express Union et YUP.',
          'Flutterwave et Paystack pour la carte, le virement et le Mobile Money selon les pays.',
          'Paddle pour la carte, PayPal et Apple Pay partout dans le monde, avec la TVA gérée.',
          'CinetPay et Korapay arrivent pour couvrir encore plus de pays de la zone CFA et d’Afrique anglophone.',
        ] },
        { t: 'h2', text: 'Un prix clair, converti au taux du jour' },
        { t: 'p', text: 'Les plans sont fixés en dollars. Quand un moyen de paiement règle en francs CFA, le montant est converti au taux de change du moment, côté serveur. Personne ne devine un taux, et le client voit le montant exact avant de payer.' },
        { t: 'callout', title: 'Mensuel ou annuel', text: 'Chaque moyen de paiement accepte le mensuel comme l’annuel. L’annuel coûte dix mois au lieu de douze.' },
        { t: 'h2', text: 'Aucun paiement accepté sur parole' },
        { t: 'p', text: 'Un message « paiement réussi » dans le navigateur ne débloque rien. Avant d’activer un plan, Atlas interroge le prestataire de paiement avec ses propres clés et vérifie le montant et la devise réellement encaissés. Si le paiement arrive par notification serveur avant le retour du client, il n’est compté qu’une seule fois.' },
        { t: 'p', text: 'C’est moins spectaculaire qu’une nouvelle fonctionnalité d’IA. Mais pour une entreprise de Bafoussam ou de Bouaké, c’est souvent ce qui fait la différence entre « intéressant » et « abonné ».' },
      ],
    },
    en: {
      title: 'Paying for software with mobile money: we made it possible',
      dek: 'Requiring a Visa card to subscribe shuts out a large share of African businesses. Atlas turned the problem around.',
      body: [
        { t: 'p', text: 'Many small businesses on the continent pay suppliers by mobile money or local bank transfer, not by international card. A SaaS that only takes Visa and Mastercard excludes them before the first demo.' },
        { t: 'h2', text: 'Several payment methods, chosen by the customer' },
        { t: 'p', text: 'Atlas’s billing page offers the payment methods that are actually configured, and only those:' },
        { t: 'ul', items: [
          'PayUnit for mobile money: MTN, Orange, Express Union and YUP.',
          'Flutterwave and Paystack for card, bank transfer and mobile money depending on the country.',
          'Paddle for card, PayPal and Apple Pay worldwide, with VAT handled.',
          'CinetPay and Korapay are coming to cover even more of the CFA zone and anglophone Africa.',
        ] },
        { t: 'h2', text: 'A clear price, converted at today’s rate' },
        { t: 'p', text: 'Plans are priced in dollars. When a payment method settles in CFA francs, the amount is converted at the current exchange rate on the server. Nobody guesses a rate, and the customer sees the exact amount before paying.' },
        { t: 'callout', title: 'Monthly or yearly', text: 'Every payment method supports both. Yearly costs ten months instead of twelve.' },
        { t: 'h2', text: 'No payment accepted on trust' },
        { t: 'p', text: 'A “payment successful” message in the browser unlocks nothing. Before activating a plan, Atlas asks the payment provider with its own keys and checks the amount and currency actually collected. If a server notification arrives before the customer returns, the payment is still counted only once.' },
        { t: 'p', text: 'It’s less flashy than a new AI feature. But for a business in Bafoussam or Bouaké, it is often the difference between “interesting” and “subscribed”.' },
      ],
    },
  },
  {
    slug: 'whatsapp-sms-automatiser-sans-perdre-le-contact',
    product: 'atlas',
    date: '2026-10-21',
    readMin: 5,
    cover: { from: '#132745', to: '#0d9488', motif: 'grid' },
    fr: {
      title: 'WhatsApp, SMS, email : automatiser sans perdre le contact humain',
      dek: 'Vos clients sont sur WhatsApp. Vos relances devraient y être aussi, au bon moment, sans qu’un commercial y passe sa soirée.',
      body: [
        { t: 'p', text: 'L’automatisation a mauvaise réputation quand elle envoie des messages froids au mauvais moment. Bien faite, elle libère du temps pour les conversations qui comptent.' },
        { t: 'h2', text: 'Des workflows qui tournent vraiment' },
        { t: 'p', text: 'Un workflow Atlas combine un déclencheur et une suite d’actions. Vous le lancez à la main, ou vous le programmez chaque heure, chaque jour, chaque semaine ou chaque mois : le serveur le vérifie toutes les cinq minutes et l’exécute à l’heure prévue. Chaque exécution est journalisée, étape par étape.' },
        { t: 'ul', items: [
          'Créer une tâche ou une notification pour l’équipe.',
          'Envoyer un WhatsApp, un SMS, un message Telegram ou un email.',
          'Ajouter un abonné Mailchimp, créer un contact HubSpot ou un ticket Freshdesk.',
          'Créer un client Shopify ou WooCommerce.',
          'Générer un lien de paiement Mollie, CinetPay, Wave, Chapa ou CamPay.',
          'Appeler un webhook ou n’importe quelle API que vous avez enregistrée.',
        ] },
        { t: 'h2', text: 'Un message à un client précis, en deux clics' },
        { t: 'p', text: 'Tout n’a pas besoin d’un workflow. Sur la liste des contacts et des pistes, une icône ouvre une fenêtre pour envoyer un WhatsApp ou un SMS à cette personne précise. Sur une facture, une autre génère un lien de paiement au bon montant. L’icône n’apparaît que si le canal est vraiment connecté et que le client a un numéro.' },
        { t: 'callout', title: 'Vos propres comptes', text: 'Les messages partent de votre compte WhatsApp Business, Twilio ou Telegram. Atlas ne fait jamais semblant d’être connecté : sans identifiants valides, l’action ne s’affiche pas.' },
        { t: 'h2', text: 'Des webhooks signés pour vos développeurs' },
        { t: 'p', text: 'Quand un contact est créé, une affaire gagnée ou une facture payée, Atlas peut prévenir vos autres systèmes. Chaque envoi est signé en HMAC-SHA256 : votre serveur vérifie que le message vient bien d’Atlas, sans que le secret circule jamais en clair.' },
        { t: 'p', text: 'Le but n’est pas de remplacer le coup de fil du commercial. C’est qu’il n’ait plus à se souvenir de passer tous les autres.' },
      ],
    },
    en: {
      title: 'WhatsApp, SMS, email: automate without losing the human touch',
      dek: 'Your customers are on WhatsApp. Your follow-ups should be too, at the right time, without a sales rep spending their evening on it.',
      body: [
        { t: 'p', text: 'Automation gets a bad name when it fires cold messages at the wrong time. Done well, it frees up time for the conversations that matter.' },
        { t: 'h2', text: 'Workflows that actually run' },
        { t: 'p', text: 'An Atlas workflow pairs a trigger with a series of actions. Run it by hand, or schedule it hourly, daily, weekly or monthly: the server checks every five minutes and runs it on time. Every run is logged, step by step.' },
        { t: 'ul', items: [
          'Create a task or a notification for the team.',
          'Send a WhatsApp message, a text, a Telegram message or an email.',
          'Add a Mailchimp subscriber, create a HubSpot contact or a Freshdesk ticket.',
          'Create a Shopify or WooCommerce customer.',
          'Generate a Mollie, CinetPay, Wave, Chapa or CamPay payment link.',
          'Call a webhook or any API you have registered.',
        ] },
        { t: 'h2', text: 'One message to one customer, in two clicks' },
        { t: 'p', text: 'Not everything needs a workflow. On the contacts and leads lists, an icon opens a window to send that person a WhatsApp message or text. On an invoice, another generates a payment link for the right amount. The icon only shows up when the channel is really connected and the customer has a number.' },
        { t: 'callout', title: 'Your own accounts', text: 'Messages go out from your own WhatsApp Business, Twilio or Telegram account. Atlas never pretends to be connected: without valid credentials, the action doesn’t appear.' },
        { t: 'h2', text: 'Signed webhooks for your developers' },
        { t: 'p', text: 'When a contact is created, a deal won or an invoice paid, Atlas can notify your other systems. Each delivery is signed with HMAC-SHA256, so your server can check it really came from Atlas without the secret ever travelling in clear text.' },
        { t: 'p', text: 'The goal isn’t to replace the sales rep’s phone call. It’s that they no longer have to remember to make all the other ones.' },
      ],
    },
  },
  {
    slug: 'atlas-libooks-sellia-ecosysteme-liafrik',
    product: 'liafrik',
    date: '2026-10-14',
    readMin: 4,
    cover: { from: '#081224', to: '#2e8bd0', motif: 'rings' },
    fr: {
      title: 'Atlas, Libooks, Sellia et toute la suite Liafrik',
      dek: 'Vendre, encaisser, tenir ses comptes : Liafrik Tech construit une suite où chaque produit se branche aux autres au lieu de vous enfermer.',
      body: [
        { t: 'p', text: 'Une entreprise qui grandit finit souvent avec un outil par service et des exports Excel pour les faire communiquer. Liafrik Tech, de Dubaï à Yaoundé, construit ses produits pour éviter ce piège.' },
        { t: 'h2', text: 'Atlas pour la relation client' },
        { t: 'p', text: 'Atlas est le CRM de la suite : contacts, pipeline, devis, factures, support, automatisations et IA. C’est là que vit la relation avec chaque client.' },
        { t: 'h2', text: 'Libooks pour la comptabilité' },
        { t: 'p', text: 'Libooks est la solution de comptabilité de Liafrik : la tenue des comptes de l’entreprise, à côté de la relation client gérée dans Atlas.' },
        { t: 'h2', text: 'Sellia pour le commerce en ligne' },
        { t: 'p', text: 'Sellia est la plateforme e-commerce de Liafrik, pour vendre en ligne avec sa propre boutique.' },
        { t: 'callout', title: 'Où les trouver', text: 'Toute la suite : liafrik.com. Sukulu : gosukulu.com. Zanldo : zanldo.com. Nutro : nutro.liafrik.com. Health Cloud : health.liafrik.com. Stella Art : stella.liafrik.com. Atlas : atlas.liafrik.com, avec une démo ouverte sans compte.' },
        { t: 'h2', text: 'Une suite qui couvre toute l’entreprise' },
        { t: 'p', text: 'Au-delà d’Atlas, Libooks et Sellia, Liafrik développe POS Flow pour le commerce de détail, Sukulu pour les écoles, Zanldo pour la vente en ligne, Nutro pour la restauration, Health Cloud pour la gestion des hôpitaux, Stella Art pour les salons de beauté, barbiers et spas, Faka pour les RH, Bailly pour l’immobilier, Kolo pour les finances familiales, Skills pour la formation, Mafo pour la santé des femmes, Z. Express pour la logistique, Litrek pour le transport, Hostrek pour l’hôtellerie, Nkapo pour les artisans et ID pour la vérification d’identité.' },
        { t: 'h2', text: 'Ouverts aux autres aussi' },
        { t: 'p', text: 'Choisir Liafrik ne vous oblige pas à tout changer. Atlas se connecte aussi aux outils du marché là où ils servent (WhatsApp, Resend, HubSpot, Freshdesk, les passerelles de paiement africaines…), et expose une API REST et des webhooks signés.' },
        { t: 'p', text: 'L’ambition est simple : que la technologie construite pour l’Afrique et le Golfe soit au niveau des meilleurs outils mondiaux, sans en copier les angles morts.' },
      ],
    },
    en: {
      title: 'Atlas, Libooks, Sellia and the whole Liafrik suite',
      dek: 'Selling, getting paid, keeping the books: Liafrik Tech builds a suite where each product plugs into the others instead of locking you in.',
      body: [
        { t: 'p', text: 'A growing company often ends up with one tool per department and Excel exports to make them talk. Liafrik Tech, from Dubai to Yaoundé, builds its products to avoid that trap.' },
        { t: 'h2', text: 'Atlas for customer relationships' },
        { t: 'p', text: 'Atlas is the suite’s CRM: contacts, pipeline, quotes, invoices, support, automation and AI. It is where the relationship with every customer lives.' },
        { t: 'h2', text: 'Libooks for accounting' },
        { t: 'p', text: 'Libooks is Liafrik’s accounting product: the company’s books, alongside the customer relationship managed in Atlas.' },
        { t: 'h2', text: 'Sellia for e-commerce' },
        { t: 'p', text: 'Sellia is Liafrik’s e-commerce platform, for selling online with your own store.' },
        { t: 'callout', title: 'Where to find them', text: 'The whole suite: liafrik.com. Sukulu: gosukulu.com. Zanldo: zanldo.com. Nutro: nutro.liafrik.com. Health Cloud: health.liafrik.com. Stella Art: stella.liafrik.com. Atlas: atlas.liafrik.com, with a demo that opens without an account.' },
        { t: 'h2', text: 'A suite that covers the whole business' },
        { t: 'p', text: 'Beyond Atlas, Libooks and Sellia, Liafrik builds POS Flow for retail, Sukulu for schools, Zanldo for online selling, Nutro for restaurants, Health Cloud for hospital management, Stella Art for beauty salons, barbers and spas, Faka for HR, Bailly for real estate, Kolo for family finances, Skills for learning, Mafo for women’s health, Z. Express for logistics, Litrek for transport, Hostrek for hotels, Nkapo for tradespeople and ID for identity verification.' },
        { t: 'h2', text: 'Open to others too' },
        { t: 'p', text: 'Choosing Liafrik doesn’t force you to replace everything. Atlas also connects to market tools where they are useful (WhatsApp, Resend, HubSpot, Freshdesk, African payment gateways…), and exposes a REST API and signed webhooks.' },
        { t: 'p', text: 'The ambition is simple: technology built for Africa and the Gulf should match the best tools in the world, without copying their blind spots.' },
      ],
    },
  },
];

/** Old slugs that must keep working (shared links, search engines). */
export const SLUG_ALIASES: Record<string, string> = {
  'liafrik-pos-la-caisse-qui-ne-lache-pas': 'pos-flow-la-caisse-qui-ne-lache-pas',
};

export function getPost(slug: string | undefined): Post | undefined {
  const s = slug && SLUG_ALIASES[slug] ? SLUG_ALIASES[slug] : slug;
  return POSTS.find(p => p.slug === s);
}
