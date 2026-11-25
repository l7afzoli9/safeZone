import React from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Zone } from '../../types';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';

interface ZoneBadgeProps {
  zone: Zone;
  minThreshold?: number;
  showThresholdState?: boolean;
  showCity?: boolean;
  className?: string;
}

export const ZoneBadge: React.FC<ZoneBadgeProps> = ({
  zone,
  minThreshold = 5,
  showThresholdState = false,
  showCity = true,
  className,
}) => {
  const { t, formatNumber } = useI18n();
  const isSufficient = zone.report_count >= minThreshold;

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <Badge tone="primary">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {t(zone.name_key)}
          {showCity ? ` · ${t(zone.city_key)}` : ''}
        </span>
      </Badge>
      {showThresholdState && (
        <Badge tone={isSufficient ? 'warning' : 'neutral'}>
          {isSufficient
            ? `${formatNumber(zone.report_count)} · ${t('common.unverifiedLabel')}`
            : t('heatmap.belowThresholdTitle')}
        </Badge>
      )}
    </div>
  );
};
