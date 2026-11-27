import React, { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

export interface ThermalPoint {
  lat: number;
  lng: number;
  /** Normalized intensity in [0, 1] derived from aggregated report_count */
  weight: number;
}

interface ThermalOverlayProps {
  points: ThermalPoint[];
}

/**
 * Build a 256-entry RGBA lookup table:
 * transparent -> indigo/violet -> cyan -> green -> yellow -> orange -> red
 */
function buildThermalLut(): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Uint8ClampedArray(256 * 4);

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(99, 102, 241, 0)');
  grad.addColorStop(0.18, 'rgba(99, 102, 241, 0.55)');
  grad.addColorStop(0.38, 'rgba(6, 182, 212, 0.72)');
  grad.addColorStop(0.56, 'rgba(34, 197, 94, 0.80)');
  grad.addColorStop(0.74, 'rgba(250, 204, 21, 0.88)');
  grad.addColorStop(0.9, 'rgba(249, 115, 22, 0.92)');
  grad.addColorStop(1.0, 'rgba(239, 68, 68, 0.95)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

let cachedLut: Uint8ClampedArray | null = null;
function getThermalLut(): Uint8ClampedArray {
  if (!cachedLut) {
    cachedLut = buildThermalLut();
  }
  return cachedLut;
}

/**
 * Non-interactive Leaflet canvas overlay rendering a smooth thermal density glow
 * strictly from aggregated area/street centroids (no individual user coordinates).
 */
export const ThermalOverlay: React.FC<ThermalOverlayProps> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    const pane = map.getPanes().overlayPane;
    const canvas = L.DomUtil.create('canvas', 'leaflet-thermal-layer') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '250';
    pane.appendChild(canvas);

    const lut = getThermalLut();

    const draw = () => {
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, size.x, size.y);
      if (points.length === 0) return;

      const zoom = map.getZoom();
      const radius = Math.max(24, Math.min(72, 42 * Math.pow(1.22, zoom - 13)));

      for (const pt of points) {
        const p = map.latLngToContainerPoint([pt.lat, pt.lng]);
        if (
          p.x < -radius ||
          p.y < -radius ||
          p.x > size.x + radius ||
          p.y > size.y + radius
        ) {
          continue;
        }
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        const alpha = Math.max(0.15, Math.min(0.95, pt.weight));
        grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
        grad.addColorStop(0.55, `rgba(0, 0, 0, ${alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const img = ctx.getImageData(0, 0, size.x, size.y);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const lutIdx = a * 4;
        data[i] = lut[lutIdx];
        data[i + 1] = lut[lutIdx + 1];
        data[i + 2] = lut[lutIdx + 2];
        data[i + 3] = lut[lutIdx + 3];
      }
      ctx.putImageData(img, 0, 0);
    };

    draw();
    map.on('moveend zoomend resize viewreset', draw);

    return () => {
      map.off('moveend zoomend resize viewreset', draw);
      if (canvas.parentNode === pane) {
        pane.removeChild(canvas);
      }
    };
  }, [map, points]);

  return null;
};
