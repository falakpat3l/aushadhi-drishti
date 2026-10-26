"""Pharmacies and hospitals mapped in OpenStreetMap (ODbL).

Source: Geofabrik's free daily extract of OpenStreetMap for India
(download.geofabrik.de), fetched once a week. The Overpass API is not used:
its robots rules turn away automated jobs like ours.

Only what the map needs is kept: position, kind, and OSM id (so anyone can
check the source). Pharmacy names are not kept, because shop names are
often a person's name. Hospital names are kept, as they are public
institutions.
"""
import json
import re
import shutil
import subprocess
from pathlib import Path

from shapely.geometry import Polygon, shape

GEOFABRIK_INDIA = "https://download.geofabrik.de/asia/india-latest.osm.pbf"
FILTERS = [
    "nwr/amenity=pharmacy,hospital",
    "nwr/healthcare=pharmacy,hospital",
    "nwr/shop=chemist",
]

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


def osmium_ready():
    return shutil.which("osmium") is not None


def extract(pbf, work_dir):
    """Cut the India extract down to pharmacies and hospitals, then read them.
    Needs the free osmium-tool program (apt install osmium-tool)."""
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)
    small = work / "health.osm.pbf"
    seq = work / "health.geojsonseq"
    subprocess.run(["osmium", "tags-filter", "--overwrite", "-o", str(small), str(pbf), *FILTERS], check=True)
    subprocess.run(["osmium", "export", "--overwrite", "-f", "geojsonseq", "-a", "type,id",
                    "--geometry-types=point,linestring,polygon", "-o", str(seq), str(small)], check=True)
    return parse_geojsonseq(seq)


def _kind(tags):
    if "hospital" in (tags.get("amenity"), tags.get("healthcare")):
        return "hospital"
    if tags.get("amenity") == "pharmacy" or tags.get("healthcare") == "pharmacy" or tags.get("shop") == "chemist":
        return "pharmacy"
    return None


def parse_geojsonseq(path):
    out, seen = [], set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip().lstrip("\x1e")
            if not line:
                continue
            feat = json.loads(line)
            tags = feat.get("properties") or {}
            kind = _kind(tags)
            if not kind:
                continue  # an untagged member, kept only for its position
            geom = shape(feat["geometry"])
            if geom.geom_type == "LineString" and geom.is_ring:
                geom = Polygon(geom.coords)
            pt = geom.representative_point()
            osm_type = str(tags.get("@type", "n"))[0]
            osm_id = f"{osm_type}{tags.get('@id', '')}"
            if osm_id in seen:
                continue
            seen.add(osm_id)
            text = " ".join(str(tags.get(k, "")) for k in ("name", "name:en", "brand", "operator"))
            item = {"lon": round(pt.x, 5), "lat": round(pt.y, 5), "kind": kind, "osm": osm_id,
                    "jak": bool(JAK_NAME.search(text))}
            if kind == "hospital":
                item["name"] = tags.get("name:en") or tags.get("name") or ""
            out.append(item)
    return out
