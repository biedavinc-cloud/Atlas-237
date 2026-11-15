import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional one-line description under the title. */
  description?: string;
}

export function Modal({ open, onClose, title, children, size = 'md', description }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes, the page behind doesn't scroll, and focus moves into the
  // dialog on open and back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-modal-close])');
    (first || panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${sizeClass} max-h-[92vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-pop animate-scale-in focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 sm:px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink-900 leading-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button data-modal-close onClick={onClose} aria-label="Close" className="btn-icon -me-2 -mt-1">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-4.5rem)] sm:max-h-[calc(90vh-4.5rem)] overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
