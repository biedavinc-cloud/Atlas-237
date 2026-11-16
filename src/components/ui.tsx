import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { language } = useAuth();
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error-50 text-error-600 ring-1 ring-inset ring-error-100">
        <AlertCircle size={22} />
      </div>
      <h3 className="text-base font-bold text-ink-900 mb-1">{t('common.errorTitle', language)}</h3>
      <p className="text-sm text-ink-500 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm">{t('common.retry', language)}</button>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'accent';
  /** Short supporting line under the value (e.g. "last 7 days"). */
  hint?: string;
  /** Makes the whole tile a link to the module the number comes from. */
  to?: string;
}

const STAT_COLORS = {
  primary: 'text-primary-600 bg-primary-50',
  success: 'text-success-600 bg-success-50',
  warning: 'text-warning-600 bg-warning-50',
  error: 'text-error-600 bg-error-50',
  accent: 'text-accent-600 bg-accent-50',
};

export function StatCard({ label, value, icon, trend, color = 'primary', hint, to }: StatCardProps) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold text-ink-500 sm:truncate">{label}</p>
        <p className="mt-1 break-words text-base font-bold leading-6 text-ink-900 tabular min-[400px]:text-lg sm:text-[26px] sm:leading-8">{value}</p>
        {trend && (
          <p className={`text-xs font-semibold mt-1 ${trend.positive ? 'text-success-600' : 'text-error-600'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </p>
        )}
        {hint && !trend && <p className="mt-1 line-clamp-2 text-xs text-ink-400 sm:truncate">{hint}</p>}
      </div>
      <div className={`hidden h-9 w-9 flex-none items-center justify-center rounded-lg sm:flex ${STAT_COLORS[color]}`}>
        {icon}
      </div>
    </div>
  );
  if (to) {
    return <Link to={to} className="card-hover block p-4 sm:p-5">{body}</Link>;
  }
  return <div className="card p-4 sm:p-5">{body}</div>;
}

interface BadgeProps {
  variant: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  children: ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const classes = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral',
  };
  return <span className={classes[variant]}>{children}</span>;
}
