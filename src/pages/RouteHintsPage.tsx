import React, { useEffect, useState } from 'react';
import { Compass, Info, Layers, MapPin, Navigation } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { RouteHintPreset, Zone } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, LoadingListSkeleton } from '../components/domain/EmptyState';

export const RouteHintsPage: React.FC = () => {
  const { t, formatDateTime, formatNumber } = useI18n();
  const { zones, minDisplayThreshold, loading, error, refreshAll } = useApp();

  const [presets, setPresets] = useState<RouteHintPreset[]>([]);
  const [originId, setOriginId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [plannedResult, setPlannedResult] = useState<{
    zones: Zone[];
    estimatedMinutes: number;
    advisoryKey?: string;
  } | null>(null);

  useEffect(() => {
    void api
      .getRoutePresets()
      .then(setPresets)
      .catch(() => {});
  }, []);

  const computeRoute = (orig: string, dest: string, preset?: RouteHintPreset) => {
    if (!orig || !dest) {
      setFormError(t('routes.selectBothError'));
      return;
    }
    if (orig === dest) {
      setFormError(t('routes.sameZoneError'));
      return;
    }
    setFormError(null);

    if (preset) {
      const traversed = preset.traversed_zone_ids
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is Zone => Boolean(z));
      setPlannedResult({
        zones: traversed,
        estimatedMinutes: preset.estimated_walk_minutes,
        advisoryKey: preset.advisory_key,
      });
      return;
    }

    const originZone = zones.find((z) => z.id === orig);
    const destZone = zones.find((z) => z.id === dest);
    if (!originZone || !destZone) return;

    const matchingPreset = presets.find(
      (p) =>
        (p.origin_zone_id === orig && p.destination_zone_id === dest) ||
        (p.origin_zone_id === dest && p.destination_zone_id === orig)
    );

    if (matchingPreset) {
      const traversed = matchingPreset.traversed_zone_ids
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is Zone => Boolean(z));
      setPlannedResult({
        zones: traversed,
        estimatedMinutes: matchingPreset.estimated_walk_minutes,
        advisoryKey: matchingPreset.advisory_key,
      });
      return;
    }

    const sameCityExtras = zones.filter(
      (z) => z.city_key === originZone.city_key && z.id !== orig && z.id !== dest
    );
    const traversed = sameCityExtras.length > 0 ? [originZone, sameCityExtras[0], destZone] : [originZone, destZone];
    setPlannedResult({
      zones: traversed,
      estimatedMinutes: traversed.length * 10,
    });
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    computeRoute(originId, destinationId);
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

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex flex-col gap-1.5">
        <Badge tone="primary" className="w-fit">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('common.phase2Badge')}</span>
        </Badge>
        <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
          {t('routes.title')}
        </h1>
        <p className="text-[0.9375rem] text-[var(--text-secondary)]">{t('routes.subtitle')}</p>
      </div>

      {/* Informational Disclaimer */}
      <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3.5">
        <div className="flex items-start gap-2.5 text-[var(--warning-ink)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-[0.9375rem] font-bold">{t('routes.disclaimerTitle')}</h2>
            <p className="mt-0.5 text-[0.875rem] leading-relaxed">{t('routes.disclaimerBody')}</p>
          </div>
        </div>
      </Card>

      {/* Preset Quick Routes */}
      {presets.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
            {t('routes.presetsTitle')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const orig = zones.find((z) => z.id === preset.origin_zone_id);
              const dest = zones.find((z) => z.id === preset.destination_zone_id);
              if (!orig || !dest) return null;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setOriginId(orig.id);
                    setDestinationId(dest.id);
                    computeRoute(orig.id, dest.id, preset);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[0.875rem] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <Navigation className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                  <span>
                    {t(orig.name_key)} → {t(dest.name_key)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Plan Route Form */}
      <Card>
        <form onSubmit={handlePlanSubmit} className="flex flex-col gap-3.5" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="route-origin"
              className="text-[0.9375rem] font-semibold text-[var(--text-primary)]"
            >
              {t('routes.originLabel')}
            </label>
            <select
              id="route-origin"
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                setFormError(null);
              }}
              className="min-h-[46px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)]"
            >
              <option value="">{t('routes.selectPlaceholder')}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {t(z.name_key)} — {t(z.city_key)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="route-destination"
              className="text-[0.9375rem] font-semibold text-[var(--text-primary)]"
            >
              {t('routes.destinationLabel')}
            </label>
            <select
              id="route-destination"
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value);
                setFormError(null);
              }}
              className="min-h-[46px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)]"
            >
              <option value="">{t('routes.selectPlaceholder')}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {t(z.name_key)} — {t(z.city_key)}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
              {formError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth>
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>{t('routes.planBtn')}</span>
          </Button>
        </form>
      </Card>

      {/* Route Output */}
      {plannedResult ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)]">
              {t('routes.traversedZonesTitle')}
            </h2>
            <Badge tone="primary">
              {t('routes.estimatedWalk', { minutes: plannedResult.estimatedMinutes })}
            </Badge>
          </div>

          {plannedResult.advisoryKey && (
            <Card className="bg-[var(--primary-soft)]/70 p-3.5 text-[0.9375rem] text-[var(--primary-soft-ink)]">
              {t(plannedResult.advisoryKey)}
            </Card>
          )}

          <div className="flex flex-col gap-2.5">
            {plannedResult.zones.map((z, idx) => {
              const sufficient = z.report_count >= minDisplayThreshold;
              return (
                <Card key={z.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[0.875rem] font-bold text-[var(--primary-soft-ink)]">
                        {formatNumber(idx + 1)}
                      </span>
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">
                          {t(z.name_key)}
                        </span>
                        <span className="ms-1.5 text-[0.875rem] text-[var(--text-muted)]">
                          · {t(z.city_key)}
                        </span>
                      </div>
                    </div>
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                  </div>

                  {sufficient ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[0.875rem] text-[var(--text-secondary)]">
                        {t('routes.sufficientNote', {
                          count: z.report_count,
                          date: z.latest_report_at ? formatDateTime(z.latest_report_at) : '',
                        })}
                      </p>
                      <Badge tone="warning">{t('common.unverifiedLabel')}</Badge>
                    </div>
                  ) : (
                    <p className="text-[0.875rem] text-[var(--text-muted)]">
                      {t('routes.belowThresholdNote')}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Compass className="h-6 w-6" aria-hidden="true" />}
          title={t('routes.emptyTitle')}
          description={t('routes.emptyDesc')}
        />
      )}
    </div>
  );
};
