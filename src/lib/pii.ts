/**
 * Contact details (e-mail, phone, WhatsApp) of contacts and leads are only
 * readable through the contacts_v / leads_v views (migrations 052–053): the
 * database returns the real value or a masked one ("j•••@g•••.com") depending
 * on the workspace's masking setting and the caller's role. Writes still go
 * to the tables. Use readTable() for every read of these two tables.
 */
export const PII_TABLES: Record<string, string> = { contacts: 'contacts_v', leads: 'leads_v' };
export const PII_FIELDS = ['email', 'phone', 'whatsapp'];

export function readTable(table: string): string {
  return PII_TABLES[table] || table;
}

export function isPiiTable(table: string): boolean {
  return table in PII_TABLES;
}

/** True when a value came back masked by the database. */
export function isMasked(v: unknown): boolean {
  return typeof v === 'string' && v.includes('•');
}
