"""Pharmacies and hospitals mapped in OpenStreetMap (ODbL).

One Overpass query per state per week. Only what the map needs is kept:
position, kind, and OSM id (so anyone can check the source). Pharmacy
names are not kept, because shop names are often a person's name.
Hospital names are kept, as they are public institutions.
"""
import json
import re

QUERY = """[out:json][timeout:300];
area["ISO3166-2"="{iso}"]["admin_level"="4"]->.a;
(
  nwr["amenity"="pharmacy"](area.a);
  nwr["healthcare"="pharmacy"](area.a);
  nwr["amenity"="hospital"](area.a);
  nwr["healthcare"="hospital"](area.a);
);
out center tags;"""

JAK_NAME = re.compile(r"jan\s*-?\s*aushadh|janaushadh|pmbjk|pradhan\s*mantri\s*bh", re.I)


def query_for(iso):
    return QUERY.format(iso=iso)


def parse(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    out = []
    seen = set()
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        if "lat" in el:
            lon, lat = el["lon"], el["lat"]
        elif "center" in el:
            lon, lat = el["center"]["lon"], el["center"]["lat"]
        else:
            continue
        kind = "hospital" if "hospital" in (tags.get("amenity"), tags.get("healthcare")) else "pharmacy"
        key = (kind, round(lon, 5), round(lat, 5))
        if key in seen:
            continue
        seen.add(key)
        text = " ".join(tags.get(k, "") for k in ("name", "name:en", "brand", "operator"))
        item = {
            "lon": lon,
            "lat": lat,
            "kind": kind,
            "osm": f"{el['type'][0]}{el['id']}",
            "jak": bool(JAK_NAME.search(text)),
        }
        if kind == "hospital":
            item["name"] = tags.get("name:en") or tags.get("name") or ""
        out.append(item)
    return out
