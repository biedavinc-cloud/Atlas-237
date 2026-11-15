/* Sample workspace for demo mode: a fictional distribution company based in
 * Douala & Yaoundé, selling across Central and West Africa and the Gulf.
 * Every name, figure and email here is invented for the demo.
 * No integration, API key or webhook is shown as connected: the demo never
 * pretends an external account exists. Super Admin data is never seeded. */

type Row = Record<string, unknown>;

export const DEMO_ORG_ID = 'd0000000-0000-4000-8000-000000000001';
export const DEMO_USER_ID = 'd0000000-0000-4000-8000-0000000000a1';
export const DEMO_EMAIL = 'aicha.mbarga@savane-demo.cm';

const DAY = 86400000;
const iso = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);
let n = 0;
const id = (prefix: string) => `${prefix}${String(++n).padStart(4, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`.slice(0, 36);

export function buildSeed(): Record<string, Row[]> {
  n = 0;
  const org = DEMO_ORG_ID;
  const base = (extra: Row, created = -30): Row => ({ org_id: org, created_at: iso(created), updated_at: iso(created), ...extra });

  /* Team */
  const team = [
    { id: DEMO_USER_ID, first_name: 'Aïcha', last_name: 'Mbarga', email: DEMO_EMAIL, role: 'owner', phone: '+237 6 77 10 20 30' },
    { id: id('a1'), first_name: 'Junior', last_name: 'Essomba', email: 'junior.essomba@savane-demo.cm', role: 'admin', phone: '+237 6 99 41 22 10' },
    { id: id('a1'), first_name: 'Mariam', last_name: 'Ndiaye', email: 'mariam.ndiaye@savane-demo.cm', role: 'member', phone: '+221 77 450 12 12' },
    { id: id('a1'), first_name: 'Patrick', last_name: 'Fotso', email: 'patrick.fotso@savane-demo.cm', role: 'member', phone: '+237 6 55 08 71 44' },
    { id: id('a1'), first_name: 'Salma', last_name: 'Haddad', email: 'salma.haddad@savane-demo.ae', role: 'member', phone: '+971 50 123 4567' },
  ];
  const profiles = team.map((p, i) => base({ ...p, org_id: org, language: 'fr', timezone: i === 4 ? 'Asia/Dubai' : 'Africa/Douala', active: true, avatar_url: null }, -120 + i * 5));
  const [me, junior, mariam, patrick, salma] = team.map(t => t.id);

  const organizations = [{
    id: org, name: 'Savane Distribution', industry: 'Distribution & logistique', website: 'https://savane-demo.cm',
    country: 'CM', address: 'Rue Joss, Bonanjo\nDouala', employees: 48, revenue: 1250000000, currency: 'XAF',
    timezone: 'Africa/Douala', plan: 'pro', trial_ends_at: iso(14), logo_url: null, branding_enabled: false,
    status: 'active', ai_provider: 'platform_free', sso_config: null, sso_enabled: false, created_at: iso(-120), updated_at: iso(-1),
  }];

  /* Companies */
  const companyData: [string, string, string, string, string, number][] = [
    ['Brasseries du Littoral', 'Agroalimentaire', 'Douala', 'CM', '201-1000', 18500000000],
    ['Pharmacie Centrale Mfoundi', 'Santé', 'Yaoundé', 'CM', '51-200', 2400000000],
    ['Abidjan Ports Services', 'Logistique', 'Abidjan', 'CI', '201-1000', 9600000000],
    ['Teranga Retail', 'Grande distribution', 'Dakar', 'SN', '51-200', 3100000000],
    ['Okoumé Bois & Export', 'Industrie du bois', 'Libreville', 'GA', '51-200', 4700000000],
    ['Gulf Trade Hub FZE', 'Import-export', 'Dubaï', 'AE', '11-50', 1800000000],
    ['Hôtel Mont Fébé Prestige', 'Hôtellerie', 'Yaoundé', 'CM', '51-200', 1350000000],
    ['Kribi Agro Industries', 'Agro-industrie', 'Kribi', 'CM', '201-1000', 7200000000],
    ['Lagos Fresh Markets', 'Distribution', 'Lagos', 'NG', '51-200', 2900000000],
    ['Bafoussam Coopérative Café', 'Agriculture', 'Bafoussam', 'CM', '11-50', 650000000],
  ];
  const companies = companyData.map(([name, industry, city, country, size, revenue], i) => base({
    id: id('c0'), name, industry, city, country, size, revenue, currency: country === 'AE' ? 'AED' : country === 'NG' ? 'NGN' : country === 'CI' || country === 'SN' ? 'XOF' : 'XAF',
    website: `https://${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.example`,
    status: i === 9 ? 'inactive' : 'active', owner_id: [me, junior, mariam, patrick, salma][i % 5],
    notes: i === 0 ? 'Compte stratégique. Renouvellement du contrat-cadre logistique prévu ce trimestre.' : null, tags: null,
  }, -100 + i * 3));
  const C = (i: number) => companies[i].id as string;

  /* Contacts */
  const contactData: [string, string, string, number | null, string, number, string][] = [
    ['Emmanuel', 'Ngando', 'Directeur des achats', 0, '+237 6 70 11 22 33', 88, 'referral'],
    ['Florence', 'Ateba', 'Responsable supply chain', 0, '+237 6 91 44 55 66', 74, 'website'],
    ['Dr Paul', 'Mvondo', 'Pharmacien titulaire', 1, '+237 6 77 88 99 00', 69, 'event'],
    ['Koffi', 'Kouassi', 'Directeur des opérations', 2, '+225 07 08 09 10 11', 81, 'cold_outreach'],
    ['Awa', 'Diop', 'Directrice commerciale', 3, '+221 77 123 45 67', 92, 'referral'],
    ['Moussa', 'Sow', 'Acheteur senior', 3, '+221 76 222 33 44', 58, 'website'],
    ['Jean-Baptiste', 'Mba', 'Directeur général', 4, '+241 66 12 34 56', 77, 'event'],
    ['Omar', 'Al Mansouri', 'Managing Director', 5, '+971 55 987 6543', 85, 'referral'],
    ['Nadia', 'Rahman', 'Procurement Lead', 5, '+971 52 444 1212', 63, 'social'],
    ['Christelle', 'Owona', 'Directrice de l’hébergement', 6, '+237 6 56 78 90 12', 54, 'website'],
    ['Serge', 'Tchoupo', 'DAF', 7, '+237 6 98 76 54 32', 71, 'cold_outreach'],
    ['Linda', 'Ekotto', 'Responsable logistique', 7, '+237 6 52 41 30 20', 49, 'website'],
    ['Chinedu', 'Okafor', 'Head of Operations', 8, '+234 803 456 7890', 66, 'social'],
    ['Folake', 'Adeyemi', 'Category Manager', 8, '+234 805 111 2233', 52, 'event'],
    ['Pierre', 'Kamga', 'Président', 9, '+237 6 75 31 42 53', 38, 'referral'],
    ['Aminata', 'Touré', 'Consultante achats', null, '+225 05 44 33 22 11', 45, 'website'],
    ['Thierry', 'Biya Nkolo', 'Gérant', null, '+237 6 60 70 80 90', 33, 'cold_outreach'],
    ['Grace', 'Nfor', 'Directrice qualité', 1, '+237 6 81 92 03 14', 61, 'event'],
    ['Ibrahim', 'Bello', 'Responsable import', 2, '+225 01 02 03 04 05', 57, 'referral'],
    ['Sandrine', 'Abena', 'Assistante de direction', 0, '+237 6 93 82 71 60', 42, 'website'],
    ['Youssef', 'Karim', 'Logistics Manager', 5, '+971 56 321 7788', 70, 'social'],
    ['Esther', 'Ngo Bassa', 'Responsable événements', 6, '+237 6 54 65 76 87', 47, 'website'],
  ];
  const contacts = contactData.map(([first, last, job, ci, phone, score, source], i) => base({
    id: id('d0'), first_name: first, last_name: last, job_title: job, company_id: ci === null ? null : C(ci),
    company: ci === null ? (i === 15 ? 'Indépendante' : 'Quincaillerie Nkolo') : companyData[ci][0],
    email: `${first.toLowerCase().replace(/[^a-z]/g, '')}.${last.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    phone, country: ci === null ? (i === 15 ? 'CI' : 'CM') : companyData[ci][3], city: ci === null ? (i === 15 ? 'Abidjan' : 'Yaoundé') : companyData[ci][2],
    status: i === 16 ? 'inactive' : i === 15 ? 'lead' : 'active', lead_score: score, lead_source: source,
    tags: i % 4 === 0 ? ['vip'] : i % 5 === 0 ? ['grand-compte'] : null, owner_id: [me, junior, mariam, patrick, salma][i % 5],
    notes: i === 0 ? 'Préfère être contacté sur WhatsApp. Décision finale en comité le jeudi.' : i === 7 ? 'Basé à Jebel Ali. Intéressé par une route Dubaï → Douala régulière.' : null,
  }, -90 + i * 3));
  const K = (i: number) => contacts[i].id as string;

  /* Pipeline */
  const pipelineId = id('e0');
  const pipelines = [base({ id: pipelineId, name: 'Ventes B2B', description: 'Contrats de distribution et de logistique', sort_order: 0 }, -110)];
  const stageDefs: [string, number][] = [['Prospection', 10], ['Qualification', 25], ['Proposition', 50], ['Négociation', 75], ['Signature', 90]];
  const pipeline_stages = stageDefs.map(([name, probability], i) => base({ id: id('f0'), pipeline_id: pipelineId, name, probability, sort_order: i, color: null }, -110));
  const S = (i: number) => pipeline_stages[i].id as string;

  /* Deals */
  const dealData: [string, number, number, number | null, number, number, string][] = [
    // name, value (XAF), contact, company, stage, closeIn(days), status
    ['Contrat-cadre logistique 2027', 145000000, 0, 0, 3, 12, 'open'],
    ['Distribution froid — 12 officines', 38000000, 2, 1, 2, 20, 'open'],
    ['Entreposage portuaire Q1', 62000000, 3, 2, 4, 6, 'open'],
    ['Réseau 40 magasins Dakar', 54000000, 4, 3, 2, 28, 'open'],
    ['Export grumes → Jebel Ali', 89000000, 6, 4, 1, 45, 'open'],
    ['Route maritime Dubaï–Douala', 120000000, 7, 5, 3, -4, 'open'],
    ['Approvisionnement hôtelier annuel', 21500000, 9, 6, 0, 60, 'open'],
    ['Transport huile de palme', 47000000, 10, 7, 2, 18, 'open'],
    ['Lagos cold chain pilot', 33000000, 12, 8, 1, 35, 'open'],
    ['Collecte café campagne 2027', 9800000, 14, 9, 0, 75, 'open'],
    ['Extension entrepôt Yaoundé', 26000000, 17, 1, 4, 3, 'open'],
    ['Dédouanement Abidjan', 18000000, 18, 2, 3, -10, 'open'],
    ['Livraison saison des fêtes', 31000000, 5, 3, 4, -20, 'won'],
    ['Flotte réfrigérée Kribi', 74000000, 11, 7, 4, -35, 'won'],
    ['Appel d’offres hôtel Bastos', 15000000, 21, 6, 2, -15, 'lost'],
    ['Partenariat Gulf → Lagos', 42000000, 20, 5, 1, 50, 'open'],
  ];
  const deals = dealData.map(([name, value, ci, coi, si, close, status], i) => base({
    id: id('g0'), name, value, currency: 'XAF', contact_id: K(ci), company_id: coi === null ? null : C(coi),
    pipeline_id: pipelineId, stage_id: S(si), probability: status === 'won' ? 100 : status === 'lost' ? 0 : stageDefs[si][1],
    closing_date: date(close), status, owner_id: [me, junior, mariam, patrick, salma][i % 5],
    lost_reason: status === 'lost' ? 'Prix — concurrent local 12 % moins cher' : null,
    notes: i === 0 ? 'Le client veut une clause de pénalité sur les délais. Proposer 48 h garanties sur Douala–Yaoundé.' : null,
  }, -70 + i * 3));
  const D = (i: number) => deals[i].id as string;

  /* Leads */
  const leadData: [string, string, string, string, string, string, number, string][] = [
    ['Hervé', 'Manga', 'Supermarchés Mahima', 'Directeur achats', 'website', 'hot', 28000000, 'qualified'],
    ['Fatou', 'Camara', 'Conakry Négoce', 'Gérante', 'referral', 'warm', 15000000, 'contacted'],
    ['Rachid', 'Benali', 'Atlas Foods Maroc', 'Export Manager', 'event', 'hot', 52000000, 'qualified'],
    ['Béatrice', 'Nkoulou', 'Clinique de l’Espoir', 'Responsable achats', 'website', 'warm', 9000000, 'new'],
    ['Kwame', 'Asante', 'Accra Grain Co.', 'CEO', 'social', 'cold', 22000000, 'new'],
    ['Diane', 'Mengue', 'Mengue Cosmétiques', 'Fondatrice', 'website', 'hot', 6500000, 'contacted'],
    ['Olivier', 'Tagne', 'Tagne BTP', 'Directeur', 'cold_outreach', 'warm', 41000000, 'contacted'],
    ['Zainab', 'Yusuf', 'Kano Textiles', 'Procurement', 'event', 'warm', 18000000, 'new'],
    ['Marc', 'Eyenga', 'École Internationale Mvan', 'Intendant', 'referral', 'cold', 4500000, 'new'],
    ['Leïla', 'Farouk', 'Sharjah Imports LLC', 'Partner', 'social', 'hot', 36000000, 'qualified'],
    ['Joseph', 'Nana', 'Nana Agro Dschang', 'Président', 'website', 'warm', 7800000, 'contacted'],
    ['Clarisse', 'Bilong', 'Bilong Événements', 'Gérante', 'website', 'cold', 3200000, 'lost'],
    ['Samuel', 'Etoundi', 'Etoundi Pharma', 'Directeur', 'referral', 'hot', 19500000, 'new'],
    ['Ama', 'Mensah', 'Lomé Port Logistics', 'COO', 'event', 'warm', 27000000, 'converted'],
  ];
  const leads = leadData.map(([first, last, company, title, source, temperature, value, status], i) => base({
    id: id('h0'), first_name: first, last_name: last, company_name: company, title, source, temperature, potential_value: value, status,
    email: `${first.toLowerCase().replace(/[^a-z]/g, '')}@${company.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')}.example`,
    phone: ['+237 6 70 00 11 22', '+224 620 11 22 33', '+212 6 61 22 33 44', '+237 6 90 12 34 56', '+233 24 123 4567', '+237 6 51 23 45 67', '+237 6 99 00 11 22', '+234 802 333 4455', '+237 6 77 66 55 44', '+971 50 765 4321', '+237 6 80 90 10 20', '+237 6 59 48 37 26', '+237 6 94 85 76 67', '+228 90 12 34 56'][i],
    lead_score: [86, 54, 90, 41, 33, 72, 64, 48, 29, 83, 57, 21, 79, 88][i], assigned_to: [me, junior, mariam, patrick, salma][i % 5],
    notes: i === 0 ? 'Veut une démo de la livraison J+1 sur Yaoundé avant fin du mois.' : i === 2 ? 'Rencontré au salon PROMOTE. Volume : 6 conteneurs/mois.' : null,
    converted_at: status === 'converted' ? iso(-6) : null, converted_contact_id: null,
  }, -40 + i * 2));

  /* Activities (timeline) */
  const act = (type: string, title: string, description: string | null, links: Row, day: number, status = 'completed', by = 'user', user = me): Row => base({
    id: id('i0'), type, title, description, ...links, status, performed_by: by, user_id: by === 'user' ? user : null,
    scheduled_at: status === 'pending' ? iso(day, 11) : null, completed_at: status === 'completed' ? iso(day, 15) : null,
  }, status === 'pending' ? -1 : day);
  const activities = [
    act('meeting', 'Réunion de cadrage contrat 2027', 'Présents : E. Ngando, F. Ateba. Volumes 2026 en hausse de 18 %. Ils veulent un SLA écrit sur Douala–Yaoundé.', { contact_id: K(0), company_id: C(0), deal_id: D(0) }, -9),
    act('email', 'Proposition commerciale envoyée', 'Version 2 avec la clause délais 48 h et le tarif dégressif au-delà de 300 palettes/mois.', { contact_id: K(0), deal_id: D(0) }, -5, 'completed', 'user', junior),
    act('call', 'Appel de suivi — retour du comité', null, { contact_id: K(0), deal_id: D(0) }, 2, 'pending'),
    act('note', 'Relance automatique préparée par l’agent commercial', 'Brouillon de relance WhatsApp prêt, en attente de validation.', { contact_id: K(7), deal_id: D(5) }, -2, 'completed', 'ai'),
    act('meeting', 'Visite du port de Jebel Ali', 'Omar confirme 2 départs/mois dès février si le tarif tient.', { contact_id: K(7), company_id: C(5), deal_id: D(5) }, -12, 'completed', 'user', salma),
    act('call', 'Qualification besoin chaîne du froid', 'Besoin : 12 officines, livraison 2x/semaine, traçabilité température.', { contact_id: K(2), company_id: C(1), deal_id: D(1) }, -7, 'completed', 'user', patrick),
    act('email', 'Envoi grille tarifaire entreposage', null, { contact_id: K(3), company_id: C(2), deal_id: D(2) }, -3, 'completed', 'user', mariam),
    act('meeting', 'Négociation finale entreposage portuaire', null, { contact_id: K(3), deal_id: D(2) }, 1, 'pending', 'user', mariam),
    act('call', 'Découverte — réseau 40 magasins', 'Awa veut démarrer par 10 magasins pilotes à Dakar Plateau.', { contact_id: K(4), company_id: C(3), deal_id: D(3) }, -6, 'completed', 'user', mariam),
    act('note', 'Score de la piste recalculé', 'Score passé de 61 à 86 après 3 visites de la page tarifs.', { lead_id: leads[0].id }, -1, 'completed', 'ai'),
    act('call', 'Premier appel — Supermarchés Mahima', 'Intéressé par J+1. Demande références clients en grande distribution.', { lead_id: leads[0].id }, -4, 'completed', 'user', junior),
    act('meeting', 'Démo livraison J+1', null, { lead_id: leads[0].id }, 3, 'pending', 'user', junior),
    act('email', 'Documentation export envoyée', null, { lead_id: leads[2].id }, -8, 'completed', 'user', salma),
    act('meeting', 'Point mensuel Brasseries du Littoral', null, { company_id: C(0), contact_id: K(1) }, -20, 'completed', 'user', me),
    act('call', 'Relance facture FAC-2026-0412', 'Paiement promis par virement avant vendredi.', { contact_id: K(10), company_id: C(7) }, -2, 'completed', 'user', patrick),
    act('meeting', 'Visite entrepôt Kribi', null, { contact_id: K(11), company_id: C(7), deal_id: D(7) }, 5, 'pending', 'user', patrick),
    act('note', 'Concurrent identifié', 'TransCam propose -8 % mais sans assurance marchandise.', { deal_id: D(7) }, -4),
    act('call', 'Pilote cold chain Lagos', null, { contact_id: K(12), company_id: C(8), deal_id: D(8) }, -10, 'completed', 'user', salma),
    act('email', 'Contrat signé reçu', 'Flotte réfrigérée Kribi : contrat signé, démarrage le 1er.', { contact_id: K(11), deal_id: D(13) }, -35),
    act('note', 'Perdu — appel d’offres Bastos', 'Écart de prix trop important. Rester en contact pour 2027.', { contact_id: K(21), deal_id: D(14) }, -15),
    act('meeting', 'Atelier extension entrepôt', null, { contact_id: K(17), company_id: C(1), deal_id: D(10) }, -1, 'completed', 'user', patrick),
    act('call', 'Signature prévue', null, { contact_id: K(17), deal_id: D(10) }, 1, 'pending', 'user', patrick),
    act('email', 'Brochure Gulf → Lagos', null, { contact_id: K(20), deal_id: D(15) }, -3, 'completed', 'user', salma),
    act('meeting', 'Revue pipeline hebdomadaire', 'Focus : 3 affaires en retard sur la date de clôture.', {}, 0, 'pending', 'user', me),
  ];

  /* Tasks */
  const task = (title: string, due: number, priority: string, related: [string, string] | null, status = 'pending', assignee = me): Row => base({
    id: id('j0'), title, due_date: iso(due, 17), priority, status, related_type: related?.[0] ?? null, related_id: related?.[1] ?? null,
    assignee_id: assignee, created_by: me, completed_at: status === 'completed' ? iso(due) : null, description: null,
  }, -10);
  const tasks = [
    task('Envoyer le SLA signé à Brasseries du Littoral', -2, 'high', ['deal', D(0)]),
    task('Préparer la grille tarifaire Gulf → Lagos', 1, 'medium', ['deal', D(15)], 'pending', salma),
    task('Relancer Pharmacie Centrale sur la proposition', -1, 'urgent', ['deal', D(1)], 'pending', patrick),
    task('Mettre à jour le prévisionnel du trimestre', 3, 'medium', null),
    task('Former Mariam sur le module devis', 5, 'low', null, 'pending', junior),
    task('Vérifier les documents export Okoumé', 2, 'high', ['company', C(4)], 'pending', salma),
    task('Appeler Hervé Manga (démo J+1)', 0, 'high', ['lead', leads[0].id as string], 'pending', junior),
    task('Récupérer le bon de commande Teranga', -6, 'medium', ['deal', D(12)], 'completed', mariam),
    task('Revue mensuelle des factures impayées', 4, 'medium', null),
    task('Relance hebdomadaire des devis en attente', 1, 'low', ['workflow', 'wf-1'], 'pending'),
  ];

  /* Products */
  const productData: [string, string, string, number, number][] = [
    ['Transport routier Douala–Yaoundé (camion 30 t)', 'TRP-DY-30', 'Transport', 650000, 19.25],
    ['Entreposage — palette / mois', 'ENT-PAL', 'Entreposage', 4500, 19.25],
    ['Livraison urbaine J+1 (colis)', 'LIV-J1', 'Livraison', 2500, 19.25],
    ['Chaîne du froid — camion frigorifique / jour', 'FRD-JOUR', 'Froid', 185000, 19.25],
    ['Dédouanement — dossier conteneur', 'DED-CTN', 'Douane', 275000, 19.25],
    ['Fret maritime Dubaï → Douala (conteneur 40’)', 'FRT-DXB-40', 'Fret', 2900000, 0],
    ['Assurance marchandise (forfait mensuel)', 'ASS-MOIS', 'Assurance', 120000, 19.25],
    ['Tableau de bord traçabilité (licence / mois)', 'TRK-LIC', 'Services', 45000, 19.25],
  ];
  const products = productData.map(([name, sku, category, price, tax_rate], i) => base({
    id: id('k0'), name, sku, category, type: 'service', price, currency: 'XAF', tax_rate, status: 'active', stock: null,
    description: i === 0 ? 'Aller simple, chargement et déchargement inclus.' : null,
  }, -100));
  const P = (i: number) => products[i];

  /* Quotes & invoices with line items */
  const quote_items: Row[] = [];
  const invoice_items: Row[] = [];
  const lines = (kind: 'quote' | 'invoice', docId: string, items: [number, number][]) => {
    let subtotal = 0;
    for (const [pi, qty] of items) {
      const p = P(pi);
      const total = Number(p.price) * qty;
      subtotal += total;
      const row = base({ id: id('l0'), product_id: p.id, name: p.name, description: null, quantity: qty, unit_price: p.price, discount: 0, total, [kind === 'quote' ? 'quote_id' : 'invoice_id']: docId }, -20);
      (kind === 'quote' ? quote_items : invoice_items).push(row);
    }
    return subtotal;
  };
  const doc = (kind: 'quote' | 'invoice', number: string, contact: number, company: number, deal: number | null, items: [number, number][], extra: Row, created: number): Row => {
    const docId = id(kind === 'quote' ? 'm0' : 'n0');
    const subtotal = lines(kind, docId, items);
    const tax = Math.round(subtotal * 0.1925);
    const total = subtotal + tax;
    const common = { id: docId, contact_id: K(contact), company_id: C(company), deal_id: deal === null ? null : D(deal), subtotal, discount: 0, tax, total, currency: 'XAF', owner_id: me, notes: 'Merci pour votre confiance.', terms: kind === 'invoice' ? 'Paiement à 30 jours par virement ou Mobile Money.' : 'Offre valable 30 jours.' };
    return base(kind === 'quote' ? { ...common, quote_number: number, ...extra } : { ...common, invoice_number: number, amount_paid: 0, amount_due: total, ...extra }, created);
  };
  const quotes = [
    doc('quote', 'DEV-2026-0118', 0, 0, 0, [[0, 160], [1, 600], [6, 12]], { status: 'sent', expiration_date: date(20) }, -6),
    doc('quote', 'DEV-2026-0121', 2, 1, 1, [[3, 96], [7, 12]], { status: 'draft', expiration_date: date(30) }, -2),
    doc('quote', 'DEV-2026-0109', 4, 3, 12, [[2, 9000], [1, 400]], { status: 'accepted', expiration_date: date(-10) }, -25),
  ];
  const inv = (number: string, c: number, co: number, d: number | null, items: [number, number][], status: string, pay: string, issue: number, due: number, paidRatio: number) => {
    const row = doc('invoice', number, c, co, d, items, { status, payment_status: pay, issue_date: date(issue), due_date: date(due) }, issue);
    const paid = Math.round(Number(row.total) * paidRatio);
    row.amount_paid = paid;
    row.amount_due = Number(row.total) - paid;
    return row;
  };
  const invoices = [
    inv('FAC-2026-0412', 10, 7, 13, [[3, 120], [6, 6]], 'sent', 'partial', -28, -2, 0.5),
    inv('FAC-2026-0418', 4, 3, 12, [[2, 9000], [1, 400]], 'paid', 'paid', -20, 10, 1),
    inv('FAC-2026-0423', 0, 0, null, [[0, 40], [1, 300]], 'sent', 'unpaid', -14, 16, 0),
    inv('FAC-2026-0427', 7, 5, null, [[5, 4], [4, 4]], 'overdue', 'unpaid', -40, -10, 0),
    inv('FAC-2026-0430', 9, 6, null, [[2, 1200]], 'paid', 'paid', -9, 21, 1),
    inv('FAC-2026-0433', 12, 8, 8, [[3, 20]], 'draft', 'unpaid', -1, 29, 0),
  ];
  const payments = [
    base({ id: id('o0'), invoice_id: invoices[1].id, amount: invoices[1].total, currency: 'XAF', method: 'bank_transfer', status: 'completed', reference: 'VIR-TERANGA-0418', payment_date: iso(-12) }, -12),
    base({ id: id('o0'), invoice_id: invoices[0].id, amount: invoices[0].amount_paid, currency: 'XAF', method: 'mobile_money', status: 'completed', reference: 'OM-77812', payment_date: iso(-8) }, -8),
    base({ id: id('o0'), invoice_id: invoices[4].id, amount: invoices[4].total, currency: 'XAF', method: 'card', status: 'completed', reference: 'CB-55120', payment_date: iso(-3) }, -3),
    base({ id: id('o0'), invoice_id: null, amount: 4800000, currency: 'XAF', method: 'cash', status: 'completed', reference: 'Acompte Okoumé', payment_date: iso(-16) }, -16),
  ];
  const orders = [
    base({ id: id('p0'), order_number: 'CMD-2026-0077', contact_id: K(4), company_id: C(3), deal_id: D(12), status: 'delivered', payment_status: 'paid', fulfillment_status: 'fulfilled', total: invoices[1].total, currency: 'XAF', owner_id: mariam }, -22),
    base({ id: id('p0'), order_number: 'CMD-2026-0081', contact_id: K(10), company_id: C(7), deal_id: D(13), status: 'processing', payment_status: 'partial', fulfillment_status: 'partial', total: invoices[0].total, currency: 'XAF', owner_id: patrick }, -27),
    base({ id: id('p0'), order_number: 'CMD-2026-0084', contact_id: K(9), company_id: C(6), deal_id: null, status: 'pending', payment_status: 'unpaid', fulfillment_status: 'unfulfilled', total: 3500000, currency: 'XAF', owner_id: junior }, -2),
  ];

  /* Marketing */
  const campaigns = [
    base({ id: id('q0'), name: 'Rentrée logistique — newsletter', type: 'email', status: 'completed', channel: 'email', subject: 'Livraison J+1 à Yaoundé : c’est parti', budget: 450000, spent: 410000, currency: 'XAF', start_date: date(-45), end_date: date(-30), owner_id: junior, metrics: { sent: 3200, opened: 1410, clicked: 286 } }, -50),
    base({ id: id('q0'), name: 'Salon PROMOTE Yaoundé', type: 'event', status: 'completed', channel: 'event', budget: 2500000, spent: 2310000, currency: 'XAF', start_date: date(-25), end_date: date(-20), owner_id: me, metrics: { leads: 37 } }, -30),
    base({ id: id('q0'), name: 'Gulf → Africa LinkedIn', type: 'ads', status: 'active', channel: 'social', budget: 1800000, spent: 640000, currency: 'XAF', start_date: date(-10), end_date: date(20), owner_id: salma, metrics: { impressions: 48200, clicks: 910 } }, -12),
    base({ id: id('q0'), name: 'Relance clients inactifs (SMS)', type: 'sms', status: 'draft', channel: 'sms', budget: 300000, spent: 0, currency: 'XAF', start_date: date(7), end_date: date(14), owner_id: patrick, metrics: {} }, -1),
  ];

  /* Support */
  const ticket = (num: string, subject: string, priority: string, status: string, c: number | null, co: number | null, created: number, description: string) => base({
    id: id('r0'), ticket_number: num, subject, priority, status, contact_id: c === null ? null : K(c), company_id: co === null ? null : C(co), category: 'Livraison', description,
    assigned_to: [junior, patrick, mariam][created % 3 === 0 ? 0 : created % 2 === 0 ? 1 : 2], resolved_at: status === 'resolved' || status === 'closed' ? iso(created + 1) : null,
  }, created);
  const tickets = [
    ticket('TCK-1042', 'Livraison en retard — entrepôt Bonabéri', 'high', 'open', 1, 0, -1, '3 palettes attendues hier, toujours pas livrées.'),
    ticket('TCK-1041', 'Température hors plage sur camion FRD-12', 'urgent', 'in_progress', 2, 1, -2, 'Alerte à 9 °C pendant 40 min sur le trajet Yaoundé.'),
    ticket('TCK-1039', 'Erreur sur facture FAC-2026-0412', 'medium', 'open', 10, 7, -3, 'Le client signale une ligne assurance facturée deux fois.'),
    ticket('TCK-1035', 'Demande d’accès au tableau de traçabilité', 'low', 'resolved', 4, 3, -8, 'Créer 3 accès pour l’équipe Dakar.'),
    ticket('TCK-1031', 'Colis endommagé à la réception', 'high', 'closed', 9, 6, -15, 'Photos reçues, avoir émis.'),
    ticket('TCK-1044', 'Changement d’adresse de livraison', 'low', 'open', 20, 5, 0, 'Nouvel entrepôt à Jebel Ali Free Zone.'),
  ];

  /* AI workforce */
  const agent = (name: string, role: string, description: string, usage: number, risk: string) => base({ id: id('s0'), name, role, description, capabilities: [], permissions: {}, enabled: true, approval_required: risk !== 'low', risk_level: risk, performance: { success_rate: 0.94 }, usage_count: usage, last_active_at: iso(-0.1) }, -60);
  const ai_agents = [
    agent('Agent commercial', 'sales', 'Qualifie les pistes, prépare les relances et propose la prochaine action.', 412, 'medium'),
    agent('Agent recouvrement', 'finance', 'Suit les factures en retard et prépare des rappels courtois.', 188, 'medium'),
    agent('Agent support', 'support', 'Trie les tickets entrants et suggère une réponse.', 655, 'low'),
    agent('Agent marketing', 'marketing', 'Segmente la base contacts et rédige des campagnes.', 97, 'low'),
  ];
  const aiTask = (agentIdx: number, title: string, status: string, progress: number, created: number, requires = false) => base({
    id: id('t0'), agent_id: ai_agents[agentIdx].id, title, instruction: title, status, priority: 'medium', risk_level: requires ? 'medium' : 'low', progress,
    requires_approval: requires, requested_by: me, result: status === 'completed' ? { summary: 'Terminé' } : null, started_at: iso(created), completed_at: status === 'completed' ? iso(created + 0.2) : null,
  }, created);
  const ai_tasks = [
    aiTask(0, 'Qualifier les 12 pistes du salon PROMOTE', 'in_progress', 58, -1),
    aiTask(1, 'Préparer la relance de FAC-2026-0427 (Gulf Trade Hub)', 'pending', 0, -0.5, true),
    aiTask(2, 'Classer les tickets de la nuit', 'completed', 100, -0.3),
    aiTask(0, 'Proposer une offre de relance à Omar Al Mansouri', 'pending', 0, -0.2, true),
    aiTask(3, 'Segmenter les clients inactifs depuis 90 jours', 'completed', 100, -3),
    aiTask(1, 'Rapport hebdomadaire des encaissements', 'completed', 100, -2),
  ];
  const approvals = [
    base({ id: id('u0'), ai_task_id: ai_tasks[1].id, agent_name: 'Agent recouvrement', action_type: 'send_whatsapp', description: 'Envoyer un rappel de paiement à Gulf Trade Hub pour FAC-2026-0427 (en retard de 10 jours)', details: {}, risk_level: 'medium', status: 'pending' }, -0.5),
    base({ id: id('u0'), ai_task_id: ai_tasks[3].id, agent_name: 'Agent commercial', action_type: 'send_email', description: 'Proposer 5 % de remise sur la route Dubaï–Douala si signature avant fin du mois', details: {}, risk_level: 'medium', status: 'pending' }, -0.2),
  ];
  const workflows = [
    base({ id: 'wf-1', name: 'Relance hebdomadaire des devis en attente', description: 'Chaque lundi, crée une tâche de relance pour l’équipe commerciale.', trigger_type: 'schedule', trigger_config: { interval: 'weekly', next_run_at: iso(3, 8) }, conditions: [], actions: [{ type: 'create_task', title: 'Relancer les devis envoyés il y a plus de 7 jours', due_in_days: 2 }], enabled: true, run_count: 6, created_by: me, agent_id: ai_agents[0].id }, -45),
    base({ id: id('v0'), name: 'Alerte facture en retard', description: 'Notifie la finance quand une facture dépasse son échéance.', trigger_type: 'schedule', trigger_config: { interval: 'daily', next_run_at: iso(1, 7) }, conditions: [], actions: [{ type: 'create_notification', title: 'Factures en retard à relancer', message: 'Voir la liste des factures impayées.' }], enabled: true, run_count: 21, created_by: me, agent_id: ai_agents[1].id }, -30),
    base({ id: id('v0'), name: 'Accueil nouveau client', description: 'Lancé manuellement après la signature d’un contrat.', trigger_type: 'manual', trigger_config: {}, conditions: [], actions: [{ type: 'create_task', title: 'Appel de bienvenue J+2', due_in_days: 2 }, { type: 'create_notification', title: 'Nouveau client signé 🎉' }], enabled: true, run_count: 3, created_by: junior, agent_id: null }, -20),
  ];
  const workflow_runs = [
    base({ id: id('w0'), workflow_id: 'wf-1', status: 'completed', trigger_data: { schedule: true }, steps: [{ action: 'create_task', ok: true, detail: 'Tâche créée' }], started_at: iso(-4, 8), completed_at: iso(-4, 8) }, -4),
    base({ id: id('w0'), workflow_id: workflows[1].id, status: 'completed', trigger_data: { schedule: true }, steps: [{ action: 'create_notification', ok: true, detail: 'Notification envoyée' }], started_at: iso(-1, 7), completed_at: iso(-1, 7) }, -1),
  ];
  const ai_memory = [
    base({ id: id('x0'), type: 'preference', key: 'Ton des relances', value: 'Courtois, vouvoiement, toujours proposer un appel.', category: 'communication', enabled: true, created_by: me }, -50),
    base({ id: id('x0'), type: 'fact', key: 'Délai standard Douala–Yaoundé', value: '24 h en camion, 48 h garanties contractuellement.', category: 'operations', enabled: true, created_by: me }, -50),
    base({ id: id('x0'), type: 'rule', key: 'Remise maximale sans validation', value: '5 % — au-delà, validation de la direction.', category: 'sales', enabled: true, created_by: me }, -40),
  ];
  const knowledge_documents = [
    base({ id: id('y0'), title: 'Conditions générales de transport 2026', type: 'document', category: 'Juridique', description: 'Responsabilités, délais, assurance, litiges.', file_path: null, status: 'active', tags: ['cgv'], uploaded_by: me }, -60),
    base({ id: id('y0'), title: 'Grille tarifaire entreposage', type: 'document', category: 'Ventes', description: 'Tarifs palette/mois par ville et dégressivité.', file_path: null, status: 'active', tags: ['tarifs'], uploaded_by: junior }, -30),
    base({ id: id('y0'), title: 'Procédure chaîne du froid', type: 'faq', category: 'Opérations', description: 'Seuils de température, alertes, que faire en cas d’incident.', file_path: null, status: 'active', tags: ['froid'], uploaded_by: patrick }, -20),
  ];

  /* System */
  const notifications = [
    base({ id: id('z0'), user_id: me, type: 'approval', title: '2 actions IA attendent votre validation', message: 'Agent recouvrement et agent commercial.', link: '/app/approvals', read: false }, -0.2),
    base({ id: id('z0'), user_id: me, type: 'deal', title: 'Route maritime Dubaï–Douala a dépassé sa date de clôture', message: 'Mettez à jour la date ou l’étape.', link: `/app/deals/${D(5)}`, read: false }, -0.5),
    base({ id: id('z0'), user_id: me, type: 'invoice', title: 'FAC-2026-0427 est en retard de 10 jours', message: 'Gulf Trade Hub FZE.', link: `/app/invoices/${invoices[3].id}`, read: false }, -1),
    base({ id: id('z0'), user_id: me, type: 'payment', title: 'Paiement reçu : FAC-2026-0430', message: 'Carte bancaire — Hôtel Mont Fébé Prestige.', link: '/app/payments', read: true }, -3),
  ];
  const audit_logs = [
    base({ id: id('b0'), actor_type: 'user', actor_name: 'Aïcha Mbarga', actor_id: me, action: 'update', entity_type: 'deal', entity_id: D(0), entity_name: 'Contrat-cadre logistique 2027', changes: { stage: 'Négociation' }, source: 'web' }, -2),
    base({ id: id('b0'), actor_type: 'ai', actor_name: 'Agent commercial', actor_id: null, action: 'create', entity_type: 'activity', entity_id: null, entity_name: 'Relance préparée', changes: {}, source: 'ai' }, -2),
    base({ id: id('b0'), actor_type: 'user', actor_name: 'Mariam Ndiaye', actor_id: mariam, action: 'create', entity_type: 'quote', entity_id: quotes[2].id, entity_name: 'DEV-2026-0109', changes: {}, source: 'web' }, -25),
    base({ id: id('b0'), actor_type: 'user', actor_name: 'Patrick Fotso', actor_id: patrick, action: 'update', entity_type: 'invoice', entity_id: invoices[0].id, entity_name: 'FAC-2026-0412', changes: { payment_status: 'partial' }, source: 'web' }, -8),
    base({ id: id('b0'), actor_type: 'system', actor_name: 'Workflow', actor_id: null, action: 'run', entity_type: 'workflow', entity_id: 'wf-1', entity_name: 'Relance hebdomadaire des devis', changes: {}, source: 'schedule' }, -4),
  ];
  const teams = [
    base({ id: id('t1'), name: 'Ventes Afrique centrale', description: 'Cameroun, Gabon', lead_id: junior }, -100),
    base({ id: id('t1'), name: 'Export & Golfe', description: 'Dubaï, Lagos, Dakar', lead_id: salma }, -100),
  ];
  const team_members = [
    { id: id('t2'), team_id: teams[0].id, user_id: junior, role: 'lead', created_at: iso(-100) },
    { id: id('t2'), team_id: teams[0].id, user_id: patrick, role: 'member', created_at: iso(-100) },
    { id: id('t2'), team_id: teams[1].id, user_id: salma, role: 'lead', created_at: iso(-100) },
    { id: id('t2'), team_id: teams[1].id, user_id: mariam, role: 'member', created_at: iso(-100) },
  ];
  const roleIds = [id('r1'), id('r1'), id('r1')];
  const rbac_roles = [
    base({ id: roleIds[0], name: 'Owner', description: 'Accès complet', scope: 'tenant', is_system: true }, -120),
    base({ id: roleIds[1], name: 'Admin', description: 'Gestion de l’équipe et des modules', scope: 'tenant', is_system: true }, -120),
    base({ id: roleIds[2], name: 'Member', description: 'Travail quotidien sur le CRM', scope: 'tenant', is_system: true }, -120),
  ];
  const modules = ['contacts', 'companies', 'leads', 'deals', 'quotes', 'invoices', 'tickets', 'reports'];
  const rbac_permissions: Row[] = [];
  modules.forEach(m => ['read', 'write', 'delete', 'export'].forEach(a => {
    rbac_permissions.push({ id: id('r2'), role_id: roleIds[0], module: m, action: a, created_at: iso(-120) });
    if (a !== 'delete') rbac_permissions.push({ id: id('r2'), role_id: roleIds[1], module: m, action: a, created_at: iso(-120) });
    if (a === 'read' || a === 'write') rbac_permissions.push({ id: id('r2'), role_id: roleIds[2], module: m, action: a, created_at: iso(-120) });
  }));
  const dashboards = [base({ id: id('b1'), name: 'Direction commerciale', description: 'Chiffre d’affaires, pipeline et nouvelles pistes', config: { widgets: ['revenue', 'deals', 'leads'] }, created_by: me }, -15)];
  const subscriptions = [base({ id: id('b2'), plan: 'pro', status: 'trialing', price_cents: 11900, currency: 'USD', billing_cycle: 'monthly', payment_provider: 'flutterwave', current_period_start: iso(-0), current_period_end: iso(14) }, -1)];

  return {
    organizations, profiles, companies, contacts, leads, pipelines, pipeline_stages, deals, activities, tasks, products,
    quotes, quote_items, invoices, invoice_items, payments, orders, campaigns, tickets, ai_agents, ai_tasks, approvals,
    workflows, workflow_runs, ai_memory, knowledge_documents, notifications, audit_logs, teams, team_members,
    rbac_roles, rbac_permissions, rbac_user_roles: [{ id: id('r3'), user_id: me, role_id: roleIds[0], org_id: org, created_at: iso(-120) }],
    dashboards, subscriptions, integrations: [], webhooks: [], api_keys: [], billing_payment_intents: [],
    // Platform-level tables stay empty: the demo has no Super Admin.
    super_admins: [], platform_staff: [], platform_audit_log: [], platform_revenue: [], platform_expenses: [], sales_codes: [], employee_kpis: [],
  };
}
