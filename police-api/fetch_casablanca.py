import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Greater Casablanca bounding box (Ain Diab -> Ain Harrouda -> Bouskoura -> Nouaceur)
CASABLANCA_BBOX = "33.42,-7.80,33.66,-7.38"

OVERPASS_QUERY = f"""
[out:json][timeout:30];
(
  nwr["amenity"="police"]({CASABLANCA_BBOX});
  nwr["office"="police"]({CASABLANCA_BBOX});
  nwr["building"="police"]({CASABLANCA_BBOX});
  nwr["office"="government"]["government"="police"]({CASABLANCA_BBOX});
);
out center tags;
""".strip()

EXCLUDED_AMENITIES = {
    "cafe",
    "restaurant",
    "fast_food",
    "pharmacy",
    "fuel",
    "parking",
    "bus_station",
    "school",
    "bank",
    "atm",
}

CASABLANCA_SECTORS = [
    ("Sidi Belyout / Centre-Ville", 33.5950, -7.6187),
    ("Gauthier", 33.5880, -7.6305),
    ("Racine / Triangle d'Or", 33.5892, -7.6410),
    ("Bourgogne", 33.5982, -7.6480),
    ("Anfa / Ain Diab", 33.5915, -7.6695),
    ("Maârif", 33.5775, -7.6375),
    ("Mers Sultan / Habous", 33.5780, -7.6105),
    ("Oasis / Cil", 33.5535, -7.6335),
    ("Hay Hassani / Oulfa", 33.5565, -7.6745),
    ("Beauséjour", 33.5685, -7.6475),
    ("Roches Noires / Belvédère", 33.5920, -7.5880),
    ("Aïn Sebaâ", 33.6065, -7.5400),
    ("Hay Mohammadi", 33.5865, -7.5590),
    ("Ben M'Sick / Sbata", 33.5525, -7.5620),
    ("Moulay Rachid / Sidi Othmane", 33.5520, -7.5300),
    ("Sidi Bernoussi", 33.6120, -7.5020),
    ("Sidi Moumen", 33.5880, -7.5150),
    ("Ain Chock / Californie", 33.5415, -7.5965),
    ("Bouskoura", 33.4550, -7.6500),
    ("Tit Mellil", 33.5550, -7.4840),
]

STATIONS_PATH = Path(__file__).with_name("stations.json")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def fetch_overpass() -> list[dict]:
    payload = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")
    last_err: Exception | None = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            req = urllib.request.Request(
                endpoint,
                data=payload,
                headers={"User-Agent": "AminSafetyPrototype/1.1"},
            )
            with urllib.request.urlopen(req, timeout=65) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("elements", [])
        except Exception as exc:
            last_err = exc
    raise RuntimeError(f"All Overpass endpoints failed: {last_err}")


def is_valid_police_feature(tags: dict[str, str]) -> bool:
    if tags.get("amenity") in EXCLUDED_AMENITIES or tags.get("shop") or tags.get("highway") == "bus_stop":
        return False
    if (
        tags.get("amenity") == "police"
        or tags.get("office") == "police"
        or tags.get("building") == "police"
        or tags.get("government") == "police"
    ):
        return True
    name_all = " ".join(str(tags.get(k, "")) for k in ("name", "name:fr", "name:ar", "official_name")).lower()
    return any(
        kw in name_all
        for kw in (
            "commissariat",
            "arrondissement de police",
            "préfecture de police",
            "gendarmerie",
            "sûreté",
            "district de police",
            "الدائرة الأمنية",
            "مفوضية",
            "الدرك",
            "ولاية الأمن",
        )
    )


def classify_type(tags: dict[str, str]) -> str:
    combined = " ".join(
        str(tags.get(k, ""))
        for k in ("name", "name:fr", "name:ar", "operator", "official_name", "description")
    ).lower()
    if "gendarme" in combined or "درك" in combined or "gendarmerie" in combined:
        return "Gendarmerie Royale"
    return "Police (DGSN)"


def infer_sector(lat: float, lon: float) -> str:
    nearest_name = "Casablanca"
    nearest_dist = 999.0
    for name, s_lat, s_lon in CASABLANCA_SECTORS:
        d = haversine_km(lat, lon, s_lat, s_lon)
        if d < nearest_dist:
            nearest_dist = d
            nearest_name = name
    return nearest_name if nearest_dist <= 4.5 else "Casablanca"


def build_address(tags: dict[str, str], city: str, sector: str) -> str:
    full = tags.get("addr:full")
    if full and full.strip().lower() not in ("casablanca", "الدار البيضاء"):
        return full.strip()
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:neighbourhood") or tags.get("addr:suburb") or tags.get("addr:quarter"),
        tags.get("addr:district"),
    ]
    cleaned = [p.strip() for p in parts if p and p.strip()]
    if not cleaned and sector and sector != city:
        cleaned.append(f"Secteur {sector}")
    cleaned.append(city)
    return ", ".join(cleaned)


def normalize_city(tags: dict[str, str]) -> str:
    raw = (tags.get("addr:city") or tags.get("is_in:city") or "Casablanca").strip()
    if raw in ("الدار البيضاء", "Casa", "Grand Casablanca", "Casablanca الدار البيضاء"):
        return "Casablanca"
    return raw


def main() -> None:
    elements = fetch_overpass()
    candidates: list[dict] = []

    for el in elements:
        tags: dict[str, str] = el.get("tags") or {}
        if not is_valid_police_feature(tags):
            continue

        lat = el.get("lat") if el.get("lat") is not None else (el.get("center") or {}).get("lat")
        lon = el.get("lon") if el.get("lon") is not None else (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue

        lat_f = round(float(lat), 6)
        lon_f = round(float(lon), 6)
        station_type = classify_type(tags)
        city = normalize_city(tags)
        sector = infer_sector(lat_f, lon_f)

        raw_name = (
            tags.get("name:fr")
            or tags.get("name")
            or tags.get("official_name")
            or tags.get("name:ar")
        )
        is_generic = not raw_name or raw_name.strip().lower() in (
            "police",
            "commissariat",
            "gendarmerie",
            "poste de police",
        )
        if is_generic:
            base = (
                "Brigade Gendarmerie Royale"
                if station_type == "Gendarmerie Royale"
                else "Poste de Police (DGSN)"
            )
            hint = tags.get("addr:street") or tags.get("addr:neighbourhood") or sector
            name = f"{base} — {hint}"
        else:
            name = raw_name.strip()

        phone = (
            tags.get("phone")
            or tags.get("contact:phone")
            or tags.get("emergency:phone")
            or None
        )
        if isinstance(phone, str):
            phone = phone.strip() or None

        candidates.append(
            {
                "name": name,
                "type": station_type,
                "city": city,
                "address": build_address(tags, city, sector),
                "latitude": lat_f,
                "longitude": lon_f,
                "phone": phone,
                "_generic": is_generic,
            }
        )

    # Deduplicate overlapping node+way/relation markers within 65m (prefer specific named/address records)
    candidates.sort(key=lambda item: (item["_generic"], item["address"] == item["city"]))
    stations: list[dict] = []
    for item in candidates:
        duplicate = False
        for kept in stations:
            dist = haversine_km(
                item["latitude"], item["longitude"], kept["latitude"], kept["longitude"]
            )
            if dist < 0.065 and (
                item["name"].lower() == kept["name"].lower()
                or item["_generic"]
                or item["type"] == kept["type"]
            ):
                duplicate = True
                break
        if not duplicate:
            item.pop("_generic", None)
            stations.append(item)

    stations.sort(key=lambda s: (s["city"], s["type"], s["name"]))
    STATIONS_PATH.write_text(
        json.dumps(stations, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Fetched {len(elements)} raw OSM elements -> saved {len(stations)} enriched unique stations to {STATIONS_PATH}"
    )


if __name__ == "__main__":
    main()
