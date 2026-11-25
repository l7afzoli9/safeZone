import React, { useMemo } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { getAreaColors } from '../../../constants/safety';
import { useTheme } from '../../../context/ThemeContext';
import { useI18n } from '../../../i18n';
import { Badge } from '../../ui/Badge';
import type { SelectedAreaInfo } from './AreaSheet';

interface AreaListViewProps {
  areas: SelectedAreaInfo[];
  onSelectArea: (area: SelectedAreaInfo) => void;
}

export const AreaListView: React.FC<AreaListViewProps> = ({ areas, onSelectArea }) => {
  const { language, t } = useI18n();
  const { resolvedTheme } = useTheme();

  // Strictly sorted alphabetically by localized area name — never by report count
  const sorted = useMemo(() => {
    const locale = language === 'fr' ? 'fr-MA' : 'ar-MA';
    return [...areas].sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [areas, language]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-[1rem] font-bold text-[var(--text-primary)]">
          {t('heatmap.listHeading')}
        </h2>
        <span className="text-[0.8125rem] text-[var(--text-muted)]">
          {t('heatmap.listSortedHint')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((item) => {
          const stats = item.stats;
          const isBelow =
            !stats || stats.below_threshold || stats.report_count === null;
          const colors = getAreaColors(
            stats?.report_count ?? null,
            isBelow,
            resolvedTheme
          );

          return (
            <button
              key={item.areaId}
              type="button"
              onClick={() => onSelectArea(item)}
              className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-start shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--bg-subtle)]/50 cursor-pointer"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  style={{
                    backgroundColor: colors.fill,
                    borderColor: colors.stroke,
                    borderStyle: isBelow ? 'dashed' : 'solid',
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                />
                <div className="min-w-0">
                  <span className="block truncate text-[1rem] font-bold text-[var(--text-primary)]">
                    {item.name}
                  </span>
                  {item.parentNeighborhoodName && (
                    <span className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-[var(--text-muted)]">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>{item.parentNeighborhoodName}</span>
                    </span>
                  )}
                  <div className="mt-1.5">
                    {isBelow ? (
                      <Badge tone="neutral">{t('heatmap.belowThresholdTitle')}</Badge>
                    ) : (
                      <Badge tone="primary">
                        {t('heatmap.reportCountLabel', { count: stats!.report_count! })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--text-muted)] rtl:rotate-180"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
