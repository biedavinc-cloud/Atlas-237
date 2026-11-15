import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, RotateCcw, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { exitDemo, resetDemo } from '@/lib/demo/mode';

/** Thin bar shown on every page of the demo workspace. */
export function DemoBanner() {
  const { language } = useAuth();
  const fr = language !== 'en';
  const [tourOpen, setTourOpen] = useState(() => {
    try { return sessionStorage.getItem('atlas-demo-tour') !== 'done'; } catch { return true; }
  });
  function closeTour() {
    setTourOpen(false);
    try { sessionStorage.setItem('atlas-demo-tour', 'done'); } catch { /* ignore */ }
  }
  return (
    <>
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-accent-200 bg-accent-50 px-4 py-2 text-sm text-accent-900 sm:px-6">
        <Sparkles size={15} className="flex-none text-accent-600" />
        <p className="min-w-0 flex-1 truncate sm:whitespace-normal">
          <span className="font-semibold">{fr ? 'Mode démo' : 'Demo mode'}</span>
          <span className="hidden sm:inline">{fr ? ' · Savane Distribution est une entreprise fictive. Tout ce que vous modifiez reste dans ce navigateur.' : ' · Savane Distribution is a fictional company. Anything you change stays in this browser.'}</span>
          <span className="sm:hidden">{fr ? ' · données fictives' : ' · sample data'}</span>
        </p>
        <button onClick={resetDemo} className="inline-flex flex-none items-center gap-1 text-xs font-semibold text-accent-800 hover:underline" title={fr ? 'Réinitialiser la démo' : 'Reset the demo'}>
          <RotateCcw size={12} /> <span className="hidden sm:inline">{fr ? 'Réinitialiser' : 'Reset'}</span>
        </button>
        <button onClick={() => exitDemo('/auth?mode=signup')} className="btn btn-sm flex-none bg-accent-600 text-white hover:bg-accent-700">
          <span className="sm:hidden">{fr ? 'S’inscrire' : 'Sign up'}</span>
          <span className="hidden sm:inline">{fr ? 'Créer mon compte gratuit' : 'Create my free account'}</span>
        </button>
      </div>

      {tourOpen && (
        <div className="fixed bottom-4 end-4 start-4 sm:start-auto z-[55] sm:w-[360px] rounded-2xl bg-navy-900 p-5 text-white shadow-pop animate-scale-in" role="dialog" aria-label={fr ? 'Bienvenue dans la démo' : 'Welcome to the demo'}>
          <button onClick={closeTour} className="absolute end-3 top-3 rounded-md p-1 text-navy-300 hover:bg-white/10 hover:text-white" aria-label={fr ? 'Fermer' : 'Close'}><X size={16} /></button>
          <p className="text-base font-bold">{fr ? 'Bienvenue dans Atlas' : 'Welcome to Atlas'}</p>
          <p className="mt-1 text-sm text-navy-200">{fr ? 'Vous êtes Aïcha, directrice commerciale. Quatre choses à essayer :' : 'You are Aïcha, sales director. Four things to try:'}</p>
          <ol className="mt-3 space-y-2 text-sm">
            {[
              [fr ? 'Faites glisser une affaire dans le pipeline' : 'Drag a deal across the pipeline', '/app/pipelines'],
              [fr ? 'Ouvrez la fiche d’un contact et notez un appel' : 'Open a contact and log a call', '/app/contacts'],
              [fr ? 'Ajoutez une ligne à une facture et imprimez-la' : 'Add a line to an invoice and print it', '/app/invoices'],
              [fr ? 'Demandez à Atlas « affaires en retard ? »' : 'Ask Atlas "overdue deals?"', '/app/ask-atlas?q=' + encodeURIComponent(fr ? 'affaires en retard ?' : 'overdue deals?')],
            ].map(([label, to], i) => (
              <li key={i}>
                <Link to={to} onClick={closeTour} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/10">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold">{i + 1}</span>
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={14} className="text-navy-300 group-hover:text-white rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
