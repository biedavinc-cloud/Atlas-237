import { AtlasMark } from '@/components/AtlasMark';

interface LoadingProps {
  text?: string;
  fullPage?: boolean;
}

function defaultText(): string {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
  return ({ fr: 'Chargement…', es: 'Cargando…', pt: 'Carregando…', ar: 'جارٍ التحميل…' } as Record<string, string>)[lang] || 'Loading…';
}

/** Loading states turn around the Atlas logo. */
export function Loading({ text, fullPage = false }: LoadingProps) {
  const label = text || defaultText();
  if (fullPage) {
    return (
      <div role="status" className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas">
        <AtlasMark size={64} busy />
        <p className="mt-4 text-sm text-ink-500">{label}</p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center py-16">
      <AtlasMark size={28} busy />
      <span className="ms-3 text-sm text-ink-500">{label}</span>
    </div>
  );
}
