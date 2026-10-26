"""Government health facilities (NIC HealthGIS, via india-geodata).

Kept as public institutions: name and type are shown; nothing about people.
Sub-centres are counted but not drawn, to keep the map light.
"""
import json

TYPES = {
    "DHO": "District hospital",
    "THO": "Taluka hospital",
    "CHC": "Community health centre",
    "PHC": "Primary health centre",
    "SCE": "Sub-centre",
}


def load(path, state_name):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    out = []
    for feat in data["features"]:
        p = feat["properties"]
        if (p.get("state") or "").strip().upper() != state_name:
            continue
        lon, lat = feat["geometry"]["coordinates"][:2]
        out.append({"lon": lon, "lat": lat, "type": p.get("type"), "name": (p.get("name") or "").strip()})
    return out
