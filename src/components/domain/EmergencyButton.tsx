import React from 'react';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';

interface EmergencyCallButtonProps {
  service: 'police' | 'gendarmerie';
  compact?: boolean;
  className?: string;
}

export const EmergencyCallButton: React.FC<EmergencyCallButtonProps> = ({
  service,
  compact = false,
  className,
}) => {
  const { t, formatNumber } = useI18n();
  const isPolice = service === 'police';
  const rawNumber = isPolice ? '19' : '177';
  const displayNumber = formatNumber(isPolice ? 19 : 177, { useGrouping: false });
  const label = t(isPolice ? 'emergency.policeLabel' : 'emergency.gendarmerieLabel');
  const ariaLabel = t(isPolice ? 'emergency.policeAria' : 'emergency.gendarmerieAria');

  return (
    <a
      href={`tel:${rawNumber}`}
      aria-label={ariaLabel}
      className={cn(
        'group flex min-h-[52px] items-center justify-between gap-2.5 rounded-[var(--radius-md)] border border-[var(--alert-border)] bg-[var(--alert-soft)] px-3.5 py-2.5 text-[var(--alert-soft-ink)] transition-all hover:brightness-95 active:scale-[0.985]',
        compact && 'min-h-[44px] px-3 py-2',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--alert)] text-[var(--alert-ink)]">
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="truncate text-[0.9375rem] font-semibold leading-tight">
          {label}
        </span>
      </div>
      <span
        dir="ltr"
        className="tabular-nums shrink-0 rounded-full bg-[var(--alert)] px-2.5 py-0.5 text-[0.9375rem] font-bold text-[var(--alert-ink)]"
      >
        {displayNumber}
      </span>
    </a>
  );
};

export const EmergencyCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useI18n();

  return (
    <Card className={cn('border-[var(--alert-border)]/80 bg-[var(--bg-surface)]', className)}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--alert-soft)] text-[var(--alert-soft-ink)]">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)]">
            {t('emergency.cardTitle')}
          </h2>
          <p className="mt-0.5 text-[0.875rem] text-[var(--text-secondary)]">
            {t('emergency.cardSubtitle')}
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2.5">
        <EmergencyCallButton service="police" />
        <EmergencyCallButton service="gendarmerie" />
      </div>
    </Card>
  );
};

export const EmergencyBanner: React.FC<{ className?: string }> = ({ className }) => {
  const { t, formatNumber } = useI18n();

  return (
    <div
      role="note"
      className={cn(
        'flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--alert-border)] bg-[var(--alert-soft)] p-3.5 text-[var(--alert-soft-ink)]',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-[0.875rem] font-semibold leading-snug">
          {t('emergency.bannerReminder')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="tel:19"
          aria-label={t('emergency.policeAria')}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--alert)] px-3 py-1.5 text-[0.875rem] font-bold text-[var(--alert-ink)]"
        >
          <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular-nums">{formatNumber(19, { useGrouping: false })}</span>
        </a>
        <a
          href="tel:177"
          aria-label={t('emergency.gendarmerieAria')}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--alert)] px-3 py-1.5 text-[0.875rem] font-bold text-[var(--alert-ink)]"
        >
          <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular-nums">{formatNumber(177, { useGrouping: false })}</span>
        </a>
      </div>
    </div>
  );
};
