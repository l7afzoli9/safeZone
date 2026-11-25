import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import { Layers, MapPin, WifiOff } from 'lucide-react';
import { MIN_REPORTS } from '../constants/safety';
import { useI18n } from '../i18n';
import { api } from '../services/api';
import type {
  AreaAggregate,
  AreaType,
  NeighborhoodProperties,
  RecencyWindow,
  StreetProperties,
  TimeBucketFilter,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/domain/EmptyState';
import { AreaLayer } from '../components/domain/heatmap/AreaLayer';
import { AreaListView } from '../components/domain/heatmap/AreaListView';
import { AreaSheet, type SelectedAreaInfo } from '../components/domain/heatmap/AreaSheet';
import { HeatLegend } from '../components/domain/heatmap/HeatLegend';
import { MapFilters } from '../components/domain/heatmap/MapFilters';

export const HeatMapScreen: React.FC = () => {
  const { language, t } = useI18n();
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
  const [geoLoading, setGeoLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedArea, setSelectedArea] = useState<SelectedAreaInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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
      const [nGeo, sGeo] = await Promise.all([
        api.getNeighborhoodsGeoJson(),
        api.getStreetsGeoJson(),
      ]);
      setNeighborhoods(nGeo);
      setStreets(sGeo);
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
      const entries = await api.getAreaStats({
        type: areaType,
        timeBucket,
        window: windowRange,
      });
      setStats(entries);
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

  const anyAboveThreshold = useMemo(
    () => stats.some((s) => !s.below_threshold && s.report_count !== null && s.report_count >= MIN_REPORTS),
    [stats]
  );

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

  const isLoading = geoLoading || statsLoading;

  return (
    <div className="flex flex-col gap-3.5 px-4 py-4">
      <div className="flex flex-col gap-1">
        <Badge tone="primary" className="w-fit">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('common.phase2Badge')}</span>
        </Badge>
        <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
          {t('heatmap.title')}
        </h1>
        <p className="text-[0.9375rem] text-[var(--text-secondary)]">
          {t('heatmap.subtitle')}
        </p>
      </div>

      {isLoading && !neighborhoods ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('common.loading')}>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-9 w-16 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
          <Skeleton className="h-[340px] w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : loadError ? (
        <ErrorState
          onRetry={() => {
            void loadGeometries();
            void loadStats();
          }}
        />
      ) : (
        <>
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

          {(isOffline || tileFailed) && (
            <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-[var(--warning-ink)]">
              <div className="flex items-start gap-2 text-[0.8125rem] font-semibold">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t('heatmap.offlineBanner')}</span>
              </div>
            </Card>
          )}

          {statsLoading ? (
            <Skeleton className="h-[340px] w-full rounded-[var(--radius-lg)]" />
          ) : !anyAboveThreshold ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
              title={t('heatmap.emptyTitle')}
              description={t('heatmap.emptyDesc', { min: MIN_REPORTS })}
              actionLabel={windowRange !== '90d' ? t('heatmap.widenWindowBtn') : undefined}
              onAction={windowRange !== '90d' ? () => setWindowRange('90d') : undefined}
            />
          ) : viewMode === 'map' && neighborhoods && streets ? (
            <AreaLayer
              areaType={areaType}
              neighborhoods={neighborhoods}
              streets={streets}
              statsById={statsById}
              selectedAreaId={selectedArea?.areaId ?? null}
              onSelectArea={handleSelectArea}
              offline={isOffline}
              onTileFailure={() => setTileFailed(true)}
            />
          ) : (
            <AreaListView areas={listItems} onSelectArea={handleSelectArea} />
          )}

          <HeatLegend />
        </>
      )}

      <AreaSheet
        area={selectedArea}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onReportHere={handleReportHere}
      />
    </div>
  );
};
