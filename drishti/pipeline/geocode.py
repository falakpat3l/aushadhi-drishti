"""Turn an address into a map position, as roughly as the map needs.

Order of tries:
1. The pincode's area (we use a point inside it). Most stores have a pincode,
   and this needs no outside service at all.
2. Nominatim (OpenStreetMap's free geocoder), one request a second at most,
   with this project's name in every request. Answers are saved in
   pipeline/.cache/geocode.json (kept between runs), so each address is asked once.

Results carry a 'precision' word so the map can say how rough a point is.
"""
import json
import urllib.parse

from config import GEOCODE_CACHE, URLS
from fetch import download


class Geocoder:
    def __init__(self, pincode_points, offline=False):
        self.pins = pincode_points  # pincode -> (lon, lat)
        self.offline = offline
        self.cache = json.loads(GEOCODE_CACHE.read_text()) if GEOCODE_CACHE.exists() else {}
        self.asked = 0

    def locate(self, address, pincode, state):
        pin = (pincode or "").strip()
        if pin in self.pins:
            lon, lat = self.pins[pin]
            return lon, lat, "pincode"
        key = f"{address}|{pin}|{state}".lower()
        if key in self.cache:
            hit = self.cache[key]
            return (hit[0], hit[1], "address") if hit else None
        if self.offline:
            return None
        q = urllib.parse.urlencode({"q": f"{address}, {state}, India", "format": "jsonv2", "limit": 1, "countrycodes": "in"})
        try:
            path = download(f"{URLS['nominatim']}?{q}", min_gap=1.1, timeout=60)
            res = json.loads(path.read_text())
        except Exception:
            return None
        self.asked += 1
        hit = [round(float(res[0]["lon"]), 5), round(float(res[0]["lat"]), 5)] if res else None
        self.cache[key] = hit
        return (hit[0], hit[1], "address") if hit else None

    def save(self):
        GEOCODE_CACHE.parent.mkdir(parents=True, exist_ok=True)
        GEOCODE_CACHE.write_text(json.dumps(self.cache, indent=0, sort_keys=True))
