import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <Card className={cn('flex flex-col items-center py-8 text-center', className)}>
      {icon && (
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]">
          {icon}
        </div>
      )}
      <h3 className="text-[1.0625rem] font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1.5 max-w-[30ch] text-[0.9375rem] text-[var(--text-secondary)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};

export const ErrorState: React.FC<{ onRetry: () => void; className?: string }> = ({
  onRetry,
  className,
}) => {
  const { t } = useI18n();

  return (
    <Card role="alert" className={cn('flex flex-col items-center py-8 text-center', className)}>
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-ink)]">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-[1.0625rem] font-bold text-[var(--text-primary)]">
        {t('common.errorTitle')}
      </h3>
      <p className="mt-1.5 max-w-[30ch] text-[0.9375rem] text-[var(--text-secondary)]">
        {t('common.errorDesc')}
      </p>
      <Button variant="primary" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        <span>{t('common.retry')}</span>
      </Button>
    </Card>
  );
};

export const LoadingListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </Card>
      ))}
    </div>
  );
};
