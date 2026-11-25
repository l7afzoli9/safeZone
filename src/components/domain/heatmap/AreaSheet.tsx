import React from 'react';
import { Clock, Flag, MapPin } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type {
  AreaAggregate,
  AreaType,
  TimeBucket,
} from '../../../types';
import { Badge } from '../../ui/Badge';
import { BottomSheet } from '../../ui/BottomSheet';
import { Button } from '../../ui/Button';
import { ThresholdNotice } from './ThresholdNotice';

export interface SelectedAreaInfo {
  areaType: AreaType;
  areaId: string;
  name: string;
  parentNeighborhoodName?: string | null;
  parentNeighborhoodId?: string;
  stats: AreaAggregate | null;
}

interface AreaSheetProps {
  area: SelectedAreaInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportHere: (area: SelectedAreaInfo) => void;
}

const TIME_ORDER: TimeBucket[] = ['morning', 'afternoon', 'evening', 'night'];

export const AreaSheet: React.FC<AreaSheetProps> = ({
  area,
  open,
  onOpenChange,
  onReportHere,
}) => {
  const { t, formatNumber, formatRelativeTime } = useI18n();

  if (!area) return null;

  const stats = area.stats;
  const isBelow =
    !stats || stats.below_threshold || stats.report_count === null || stats.by_type === null;

  const typeRows =
    !isBelow && stats.by_type
      ? [
          { key: 'theft', label: t('report.types.theft'), count: stats.by_type.theft },
          { key: 'harassment', label: t('report.types.harassment'), count: stats.by_type.harassment },
          {
            key: 'suspicious',
            label: t('report.types.suspicious_activity'),
            count: stats.by_type.suspicious,
          },
          { key: 'other', label: t('report.types.other'), count: stats.by_type.other },
        ]
      : [];

  const maxTypeCount = Math.max(1, ...typeRows.map((r) => r.count));
  const timeValues = !isBelow && stats.by_time ? TIME_ORDER.map((k) => stats.by_time![k]) : [];
  const maxTimeCount = Math.max(1, ...timeValues);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={area.name}
      description={
        area.parentNeighborhoodName ?? t(`heatmap.areaTypes.${area.areaType}`)
      }
    >
      <div className="flex flex-col gap-4">
        {area.parentNeighborhoodName && (
          <Badge tone="primary" className="w-fit">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{area.parentNeighborhoodName}</span>
          </Badge>
        )}

        {isBelow ? (
          <ThresholdNotice />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--bg-subtle)]/80 p-3.5">
              <div>
                <p className="tabular-nums text-[1.125rem] font-extrabold text-[var(--text-primary)]">
                  {t('heatmap.reportCountLabel', { count: stats.report_count! })}
                </p>
                {stats.last_report_at && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[0.875rem] text-[var(--text-secondary)]">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {t('heatmap.lastReportedLabel', {
                        time: formatRelativeTime(stats.last_report_at),
                      })}
                    </span>
                  </p>
                )}
              </div>
              <Badge tone="warning">{t('common.unverifiedLabel')}</Badge>
            </div>

            {stats.by_time && (
              <section className="flex flex-col gap-2">
                <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
                  {t('heatmap.byTimeTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_ORDER.map((bucket) => {
                    const count = stats.by_time![bucket];
                    const widthPct = Math.round((count / maxTimeCount) * 100);
                    return (
                      <div
                        key={bucket}
                        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5"
                      >
                        <div className="flex items-center justify-between text-[0.8125rem]">
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {t(`report.times.${bucket}`)}
                          </span>
                          <span className="tabular-nums font-bold text-[var(--text-primary)]">
                            {formatNumber(count)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
                {t('heatmap.byTypeTitle')}
              </h3>
              <div className="flex flex-col gap-2">
                {typeRows.map((row) => {
                  const widthPct = Math.round((row.count / maxTypeCount) * 100);
                  return (
                    <div key={row.key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[0.875rem]">
                        <span className="text-[var(--text-secondary)]">{row.label}</span>
                        <span className="tabular-nums font-bold text-[var(--text-primary)]">
                          {formatNumber(row.count)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-3 text-[0.8125rem] leading-relaxed text-[var(--text-secondary)]">
              {t('heatmap.busyStreetsNote')}
            </p>
          </>
        )}

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => onReportHere(area)}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          <span>{t('heatmap.reportHereBtn')}</span>
        </Button>
      </div>
    </BottomSheet>
  );
};
