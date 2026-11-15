import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  fullPage?: boolean;
}

function defaultText(): string {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
  return ({ fr: 'Chargement…', es: 'Cargando…', pt: 'Carregando…', ar: 'جارٍ التحميل…' } as Record<string, string>)[lang] || 'Loading…';
}

export function Loading({ text, fullPage = false }: LoadingProps) {
  const label = text || defaultText();
  if (fullPage) {
    return (
      <div role="status" className="flex flex-col items-center justify-center min-h-screen w-full bg-canvas">
        <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
        <p className="mt-3 text-sm text-ink-500">{label}</p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
      <span className="ms-2 text-sm text-ink-500">{label}</span>
    </div>
  );
}
