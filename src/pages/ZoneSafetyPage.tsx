import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Info, Layers, Map as MapIcon, MapPin } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { IncidentReport, IncidentType, VoteChoice } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { ReportCard } from '../components/domain/ReportCard';
import { EmptyState, ErrorState, LoadingListSkeleton } from '../components/domain/EmptyState';
import { cn } from '../lib/cn';

export const ZoneSafetyPage: React.FC = () => {
  const { t, formatNumber, formatDateTime } = useI18n();
  const { zones, minDisplayThreshold, loading, error, refreshAll } = useApp();
  const navigate = useNavigate();

  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneReports, setZoneReports] = useState<IncidentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  const cityKeys = useMemo(() => {
    const unique = Array.from(new Set(zones.map((z) => z.city_key)));
    return ['all', ...unique];
  }, [zones]);

  const visibleZones = useMemo(() => {
    if (cityFilter === 'all') return zones;
    return zones.filter((z) => z.city_key === cityFilter);
  }, [zones, cityFilter]);

  useEffect(() => {
    if (!selectedZoneId && visibleZones.length > 0) {
      setSelectedZoneId(visibleZones[0].id);
    } else if (selectedZoneId && !visibleZones.some((z) => z.id === selectedZoneId)) {
      setSelectedZoneId(visibleZones[0]?.id ?? null);
    }
  }, [visibleZones, selectedZoneId]);

  const selectedZone = useMemo(
    () => visibleZones.find((z) => z.id === selectedZoneId) ?? null,
    [visibleZones, selectedZoneId]
  );

  const loadZoneReports = useCallback(async (zoneId: string) => {
    setReportsLoading(true);
    try {
      const list = await api.getReports(zoneId);
      setZoneReports(list);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedZone && selectedZone.report_count >= minDisplayThreshold) {
      void loadZoneReports(selectedZone.id);
    } else {
      setZoneReports([]);
    }
  }, [selectedZone, minDisplayThreshold, loadZoneReports]);

  const handleVote = async (reportId: string, choice: VoteChoice) => {
    await api.voteReport(reportId, choice);
    if (selectedZone) {
      await loadZoneReports(selectedZone.id);
    }
    toast.success(
      choice === 'confirm' ? t('zones.votedConfirmToast') : t('zones.votedDisputeToast')
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-5">
        <LoadingListSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-5">
        <ErrorState onRetry={() => void refreshAll()} />
      </div>
    );
  }

  const isSelectedSufficient =
    selectedZone !== null && selectedZone.report_count >= minDisplayThreshold;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex flex-col gap-1.5">
        <Badge tone="primary" className="w-fit">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('common.phase2Badge')}</span>
        </Badge>
        <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
          {t('zones.title')}
        </h1>
        <p className="text-[0.9375rem] text-[var(--text-secondary)]">{t('zones.subtitle')}</p>
      </div>

      {/* Phase 2 Threshold Explanation */}
      <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3.5">
        <div className="flex items-start gap-2.5 text-[var(--warning-ink)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-[0.875rem] font-semibold leading-snug">
            {t('zones.phase2Notice', { threshold: minDisplayThreshold })}
          </p>
        </div>
      </Card>

      {/* City Filter Chips */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('zones.title')}>
        {cityKeys.map((key) => {
          const active = cityFilter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCityFilter(key)}
              className={cn(
                'min-h-[44px] rounded-full border px-3.5 py-1.5 text-[0.875rem] font-bold transition-colors cursor-pointer',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              {key === 'all' ? t('zones.allCities') : t(key)}
            </button>
          );
        })}
      </div>

      {/* Phase 2 Interactive Complaint Heat Map Entry (Replaces placeholder map) */}
      <Card className="flex flex-col gap-3 border-[var(--primary)]/30 bg-[var(--primary-soft)]/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-ink)]">
              <MapIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)]">
                  {t('heatmap.title')}
                </h2>
                <Badge tone="primary">{t('common.phase2Badge')}</Badge>
              </div>
              <p className="mt-0.5 text-[0.875rem] text-[var(--text-secondary)]">
                {t('heatmap.subtitle')}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => navigate('/map')}
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          <span>{t('heatmap.openMapCta')}</span>
        </Button>
      </Card>

      {/* Quick Zone Picker Chips */}
      <div className="flex flex-wrap gap-2">
        {visibleZones.map((zone) => {
          const active = zone.id === selectedZoneId;
          const sufficient = zone.report_count >= minDisplayThreshold;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZoneId(zone.id)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-1.5 text-[0.875rem] font-semibold transition-colors cursor-pointer',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t(zone.name_key)}</span>
              {sufficient && (
                <span className="tabular-nums rounded-full bg-[var(--bg-surface)] px-1.5 text-[0.75rem] text-[var(--text-secondary)]">
                  {formatNumber(zone.report_count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Zone Panel */}
      {selectedZone ? (
        isSelectedSufficient ? (
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-[1.125rem] font-extrabold text-[var(--text-primary)]">
                    {t(selectedZone.name_key)} · {t(selectedZone.city_key)}
                  </h2>
                  <p className="tabular-nums text-[0.8125rem] text-[var(--text-muted)]">
                    {selectedZone.zone_code}
                  </p>
                </div>
                <Badge tone="warning">{t('common.unverifiedLabel')}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-[var(--radius-md)] bg-[var(--bg-subtle)]/70 p-3 text-[0.9375rem]">
                <p className="font-bold text-[var(--text-primary)]">
                  {t('zones.reportsCountLabel', { count: selectedZone.report_count })}
                </p>
                {selectedZone.latest_report_at && (
                  <p className="flex items-center gap-1.5 text-[0.875rem] text-[var(--text-secondary)]">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('zones.lastReportLabel', {
                        date: formatDateTime(selectedZone.latest_report_at),
                      })}
                    </span>
                  </p>
                )}
                {selectedZone.dominant_time_bucket && (
                  <p className="text-[0.875rem] text-[var(--text-secondary)]">
                    {t('zones.dominantTimeLabel', {
                      time: t(`report.times.${selectedZone.dominant_time_bucket}`),
                    })}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[0.8125rem] font-bold text-[var(--text-muted)]">
                  {t('zones.categoryBreakdown')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(selectedZone.category_counts) as IncidentType[])
                    .filter((cat) => selectedZone.category_counts[cat] > 0)
                    .map((cat) => (
                      <Badge key={cat} tone="neutral">
                        {t(`report.types.${cat}`)}: {formatNumber(selectedZone.category_counts[cat])}
                      </Badge>
                    ))}
                </div>
              </div>
            </Card>

            <h3 className="text-[1rem] font-bold text-[var(--text-primary)]">
              {t('zones.recentReportsHeading')}
            </h3>

            {reportsLoading ? (
              <LoadingListSkeleton count={1} />
            ) : zoneReports.length === 0 ? (
              <Card className="py-5 text-center text-[0.9375rem] text-[var(--text-secondary)]">
                {t('zones.noReportsInZone')}
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {zoneReports.map((rep) => (
                  <ReportCard
                    key={rep.id}
                    report={rep}
                    showVoteActions
                    onVote={(id, choice) => void handleVote(id, choice)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Info className="h-6 w-6" aria-hidden="true" />}
            title={t('zones.belowThresholdTitle')}
            description={t('zones.belowThresholdDesc', { threshold: minDisplayThreshold })}
          />
        )
      ) : (
        <Card className="py-6 text-center text-[0.9375rem] text-[var(--text-secondary)]">
          {t('zones.selectZoneHint')}
        </Card>
      )}
    </div>
  );
};
