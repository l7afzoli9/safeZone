# Amin — Mobile-First Community Safety PWA

**Amin** is an installable, mobile-first Progressive Web App (PWA) for community safety in Morocco, built around privacy-by-design (Morocco Law 09-08 / CNDP data minimization), calm visual ergonomics, and bilingual RTL/LTR support (`ar`, `fr`).

---

## Core Capabilities

- **Trip Sharing (Phase 1):** Start timed trips (`15`, `30`, `60`, or custom minutes `5–240`) with selected trusted contacts, live countdown (`Intl.NumberFormat`), calm status pulse (`prefers-reduced-motion` aware), Pause/Resume, Safe End (deletes transient trip data), and confirmation-gated Contact Alert.
- **Official Emergency Shortcuts:** Persistent one-tap `tel:19` (DGSN Police) and `tel:177` (Gendarmerie Royale) actions.
- **Anonymous Coarse-Zone Incident Reporting (Phase 1):** 3-step flow with incident type, approximate neighborhood/grid zone picker (with optional client-side quantization in `src/services/geo.ts` that never stores or sends raw GPS coordinates), time range (`morning`, `afternoon`, `evening`, `night`), optional description with character counter, and hourly anti-abuse rate limiting.
- **Complaint Heat Map & Route Hints (Phase 2 Previews):** Per-street and per-neighborhood choropleth map (`/map`) built with React-Leaflet, `d3-scale`/`d3-interpolate` (5-step single-hue sequential teal ramp), `@turf/turf`, automatic offline SVG schematic fallback, strict `MIN_REPORTS` (`5` distinct reporters) threshold gating, accessible alphabetical list view, mandatory *"User-reported, unverified"* and *"Busy streets get more reports..."* notes, and informational route hints without single numeric danger scores.
- **Bilingual RTL/LTR & Theming:** Instant switching across French (`fr`, LTR) and Modern Standard Arabic (`ar`, RTL), plus `System / Light / Dark` themes persisted in `localStorage`.
- **Law 09-08 Data Controls:** Full JSON data export and immediate local data deletion in Settings.

---

## Local Development & PWA Build

### Prerequisites
- Node.js `>= 20` and npm `>= 10`

### Commands

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Type-check and build production PWA bundle (dist/)
npm run build

# Preview built PWA locally (includes generated Service Worker & manifest)
npm run preview
```

---

## Swapping `/mock/*.json` for a PHP + MySQL REST API

All data reads and writes are isolated inside [`src/services/api.ts`](src/services/api.ts). The UI components never fetch mock URLs or touch `localStorage` directly for domain records.

### Step 1: Configure API Base URL
In `src/services/api.ts`, replace `fetchMockJson('/mock/...')` with `fetch('/api/...')` (or an environment variable `import.meta.env.VITE_API_BASE_URL`).

### Step 2: Endpoint Mapping & Expected Shapes

| Frontend Method (`api.ts`) | PHP Endpoint | Method | Request / Query | Expected JSON Response |
|---|---|---|---|---|
| `getSession()` | `/api/me.php` | `GET` | Auth cookie / bearer token | `UserSession` (`pseudonym`, `onboarding_completed`, `location_consent`, `language`, `theme`, `notifications`, `rate_limit`) |
| `updateSession(patch)` | `/api/me.php` | `PATCH` | Partial `UserSession` JSON | Updated `UserSession` |
| `getZones()` | `/api/zones.php` | `GET` | Optional `?city=` | `{ "min_display_threshold": 5, "window_days": 14, "zones": Zone[] }` |
| `getNeighborhoodsGeoJson()` | `/api/areas.php?format=geojson&type=neighborhood` | `GET` | — | GeoJSON `FeatureCollection<Polygon>` with `{ id, name_ar, name_fr }` |
| `getStreetsGeoJson()` | `/api/areas.php?format=geojson&type=street` | `GET` | — | GeoJSON `FeatureCollection<LineString>` with `{ id, name_ar, name_fr, neighborhood_id }` |
| `getAreaStats(params)` | `/api/areas?type=street\|neighborhood&time_bucket=...&window=...` | `GET` | `type`, `time_bucket` (`all\|morning\|afternoon\|evening\|night`), `window` (`7d\|30d\|90d`) | Aggregated entries; **server must suppress `report_count`, `distinct_reporters`, `last_report_at`, and `by_type` (`null`, `below_threshold: true`) whenever `< MIN_REPORTS` (default `5`)** |
| `getReports(zoneId?)` | `/api/reports.php` | `GET` | Optional `?zone_id=` | `{ "reports": IncidentReport[] }` (exclude `hidden` / expired rows) |
| `submitReport(input)` | `/api/reports.php` | `POST` | `{ zone_id, incident_type, time_bucket, note, is_anonymous }` | `201 Created` with `IncidentReport`; `429 Too Many Requests` when rate-limited |
| `voteReport(id, choice)` | `/api/reports.php?action=vote` | `POST` | `{ report_id, choice: "confirm" \| "dispute" }` | `{ "ok": true }` |
| `getContacts()` | `/api/contacts.php` | `GET` | — | `{ "contacts": TrustedContact[] }` |
| `saveContact(input)` | `/api/contacts.php` | `POST` / `PUT` | `{ id?, name, phone, relation_key }` | `{ "contacts": TrustedContact[] }` |
| `deleteContact(id)` | `/api/contacts.php?id=...` | `DELETE` | Query `id` | `{ "contacts": TrustedContact[] }` |
| `getActiveTrip()` | `/api/trips.php?status=active` | `GET` | — | `{ "active_trip": ActiveTrip \| null }` |
| `startTrip(input)` | `/api/trips.php` | `POST` | `{ duration_minutes, contact_ids, note, coarse_zone_id }` | `ActiveTrip` (stored in volatile/active table, purged on completion) |
| `pauseTrip` / `resumeTrip` / `triggerTripAlert` | `/api/trips.php?id=...` | `PATCH` | `{ status, remaining_seconds_on_pause?, alert_triggered_at? }` | Updated `ActiveTrip` |
| `endTrip()` | `/api/trips.php?id=...` | `DELETE` | Query `id` | `{ "ok": true }` (delete transient trip coordinates/status) |
| `getRoutePresets()` | `/api/route-hints.php` | `GET` | Optional `?origin=&destination=` | `{ "preset_routes": RouteHintPreset[] }` |
| `exportMyData()` | `/api/export.php` | `GET` | — | `ExportedUserData` JSON attachment |
| `deleteMyData()` | `/api/me.php` | `DELETE` | — | `{ "ok": true }` |

### Step 3: Deployment Notes for PHP Hosting
- Build static assets with `npm run build` and upload `dist/` to your PHP web root (`public_html/`).
- Add an Apache `.htaccess` (or Nginx `try_files`) fallback redirecting non-API SPA routes to `/index.html`, excluding `/api/*`.
- Enforce server-side Moroccan phone validation (`^\+212[67]\d{8}$`), CSRF/session protection, hourly rate limits on `POST /api/reports.php`, and automated SQL expiry (`DELETE` or archive where `expires_at < NOW()`).
