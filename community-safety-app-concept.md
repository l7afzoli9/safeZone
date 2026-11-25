# Structured Concept: Community Safety App (Working Title)

Working draft

## 1. Overview

A mobile-first app that helps people stay aware of safety around them and share trusted location during trips. It combines three features: trip sharing with trusted contacts, zone-level incident reports, and route safety hints based on aggregated data.

## 2. Problem

- People walking home, commuting late, or traveling alone want a quick way to let someone know where they are.
- Incidents such as theft and harassment are often underreported or unknown to people who could avoid those areas.
- Existing channels (calling the police, word of mouth) are slow to share local patterns.

## 3. Goals

- Give each user immediate, personal value (trip sharing, route hints) so they have a reason to use the app.
- Collect incident data in a way that is useful at the area level without exposing individuals.
- Protect user privacy by design.
- Direct users to official emergency services rather than replacing them.

## 4. Non-Goals

- No heat map of where individuals usually are.
- No raw GPS history stored on the server.
- No single "safe/unsafe" score for a place.
- No naming or publicly identifying accused people.
- No native background tracking in the MVP.

## 5. Core Features

### 5.1 Trip Sharing (Phase 1)

- User starts a trip and picks trusted contacts.
- Contacts see live location until the trip ends or a time limit passes.
- One-tap alert to contacts and a shortcut to DGSN (19) and Gendarmerie (177).
- Location is shared only during the active trip, and is deleted afterward.

### 5.2 Incident Reporting (Phase 1)

- Report type: theft, harassment, suspicious activity, other.
- Location entered as an approximate zone (e.g., a grid cell or neighborhood), not exact coordinates.
- Time entered as a range (morning, afternoon, evening, night) or approximate hour.
- Reports are pseudonymous or anonymous, with optional account for trust scoring.
- Reports include a reminder to contact police for emergencies.

### 5.3 Aggregated Zone Map (Phase 2)

- Shows incident counts per zone and time window.
- Displays nothing for a zone until a minimum number of independent reports exists (threshold to be set, e.g., 5+ reports from different users).
- Shows counts and recency, not a safety rating.
- Labels data as user-reported and unverified.

### 5.4 Route Safety Hints (Phase 2)

- When planning a route, the app lists recent incident reports in zones along it.
- Hints are informational, not guarantees.

### 5.5 Report Lifecycle (Phase 2)

- Other users can confirm or dispute a report.
- Reports fade over time, so old reports carry less weight.
- Disputed or flagged reports are reviewed and can be hidden.

## 6. Privacy and Data Design

- **Minimize data:** convert locations to coarse zones on the device before anything is sent.
- **No movement history:** trip location is held only for the active trip and then deleted.
- **Retention limits:** define how long reports and logs are kept (e.g., reports expire after a set period).
- **Consent:** clear opt-in for location, with a plain-language explanation.
- **Legal basis:** Morocco's Law 09-08 on personal data protection, overseen by the CNDP. Review with a legal advisor before launch.
- **Access control:** only the minimum staff or systems can see report data.

## 7. Trust, Safety, and Moderation

- Rate limits on reports per user and per zone.
- Threshold before displaying aggregated data.
- Flagging and review process for abuse, harassment, or false reports.
- Clear policy against targeting individuals or specific groups.
- Content guidelines to avoid stigmatizing neighborhoods or communities.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Used for stalking | No individual movement maps; trip sharing is time-limited |
| False or malicious reports | Thresholds, confirmation, dispute process, rate limits |
| Biased data (more reports where more users are) | Show counts with context; label as unverified |
| Stigmatizing neighborhoods | Avoid safety scores; add context labels |
| Privacy law non-compliance | Legal review, consent flows, data minimization |
| Users relying on app over police | Prominent emergency numbers and disclaimers |
| App store rejection | Review safety and crime content guidelines early |

## 9. Data Model (Sketch)

- **users:** id, pseudonym, created_at, trust_score (optional)
- **trusted_contacts:** id, user_id, contact_phone or contact_id
- **trips:** id, user_id, started_at, ends_at, status (location stored only in active session cache)
- **zones:** id, zone_code (grid cell or geohash prefix), name (optional)
- **reports:** id, user_id (nullable if anonymous), zone_id, incident_type, time_bucket, created_at, expires_at, status
- **report_votes:** report_id, user_id, vote (confirm or dispute)
- **moderation_actions:** id, report_id, action, reviewed_by, created_at

## 10. Tech Stack (MVP)

- **Frontend:** responsive web app or PWA using JavaScript and Bootstrap, so it works on phones without an app store listing at first.
- **Backend:** PHP for the API, with MySQL for storage.
- **Location:** browser geolocation API, with zone conversion done in the client.
- **Maps:** a lightweight map library for zone display (Phase 2).
- **Real-time trip sharing:** polling or WebSockets (polling is simpler for an MVP).
- **Later:** native app wrapper if the PWA proves useful, and Python for analysis of aggregated data.

## 11. Roadmap

- **Phase 0 (research):** talk to potential users and local associations; review legal requirements; define zone grid and report thresholds.
- **Phase 1 (MVP):** trip sharing, emergency shortcuts, anonymous zone-level reporting with no public map yet.
- **Phase 2:** aggregated zone map with thresholds, route hints, confirm/dispute, report expiry.
- **Phase 3:** moderation tooling, partnerships with local organizations, evaluation of impact and accuracy.

## 12. Open Questions

- What zone size works best for Moroccan cities (neighborhood vs. street-level)?
- What minimum report threshold keeps data useful without hiding real problems?
- Who moderates reports, and what happens to disputed ones?
- Which local partners can validate data or help with trust?
- Should the app support Arabic, French, and Darija from the start?
