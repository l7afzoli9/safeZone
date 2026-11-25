import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HEAT_BINS, MIN_REPORTS } from '../../../constants/safety';
import { useTheme } from '../../../context/ThemeContext';
import { useI18n } from '../../../i18n';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

export const HeatLegend: React.FC = () => {
  const { t, formatNumber } = useI18n();
  const { resolvedTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-3.5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="warning">{t('common.unverifiedLabel')}</Badge>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t('heatmap.legendToggle')}
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[0.8125rem] font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] cursor-pointer"
          >
            <span>{t('heatmap.legendTitle')}</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <p className="text-[0.8125rem] leading-snug text-[var(--text-secondary)]">
          {t('heatmap.busyStreetsNote')}
        </p>

        {expanded && (
          <div className="mt-1 flex flex-col gap-2.5 border-t border-[var(--border-subtle)] pt-3">
            <div
              aria-hidden="true"
              className="h-2.5 w-full rounded-full border border-[var(--border-subtle)]"
              style={{
                background:
                  'linear-gradient(to right, #6366F1 0%, #06B6D4 25%, #22C55E 50%, #FACC15 75%, #EF4444 100%)',
              }}
            />
            <div className="grid grid-cols-5 gap-1.5">
              {HEAT_BINS.map((bin) => {
                const bg = resolvedTheme === 'dark' ? bin.darkFill : bin.lightFill;
                const ink = resolvedTheme === 'dark' ? bin.darkInk : bin.lightInk;
                const label =
                  bin.max !== null
                    ? t('heatmap.legendRange', { min: bin.min, max: bin.max })
                    : t('heatmap.legendRangePlus', { min: bin.min });
                return (
                  <div
                    key={bin.step}
                    style={{ backgroundColor: bg, color: ink }}
                    className="tabular-nums flex min-h-[36px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1 text-center text-[0.75rem] font-bold"
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[0.8125rem] text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="h-4 w-6 shrink-0 rounded-[4px] border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)]"
              />
              <span>
                {t('heatmap.legendBelowThreshold', { min: formatNumber(MIN_REPORTS) })}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
