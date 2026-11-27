import json
import math
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

STATIONS_PATH = Path(__file__).with_name("stations.json")
EARTH_RADIUS_KM = 6371.0


class Station(BaseModel):
    """Police or Gendarmerie Royale station entry."""

    name: str
    type: Literal["Police (DGSN)", "Gendarmerie Royale"]
    city: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None


class NearbyStation(Station):
    """Station enriched with computed Haversine distance from query point."""

    distance_km: float


_cached_mtime: float = -1.0
_cached_stations: list[Station] = []


def get_stations() -> list[Station]:
    """Load stations from local stations.json with mtime caching."""
    global _cached_mtime, _cached_stations
    mtime = STATIONS_PATH.stat().st_mtime
    if mtime != _cached_mtime:
        raw = json.loads(STATIONS_PATH.read_text(encoding="utf-8"))
        _cached_stations = [Station.model_validate(item) for item in raw]
        _cached_mtime = mtime
    return _cached_stations


def filter_stations(
    city: Optional[str] = None,
    type: Optional[str] = None,
    q: Optional[str] = None,
) -> list[Station]:
    results = get_stations()
    if city is not None:
        city_norm = city.strip().lower()
        results = [s for s in results if s.city.lower() == city_norm]
    if type is not None:
        type_norm = type.strip().lower()
        results = [s for s in results if s.type.lower() == type_norm]
    if q is not None:
        q_norm = q.strip().lower()
        if q_norm:
            results = [
                s
                for s in results
                if q_norm in s.name.lower() or q_norm in s.address.lower()
            ]
    return results


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in kilometers between two WGS84 coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1 - a))


app = FastAPI(
    title="Amin Morocco Police Stations API",
    description="Read-only API serving Morocco Police (DGSN) and Gendarmerie Royale station locations.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


EXPLORER_HTML = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Amin — Casablanca Police Stations Explorer</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; display: grid; grid-template-rows: auto 1fr; height: 100vh; background: #f8f7f4; color: #142026; }
    header { padding: 12px 16px; background: #0f5c66; color: #fff; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    header h1 { margin: 0; font-size: 16px; font-weight: 700; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    input, select, button { border-radius: 8px; border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 13px; }
    button { background: #fff; color: #0f5c66; font-weight: 700; cursor: pointer; border: none; }
    main { display: grid; grid-template-columns: 340px 1fr; min-height: 0; }
    @media (max-width: 768px) { main { grid-template-columns: 1fr; grid-template-rows: 52vh 1fr; } }
    #map { width: 100%; height: 100%; }
    aside { overflow-y: auto; border-right: 1px solid #e2e8f0; background: #fff; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; cursor: pointer; }
    .card:hover { border-color: #0f5c66; background: #f0f9fa; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; }
    .badge.gend { background: #fef3c7; color: #92400e; }
    .meta { font-size: 12px; color: #475569; margin-top: 4px; }
    .api-bar { font-size: 11px; background: #0e1418; color: #7ad1db; padding: 8px; border-radius: 8px; word-break: break-all; }
  </style>
</head>
<body>
  <header>
    <h1>Amin — Stations Police (DGSN) &amp; Gendarmerie Royale (Casablanca)</h1>
    <div class="controls">
      <input id="q" type="search" placeholder="Search name or district..." />
      <select id="radius">
        <option value="2">Within 2 km</option>
        <option value="5" selected>Within 5 km</option>
        <option value="10">Within 10 km</option>
        <option value="25">All Casablanca (25 km)</option>
      </select>
      <button id="locBtn">Use My Location</button>
      <a href="/docs" style="color:#fff;font-size:13px;font-weight:600;margin-left:6px;">Swagger Docs ↗</a>
    </div>
  </header>
  <main>
    <aside>
      <div class="api-bar" id="apiBar"></div>
      <div id="count" class="meta"></div>
      <div id="list"></div>
    </aside>
    <div id="map"></div>
  </main>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    let center = [33.5731, -7.5898];
    const map = L.map('map').setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const layerGroup = L.layerGroup().addTo(map);
    const qInput = document.getElementById('q');
    const rSelect = document.getElementById('radius');

    async function load() {
      const r = rSelect.value;
      const q = qInput.value.trim().toLowerCase();
      const url = `/stations/nearby?lat=${center[0].toFixed(5)}&lon=${center[1].toFixed(5)}&radius_km=${r}`;
      document.getElementById('apiBar').textContent = `GET ${location.origin}${url}`;
      const res = await fetch(url);
      let items = await res.json();
      if (q) items = items.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));

      layerGroup.clearLayers();
      L.circle(center, { radius: Number(r) * 1000, color: '#0f5c66', weight: 1.5, fillOpacity: 0.05 }).addTo(layerGroup);
      L.circleMarker(center, { radius: 6, color: '#0f5c66', fillColor: '#0f5c66', fillOpacity: 1 }).addTo(layerGroup).bindPopup('Search center (click anywhere on map to move)');

      document.getElementById('count').textContent = `${items.length} stations shown (click map to re-center)`;
      const list = document.getElementById('list');
      list.innerHTML = '';

      items.forEach(st => {
        const isGend = st.type === 'Gendarmerie Royale';
        const marker = L.circleMarker([st.latitude, st.longitude], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: isGend ? '#b45309' : '#0369a1',
          fillOpacity: 0.95,
        }).addTo(layerGroup);
        marker.bindPopup(`<b>${st.name}</b><br/>${st.type} · ${st.distance_km} km<br/>${st.address}${st.phone ? '<br/>📞 ' + st.phone : ''}`);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <span class="badge ${isGend ? 'gend' : ''}">${st.type}</span>
          <strong style="display:block;margin-top:4px;font-size:13px">${st.name}</strong>
          <div class="meta">${st.distance_km} km · ${st.address}</div>
        `;
        card.onclick = () => { map.setView([st.latitude, st.longitude], 15); marker.openPopup(); };
        list.appendChild(card);
      });
    }

    map.on('click', e => { center = [e.latlng.lat, e.latlng.lng]; load(); });
    qInput.addEventListener('input', load);
    rSelect.addEventListener('change', load);
    document.getElementById('locBtn').onclick = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        center = [pos.coords.latitude, pos.coords.longitude];
        map.setView(center, 14);
        load();
      });
    };
    load();
  </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/map", response_class=HTMLResponse, include_in_schema=False)
def map_explorer() -> str:
    """Interactive browser map explorer for local Casablanca police stations."""
    return EXPLORER_HTML


@app.get("/health")
def health() -> dict[str, object]:
    """Health check endpoint reporting loaded station count."""
    return {"status": "ok", "stations": len(get_stations())}


@app.get("/stations.geojson")
def stations_geojson(
    city: Optional[str] = Query(default=None, description="Case-insensitive exact city filter"),
    type: Optional[str] = Query(default=None, description="Case-insensitive exact station type filter"),
    q: Optional[str] = Query(default=None, description="Case-insensitive substring search across name and address"),
) -> JSONResponse:
    """Return filtered stations as an RFC 7946 GeoJSON FeatureCollection."""
    items = filter_stations(city=city, type=type, q=q)
    fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [s.longitude, s.latitude],
                },
                "properties": s.model_dump(),
            }
            for s in items
        ],
    }
    return JSONResponse(content=fc, media_type="application/geo+json")


@app.get("/stations", response_model=list[Station])
def list_stations(
    city: Optional[str] = Query(default=None, description="Case-insensitive exact city filter"),
    type: Optional[str] = Query(default=None, description="Case-insensitive exact station type filter"),
    q: Optional[str] = Query(default=None, description="Case-insensitive substring search across name and address"),
    has_phone: Optional[bool] = Query(default=None, description="Filter by phone availability"),
    limit: Optional[int] = Query(default=None, ge=1, le=500, description="Optional max results"),
) -> list[Station]:
    """List stations with optional city, type, substring, phone, and limit filters."""
    results = filter_stations(city=city, type=type, q=q)
    if has_phone is True:
        results = [s for s in results if bool(s.phone)]
    elif has_phone is False:
        results = [s for s in results if not s.phone]
    if limit is not None:
        results = results[:limit]
    return results


@app.get("/stations/nearby", response_model=list[NearbyStation])
def nearby_stations(
    lat: float = Query(default=33.5731, ge=-90, le=90, description="Query latitude (defaults to Casablanca center)"),
    lon: float = Query(default=-7.5898, ge=-180, le=180, description="Query longitude (defaults to Casablanca center)"),
    radius_km: float = Query(default=5.0, gt=0, le=100, description="Search radius in kilometers"),
    limit: Optional[int] = Query(default=None, ge=1, le=200, description="Optional max results"),
) -> list[NearbyStation]:
    """Find stations within radius_km sorted by ascending Haversine distance."""
    nearby: list[NearbyStation] = []
    for station in get_stations():
        dist = haversine_km(lat, lon, station.latitude, station.longitude)
        if dist <= radius_km:
            nearby.append(
                NearbyStation(
                    **station.model_dump(),
                    distance_km=round(dist, 2),
                )
            )
    nearby.sort(key=lambda s: s.distance_km)
    if limit is not None:
        nearby = nearby[:limit]
    return nearby


@app.get("/stations/{station_id}", response_model=Station)
def get_station(station_id: int) -> Station:
    """Retrieve a single station by zero-based index."""
    stations = get_stations()
    if station_id < 0 or station_id >= len(stations):
        raise HTTPException(status_code=404, detail="Station not found")
    return stations[station_id]
