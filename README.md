# Amin — Mobile-First Community Safety PWA

**Amin** is an installable, mobile-first Progressive Web App (PWA) for community safety in Morocco, built around privacy-by-design (Morocco Law 09-08 / CNDP data minimization), calm visual ergonomics, and bilingual RTL/LTR support (`ar`, `fr`).

---

## Core Capabilities

- **Official Emergency Shortcuts:** Persistent one-tap `tel:19` (DGSN Police) and `tel:177` (Gendarmerie Royale) actions.
- **Anonymous Coarse-Zone Incident Reporting (Phase 1):** 3-step flow with incident type, approximate neighborhood/street picker (with optional client-side quantization in `src/services/geo.ts` that never stores or sends raw GPS coordinates), time range (`morning`, `afternoon`, `evening`, `night`), optional description with character counter, and hourly anti-abuse rate limiting.
- **Merged Map-First Itinéraires & Thermal Heat Map (Phase 2 Preview):** Full-bleed React-Leaflet map (`/routes`) with a custom `<canvas>` thermal density overlay (`ThermalOverlay.tsx`, `indigo/violet → cyan → green → yellow → orange → red` driven by aggregated report counts), `@turf/turf`, automatic offline SVG schematic fallback, strict `MIN_REPORTS` (`5` distinct reporters) threshold gating, accessible alphabetical list view, route planner overlay sheet highlighting traversed paths, and mandatory *"User-reported, unverified"* and *"Busy streets get more reports..."* notes.
- **Bilingual RTL/LTR & Theming:** Instant switching across French (`fr`, LTR) and Modern Standard Arabic (`ar`, RTL) in the top app bar and Settings, plus `System / Light / Dark` themes persisted in `localStorage`.
- **Law 09-08 Data Controls:** Full JSON data export and immediate local data deletion in Settings (accessible from the top app bar gear icon).

See [`APP_OVERVIEW.md`](APP_OVERVIEW.md) for a full architecture and screen-by-screen overview.

---

## Local Development & PWA Build

```bash
npm install
npm run dev
npm run build
npm run preview
```

---

## Swapping `/mock/*.json` for a PHP + MySQL REST API

All data reads and writes are isolated inside [`src/services/api.ts`](src/services/api.ts).

| Frontend Method (`api.ts`) | PHP Endpoint | Method | Request / Query | Expected JSON Response |
|---|---|---|---|---|
| `getSession()` | `/api/me.php` | `GET` | Auth cookie / bearer token | `UserSession` |
| `updateSession(patch)` | `/api/me.php` | `PATCH` | Partial `UserSession` JSON | Updated `UserSession` |
| `getZones()` | `/api/zones.php` | `GET` | Optional `?city=` | `{ "min_display_threshold": 5, "window_days": 14, "zones": Zone[] }` |
| `getNeighborhoodsGeoJson()` | `/api/areas.php?format=geojson&type=neighborhood` | `GET` | — | GeoJSON `FeatureCollection<Polygon>` with `{ id, name_ar, name_fr }` |
| `getStreetsGeoJson()` | `/api/areas.php?format=geojson&type=street` | `GET` | — | GeoJSON `FeatureCollection<LineString>` with `{ id, name_ar, name_fr, neighborhood_id }` |
| `getAreaStats(params)` | `/api/areas?type=street\|neighborhood&time_bucket=...&window=...` | `GET` | `type`, `time_bucket`, `window` | Aggregated entries; **server suppresses counts (`null`, `below_threshold: true`) whenever `< MIN_REPORTS` (default `5`)** |
| `getReports(zoneId?)` | `/api/reports.php` | `GET` | Optional `?zone_id=` | `{ "reports": IncidentReport[] }` |
| `submitReport(input)` | `/api/reports.php` | `POST` | `{ zone_id, area_type?, area_id?, incident_type, time_bucket, note, is_anonymous }` | `201 Created` with `IncidentReport` (`429` on rate limit) |
| `voteReport(id, choice)` | `/api/reports.php?action=vote` | `POST` | `{ report_id, choice }` | `{ "ok": true }` |
| `getRoutePresets()` | `/api/route-hints.php` | `GET` | — | `{ "preset_routes": RouteHintPreset[] }` |
| `exportMyData()` | `/api/export.php` | `GET` | — | `ExportedUserData` JSON attachment |
| `deleteMyData()` | `/api/me.php` | `DELETE` | — | `{ "ok": true }` |
