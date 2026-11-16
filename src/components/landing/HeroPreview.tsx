import { Bot, CheckCircle2, FileText, LayoutGrid, Link2, Mail, MessageCircle, MousePointer2, Users } from 'lucide-react';

type Lang = 'fr' | 'en';

/**
 * Animated product preview under the hero: a stylised Atlas window with the
 * demo company's numbers, a deal dragged through the pipeline by a cursor,
 * Ask Atlas answering, and real integrations firing (WhatsApp, Resend,
 * payment link). Pure HTML/CSS (transform + opacity only); the 3D stage
 * leans with the mouse and flattens as you scroll (useLandingMotion sets
 * --lp-rx / --lp-ry on #lp-stage). Figures are the demo's fictional data and
 * the caption says so. prefers-reduced-motion freezes it on a readable frame.
 */
export function HeroPreview({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const cols = fr ? ['Qualification', 'Proposition', 'Négociation'] : ['Qualification', 'Proposal', 'Negotiation'];
  const cards: [string, string][][] = [
    [['Hôtel Mont Fébé', '4,2 M FCFA'], ['Brasseries du Littoral', '9,8 M FCFA']],
    [['Pharmacie Akwa', '1,6 M FCFA'], ['Groupe Ndiaye', '6,1 M FCFA']],
    [['Port Autonome — lot 3', '12 M FCFA']],
  ];
  const kpis = [
    { l: fr ? 'Revenu encaissé' : 'Revenue collected', v: '51 M', u: 'FCFA', spark: true },
    { l: fr ? 'Affaires ouvertes' : 'Open deals', v: '13', u: fr ? 'au pipeline' : 'in pipeline' },
    { l: fr ? 'Factures impayées' : 'Unpaid invoices', v: '4', u: fr ? 'à relancer' : 'to chase' },
  ];

  return (
    <div className="lp-preview-wrap relative mx-auto mt-16 max-w-5xl px-4 sm:px-6" aria-hidden="true">
      {/* light behind the window */}
      <div className="lp-glow pointer-events-none absolute inset-x-10 top-10 bottom-0 rounded-[40px]" />

      <div id="lp-stage" className="lp-stage relative">
        <div className="lp-preview relative overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-[0_40px_100px_-40px_rgba(1,118,211,0.45),0_12px_32px_-16px_rgba(15,23,42,0.28)]">
          <span className="lp-sheen pointer-events-none absolute inset-0 z-20" />
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ms-3 truncate rounded-md bg-white px-3 py-1 text-[11px] text-ink-500 ring-1 ring-ink-100">atlas.liafrik.com/app/pipelines</span>
            <span className="ms-auto hidden items-center gap-1.5 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700 sm:inline-flex"><span className="lp-live h-1.5 w-1.5 rounded-full bg-success-500" />{fr ? 'En direct' : 'Live'}</span>
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
                <span key={n.l} className={`relative flex items-center gap-2 rounded-md px-2 py-1.5 ${n.on ? 'bg-white/10 text-white' : ''}`}>
                  {n.on && <span className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary-400" />}
                  {n.i}{n.l}
                </span>
              ))}
            </div>

            <div className="min-w-0 flex-1 p-3 sm:p-4">
              {/* KPI strip */}
              <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
                {kpis.map((k, i) => (
                  <div key={k.l} className="lp-kpi relative overflow-hidden rounded-xl border border-ink-100 bg-white p-2 sm:p-2.5" style={{ ['--i' as string]: i }}>
                    <p className="truncate text-[10px] font-semibold text-ink-500">{k.l}</p>
                    <p className="mt-0.5 text-[15px] font-bold leading-5 text-ink-900 sm:text-lg">{k.v} <span className="text-[10px] font-semibold text-ink-400">{k.u}</span></p>
                    {k.spark && (
                      <svg viewBox="0 0 100 24" className="absolute bottom-1 end-1 hidden h-5 w-20 sm:block" fill="none">
                        <path className="lp-spark" d="M0 20 L14 16 L26 18 L38 11 L52 13 L64 7 L78 9 L100 2" stroke="#0176d3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

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
                {/* the deal dragged through the stages, with its cursor */}
                <div className="lp-travel pointer-events-none absolute start-0 top-[32.5px] w-[calc((100%-1rem)/3)] px-2 sm:top-[34.5px] sm:w-[calc((100%-1.5rem)/3)] sm:px-2.5">
                  <div className="lp-lift relative h-[46px] rounded-lg bg-white p-2 shadow-lg ring-2 ring-primary-400">
                    <p className="truncate text-[11px] font-bold text-ink-900">Savane × Douala Port</p>
                    <p className="text-[10px] text-primary-700">7,5 M FCFA</p>
                    <span className="lp-won absolute -end-1.5 -top-2 inline-flex items-center gap-0.5 rounded-full bg-success-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                      <CheckCircle2 size={9} /> {fr ? 'Gagnée' : 'Won'}
                    </span>
                    <MousePointer2 size={18} className="lp-cursor absolute -bottom-3 end-3 fill-ink-900 text-white drop-shadow" strokeWidth={1.5} />
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
                <p className="font-semibold text-ink-900">{fr ? '4 factures en attente' : '4 invoices pending'}</p>
                <p>{fr ? 'La plus ancienne : FAC-0412' : 'Oldest: FAC-0412'}</p>
                <p className="text-primary-700">{fr ? 'Ouvrir les factures →' : 'Open invoices →'}</p>
              </div>
            </div>
          </div>

          {/* toast */}
          <div className="lp-toast absolute bottom-3 end-3 z-10 flex items-center gap-2 rounded-xl bg-navy-900 px-3 py-2 text-[11px] text-white shadow-pop">
            <Mail size={13} className="text-primary-200" /> {fr ? 'Facture envoyée via Resend' : 'Invoice sent via Resend'}
          </div>
        </div>

        {/* floating cards: real integrations, in front of the window (desktop) */}
        <div className="lp-float lp-float-a absolute -start-16 top-[58%] z-30 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 text-start shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] ring-1 ring-ink-100 backdrop-blur xl:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25d366] text-white"><MessageCircle size={16} /></span>
          <span>
            <span className="block text-[12px] font-bold text-ink-900">{fr ? 'WhatsApp envoyé' : 'WhatsApp sent'}</span>
            <span className="block text-[11px] text-ink-500">{fr ? 'Relance devis · Esther N.' : 'Quote follow-up · Esther N.'}</span>
          </span>
          <CheckCircle2 size={15} className="text-success-600" />
        </div>
        <div className="lp-float lp-float-b absolute -end-14 top-[60%] z-30 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 text-start shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] ring-1 ring-ink-100 backdrop-blur xl:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-100 text-warning-700"><Link2 size={16} /></span>
          <span>
            <span className="block text-[12px] font-bold text-ink-900">{fr ? 'Lien de paiement créé' : 'Payment link created'}</span>
            <span className="block text-[11px] text-ink-500">Mobile Money · FAC-0412</span>
          </span>
        </div>
      </div>
      <p className="relative mt-4 text-center text-xs text-ink-400">{fr ? 'Aperçu animé de la démo, données fictives.' : 'Animated preview of the demo, fictional data.'}</p>
    </div>
  );
}
