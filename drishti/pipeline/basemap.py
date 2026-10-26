"""Build the background map: India as the Government of India shows it.

    python3 pipeline/basemap.py

Writes public/basemap/india-basemap.json, which is committed to the
repository (boundaries change rarely, so this is not part of the weekly job).

Why our own background map
--------------------------
The common free street maps draw India's borders the international way:
parts of Jammu and Kashmir, Ladakh and Arunachal Pradesh are shown outside
India. This map is for an Indian audience, so it draws:

1. India's outline from the Survey of India boundary file (CC BY 4.0, via
   DataMeet and india-geodata). It includes all of Jammu and Kashmir and
   Ladakh (including Pakistan-occupied areas, Gilgit-Baltistan and Aksai
   Chin) and all of Arunachal Pradesh.
2. State and UT lines from the LGD district boundaries (the same boundaries
   the district layer uses), joined state by state.
3. Neighbouring countries from Natural Earth's "India point of view" file
   (public domain), with India's Survey of India outline cut out of them,
   so no neighbour ever overlaps India.
4. A few city, state, country and sea names for orientation.
"""
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pyarrow.parquet as pq  # noqa: E402
from shapely import wkb  # noqa: E402
from shapely.geometry import MultiLineString, Polygon, box, mapping, shape  # noqa: E402
from shapely.ops import linemerge, transform, unary_union  # noqa: E402

from config import CACHE, ROOT, URLS, USER_AGENT  # noqa: E402
from fetch import download  # noqa: E402

OUT = ROOT / "public" / "basemap" / "india-basemap.json"
REGION = box(40, -15, 120, 55)          # what we draw around India
SIMPLIFY = {"india": 0.004, "states": 0.008, "neighbours": 0.03}

SOI_BASE = "https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/data/survey-of-india/india-boundary/IndiaBoundary"
NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"

SEAS = [
    (64.0, 15.0, "Arabian Sea"),
    (89.0, 15.0, "Bay of Bengal"),
    (78.0, 2.0, "Indian Ocean"),
    (95.5, 8.5, "Andaman Sea"),
]

NICE = {
    "ANDAMAN & NICOBAR": "Andaman and Nicobar Islands",
    "DADRA,NAGAR HAVELI,DAMAN & DIU": "Dadra and Nagar Haveli and Daman and Diu",
    "JAMMU & KASHMIR": "Jammu and Kashmir",
}


def nice_state(name):
    return NICE.get(name, name.title().replace(" And ", " and "))


def rounded(geom, places=3):
    def r(obj):
        if isinstance(obj, float):
            return round(obj, places)
        if isinstance(obj, (list, tuple)):
            return [r(x) for x in obj]
        return obj
    m = mapping(geom)
    return {"type": m["type"], "coordinates": r(m["coordinates"])}


def soi_outline():
    import shapefile  # pyshp
    from pyproj import Transformer

    paths = {}
    for ext in ("shp", "shx", "dbf", "prj"):
        paths[ext] = download(f"{SOI_BASE}.{ext}", name=f"soi_IndiaBoundary.{ext}")
    prj = paths["prj"].read_text()
    reader = shapefile.Reader(shp=open(paths["shp"], "rb"), shx=open(paths["shx"], "rb"), dbf=open(paths["dbf"], "rb"))
    geoms = [shape(s.__geo_interface__) for s in reader.shapes()]
    if "Mercator" in prj:
        to_wgs84 = Transformer.from_crs(3857, 4326, always_xy=True).transform
        geoms = [transform(to_wgs84, g) for g in geoms]
    return unary_union([g.buffer(0) for g in geoms])


def state_shapes(lgd_path):
    t = pq.read_table(lgd_path, columns=["stname", "geometry"])
    groups = {}
    for row in t.to_pylist():
        groups.setdefault(row["stname"], []).append(wkb.loads(row["geometry"]).buffer(0))
    out = {}
    for name, gs in groups.items():
        # Close the hair-thin gaps between neighbouring districts, then drop tiny holes.
        g = unary_union(gs).buffer(0.003).buffer(-0.003)
        polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
        polys = [Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area > 0.01]) for p in polys]
        out[name] = unary_union(polys)
    return out


def build():
    india = soi_outline()
    lgd = download(URLS["lgd_districts"], name="LGD_Districts.parquet")
    states = state_shapes(lgd)

    # State lines: the shared edges between states (not the coast or the national border).
    edges = unary_union([g.simplify(SIMPLIFY["states"], preserve_topology=True).boundary for g in states.values()])
    inner = linemerge(edges.intersection(india.buffer(-0.03)))
    parts = list(inner.geoms) if hasattr(inner, "geoms") else [inner]
    state_lines = MultiLineString([p for p in parts if p.geom_type == "LineString" and p.length > 0.05])

    labels = []
    for name, geom in states.items():
        p = geom.representative_point()
        labels.append([round(p.x, 3), round(p.y, 3), nice_state(name), "state", round(geom.area, 2)])

    ne = json.loads(download(f"{NE_BASE}/ne_10m_admin_0_countries_ind.geojson", name="ne_10m_countries_ind.geojson").read_text())
    cut = india.buffer(0.001)
    neighbours = []
    for f in ne["features"]:
        p = f["properties"]
        if p.get("ADM0_A3") == "IND":
            continue
        g = shape(f["geometry"]).buffer(0)
        if not g.intersects(REGION):
            continue
        g = g.intersection(REGION).difference(cut).simplify(SIMPLIFY["neighbours"], preserve_topology=True)
        if g.is_empty or g.area < 0.05:
            continue
        neighbours.append({"name": p.get("NAME_EN") or p.get("NAME"), "geometry": rounded(g, 2)})
        if g.area > 2:
            lp = g.representative_point()
            labels.append([round(lp.x, 2), round(lp.y, 2), p.get("NAME_EN") or p.get("NAME"), "country", round(g.area, 1)])

    places = json.loads(download(f"{NE_BASE}/ne_50m_populated_places_simple.geojson", name="ne_50m_places.geojson").read_text())
    for f in places["features"]:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"][:2]
        if not REGION.contains(shape(f["geometry"])):
            continue
        inside = india.contains(shape(f["geometry"]))
        if not inside and not p.get("adm0cap"):
            continue
        labels.append([round(lon, 3), round(lat, 3), p["name"], "city", int(p.get("scalerank") or 9)])
    for lon, lat, name in SEAS:
        labels.append([lon, lat, name, "sea", 0])

    data = {
        "about": "India outline: Survey of India (CC BY 4.0, via DataMeet and india-geodata). "
                 "State lines: LGD district boundaries. Neighbours, cities: Natural Earth (public domain), "
                 "India point of view, with India's Survey of India outline cut out.",
        "india": rounded(india.simplify(SIMPLIFY["india"], preserve_topology=True), 3),
        "state_lines": rounded(state_lines, 3),
        "neighbours": neighbours,
        "labels": labels,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
