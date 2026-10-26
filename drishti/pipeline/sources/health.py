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


def load(path, state_name=None):
    """All facilities (or one state's, by the state name in the file).
    The build places each one in a district by its position, because the
    file's own state names use older spellings (ORISSA, PONDICHERRY)."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    out = []
    for feat in data["features"]:
        p = feat["properties"]
        if state_name and (p.get("state") or "").strip().upper() != state_name:
            continue
        lon, lat = feat["geometry"]["coordinates"][:2]
        out.append({"lon": lon, "lat": lat, "type": p.get("type"), "name": (p.get("name") or "").strip()})
    return out
