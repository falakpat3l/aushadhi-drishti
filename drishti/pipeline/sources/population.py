"""Population by district, Census 2011.

Census 2011 counted people by sub-district (taluka). Each sub-district in the
source file also carries today's LGD district code, so adding sub-districts up
gives 2011 population for today's districts, including ones created after 2011.
"""
import pyarrow.parquet as pq


def by_district(path, state_lgd=None):
    """LGD district code -> 2011 population (all of India, or one state)."""
    t = pq.read_table(path, columns=["State_LGD", "Dist_LGD", "Tot_pop"])
    totals = {}
    for row in t.to_pylist():
        if (state_lgd and row["State_LGD"] != state_lgd) or row["Dist_LGD"] is None:
            continue
        totals[row["Dist_LGD"]] = totals.get(row["Dist_LGD"], 0) + int(row["Tot_pop"] or 0)
    return totals



def by_district_shapes(path, districts, own=0.6, whole=0.8):
    """2011 population for today's districts, by where each 2011 sub-district lies.

    Each 2011 sub-district carries a district code. Districts created since
    then took sub-districts (or parts of them) from their parent, so:
    1. If the sub-district's own district still exists and holds at least 60%
       of it, all its people count there (keeps exact Census figures; small
       boundary differences between the files are ignored).
    2. Else, if one of today's districts holds at least 80% of it, all its
       people count there.
    3. Else its people are shared out by area (an estimate, noted on the map).
    Returns ({lgd: population}, {lgd: True if part is an area estimate}).
    """
    from shapely import STRtree, wkb
    t = pq.read_table(path, columns=["Dist_LGD", "Tot_pop", "geometry"])
    geoms = [d["geom"] for d in districts]
    codes = [d["lgd"] for d in districts]
    tree = STRtree(geoms)
    totals, estimated = {}, {}

    def add(code, n):
        totals[code] = totals.get(code, 0) + n

    for row in t.to_pylist():
        pop = int(row["Tot_pop"] or 0)
        if not pop:
            continue
        g = wkb.loads(row["geometry"])
        if not g.is_valid:
            g = g.buffer(0)
        area = g.area or 1e-12
        shares = {}
        for i in tree.query(g):
            inter = geoms[i].intersection(g).area
            if inter > 0:
                shares[codes[i]] = shares.get(codes[i], 0) + inter / area
        if not shares:
            if row["Dist_LGD"] is not None:
                add(row["Dist_LGD"], pop)
            continue
        if shares.get(row["Dist_LGD"], 0) >= own:
            add(row["Dist_LGD"], pop)
            continue
        best = max(shares, key=shares.get)
        if shares[best] >= whole:
            add(best, pop)
            continue
        big = {c: s for c, s in shares.items() if s >= 0.05}
        covered = sum(big.values())
        for c, s in big.items():
            add(c, pop * s / covered)
            estimated[c] = True
    return {k: round(v) for k, v in totals.items()}, estimated
