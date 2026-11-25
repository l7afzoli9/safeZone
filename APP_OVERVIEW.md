# Amin — Mobile-First Community Safety PWA

**Amin** is an installable, mobile-first Progressive Web App (PWA) for community safety in Morocco, built with React, TypeScript, Vite, Tailwind CSS, and Leaflet. It is designed around calm, accessible UX, strict data minimization (aligned with Moroccan Law 09-08), and bilingual RTL/LTR support.

---

## 1. Core Features & Screens

| Route | Screen | Purpose |
| :--- | :--- | :--- |
| `/onboarding` | **Onboarding & Consent** | 3-slide privacy-first introduction plus a local location-estimation consent toggle (`amin_onboarding_done`). |
| `/` | **Home (`Accueil`)** | Primary **Signaler un incident** hero CTA, official emergency shortcuts (**19** Police DGSN / **177** Gendarmerie Royale), quick link to the map (`/routes`), and recent community reports by neighborhood. |
| `/report` | **Anonymous Incident Reporting** | 3-step flow: (1) incident type (`theft`, `harassment`, `suspicious_activity`, `other`), (2) approximate neighborhood selection (manual search or on-device coarse estimation—never exact GPS coordinates), and (3) approximate time bucket + optional note. |
| `/routes` | **Itinéraires (Thermal Heat Map & Route Hints)** | Map-first interactive Leaflet view with a smooth thermal density overlay (`ThermalOverlay.tsx`) driven by aggregated area/street report counts, time-of-day & recency filters, street/neighborhood toggle, list view, route presets (`Gauthier → Maârif`, etc.), and tap-to-inspect `AreaSheet` details. |
| `/settings` | **Settings & Privacy** | Accessible via the header gear icon or `Plus` menu. Supports language switching (`FR` / `ع`), theme (`Système` / `Clair` / `Sombre`), zone-update notifications, on-device location estimation toggle, Privacy Policy sheet (Law 09-08), Replay Onboarding, JSON data export (`exportMyData()`), and one-tap local data deletion. |

*(Legacy `/zones` and `/map` routes redirect to `/routes`.)*

---

## 2. Privacy & Safety Architecture

- **No exact coordinates stored or rendered:** Incident reports attach only to an approximate neighborhood/street and time bucket.
- **No individual tracking or movement history:** No user markers, no trip history, and no personal contact lists.
- **Threshold gating (`MIN_REPORTS = 5`):** Areas or street segments with fewer than `5` independent reports are rendered in neutral dashed gray with *"Not enough reports yet"* and suppress all counts.
- **Non-alarmist labeling:** Every map view displays *"User-reported, unverified"* and *"Busy streets get more reports because more people use them."*
- **No single safe/unsafe score:** Never displays danger grades or neighborhood rankings.
- **Legacy local cleanup:** `cleanupLegacyData()` in `src/services/storage.ts` automatically removes deprecated `localStorage` keys (`amin_contacts`, `amin_contacts_initialized`, `amin_active_trip`) on boot.

---

## 3. Internationalization (i18n) & Theming

- **Languages:** French (`fr`, `dir="ltr"`) and Modern Standard Arabic (`ar`, `dir="rtl"`), stored in `src/i18n/fr.json` and `src/i18n/ar.json` (`211` synchronized keys, zero hardcoded UI strings).
- **Fonts:** Google Fonts **Tajawal** (Arabic) and **Inter** (French/Latin).
- **Themes:** Light, Dark, and System via `ThemeContext` and CSS custom properties.

---

## 4. Tech Stack & Data Layer

- **Frontend:** React 18, TypeScript, Vite (`vite-plugin-pwa`), Tailwind CSS v4, Framer Motion, Vaul (bottom sheets), Sonner (toasts), Lucide React (icons).
- **Mapping & Heat Map:** `leaflet`, `react-leaflet`, `@turf/turf` (`bbox`, `centerOfMass`), `d3-scale`, `d3-interpolate`, and a custom non-interactive `<canvas>` `ThermalOverlay` (`indigo/violet → cyan → green → yellow → orange → red`) over OpenStreetMap tiles with an offline SVG fallback.
- **Data Layer (`src/services/api.ts`):** All reads/writes go through `src/services/api.ts`, currently backed by static mock files in `public/mock/` (`neighborhoods.geojson`, `streets.geojson`, `area-stats.json`, `reports.json`, `routes.json`, `session.json`, `zones.json`) and `localStorage`, structured for a clean swap to a PHP + MySQL REST API.

---

## 5. Running Locally

```bash
npm install
npm run dev      # Start local dev server
npm run build    # Type-check (tsc -b) + production PWA build
npm run preview  # Preview production build locally
```
