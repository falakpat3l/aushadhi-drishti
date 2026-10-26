"""Shapes for clicking a country on the globe to open it.

Writes public/basemap/world-countries.json: one plain outline for each place
the map covers (India, Singapore, New Zealand, Australia and the European
countries in Eurostat's NUTS 2024 set). The front end draws them invisibly and
uses them to know which country was clicked or hovered.

India uses the Survey of India outline from the India basemap, so a highlight
on hover always shows India's official map. Everything else is Natural Earth
(public domain). Run once after the basemap: python pipeline/hops.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from shapely.geometry import MultiPolygon, box, mapping, shape  # noqa: E402

from fetch import download  # noqa: E402

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
PUBLIC = Path(__file__).resolve().parent.parent / "public"

# Eurostat NUTS 2024 countries: EU, EFTA and candidate countries. Eurostat
# writes Greece as EL; Natural Earth writes GR.
EUROPE = ("AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK "
          "IS LI NO CH AL ME MK RS TR").split()
NUTS_CODE = {"GR": "EL"}
OTHERS = {"SG": "sg", "NZ": "nz", "AU": "au"}
EUROPE_BOX = box(-32, 27, 45, 72)  # leaves out overseas parts, for example French Guiana


def rounded(geom, digits=2):
    def r(c):
        return [round(c[0], digits), round(c[1], digits)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    g = mapping(geom)
    return {"type": g["type"], "coordinates": r(g["coordinates"])}


def main():
    ne = json.loads(download(f"{NE}/ne_10m_admin_0_countries_ind.geojson", name="ne_10m_countries_ind.geojson").read_text())
    feats = []

    def add(code, name, geom, area=None, tol=0.05):
        g = geom.simplify(tol, preserve_topology=True)
        parts = [x for x in getattr(g, "geoms", [g]) if x.geom_type == "Polygon" and not x.is_empty]
        if not parts:
            return
        g = MultiPolygon(parts) if len(parts) > 1 else parts[0]
        props = {"code": code, "name": name}
        if area:
            props["area"] = area
        feats.append({"type": "Feature", "id": len(feats) + 1, "properties": props, "geometry": rounded(g)})

    india = json.loads((PUBLIC / "basemap" / "india-basemap.json").read_text())["india"]
    add("", "India", shape(india).buffer(0))
    for f in ne["features"]:
        p = f["properties"]
        iso = p["ISO_A2"] if p["ISO_A2"] != "-99" else p["ISO_A2_EH"]
        if iso in OTHERS:
            add(OTHERS[iso], p["NAME_EN"] or p["NAME"], shape(f["geometry"]).buffer(0), tol=0.002 if iso == "SG" else 0.05)
        elif iso in EUROPE:
            add("eu", p["NAME_EN"] or p["NAME"], shape(f["geometry"]).buffer(0).intersection(EUROPE_BOX), area=NUTS_CODE.get(iso, iso))
    out = PUBLIC / "basemap" / "world-countries.json"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    print(f"{out.name}: {len(feats)} shapes, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
