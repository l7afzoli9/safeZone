import type { Zone } from '../types';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Privacy-by-design coarse quantization:
 * Converts raw browser coordinates on-device into the nearest named neighborhood zone ID
 * and immediately discards exact coordinates without storing or transmitting them.
 */
export function quantizeCoordinatesToZone(
  lat: number,
  lng: number,
  zones: Zone[]
): Zone | null {
  if (zones.length === 0) return null;
  let closest = zones[0];
  let bestDist = haversineKm(lat, lng, closest.center[0], closest.center[1]);
  for (let i = 1; i < zones.length; i++) {
    const candidate = zones[i];
    const dist = haversineKm(lat, lng, candidate.center[0], candidate.center[1]);
    if (dist < bestDist) {
      bestDist = dist;
      closest = candidate;
    }
  }
  return closest;
}

export async function detectApproximateZone(zones: Zone[]): Promise<Zone | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Immediately convert to coarse neighborhood zone; raw coords never leave this function
        resolve(quantizeCoordinatesToZone(latitude, longitude, zones));
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  });
}
