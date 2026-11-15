/**
 * Where each marketplace app is actually used inside Atlas.
 *
 * This is the rule for the marketplace: an app is listed ONLY if it has at
 * least one real place of use below, backed by real code (a quick action on
 * a record, a workflow action in supabase/functions/integration-action, or
 * Ask Atlas). An app whose credentials would just be stored and never read
 * is not offered — connecting it would do nothing.
 *
 * Adding an app: implement the call (integration-action + a quick action
 * where the user naturally needs it), then add its entry here. The
 * marketplace card and the Connected Apps page read this list.
 */
export interface AppUse {
  fr: string;
  en: string;
  to: string;
}

const WORKFLOWS: AppUse = { fr: 'Workflows (action automatique)', en: 'Workflows (automated action)', to: '/app/ai-workflows' };
const ASK_ATLAS: AppUse = { fr: 'Ask Atlas (réponses IA)', en: 'Ask Atlas (AI answers)', to: '/app/ask-atlas' };
const AI_SETTINGS: AppUse = { fr: 'Paramètres → Choisir votre IA', en: 'Settings → Choose your AI', to: '/app/settings' };
const CONTACT: AppUse = { fr: 'Fiche contact', en: 'Contact record', to: '/app/contacts' };
const LEAD: AppUse = { fr: 'Fiche lead', en: 'Lead record', to: '/app/leads' };
const INVOICE: AppUse = { fr: 'Factures → lien de paiement', en: 'Invoices → payment link', to: '/app/invoices' };
const DOCS: AppUse = { fr: 'Devis et factures → envoi par email', en: 'Quotes & invoices → send by email', to: '/app/invoices' };
const TICKETS: AppUse = { fr: 'Tickets support → escalade', en: 'Support tickets → escalate', to: '/app/support' };

export const APP_USAGE: Record<string, AppUse[]> = {
  openai: [ASK_ATLAS, AI_SETTINGS],
  anthropic: [ASK_ATLAS, AI_SETTINGS],
  gemini: [ASK_ATLAS, AI_SETTINGS],
  whatsapp: [CONTACT, LEAD, WORKFLOWS],
  twilio: [CONTACT, LEAD, WORKFLOWS],
  resend: [CONTACT, LEAD, DOCS, WORKFLOWS],
  telegram: [WORKFLOWS],
  mailchimp: [CONTACT, LEAD, WORKFLOWS],
  hubspot: [CONTACT, LEAD, WORKFLOWS],
  shopify: [CONTACT, WORKFLOWS],
  woocommerce: [CONTACT, WORKFLOWS],
  freshdesk: [TICKETS, WORKFLOWS],
  mollie: [INVOICE, WORKFLOWS],
  cinetpay: [INVOICE, WORKFLOWS],
  wave: [INVOICE, WORKFLOWS],
  chapa: [INVOICE, WORKFLOWS],
  campay: [INVOICE, WORKFLOWS],
};

/** What the app does for the user, in one line (shown on the marketplace card). */
export const APP_PURPOSE: Record<string, { fr: string; en: string }> = {
  openai: { fr: 'Fait répondre Ask Atlas avec GPT, sur vos données CRM.', en: 'Ask Atlas answers with GPT, on your CRM data.' },
  anthropic: { fr: 'Fait répondre Ask Atlas avec Claude, sur vos données CRM.', en: 'Ask Atlas answers with Claude, on your CRM data.' },
  gemini: { fr: 'Fait répondre Ask Atlas avec votre propre clé Gemini.', en: 'Ask Atlas answers with your own Gemini key.' },
  whatsapp: { fr: 'Écrivez à un contact ou un lead sur WhatsApp depuis sa fiche.', en: 'Message a contact or lead on WhatsApp from their record.' },
  twilio: { fr: 'Envoyez un SMS à un contact ou un lead depuis sa fiche.', en: 'Text a contact or lead from their record.' },
  resend: { fr: 'Envoyez des emails, devis et factures depuis votre domaine.', en: 'Send emails, quotes and invoices from your own domain.' },
  telegram: { fr: 'Recevez des alertes Telegram quand un workflow tourne.', en: 'Get Telegram alerts when a workflow runs.' },
  mailchimp: { fr: 'Ajoutez un contact à une audience Mailchimp en un clic.', en: 'Add a contact to a Mailchimp audience in one click.' },
  hubspot: { fr: 'Poussez un contact Atlas vers HubSpot.', en: 'Push an Atlas contact to HubSpot.' },
  shopify: { fr: 'Créez le client dans votre boutique Shopify.', en: 'Create the customer in your Shopify store.' },
  woocommerce: { fr: 'Créez le client dans votre boutique WooCommerce.', en: 'Create the customer in your WooCommerce store.' },
  freshdesk: { fr: 'Escaladez un ticket Atlas vers Freshdesk.', en: 'Escalate an Atlas ticket to Freshdesk.' },
  mollie: { fr: 'Générez un lien de paiement Mollie pour une facture.', en: 'Generate a Mollie payment link for an invoice.' },
  cinetpay: { fr: 'Encaissez une facture en Mobile Money via CinetPay.', en: 'Collect an invoice by Mobile Money via CinetPay.' },
  wave: { fr: 'Encaissez une facture avec Wave.', en: 'Collect an invoice with Wave.' },
  chapa: { fr: 'Encaissez une facture avec Chapa.', en: 'Collect an invoice with Chapa.' },
  campay: { fr: 'Encaissez une facture en MTN / Orange Money via CamPay.', en: 'Collect an invoice by MTN / Orange Money via CamPay.' },
};

export function isUsableApp(provider: string): boolean {
  return (APP_USAGE[provider]?.length || 0) > 0;
}
