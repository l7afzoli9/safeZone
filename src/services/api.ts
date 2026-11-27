import type { FeatureCollection, LineString, Polygon } from 'geojson';
import type {
  AreaAggregate,
  AreaByType,
  AreaStatsPayload,
  AreaType,
  CreateReportInput,
  ExportedUserData,
  IncidentReport,
  NearbyStation,
  NeighborhoodProperties,
  PoliceStation,
  RecencyWindow,
  ReportsPayload,
  RouteHintPreset,
  RoutesPayload,
  StreetProperties,
  TimeBucket,
  TimeBucketFilter,
  UserSession,
  VoteChoice,
  Zone,
  ZonesPayload,
} from '../types';
import { MIN_REPORTS } from '../constants/safety';
import { storage } from './storage';

/**
 * Single data-access service layer for Amin.
 * Currently backed by /mock/*.json + localStorage persistence.
 *
 * Future PHP + MySQL swap points:
 * - getZones()                -> GET    /api/zones.php
 * - getNeighborhoodsGeoJson() -> GET    /api/areas.php?format=geojson&type=neighborhood
 * - getStreetsGeoJson()       -> GET    /api/areas.php?format=geojson&type=street
 * - getAreaStats()            -> GET    /api/areas?type=street|neighborhood&time_bucket=...&window=...
 * - getReports()              -> GET    /api/reports.php?zone_id=...
 * - submitReport()            -> POST   /api/reports.php
 * - voteReport()              -> POST   /api/reports.php?action=vote
 * - getRoutePresets()         -> GET    /api/route-hints.php
 * - getSession()              -> GET    /api/me.php
 * - exportMyData()            -> GET    /api/export.php
 * - deleteMyData()            -> DELETE /api/me.php
 */

async function fetchMockJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export class RateLimitError extends Error {
  constructor(public maxPerHour: number) {
    super('RATE_LIMIT_EXCEEDED');
  }
}

export const api = {
  async getSession(): Promise<UserSession> {
    const existing = storage.getSession();
    if (existing) {
      return {
        ...existing,
        language: storage.getLanguage(),
        theme: storage.getTheme(),
      };
    }
    const seed = await fetchMockJson<UserSession>('/mock/session.json');
    const hydrated: UserSession = {
      ...seed,
      language: storage.getLanguage(),
      theme: storage.getTheme(),
    };
    storage.setSession(hydrated);
    return hydrated;
  },

  async updateSession(patch: Partial<UserSession>): Promise<UserSession> {
    const current = await this.getSession();
    const next: UserSession = {
      ...current,
      ...patch,
      notifications: {
        ...current.notifications,
        ...(patch.notifications ?? {}),
      },
      rate_limit: {
        ...current.rate_limit,
        ...(patch.rate_limit ?? {}),
      },
    };
    storage.setSession(next);
    return next;
  },

  async getZones(): Promise<ZonesPayload> {
    const payload = await fetchMockJson<ZonesPayload>('/mock/zones.json');
    const localReports = storage.getUserReports().filter((r) => r.status !== 'hidden');
    if (localReports.length === 0) {
      return {
        ...payload,
        min_display_threshold: MIN_REPORTS,
      };
    }

    const mergedZones: Zone[] = payload.zones.map((zone) => {
      const additions = localReports.filter((r) => r.zone_id === zone.id);
      if (additions.length === 0) return zone;

      const nextCategories = { ...zone.category_counts };
      let latest = zone.latest_report_at;
      for (const rep of additions) {
        nextCategories[rep.incident_type] = (nextCategories[rep.incident_type] ?? 0) + 1;
        if (!latest || new Date(rep.created_at) > new Date(latest)) {
          latest = rep.created_at;
        }
      }

      return {
        ...zone,
        report_count: zone.report_count + additions.length,
        latest_report_at: latest,
        category_counts: nextCategories,
      };
    });

    return {
      ...payload,
      min_display_threshold: MIN_REPORTS,
      zones: mergedZones,
    };
  },

  async getNeighborhoodsGeoJson(): Promise<FeatureCollection<Polygon, NeighborhoodProperties>> {
    return fetchMockJson<FeatureCollection<Polygon, NeighborhoodProperties>>(
      '/mock/neighborhoods.geojson'
    );
  },

  async getStreetsGeoJson(): Promise<FeatureCollection<LineString, StreetProperties>> {
    return fetchMockJson<FeatureCollection<LineString, StreetProperties>>(
      '/mock/streets.geojson'
    );
  },

  async getAreaStats(params: {
    type: AreaType;
    timeBucket: TimeBucketFilter;
    window: RecencyWindow;
  }): Promise<AreaAggregate[]> {
    const payload = await fetchMockJson<AreaStatsPayload>('/mock/area-stats.json');
    const localReports = storage.getUserReports().filter((r) => r.status !== 'hidden');

    const matching = payload.areas.filter(
      (entry) => entry.area_type === params.type && entry.window === params.window
    );

    const grouped = new Map<string, typeof matching>();
    for (const item of matching) {
      const list = grouped.get(item.area_id) ?? [];
      list.push(item);
      grouped.set(item.area_id, list);
    }

    const result: AreaAggregate[] = [];
    for (const [areaId, rows] of grouped.entries()) {
      const matchingLocal = localReports.filter((rep) => {
        if (params.type === 'street') {
          return rep.area_type === 'street' && rep.area_id === areaId;
        }
        return rep.zone_id === areaId || (rep.area_type === 'neighborhood' && rep.area_id === areaId);
      });

      const byTime: Record<TimeBucket, number> = {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      };
      const byType: AreaByType = { theft: 0, harassment: 0, suspicious: 0, other: 0 };
      let totalCount = 0;
      let sumDistinct = 0;
      let maxDistinct = 0;
      let latestAt: string | null = null;

      const filteredRows =
        params.timeBucket === 'all'
          ? rows
          : rows.filter((r) => r.time_bucket === params.timeBucket);

      for (const r of rows) {
        byTime[r.time_bucket] += r.report_count;
      }

      for (const r of filteredRows) {
        totalCount += r.report_count;
        sumDistinct += r.distinct_reporters;
        if (r.distinct_reporters > maxDistinct) maxDistinct = r.distinct_reporters;
        byType.theft += r.by_type.theft;
        byType.harassment += r.by_type.harassment;
        byType.suspicious += r.by_type.suspicious;
        byType.other += r.by_type.other;
        if (
          r.report_count > 0 &&
          (!latestAt || new Date(r.last_report_at) > new Date(latestAt))
        ) {
          latestAt = r.last_report_at;
        }
      }

      for (const rep of matchingLocal) {
        byTime[rep.time_bucket] += 1;
        if (params.timeBucket === 'all' || rep.time_bucket === params.timeBucket) {
          totalCount += 1;
          sumDistinct += 1;
          maxDistinct = Math.max(maxDistinct, 1);
          const mappedType =
            rep.incident_type === 'suspicious_activity' ? 'suspicious' : rep.incident_type;
          byType[mappedType] += 1;
          if (!latestAt || new Date(rep.created_at) > new Date(latestAt)) {
            latestAt = rep.created_at;
          }
        }
      }

      // If only 1 distinct reporter repeated across buckets, keep distinct below threshold
      const distinctReporters =
        params.timeBucket === 'all'
          ? maxDistinct <= 1
            ? Math.min(sumDistinct, 2)
            : sumDistinct
          : sumDistinct;

      const belowThreshold = totalCount < MIN_REPORTS || distinctReporters < MIN_REPORTS;

      if (belowThreshold) {
        result.push({
          area_type: params.type,
          area_id: areaId,
          window: params.window,
          time_bucket: params.timeBucket,
          below_threshold: true,
          report_count: null,
          distinct_reporters: null,
          last_report_at: null,
          by_type: null,
          by_time: null,
        });
      } else {
        result.push({
          area_type: params.type,
          area_id: areaId,
          window: params.window,
          time_bucket: params.timeBucket,
          below_threshold: false,
          report_count: totalCount,
          distinct_reporters: distinctReporters,
          last_report_at: latestAt,
          by_type: byType,
          by_time: byTime,
        });
      }
    }

    return result;
  },

  async getReports(zoneId?: string): Promise<IncidentReport[]> {
    const mock = await fetchMockJson<ReportsPayload>('/mock/reports.json');
    const localReports = storage.getUserReports();
    const votes = storage.getReportVotes();
    const now = Date.now();

    const combined = [...localReports, ...mock.reports]
      .filter((r) => r.status !== 'hidden' && new Date(r.expires_at).getTime() > now)
      .filter((r) => (zoneId ? r.zone_id === zoneId : true))
      .map((r) => {
        const vote = votes[r.id] ?? null;
        return {
          ...r,
          confirm_count: r.confirm_count + (vote === 'confirm' ? 1 : 0),
          dispute_count: r.dispute_count + (vote === 'dispute' ? 1 : 0),
          user_vote: vote,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return combined;
  },

  async submitReport(input: CreateReportInput): Promise<IncidentReport> {
    const session = await this.getSession();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = session.rate_limit.recent_report_timestamps.filter(
      (ts) => new Date(ts).getTime() > oneHourAgo
    );

    if (recent.length >= session.rate_limit.max_reports_per_hour) {
      throw new RateLimitError(session.rate_limit.max_reports_per_hour);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const created: IncidentReport = {
      id: createId('rep'),
      zone_id: input.zone_id,
      area_type: input.area_type,
      area_id: input.area_id,
      incident_type: input.incident_type,
      time_bucket: input.time_bucket,
      note: input.note.trim() ? input.note.trim() : null,
      is_anonymous: input.is_anonymous,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'active',
      confirm_count: 1,
      dispute_count: 0,
      user_vote: null,
    };

    const existing = storage.getUserReports();
    storage.setUserReports([created, ...existing]);
    await this.updateSession({
      rate_limit: {
        ...session.rate_limit,
        recent_report_timestamps: [...recent, now.toISOString()],
      },
    });

    return created;
  },

  async voteReport(reportId: string, choice: VoteChoice): Promise<void> {
    const votes = storage.getReportVotes();
    if (votes[reportId] === choice) {
      delete votes[reportId];
    } else {
      votes[reportId] = choice;
    }
    storage.setReportVotes(votes);
  },

  async getRoutePresets(): Promise<RouteHintPreset[]> {
    const payload = await fetchMockJson<RoutesPayload>('/mock/routes.json');
    return payload.preset_routes;
  },

  async getNearbyStations(
    lat = 33.586,
    lon = -7.632,
    radiusKm = 12
  ): Promise<NearbyStation[]> {
    const envBase = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_POLICE_API_URL;
    const isLocalHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const apiBase = envBase || (isLocalHost ? 'http://127.0.0.1:8000' : '');

    if (apiBase) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 1200);
        const res = await fetch(
          `${apiBase}/stations/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timer);
        if (res.ok) {
          return (await res.json()) as NearbyStation[];
        }
      } catch {
        // Gracefully fall back to bundled static stations.json when API server is offline
      }
    }

    const stations = await fetchMockJson<PoliceStation[]>('/mock/stations.json');
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (aLat: number, aLon: number, bLat: number, bLon: number) => {
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
      return 2 * 6371 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

    return stations
      .map((st) => ({
        ...st,
        distance_km: Number(haversine(lat, lon, st.latitude, st.longitude).toFixed(2)),
      }))
      .filter((st) => st.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  },

  async exportMyData(): Promise<ExportedUserData> {
    const session = await this.getSession();
    return {
      exported_at: new Date().toISOString(),
      schema_version: '1.2.0',
      session,
      submitted_reports: storage.getUserReports(),
    };
  },

  async deleteMyData(): Promise<UserSession> {
    storage.clearAllUserData();
    const seed = await fetchMockJson<UserSession>('/mock/session.json');
    const clean: UserSession = {
      ...seed,
      onboarding_completed: true,
      location_consent: false,
      consent_updated_at: null,
      language: storage.getLanguage(),
      theme: storage.getTheme(),
    };
    storage.setSession(clean);
    return clean;
  },
};
