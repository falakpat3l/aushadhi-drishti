"""Find a rough map position for an address anywhere in India, with no
outside service: pincode first, then district name, then state name.
Used for drug makers' addresses in the CDSCO alerts."""
import re

import pyarrow.parquet as pq
from shapely import STRtree, wkb
from shapely.geometry import Point

from geo import norm

# Short forms often printed in drug makers' addresses.
SHORT_FORMS = [
    (r"\bH\.?\s?P\.?(?=[\s,).-]|$)", "Himachal Pradesh"),
    (r"\bU\.?\s?P\.?(?=[\s,).-]|$)", "Uttar Pradesh"),
    (r"\bM\.?\s?P\.?(?=[\s,).-]|$)", "Madhya Pradesh"),
    (r"\bA\.?\s?P\.?(?=[\s,).-]|$)", "Andhra Pradesh"),
    (r"\bT\.?\s?N\.?(?=[\s,).-]|$)", "Tamil Nadu"),
    (r"\bW\.?\s?B\.?(?=[\s,).-]|$)", "West Bengal"),
    (r"\bJ\s?&\s?K\b", "Jammu and Kashmir"),
    (r"\bUttaranchal\b", "Uttarakhand"),
    (r"\bOrissa\b", "Odisha"),
    (r"\bPondicherry\b", "Puducherry"),
]


def expand(text):
    for pattern, full in SHORT_FORMS:
        text = re.sub(pattern, " " + full + " ", text)
    return text


class IndiaPlaces:
    def __init__(self, lgd_path, pincode_path):
        self.pins = {}
        t = pq.read_table(pincode_path, columns=["Pincode", "geometry"])
        for d in t.to_pylist():
            p = wkb.loads(d["geometry"]).representative_point()
            self.pins[str(d["Pincode"]).strip()] = (round(p.x, 4), round(p.y, 4))
        self.districts, states = {}, {}
        self._shapes, self._shape_info = [], []
        t = pq.read_table(lgd_path, columns=["dtname", "stname", "geometry"])
        for d in t.to_pylist():
            g = wkb.loads(d["geometry"])
            p = g.representative_point()
            self._shapes.append(g)
            self._shape_info.append((d["dtname"].title(), d["stname"].title(), (round(p.x, 4), round(p.y, 4))))
            key = norm(d["dtname"])
            if len(key) >= 4:
                self.districts.setdefault(key, []).append((d["stname"], (round(p.x, 4), round(p.y, 4))))
            states.setdefault(d["stname"], []).append(g.centroid)
        self.states = {}
        for name, cents in states.items():
            x = sum(c.x for c in cents) / len(cents)
            y = sum(c.y for c in cents) / len(cents)
            self.states[norm(name)] = (name.title(), (round(x, 4), round(y, 4)))
        self._tree = STRtree(self._shapes)

    def locate(self, address, pincode=None):
        """Returns (lon, lat, precision, state) or None.

        If the address names a state, only districts in that state are
        considered, which avoids matching a short district name by chance.
        """
        text = expand(address or "")
        state = self.state_in(text)
        if pincode and pincode in self.pins:
            lon, lat = self.pins[pincode]
            return lon, lat, "pincode", state
        words = norm(text)
        best = None
        for key, options in self.districts.items():
            if key not in words:
                continue
            if state:
                options = [o for o in options if norm(o[0]) == norm(state)]
                if not options:
                    continue
            elif len(key) < 6:
                continue  # short names need a state to be trusted
            if best is None or len(key) > len(best[0]):
                best = (key, options)
        if best:
            lon, lat = best[1][0][1]
            return lon, lat, "district", state or best[1][0][0].title()
        if state:
            lon, lat = self.states[norm(state)][1]
            return lon, lat, "state", state
        return None

    def state_in(self, text):
        words = norm(expand(text or ""))
        hits = [v[0] for k, v in self.states.items() if k in words]
        return max(hits, key=len) if hits else None

    def state_point(self, name):
        hit = self.states.get(norm(name))
        return hit[1] if hit else None


    def district_of(self, lon, lat):
        """(district, state, (lon, lat) of the district) for a point, or None."""
        pt = Point(lon, lat)
        for i in self._tree.query(pt):
            if self._shapes[i].covers(pt):
                return self._shape_info[i]
        return None

    def coarse(self, address, pincode=None):
        """Like locate, but never finer than a district: a pincode match is
        moved to its district's centre, so no single site is pinned.
        Returns (lon, lat, precision, label) or None."""
        hit = self.locate(address, pincode)
        if not hit:
            return None
        lon, lat, prec, state = hit
        if prec in ("pincode", "district"):
            d = self.district_of(lon, lat)
            if d:
                return d[2][0], d[2][1], "district", f"{d[0]}, {d[1]}"
            if state and self.state_point(state):
                sp = self.state_point(state)
                return sp[0], sp[1], "state", state
            return None
        return lon, lat, prec, state
