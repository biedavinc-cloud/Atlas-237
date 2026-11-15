import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="relative mb-5">
        <div className="absolute -inset-3 rounded-full contour-ink opacity-80" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-600 ring-1 ring-ink-200 shadow-card">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-bold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-500 max-w-sm mb-5">{description}</p>
      {action}
    </div>
  );
}
