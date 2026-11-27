import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
import { bbox as turfBbox, centerOfMass } from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import { getAreaColors, MAP_ZOOM } from '../../../constants/safety';
import { useTheme } from '../../../context/ThemeContext';
import { useI18n } from '../../../i18n';
import type {
  AreaAggregate,
  AreaType,
  NearbyStation,
  NeighborhoodProperties,
  StreetProperties,
} from '../../../types';
import { cn } from '../../../lib/cn';
import type { SelectedAreaInfo } from './AreaSheet';
import { ThermalOverlay, type ThermalPoint } from './ThermalOverlay';

interface AreaLayerProps {
  areaType: AreaType;
  neighborhoods: FeatureCollection<Polygon, NeighborhoodProperties>;
  streets: FeatureCollection<LineString, StreetProperties>;
  statsById: Map<string, AreaAggregate>;
  selectedAreaId: string | null;
  highlightedNeighborhoodIds?: Set<string>;
  stations?: NearbyStation[];
  showStations?: boolean;
  onSelectArea: (area: SelectedAreaInfo) => void;
  offline: boolean;
  onTileFailure: () => void;
}

const FitBoundsHelper: React.FC<{
  collection: FeatureCollection<Polygon | LineString>;
}> = ({ collection }) => {
  const map = useMap();

  useEffect(() => {
    if (collection.features.length === 0) return;
    const [minLng, minLat, maxLng, maxLat] = turfBbox(collection);
    if (
      Number.isFinite(minLat) &&
      Number.isFinite(minLng) &&
      Number.isFinite(maxLat) &&
      Number.isFinite(maxLng)
    ) {
      map.fitBounds(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        { padding: [22, 22], maxZoom: MAP_ZOOM.default }
      );
    }
  }, [collection, map]);

  return null;
};

const ZoomWatcher: React.FC<{ onZoomChange: (zoom: number) => void }> = ({
  onZoomChange,
}) => {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
};

export const AreaLayer: React.FC<AreaLayerProps> = ({
  areaType,
  neighborhoods,
  streets,
  statsById,
  selectedAreaId,
  highlightedNeighborhoodIds,
  stations = [],
  showStations = false,
  onSelectArea,
  offline,
  onTileFailure,
}) => {
  const { language, dir, t, formatNumber } = useI18n();
  const { resolvedTheme } = useTheme();
  const [zoom, setZoom] = useState<number>(MAP_ZOOM.default);
  const [tileErrorCount, setTileErrorCount] = useState<number>(0);

  const useFallback = offline || tileErrorCount >= 2;

  const neighborhoodNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of neighborhoods.features) {
      map.set(
        f.properties.id,
        language === 'ar' ? f.properties.name_ar : f.properties.name_fr
      );
    }
    return map;
  }, [neighborhoods, language]);

  const activeCollection = useMemo<FeatureCollection<Polygon | LineString>>(() => {
    return areaType === 'neighborhood' ? neighborhoods : streets;
  }, [areaType, neighborhoods, streets]);

  const thermalPoints = useMemo<ThermalPoint[]>(() => {
    const pts: ThermalPoint[] = [];
    let maxCount = 0;
    for (const f of activeCollection.features) {
      const id = (f.properties as { id?: string } | undefined)?.id;
      const st = id ? statsById.get(id) : undefined;
      if (st && !st.below_threshold && st.report_count !== null) {
        if (st.report_count > maxCount) maxCount = st.report_count;
      }
    }
    const denom = Math.max(25, maxCount);
    for (const f of activeCollection.features) {
      const id = (f.properties as { id?: string } | undefined)?.id;
      const st = id ? statsById.get(id) : undefined;
      if (!st || st.below_threshold || st.report_count === null) continue;
      const c = centerOfMass(f);
      const [lng, lat] = c.geometry.coordinates;
      pts.push({
        lat,
        lng,
        weight: Math.min(1, Math.max(0.22, st.report_count / denom)),
      });
    }
    return pts;
  }, [activeCollection, statsById]);

  const getLocalizedName = (props: NeighborhoodProperties | StreetProperties): string => {
    return language === 'ar' ? props.name_ar : props.name_fr;
  };

  const buildSelectedInfo = (
    feature: Feature<Polygon | LineString, NeighborhoodProperties | StreetProperties>
  ): SelectedAreaInfo => {
    const props = feature.properties;
    const isStreet = 'neighborhood_id' in props;
    const stats = statsById.get(props.id) ?? null;
    return {
      areaType: isStreet ? 'street' : 'neighborhood',
      areaId: props.id,
      name: getLocalizedName(props),
      parentNeighborhoodId: isStreet ? props.neighborhood_id : undefined,
      parentNeighborhoodName: isStreet
        ? neighborhoodNameById.get(props.neighborhood_id) ?? null
        : null,
      stats,
    };
  };

  // Zoom-scaled street weight: calm & readable without building-level ambiguity
  const streetWeight = useMemo(() => {
    if (zoom <= 12) return 5;
    if (zoom === 13) return 7;
    if (zoom === 14) return 9;
    return 11;
  }, [zoom]);

  const highlightSig = useMemo(
    () => (highlightedNeighborhoodIds ? Array.from(highlightedNeighborhoodIds).sort().join(',') : ''),
    [highlightedNeighborhoodIds]
  );

  const renderKey = useMemo(() => {
    const statsSig = Array.from(statsById.entries())
      .map(([id, s]) => `${id}:${s.below_threshold ? 'x' : s.report_count}`)
      .join('|');
    return `${areaType}-${resolvedTheme}-${language}-${zoom}-${selectedAreaId ?? 'none'}-${highlightSig}-${statsSig}`;
  }, [areaType, resolvedTheme, language, zoom, selectedAreaId, highlightSig, statsById]);

  // Offline SVG schematic fallback using @turf/turf bbox
  const svgProjection = useMemo(() => {
    const allBounds = turfBbox(neighborhoods);
    const [minLng, minLat, maxLng, maxLat] = allBounds;
    const w = 340;
    const h = 300;
    const pad = 16;
    const lngSpan = Math.max(0.005, maxLng - minLng);
    const latSpan = Math.max(0.005, maxLat - minLat);

    const project = ([lng, lat]: [number, number]): [number, number] => {
      const x = pad + ((lng - minLng) / lngSpan) * (w - pad * 2);
      const y = h - pad - ((lat - minLat) / latSpan) * (h - pad * 2);
      return [x, y];
    };

    const polyToPath = (coords: number[][][]): string => {
      const ring = coords[0] ?? [];
      return ring
        .map((pt, idx) => {
          const [x, y] = project([pt[0], pt[1]]);
          return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + ' Z';
    };

    const lineToPath = (coords: number[][]): string => {
      return coords
        .map((pt, idx) => {
          const [x, y] = project([pt[0], pt[1]]);
          return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    };

    const labels = neighborhoods.features.map((f) => {
      const c = centerOfMass(f);
      const [x, y] = project(c.geometry.coordinates as [number, number]);
      return {
        id: f.properties.id,
        name: getLocalizedName(f.properties),
        x,
        y,
      };
    });

    return { w, h, polyToPath, lineToPath, labels };
  }, [neighborhoods, language]);

  if (useFallback) {
    return (
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-card)]"
        aria-label={t('heatmap.mapAriaLabel')}
      >
        <svg
          viewBox={`0 0 ${svgProjection.w} ${svgProjection.h}`}
          className="h-[320px] w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
          role="img"
          aria-label={t('heatmap.mapAriaLabel')}
        >
          {/* Always draw neighborhood outlines calmly */}
          {neighborhoods.features.map((f) => {
            const stats = statsById.get(f.properties.id) ?? null;
            const isBelow =
              areaType === 'neighborhood'
                ? !stats || stats.below_threshold
                : true;
            const colors =
              areaType === 'neighborhood'
                ? getAreaColors(stats?.report_count ?? null, isBelow, resolvedTheme)
                : {
                    fill: 'transparent',
                    stroke: resolvedTheme === 'dark' ? '#2B3B45' : '#D5D2CA',
                    fillOpacity: 0,
                    dashArray: undefined,
                  };
            const isSelected =
              areaType === 'neighborhood' && selectedAreaId === f.properties.id;
            const isHighlighted =
              highlightedNeighborhoodIds?.has(f.properties.id) ?? false;

            return (
              <path
                key={f.properties.id}
                d={svgProjection.polyToPath(f.geometry.coordinates)}
                fill={colors.fill}
                fillOpacity={areaType === 'neighborhood' ? colors.fillOpacity : isHighlighted ? 0.14 : 0}
                stroke={isHighlighted ? (resolvedTheme === 'dark' ? '#7AD1DB' : '#0F5C66') : colors.stroke}
                strokeWidth={isSelected || isHighlighted ? 3 : 1.5}
                strokeDasharray={isHighlighted ? undefined : colors.dashArray}
                className={cn(areaType === 'neighborhood' && 'cursor-pointer')}
                onClick={
                  areaType === 'neighborhood'
                    ? () => onSelectArea(buildSelectedInfo(f))
                    : undefined
                }
              />
            );
          })}

          {/* Street segments when Streets mode is active */}
          {areaType === 'street' &&
            streets.features.map((f) => {
              const stats = statsById.get(f.properties.id) ?? null;
              const isBelow = !stats || stats.below_threshold;
              const colors = getAreaColors(
                stats?.report_count ?? null,
                isBelow,
                resolvedTheme
              );
              const isSelected = selectedAreaId === f.properties.id;
              return (
                <path
                  key={f.properties.id}
                  d={svgProjection.lineToPath(f.geometry.coordinates)}
                  fill="none"
                  stroke={isBelow ? colors.stroke : colors.fill}
                  strokeWidth={isSelected ? 8 : 6}
                  strokeLinecap="round"
                  strokeDasharray={colors.dashArray}
                  className="cursor-pointer"
                  onClick={() => onSelectArea(buildSelectedInfo(f))}
                />
              );
            })}

          {/* Centroid neighborhood labels */}
          {svgProjection.labels.map((lbl) => (
            <text
              key={lbl.id}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none fill-[var(--text-primary)] text-[10px] font-bold"
            >
              {lbl.name}
            </text>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-y border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
      <MapContainer
        center={[33.586, -7.632]}
        zoom={MAP_ZOOM.default}
        minZoom={MAP_ZOOM.min}
        maxZoom={MAP_ZOOM.max}
        zoomControl={false}
        scrollWheelZoom={false}
        className="h-[370px] w-full"
        aria-label={t('heatmap.mapAriaLabel')}
      >
        <ZoomControl position={dir === 'rtl' ? 'topleft' : 'topright'} />
        <ZoomWatcher onZoomChange={setZoom} />
        <FitBoundsHelper collection={activeCollection} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={MAP_ZOOM.max}
          eventHandlers={{
            tileerror: () => {
              setTileErrorCount((prev) => {
                const next = prev + 1;
                if (next >= 2) onTileFailure();
                return next;
              });
            },
          }}
        />

        {/* Subtle context neighborhood outlines when viewing streets */}
        {areaType === 'street' && (
          <GeoJSON
            key={`ctx-${resolvedTheme}-${highlightSig}`}
            data={neighborhoods}
            interactive={false}
            style={(feature) => {
              const id = feature?.properties?.id as string | undefined;
              const isHighlighted = id ? highlightedNeighborhoodIds?.has(id) ?? false : false;
              return {
                color: isHighlighted
                  ? resolvedTheme === 'dark'
                    ? '#7AD1DB'
                    : '#0F5C66'
                  : resolvedTheme === 'dark'
                    ? '#3B4D58'
                    : '#A9B4BA',
                weight: isHighlighted ? 2.5 : 1.25,
                fillOpacity: isHighlighted ? 0.14 : 0.04,
              };
            }}
          />
        )}

        {/* Thermal Density Glow Layer (aggregated area centroids only) */}
        <ThermalOverlay points={thermalPoints} />

        {/* Active Interactive Layer */}
        <GeoJSON
          key={renderKey}
          data={activeCollection}
          style={(feature) => {
            const id = feature?.properties?.id as string | undefined;
            const neighborId = feature?.properties?.neighborhood_id as string | undefined;
            const stats = id ? statsById.get(id) ?? null : null;
            const isBelow = !stats || stats.below_threshold;
            const colors = getAreaColors(
              stats?.report_count ?? null,
              isBelow,
              resolvedTheme
            );
            const isSelected = id === selectedAreaId;
            const isHighlighted =
              areaType === 'street'
                ? neighborId
                  ? highlightedNeighborhoodIds?.has(neighborId) ?? false
                  : false
                : id
                  ? highlightedNeighborhoodIds?.has(id) ?? false
                  : false;

            if (areaType === 'street') {
              return {
                color: isBelow ? colors.stroke : colors.fill,
                weight: isSelected ? streetWeight + 3 : isHighlighted ? streetWeight + 2 : streetWeight,
                opacity: isBelow ? 0.85 : isHighlighted ? 1 : 0.92,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: colors.dashArray,
              };
            }

            return {
              color: isHighlighted ? (resolvedTheme === 'dark' ? '#7AD1DB' : '#0F5C66') : colors.stroke,
              weight: isSelected || isHighlighted ? 3 : 2,
              dashArray: colors.dashArray,
              fillColor: colors.fill,
              fillOpacity: isSelected
                ? Math.min(0.75, colors.fillOpacity + 0.16)
                : isHighlighted
                  ? Math.min(0.68, colors.fillOpacity + 0.1)
                  : colors.fillOpacity,
            };
          }}
          onEachFeature={(feature, layer) => {
            const info = buildSelectedInfo(
              feature as Feature<Polygon | LineString, NeighborhoodProperties | StreetProperties>
            );
            const isBelow =
              !info.stats ||
              info.stats.below_threshold ||
              info.stats.report_count === null;

            // Strict rule: never render any count in tooltips for below-threshold areas
            const tooltipText = isBelow
              ? `${info.name} — ${t('heatmap.belowThresholdTitle')}`
              : `${info.name} (${formatNumber(info.stats!.report_count!)})`;

            layer.bindTooltip(tooltipText, {
              sticky: true,
              direction: 'top',
            });

            layer.on('click', () => {
              onSelectArea(info);
            });
          }}
        />

        {/* Neighborhood centroid labels */}
        {areaType === 'neighborhood' &&
          neighborhoods.features.map((f) => {
            const center = centerOfMass(f);
            const [lng, lat] = center.geometry.coordinates;
            const name = getLocalizedName(f.properties);
            return (
              <CircleMarker
                key={`lbl-${f.properties.id}-${language}`}
                center={[lat, lng]}
                radius={0}
                interactive={false}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="!border-0 !bg-transparent !px-1 !py-0 !text-[11px] !font-bold !text-[var(--text-primary)] !shadow-none"
                >
                  {name}
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Nearby Official Police (DGSN) & Gendarmerie Royale Station Markers */}
        {showStations && stations.length > 0 && (
          <Pane name="police-stations-pane" style={{ zIndex: 650 }}>
            {stations.map((st, idx) => {
              const isGendarmerie = st.type === 'Gendarmerie Royale';
              const callNumber = st.phone || (isGendarmerie ? '177' : '19');
              const typeLabel = isGendarmerie
                ? t('heatmap.gendarmerieType')
                : t('heatmap.policeType');
              return (
                <CircleMarker
                  key={`st-${idx}-${st.latitude}-${st.longitude}`}
                  center={[st.latitude, st.longitude]}
                  radius={6}
                  pane="police-stations-pane"
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 2,
                    fillColor: isGendarmerie ? '#B45309' : '#0369A1',
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="flex min-w-[190px] flex-col gap-1.5 text-[0.8125rem]">
                      <span
                        className={cn(
                          'inline-block w-fit rounded-full px-2 py-0.5 text-[0.6875rem] font-bold',
                          isGendarmerie
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sky-100 text-sky-900'
                        )}
                      >
                        {typeLabel}
                      </span>
                      <strong className="text-[0.875rem] leading-snug text-slate-900">
                        {st.name}
                      </strong>
                      <span className="text-[0.75rem] text-slate-600">
                        {t('heatmap.stationDistanceKm', {
                          distance: formatNumber(st.distance_km),
                        })}{' '}
                        · {st.address}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <a
                          href={`tel:${callNumber.replace(/\s+/g, '')}`}
                          className="inline-flex items-center rounded-md bg-[#0F5C66] px-2.5 py-1 text-[0.75rem] font-bold !text-white no-underline"
                        >
                          {t('heatmap.stationCallBtn', { number: callNumber })}
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${st.latitude},${st.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1 text-[0.75rem] font-semibold !text-slate-800 no-underline"
                        >
                          {t('heatmap.stationDirectionsBtn')}
                        </a>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </Pane>
        )}
      </MapContainer>
    </div>
  );
};
