import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import type { Zone } from '../../types';
import { cn } from '../../lib/cn';

interface ZoneMapProps {
  zones: Zone[];
  minThreshold: number;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  className?: string;
}

export const ZoneMap: React.FC<ZoneMapProps> = ({
  zones,
  minThreshold,
  selectedZoneId,
  onSelectZone,
  className,
}) => {
  const { t, formatNumber } = useI18n();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [tileFailed, setTileFailed] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Compute safe normalized positions for the offline schematic fallback
  const schematicNodes = useMemo(() => {
    if (zones.length === 0) return [];
    const lats = zones.map((z) => z.center[0]);
    const lngs = zones.map((z) => z.center[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.01, maxLat - minLat);
    const lngSpan = Math.max(0.01, maxLng - minLng);

    return zones.map((z) => ({
      zone: z,
      xPct: 12 + ((z.center[1] - minLng) / lngSpan) * 76,
      yPct: 82 - ((z.center[0] - minLat) / latSpan) * 64,
    }));
  }, [zones]);

  useEffect(() => {
    if (tileFailed || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([33.76, -7.24], 8);

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 17,
    });

    let errorCount = 0;
    tileLayer.on('tileerror', () => {
      errorCount += 1;
      if (errorCount >= 2) {
        setTileFailed(true);
      }
    });

    tileLayer.addTo(map);
    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [tileFailed]);

  useEffect(() => {
    if (tileFailed || !mapRef.current || !layerGroupRef.current) return;
    const group = layerGroupRef.current;
    const map = mapRef.current;
    group.clearLayers();

    if (zones.length === 0) return;

    const primaryColor = resolvedTheme === 'dark' ? '#4DB8C4' : '#0F5C66';
    const mutedColor = resolvedTheme === 'dark' ? '#8B9CA6' : '#5C6D75';
    const bounds = L.latLngBounds([]);

    for (const zone of zones) {
      const isSufficient = zone.report_count >= minThreshold;
      const isSelected = zone.id === selectedZoneId;

      const poly = L.polygon(zone.polygon, {
        color: isSelected ? primaryColor : isSufficient ? primaryColor : mutedColor,
        weight: isSelected ? 3 : 2,
        dashArray: isSufficient ? undefined : '5 4',
        fillColor: isSufficient ? primaryColor : mutedColor,
        fillOpacity: isSelected ? 0.34 : isSufficient ? 0.2 : 0.08,
      });

      poly.on('click', () => onSelectZone(zone.id));
      poly.bindTooltip(
        isSufficient
          ? `${t(zone.name_key)} (${formatNumber(zone.report_count)})`
          : t(zone.name_key),
        { direction: 'top', sticky: true }
      );
      poly.addTo(group);
      bounds.extend(zone.polygon);
    }

    if (selectedZoneId) {
      const target = zones.find((z) => z.id === selectedZoneId);
      if (target) {
        map.fitBounds(L.latLngBounds(target.polygon), { padding: [36, 36], maxZoom: 13 });
        return;
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
    }
  }, [zones, minThreshold, selectedZoneId, resolvedTheme, tileFailed, onSelectZone, t, formatNumber]);

  if (tileFailed) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5',
          className
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 text-[var(--text-secondary)]">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[0.875rem] font-bold text-[var(--text-primary)]">
                {t('zones.tileFallbackTitle')}
              </p>
              <p className="text-[0.8125rem] text-[var(--text-muted)]">
                {t('zones.tileFallbackSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative h-[220px] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--border-strong) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        >
          {schematicNodes.map(({ zone, xPct, yPct }) => {
            const isSufficient = zone.report_count >= minThreshold;
            const isSelected = zone.id === selectedZoneId;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => onSelectZone(zone.id)}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 inline-flex min-h-[36px] items-center gap-1 rounded-full border px-2.5 py-1 text-[0.75rem] font-bold shadow-xs transition-transform cursor-pointer',
                  isSelected
                    ? 'z-10 scale-105 border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-ink)]'
                    : isSufficient
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]'
                      : 'border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                )}
              >
                <span>{t(zone.name_key)}</span>
                {isSufficient && (
                  <span className="tabular-nums opacity-90">
                    ({formatNumber(zone.report_count)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div ref={containerRef} className="h-[250px] w-full" aria-label={t('zones.title')} />
    </div>
  );
};
