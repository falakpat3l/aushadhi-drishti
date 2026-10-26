"""Shapes: district and pincode boundaries, and finding which area a point is in."""
import csv
import re

import pyarrow.parquet as pq
from shapely import STRtree, wkb
from shapely.geometry import Point, mapping

from config import DECIMALS, SEEDS


def norm(name):
    """Make names comparable: 'The Dangs' and 'dangs' both become 'dangs'."""
    s = re.sub(r"[^a-z]", "", str(name).lower())
    return s[3:] if s.startswith("the") and len(s) > 6 else s


def load_aliases():
    """(state, alias) to LGD district code, with an optional note."""
    out = {}
    with open(SEEDS / "district_aliases.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            out[(norm(row["state"]), norm(row["alias"]))] = (int(row["lgd_code"]), row["note"])
    return out


def load_districts(path, state_lgd):
    """Districts of one state from the LGD parquet: list of dicts with shapely geometry."""
    t = pq.read_table(path, columns=["dtname", "stname", "dist_lgd", "state_lgd", "geometry"])
    rows = []
    for d in t.to_pylist():
        if d["state_lgd"] != state_lgd:
            continue
        rows.append({"lgd": d["dist_lgd"], "name": d["dtname"], "geom": wkb.loads(d["geometry"])})
    rows.sort(key=lambda r: r["name"])
    return rows


NICE_STATES = {
    "ANDAMAN & NICOBAR": "Andaman and Nicobar Islands",
    "DADRA,NAGAR HAVELI,DAMAN & DIU": "Dadra and Nagar Haveli and Daman and Diu",
    "JAMMU & KASHMIR": "Jammu and Kashmir",
}


def nice_state(name):
    """'JAMMU & KASHMIR' -> 'Jammu and Kashmir', 'GUJARAT' -> 'Gujarat'."""
    return NICE_STATES.get(name, name.title().replace(" And ", " and "))


def state_key(name):
    """Compare state names across sources: '&' and 'and', spaces, 'The' do not matter."""
    k = norm(str(name).replace("&", "and"))
    if k.startswith("dadra"):
        return "dadraandnagarhavelianddamananddiu"
    return k[:-7] if k.endswith("islands") else k


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", nice_state(name).lower()).strip("-")


def load_all_districts(path):
    """Every district in the LGD file (all of India)."""
    t = pq.read_table(path, columns=["dtname", "stname", "dist_lgd", "state_lgd", "geometry"])
    rows = []
    for d in t.to_pylist():
        rows.append({"lgd": d["dist_lgd"], "name": d["dtname"], "state": nice_state(d["stname"]),
                     "state_lgd": d["state_lgd"], "geom": wkb.loads(d["geometry"])})
    rows.sort(key=lambda r: (r["state"], r["name"]))
    return rows


def apply_merges(districts):
    """Fold districts that no longer exist into the district they went back to
    (seeds/district_merges.csv). Returns the notes added."""
    from shapely.ops import unary_union
    path = SEEDS / "district_merges.csv"
    if not path.exists():
        return []
    by_key = {(state_key(d["state"]), norm(d["name"])): d for d in districts}
    done = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            gone = by_key.get((state_key(row["state"]), norm(row["district"])))
            into = by_key.get((state_key(row["state"]), norm(row["into"])))
            if not gone or not into or gone is into:
                continue
            into["geom"] = unary_union([into["geom"], gone["geom"]])
            into.setdefault("merged_lgd", []).append(gone["lgd"])
            into.setdefault("notes", []).append(row["note"])
            districts.remove(gone)
            done.append(f"{row['district']} into {row['into']}")
    return done


def load_pincodes(path, circle=None):
    """Pincode areas (all of India, or one postal circle)."""
    t = pq.read_table(path, columns=["Pincode", "Office_Name", "Circle", "geometry"])
    rows = []
    for d in t.to_pylist():
        if circle and (d["Circle"] or "").strip().lower() != circle.lower():
            continue
        rows.append({"pincode": str(d["Pincode"]).strip(), "office": (d["Office_Name"] or "").strip(), "geom": wkb.loads(d["geometry"])})
    return rows


class Locator:
    """Answers 'which area is this point in?' quickly."""

    def __init__(self, areas):
        self.areas = areas
        self.tree = STRtree([a["geom"] for a in areas])

    def find(self, lon, lat):
        p = Point(lon, lat)
        for i in self.tree.query(p):
            if self.areas[i]["geom"].covers(p):
                return self.areas[i]
        return None


def _round(obj):
    if isinstance(obj, float):
        return round(obj, DECIMALS)
    if isinstance(obj, (list, tuple)):
        return [_round(x) for x in obj]
    return obj


def feature(geom, props, tolerance):
    g = geom.simplify(tolerance, preserve_topology=True)
    if g.is_empty:
        g = geom
    m = mapping(g)
    return {"type": "Feature", "properties": props, "geometry": {"type": m["type"], "coordinates": _round(m["coordinates"])}}
