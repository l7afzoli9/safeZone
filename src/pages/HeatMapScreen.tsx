import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import { Compass, Info, Layers, MapPin, Navigation, Shield, WifiOff, X } from 'lucide-react';
import { MIN_REPORTS } from '../constants/safety';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  AreaAggregate,
  AreaType,
  NearbyStation,
  NeighborhoodProperties,
  RecencyWindow,
  RouteHintPreset,
  StreetProperties,
  TimeBucketFilter,
  Zone,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/domain/EmptyState';
import { AreaLayer } from '../components/domain/heatmap/AreaLayer';
import { AreaListView } from '../components/domain/heatmap/AreaListView';
import { AreaSheet, type SelectedAreaInfo } from '../components/domain/heatmap/AreaSheet';
import { HeatLegend } from '../components/domain/heatmap/HeatLegend';
import { MapFilters } from '../components/domain/heatmap/MapFilters';

export const HeatMapScreen: React.FC = () => {
  const { language, t, formatNumber, formatRelativeTime } = useI18n();
  const { zones, minDisplayThreshold } = useApp();
  const navigate = useNavigate();

  const [areaType, setAreaType] = useState<AreaType>('street');
  const [timeBucket, setTimeBucket] = useState<TimeBucketFilter>('all');
  const [windowRange, setWindowRange] = useState<RecencyWindow>('30d');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const [neighborhoods, setNeighborhoods] = useState<FeatureCollection<
    Polygon,
    NeighborhoodProperties
  > | null>(null);
  const [streets, setStreets] = useState<FeatureCollection<
    LineString,
    StreetProperties
  > | null>(null);
  const [stats, setStats] = useState<AreaAggregate[]>([]);
  const [neighborhoodStats, setNeighborhoodStats] = useState<AreaAggregate[]>([]);
  const [presets, setPresets] = useState<RouteHintPreset[]>([]);
  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [showStations, setShowStations] = useState(true);
  const [geoLoading, setGeoLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedArea, setSelectedArea] = useState<SelectedAreaInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Merged Route Planner overlay state
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [originId, setOriginId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<{
    zones: Zone[];
    estimatedMinutes: number;
    advisoryKey?: string;
  } | null>(null);

  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [tileFailed, setTileFailed] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const loadGeometries = useCallback(async () => {
    setGeoLoading(true);
    setLoadError(false);
    try {
      const [nGeo, sGeo, routePresets, nearbyStations] = await Promise.all([
        api.getNeighborhoodsGeoJson(),
        api.getStreetsGeoJson(),
        api.getRoutePresets(),
        api.getNearbyStations(33.586, -7.632, 25).catch(() => []),
      ]);
      setNeighborhoods(nGeo);
      setStreets(sGeo);
      setPresets(routePresets);
      setStations(nearbyStations);
    } catch {
      setLoadError(true);
    } finally {
      setGeoLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setLoadError(false);
    try {
      const [entries, nEntries] = await Promise.all([
        api.getAreaStats({
          type: areaType,
          timeBucket,
          window: windowRange,
        }),
        api.getAreaStats({
          type: 'neighborhood',
          timeBucket,
          window: windowRange,
        }),
      ]);
      setStats(entries);
      setNeighborhoodStats(nEntries);
    } catch {
      setLoadError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [areaType, timeBucket, windowRange]);

  useEffect(() => {
    void loadGeometries();
  }, [loadGeometries]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const statsById = useMemo(() => {
    const map = new Map<string, AreaAggregate>();
    for (const s of stats) {
      map.set(s.area_id, s);
    }
    return map;
  }, [stats]);

  const neighborhoodStatsById = useMemo(() => {
    const map = new Map<string, AreaAggregate>();
    for (const s of neighborhoodStats) {
      map.set(s.area_id, s);
    }
    return map;
  }, [neighborhoodStats]);

  const anyAboveThreshold = useMemo(
    () =>
      stats.some(
        (s) =>
          !s.below_threshold &&
          s.report_count !== null &&
          s.report_count >= MIN_REPORTS
      ),
    [stats]
  );

  const casablancaZones = useMemo(
    () => zones.filter((z) => z.city_key === 'zones.cities.casablanca'),
    [zones]
  );

  const highlightedNeighborhoodIds = useMemo(() => {
    if (!plannedRoute) return undefined;
    return new Set(plannedRoute.zones.map((z) => z.id));
  }, [plannedRoute]);

  const listItems = useMemo<SelectedAreaInfo[]>(() => {
    if (!neighborhoods || !streets) return [];
    const nNames = new Map<string, string>();
    for (const f of neighborhoods.features) {
      nNames.set(
        f.properties.id,
        language === 'ar' ? f.properties.name_ar : f.properties.name_fr
      );
    }

    if (areaType === 'neighborhood') {
      return neighborhoods.features.map((f) => ({
        areaType: 'neighborhood',
        areaId: f.properties.id,
        name: language === 'ar' ? f.properties.name_ar : f.properties.name_fr,
        parentNeighborhoodName: null,
        stats: statsById.get(f.properties.id) ?? null,
      }));
    }

    return streets.features.map((f) => ({
      areaType: 'street',
      areaId: f.properties.id,
      name: language === 'ar' ? f.properties.name_ar : f.properties.name_fr,
      parentNeighborhoodId: f.properties.neighborhood_id,
      parentNeighborhoodName: nNames.get(f.properties.neighborhood_id) ?? null,
      stats: statsById.get(f.properties.id) ?? null,
    }));
  }, [areaType, neighborhoods, streets, statsById, language]);

  const handleSelectArea = (area: SelectedAreaInfo) => {
    setSelectedArea(area);
    setSheetOpen(true);
  };

  const handleReportHere = (area: SelectedAreaInfo) => {
    setSheetOpen(false);
    const params = new URLSearchParams();
    params.set('areaType', area.areaType);
    params.set('areaId', area.areaId);
    if (area.areaType === 'neighborhood') {
      params.set('zoneId', area.areaId);
    } else if (area.parentNeighborhoodId) {
      params.set('zoneId', area.parentNeighborhoodId);
    }
    navigate(`/report?${params.toString()}`);
  };

  const applyRouteSelection = (orig: string, dest: string, preset?: RouteHintPreset) => {
    if (!orig || !dest) {
      setRouteError(t('routes.selectBothError'));
      return;
    }
    if (orig === dest) {
      setRouteError(t('routes.sameZoneError'));
      return;
    }
    setRouteError(null);

    if (preset) {
      const traversed = preset.traversed_zone_ids
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is Zone => Boolean(z));
      setPlannedRoute({
        zones: traversed,
        estimatedMinutes: preset.estimated_walk_minutes,
        advisoryKey: preset.advisory_key,
      });
      setRouteSheetOpen(true);
      return;
    }

    const originZone = zones.find((z) => z.id === orig);
    const destZone = zones.find((z) => z.id === dest);
    if (!originZone || !destZone) return;

    const match = presets.find(
      (p) =>
        (p.origin_zone_id === orig && p.destination_zone_id === dest) ||
        (p.origin_zone_id === dest && p.destination_zone_id === orig)
    );

    if (match) {
      const traversed = match.traversed_zone_ids
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is Zone => Boolean(z));
      setPlannedRoute({
        zones: traversed,
        estimatedMinutes: match.estimated_walk_minutes,
        advisoryKey: match.advisory_key,
      });
      setRouteSheetOpen(true);
      return;
    }

    const extras = casablancaZones.filter((z) => z.id !== orig && z.id !== dest);
    const traversed = extras.length > 0 ? [originZone, extras[0], destZone] : [originZone, destZone];
    setPlannedRoute({
      zones: traversed,
      estimatedMinutes: traversed.length * 9,
    });
    setRouteSheetOpen(true);
  };

  const handleClearRoute = () => {
    setPlannedRoute(null);
    setOriginId('');
    setDestinationId('');
    setRouteError(null);
  };

  const isLoading = geoLoading || statsLoading;

  return (
    <div className="flex flex-col">
      {/* Compact Top Docked Controls */}
      <div className="flex flex-col gap-2.5 px-4 pb-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-[1.25rem] font-extrabold text-[var(--text-primary)]">
            {t('routes.title')}
          </h1>
          <div className="flex items-center gap-1.5">
            {stations.length > 0 && viewMode === 'map' && (
              <button
                type="button"
                aria-pressed={showStations}
                aria-label={t('heatmap.stationsToggleAria')}
                onClick={() => setShowStations((prev) => !prev)}
                className={
                  showStations
                    ? 'inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[#0369A1]/40 bg-[#0369A1]/15 px-2.5 text-[0.75rem] font-bold text-[#0369A1] dark:text-[#38BDF8] cursor-pointer'
                    : 'inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[0.75rem] font-semibold text-[var(--text-secondary)] cursor-pointer'
                }
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t('heatmap.stationsToggle', { count: formatNumber(stations.length) })}
                </span>
              </button>
            )}
            <Badge tone="primary">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('common.phase2Badge')}</span>
            </Badge>
          </div>
        </div>

        {!isLoading && !loadError && (
          <MapFilters
            areaType={areaType}
            onAreaTypeChange={(next) => {
              setSelectedArea(null);
              setSheetOpen(false);
              setAreaType(next);
            }}
            timeBucket={timeBucket}
            onTimeBucketChange={(next) => {
              setSelectedArea(null);
              setSheetOpen(false);
              setTimeBucket(next);
            }}
            windowRange={windowRange}
            onWindowRangeChange={(next) => {
              setSelectedArea(null);
              setSheetOpen(false);
              setWindowRange(next);
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </div>

      {/* Main Map / List Canvas */}
      {isLoading && !neighborhoods ? (
        <div className="flex flex-col gap-3 px-4" aria-busy="true" aria-label={t('common.loading')}>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
          <Skeleton className="h-[370px] w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : loadError ? (
        <div className="px-4 py-4">
          <ErrorState
            onRetry={() => {
              void loadGeometries();
              void loadStats();
            }}
          />
        </div>
      ) : (
        <>
          {(isOffline || tileFailed) && (
            <div className="px-4 pb-2.5">
              <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-[var(--warning-ink)]">
                <div className="flex items-start gap-2 text-[0.8125rem] font-semibold">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t('heatmap.offlineBanner')}</span>
                </div>
              </Card>
            </div>
          )}

          {statsLoading ? (
            <div className="px-4">
              <Skeleton className="h-[370px] w-full rounded-[var(--radius-lg)]" />
            </div>
          ) : !anyAboveThreshold ? (
            <div className="px-4">
              <EmptyState
                icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
                title={t('heatmap.emptyTitle')}
                description={t('heatmap.emptyDesc', { min: MIN_REPORTS })}
                actionLabel={windowRange !== '90d' ? t('heatmap.widenWindowBtn') : undefined}
                onAction={windowRange !== '90d' ? () => setWindowRange('90d') : undefined}
              />
            </div>
          ) : viewMode === 'map' && neighborhoods && streets ? (
            <AreaLayer
              areaType={areaType}
              neighborhoods={neighborhoods}
              streets={streets}
              statsById={statsById}
              selectedAreaId={selectedArea?.areaId ?? null}
              highlightedNeighborhoodIds={highlightedNeighborhoodIds}
              stations={stations}
              showStations={showStations}
              onSelectArea={handleSelectArea}
              offline={isOffline}
              onTileFailure={() => setTileFailed(true)}
            />
          ) : (
            <div className="px-4">
              <AreaListView areas={listItems} onSelectArea={handleSelectArea} />
            </div>
          )}

          {/* Collapsible Route Planner Bar + Frequent Routes + Legend */}
          <div className="flex flex-col gap-3 px-4 pt-3">
            <Card className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setRouteSheetOpen(true)}
                  className="inline-flex min-h-[44px] flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-3.5 py-2 text-start text-[0.9375rem] font-bold text-[var(--primary-ink)] shadow-xs cursor-pointer"
                >
                  <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t('routes.planOverlayBtn')}</span>
                </button>
                {plannedRoute && (
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    aria-label={t('routes.clearRouteBtn')}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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
                          applyRouteSelection(orig.id, dest.id, preset);
                        }}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 px-3 py-1 text-[0.8125rem] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary-soft)] cursor-pointer"
                      >
                        <Navigation className="h-3 w-3 text-[var(--primary)]" aria-hidden="true" />
                        <span>
                          {t(orig.name_key)} → {t(dest.name_key)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <HeatLegend />

            {showStations && stations.length > 0 && (
              <Card className="flex flex-col gap-2.5 p-3.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#0369A1] dark:text-[#38BDF8]" aria-hidden="true" />
                  <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
                    {t('heatmap.nearbyStationsTitle')}
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {stations.slice(0, 3).map((st, idx) => {
                    const isGendarmerie = st.type === 'Gendarmerie Royale';
                    const callNumber = st.phone || (isGendarmerie ? '177' : '19');
                    return (
                      <div
                        key={`near-card-${idx}-${st.name}`}
                        className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.8125rem] font-bold text-[var(--text-primary)]">
                            {st.name}
                          </p>
                          <p className="truncate text-[0.75rem] text-[var(--text-secondary)]">
                            {t('heatmap.stationDistanceKm', {
                              distance: formatNumber(st.distance_km),
                            })}{' '}
                            · {st.address}
                          </p>
                        </div>
                        <a
                          href={`tel:${callNumber.replace(/\s+/g, '')}`}
                          className="shrink-0 rounded-[var(--radius-sm)] bg-[#0F5C66] px-2.5 py-1.5 text-[0.75rem] font-bold text-white no-underline"
                        >
                          {callNumber}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Tapped Area Detail Sheet */}
      <AreaSheet
        area={selectedArea}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onReportHere={handleReportHere}
      />

      {/* Merged Route Planner Overlay Sheet */}
      <BottomSheet
        open={routeSheetOpen}
        onOpenChange={setRouteSheetOpen}
        title={t('routes.sheetTitle')}
        description={t('routes.sheetDesc')}
      >
        <div className="flex flex-col gap-4">
          <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3">
            <div className="flex items-start gap-2 text-[var(--warning-ink)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="text-[0.8125rem]">
                <p className="font-bold">{t('routes.disclaimerTitle')}</p>
                <p className="mt-0.5 leading-snug">{t('routes.disclaimerBody')}</p>
              </div>
            </div>
          </Card>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyRouteSelection(originId, destinationId);
            }}
            className="flex flex-col gap-3"
            noValidate
          >
            <div className="flex flex-col gap-1">
              <label
                htmlFor="overlay-origin"
                className="text-[0.875rem] font-semibold text-[var(--text-primary)]"
              >
                {t('routes.originLabel')}
              </label>
              <select
                id="overlay-origin"
                value={originId}
                onChange={(e) => {
                  setOriginId(e.target.value);
                  setRouteError(null);
                }}
                className="min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-base text-[var(--text-primary)]"
              >
                <option value="">{t('routes.selectPlaceholder')}</option>
                {(casablancaZones.length > 0 ? casablancaZones : zones).map((z) => (
                  <option key={z.id} value={z.id}>
                    {t(z.name_key)} — {t(z.city_key)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="overlay-destination"
                className="text-[0.875rem] font-semibold text-[var(--text-primary)]"
              >
                {t('routes.destinationLabel')}
              </label>
              <select
                id="overlay-destination"
                value={destinationId}
                onChange={(e) => {
                  setDestinationId(e.target.value);
                  setRouteError(null);
                }}
                className="min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-base text-[var(--text-primary)]"
              >
                <option value="">{t('routes.selectPlaceholder')}</option>
                {(casablancaZones.length > 0 ? casablancaZones : zones).map((z) => (
                  <option key={z.id} value={z.id}>
                    {t(z.name_key)} — {t(z.city_key)}
                  </option>
                ))}
              </select>
            </div>

            {routeError && (
              <p role="alert" className="text-[0.875rem] font-medium text-[var(--alert-soft-ink)]">
                {routeError}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="md" fullWidth>
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>{t('routes.planBtn')}</span>
              </Button>
              {plannedRoute && (
                <Button type="button" variant="outline" size="md" onClick={handleClearRoute}>
                  {t('routes.clearRouteBtn')}
                </Button>
              )}
            </div>
          </form>

          {plannedRoute && (
            <div className="flex flex-col gap-2.5 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">
                  {t('routes.traversedZonesTitle')}
                </h3>
                <Badge tone="primary">
                  {t('routes.estimatedWalk', { minutes: plannedRoute.estimatedMinutes })}
                </Badge>
              </div>

              {plannedRoute.advisoryKey && (
                <p className="rounded-[var(--radius-md)] bg-[var(--primary-soft)]/70 p-3 text-[0.875rem] text-[var(--primary-soft-ink)]">
                  {t(plannedRoute.advisoryKey)}
                </p>
              )}

              <p className="text-[0.8125rem] text-[var(--text-muted)]">
                {t('routes.highlightedAreasHint')}
              </p>

              <div className="flex flex-col gap-2">
                {plannedRoute.zones.map((z, idx) => {
                  const areaStat = neighborhoodStatsById.get(z.id);
                  const below =
                    !areaStat ||
                    areaStat.below_threshold ||
                    areaStat.report_count === null ||
                    areaStat.report_count < minDisplayThreshold;
                  return (
                    <Card key={z.id} className="flex flex-col gap-1.5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[0.8125rem] font-bold text-[var(--primary-soft-ink)]">
                            {formatNumber(idx + 1)}
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {t(z.name_key)}
                          </span>
                        </div>
                        <Badge tone={below ? 'neutral' : 'warning'}>
                          {below
                            ? t('heatmap.belowThresholdTitle')
                            : t('common.unverifiedLabel')}
                        </Badge>
                      </div>
                      {!below && areaStat ? (
                        <p className="text-[0.875rem] text-[var(--text-secondary)]">
                          {t('heatmap.reportCountLabel', { count: areaStat.report_count! })}
                          {areaStat.last_report_at
                            ? ` · ${formatRelativeTime(areaStat.last_report_at)}`
                            : ''}
                        </p>
                      ) : (
                        <p className="text-[0.8125rem] text-[var(--text-muted)]">
                          {t('routes.belowThresholdNote')}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
