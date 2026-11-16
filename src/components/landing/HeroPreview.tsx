import { Bot, CheckCircle2, FileText, LayoutGrid, Mail, Users } from 'lucide-react';

type Lang = 'fr' | 'en';

/**
 * Animated product preview under the hero: a stylised Atlas window where a
 * deal travels through the pipeline, Ask Atlas answers a question and an
 * email confirmation slides in. Pure HTML/CSS (transform + opacity only),
 * no images, no JS timers. Everything shown is a real Atlas feature, with
 * the demo's fictional data, and it is labelled as such.
 * prefers-reduced-motion freezes it on a readable frame (index.css).
 */
export function HeroPreview({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const cols = fr ? ['Qualification', 'Proposition', 'Négociation'] : ['Qualification', 'Proposal', 'Negotiation'];
  const cards: [string, string][][] = [
    [['Hôtel Mont Fébé', '4,2 M FCFA'], ['Brasseries du Littoral', '9,8 M FCFA']],
    [['Pharmacie Akwa', '1,6 M FCFA'], ['Groupe Ndiaye', '6,1 M FCFA']],
    [['Port Autonome — lot 3', '12 M FCFA']],
  ];

  return (
    <div className="lp-preview-wrap relative mx-auto mt-14 max-w-5xl px-4 sm:px-6" aria-hidden="true">
      <div className="lp-preview relative overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-[0_30px_80px_-30px_rgba(1,118,211,0.35),0_10px_30px_-15px_rgba(15,23,42,0.25)]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ms-3 truncate rounded-md bg-white px-3 py-1 text-[11px] text-ink-500 ring-1 ring-ink-100">atlas.liafrik.com/app/pipelines</span>
        </div>

        <div className="flex text-start">
          {/* sidebar */}
          <div className="hidden w-40 flex-none flex-col gap-1 bg-navy-900 p-3 text-[12px] text-navy-100 sm:flex">
            <span className="mb-2 flex items-center gap-2 font-bold text-white"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-[11px]">S</span>Savane</span>
            {[
              { i: <Users size={13} />, l: 'Contacts' },
              { i: <LayoutGrid size={13} />, l: 'Pipeline', on: true },
              { i: <FileText size={13} />, l: fr ? 'Factures' : 'Invoices' },
              { i: <Bot size={13} />, l: 'Ask Atlas' },
            ].map(n => (
              <span key={n.l} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${n.on ? 'bg-white/10 text-white' : ''}`}>{n.i}{n.l}</span>
            ))}
          </div>

          {/* pipeline */}
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink-900">{fr ? 'Pipeline des ventes' : 'Sales pipeline'}</p>
              <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">{fr ? 'Glisser-déposer' : 'Drag & drop'}</span>
            </div>
            <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
              {cols.map((c, ci) => (
                <div key={c} className="min-w-0 rounded-xl bg-ink-50 p-2 sm:p-2.5">
                  <p className="mb-2 flex items-center justify-between text-[11px] font-semibold text-ink-600">
                    <span className="truncate">{c}</span>
                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${['bg-warning-400', 'bg-primary-500', 'bg-success-500'][ci]}`} />
                  </p>
                  <div className="space-y-2">
                    {/* reserved slot where the travelling card passes */}
                    <div className="h-[46px] rounded-lg border border-dashed border-ink-200/80" />
                    {cards[ci].map(([n, v]) => (
                      <div key={n} className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-ink-100">
                        <p className="truncate text-[11px] font-semibold text-ink-800">{n}</p>
                        <p className="text-[10px] text-ink-500">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* the deal that moves through the stages */}
              <div className="lp-travel pointer-events-none absolute start-0 top-[32.5px] w-[calc((100%-1rem)/3)] px-2 sm:top-[34.5px] sm:w-[calc((100%-1.5rem)/3)] sm:px-2.5">
                <div className="relative h-[46px] rounded-lg bg-white p-2 shadow-lg ring-2 ring-primary-400">
                  <p className="truncate text-[11px] font-bold text-ink-900">Savane × Douala Port</p>
                  <p className="text-[10px] text-primary-700">7,5 M FCFA</p>
                  <span className="lp-won absolute -end-1.5 -top-2 inline-flex items-center gap-0.5 rounded-full bg-success-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                    <CheckCircle2 size={9} /> {fr ? 'Gagnée' : 'Won'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ask Atlas */}
          <div className="hidden w-60 flex-none border-s border-ink-100 p-4 lg:block">
            <p className="mb-3 flex items-center gap-1.5 text-[12px] font-bold text-ink-900"><Bot size={14} className="text-primary-600" /> Ask Atlas</p>
            <div className="lp-q ms-6 rounded-xl rounded-se-sm bg-primary-600 px-3 py-2 text-[11px] text-white">
              {fr ? 'Quelles factures sont impayées ?' : 'Which invoices are unpaid?'}
            </div>
            <div className="lp-typing mt-2 flex w-12 items-center justify-center gap-1 rounded-xl bg-ink-100 py-2">
              <span className="lp-dot h-1.5 w-1.5 rounded-full bg-ink-400" /><span className="lp-dot h-1.5 w-1.5 rounded-full bg-ink-400" /><span className="lp-dot h-1.5 w-1.5 rounded-full bg-ink-400" />
            </div>
            <div className="lp-a mt-2 space-y-1 rounded-xl rounded-ss-sm bg-ink-50 px-3 py-2 text-[11px] text-ink-700 ring-1 ring-ink-100">
              <p className="font-semibold text-ink-900">{fr ? '3 factures en attente' : '3 invoices pending'}</p>
              <p>{fr ? 'La plus ancienne : FAC-0412' : 'Oldest: FAC-0412'}</p>
              <p className="text-primary-700">{fr ? 'Ouvrir les factures →' : 'Open invoices →'}</p>
            </div>
          </div>
        </div>

        {/* toast */}
        <div className="lp-toast absolute bottom-3 end-3 flex items-center gap-2 rounded-xl bg-navy-900 px-3 py-2 text-[11px] text-white shadow-pop">
          <Mail size={13} className="text-primary-200" /> {fr ? 'Facture envoyée via Resend' : 'Invoice sent via Resend'}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-400">{fr ? 'Aperçu animé de la démo, données fictives.' : 'Animated preview of the demo, fictional data.'}</p>
    </div>
  );
}
