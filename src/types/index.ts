export type Language = 'ar' | 'fr';

export type ThemePreference = 'system' | 'light' | 'dark';

export type AreaType = 'street' | 'neighborhood';

export type RecencyWindow = '7d' | '30d' | '90d';

export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export type TimeBucketFilter = TimeBucket | 'all';

export type IncidentType =
  | 'theft'
  | 'harassment'
  | 'suspicious_activity'
  | 'other';

export type ReportStatus = 'active' | 'disputed' | 'hidden' | 'expired';

export type VoteChoice = 'confirm' | 'dispute';

export interface Zone {
  id: string;
  zone_code: string;
  city_key: string;
  name_key: string;
  center: [number, number];
  polygon: [number, number][];
  report_count: number;
  latest_report_at: string | null;
  dominant_time_bucket: TimeBucket | null;
  category_counts: Record<IncidentType, number>;
}

export interface ZonesPayload {
  min_display_threshold: number;
  window_days: number;
  zones: Zone[];
}

export interface IncidentReport {
  id: string;
  zone_id: string;
  area_type?: AreaType;
  area_id?: string;
  incident_type: IncidentType;
  time_bucket: TimeBucket;
  note: string | null;
  note_key?: string | null;
  is_anonymous: boolean;
  created_at: string;
  expires_at: string;
  status: ReportStatus;
  confirm_count: number;
  dispute_count: number;
  user_vote?: VoteChoice | null;
}

export interface ReportsPayload {
  reports: IncidentReport[];
}

export interface RouteHintPreset {
  id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  traversed_zone_ids: string[];
  estimated_walk_minutes: number;
  advisory_key: string;
}

export interface RoutesPayload {
  preset_routes: RouteHintPreset[];
}

export interface NotificationPrefs {
  zone_updates: boolean;
}

export interface UserSession {
  pseudonym: string;
  onboarding_completed: boolean;
  location_consent: boolean;
  consent_updated_at: string | null;
  language: Language;
  theme: ThemePreference;
  notifications: NotificationPrefs;
  rate_limit: {
    recent_report_timestamps: string[];
    max_reports_per_hour: number;
  };
}

export interface NeighborhoodProperties {
  id: string;
  name_ar: string;
  name_fr: string;
}

export interface StreetProperties {
  id: string;
  name_ar: string;
  name_fr: string;
  neighborhood_id: string;
}

export interface AreaByType {
  theft: number;
  harassment: number;
  suspicious: number;
  other: number;
}

export interface AreaStatEntry {
  area_type: AreaType;
  area_id: string;
  time_bucket: TimeBucket;
  window: RecencyWindow;
  report_count: number;
  distinct_reporters: number;
  last_report_at: string;
  by_type: AreaByType;
}

export interface AreaStatsPayload {
  min_reports?: number;
  areas: AreaStatEntry[];
}

export interface AreaAggregate {
  area_type: AreaType;
  area_id: string;
  window: RecencyWindow;
  time_bucket: TimeBucketFilter;
  below_threshold: boolean;
  report_count: number | null;
  distinct_reporters: number | null;
  last_report_at: string | null;
  by_type: AreaByType | null;
  by_time: Record<TimeBucket, number> | null;
}

export interface CreateReportInput {
  zone_id: string;
  area_type?: AreaType;
  area_id?: string;
  incident_type: IncidentType;
  time_bucket: TimeBucket;
  note: string;
  is_anonymous: boolean;
}

export interface ExportedUserData {
  exported_at: string;
  schema_version: string;
  session: UserSession;
  submitted_reports: IncidentReport[];
}
