import React from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { cn } from '../../../lib/cn';
import type { AreaType, RecencyWindow, TimeBucketFilter } from '../../../types';

interface MapFiltersProps {
  areaType: AreaType;
  onAreaTypeChange: (next: AreaType) => void;
  timeBucket: TimeBucketFilter;
  onTimeBucketChange: (next: TimeBucketFilter) => void;
  windowRange: RecencyWindow;
  onWindowRangeChange: (next: RecencyWindow) => void;
  viewMode: 'map' | 'list';
  onViewModeChange: (next: 'map' | 'list') => void;
}

const TIME_OPTIONS: TimeBucketFilter[] = ['all', 'morning', 'afternoon', 'evening', 'night'];
const WINDOW_OPTIONS: RecencyWindow[] = ['7d', '30d', '90d'];

export const MapFilters: React.FC<MapFiltersProps> = ({
  areaType,
  onAreaTypeChange,
  timeBucket,
  onTimeBucketChange,
  windowRange,
  onWindowRangeChange,
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2.5">
      {/* Row 1: Streets / Neighborhoods segmented control + Map / List switch */}
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t('heatmap.title')}
          className="grid flex-1 grid-cols-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1"
        >
          {(['street', 'neighborhood'] as AreaType[]).map((type) => {
            const active = areaType === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => onAreaTypeChange(type)}
                className={cn(
                  'min-h-[40px] rounded-[var(--radius-sm)] px-2.5 text-[0.875rem] font-bold transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-ink)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {t(`heatmap.areaTypes.${type}`)}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={t('heatmap.viewModes.label')}
          className="inline-flex shrink-0 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1"
        >
          <button
            type="button"
            aria-pressed={viewMode === 'map'}
            aria-label={t('heatmap.viewModes.map')}
            onClick={() => onViewModeChange('map')}
            className={cn(
              'inline-flex min-h-[40px] min-w-[44px] items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2.5 text-[0.8125rem] font-bold transition-colors cursor-pointer',
              viewMode === 'map'
                ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            )}
          >
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('heatmap.viewModes.map')}</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'list'}
            aria-label={t('heatmap.viewModes.list')}
            onClick={() => onViewModeChange('list')}
            className={cn(
              'inline-flex min-h-[40px] min-w-[44px] items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2.5 text-[0.8125rem] font-bold transition-colors cursor-pointer',
              viewMode === 'list'
                ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('heatmap.viewModes.list')}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Time-of-day chips */}
      <div
        role="group"
        aria-label={t('heatmap.timeFilters.label')}
        className="flex flex-wrap gap-1.5"
      >
        {TIME_OPTIONS.map((opt) => {
          const active = timeBucket === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onTimeBucketChange(opt)}
              className={cn(
                'min-h-[38px] rounded-full border px-3 py-1 text-[0.8125rem] font-semibold transition-colors cursor-pointer',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              {t(`heatmap.timeFilters.${opt}`)}
            </button>
          );
        })}
      </div>

      {/* Row 3: Recency window selector */}
      <div
        role="group"
        aria-label={t('heatmap.windows.label')}
        className="grid grid-cols-3 gap-1.5"
      >
        {WINDOW_OPTIONS.map((win) => {
          const active = windowRange === win;
          return (
            <button
              key={win}
              type="button"
              aria-pressed={active}
              onClick={() => onWindowRangeChange(win)}
              className={cn(
                'min-h-[38px] rounded-[var(--radius-sm)] border px-2 py-1 text-[0.8125rem] font-bold transition-colors cursor-pointer',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              {t(`heatmap.windows.${win}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
