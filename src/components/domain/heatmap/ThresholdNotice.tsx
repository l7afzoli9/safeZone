import React from 'react';
import { Info } from 'lucide-react';
import { MIN_REPORTS } from '../../../constants/safety';
import { useI18n } from '../../../i18n';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

interface ThresholdNoticeProps {
  compact?: boolean;
  showBusyNote?: boolean;
}

export const ThresholdNotice: React.FC<ThresholdNoticeProps> = ({
  compact = false,
  showBusyNote = true,
}) => {
  const { t } = useI18n();

  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
            {t('heatmap.belowThresholdTitle')}
          </p>
          {!compact && (
            <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
              {t('heatmap.belowThresholdExplanation', { min: MIN_REPORTS })}
            </p>
          )}
        </div>
      </div>

      {showBusyNote && (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-2.5">
          <Badge tone="warning" className="w-fit">
            {t('common.unverifiedLabel')}
          </Badge>
          <p className="text-[0.8125rem] leading-snug text-[var(--text-muted)]">
            {t('heatmap.busyStreetsNote')}
          </p>
        </div>
      )}
    </Card>
  );
};
