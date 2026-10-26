"""Per-district insights and the gap score.

Gap score, in plain words
-------------------------
It answers: "In which district would one more Jan Aushadhi (generic) store
help the most?" Districts are compared with the other districts in the same
state, and separately with all districts in India. Each district gets a
score from 0 (well served) to 100 (biggest gap),
made from three signals:

1. People per Jan Aushadhi Kendra (half of the score).
   More people sharing one Kendra means a bigger gap.
2. Medicine outlets per 10,000 people (a quarter).
   Fewer outlets of any kind (Kendras plus pharmacies mapped in
   OpenStreetMap) means a bigger gap.
3. Government health centres per Kendra (a quarter).
   PHCs, CHCs and government hospitals write prescriptions for generic
   medicines. More centres per Kendra means more patients who may have
   nowhere nearby to buy those generics.

Each signal is turned into a rank from 0 to 100 among the districts being
compared (so a district in the middle gets about 50), then the three ranks are
combined with the weights above. If a signal has no data at all in a build
(for example OpenStreetMap was not reachable), it is left out and the other
weights are scaled up, and the map says so.
"""

WEIGHTS = {"people_per_kendra": 0.50, "outlets_per_10k": 0.25, "centres_per_kendra": 0.25}
WORSE_WHEN = {"people_per_kendra": "high", "outlets_per_10k": "low", "centres_per_kendra": "high"}


def district_numbers(d):
    pop = d["pop2011"] or 0
    jak = d["jak_official"]
    centres = None if d.get("no_centre_data") else d["phc"] + d["chc"] + d["hospital_gov"]
    # OSM pharmacies named Jan Aushadhi are already in the official Kendra count.
    outlets = jak + max(d["osm_pharmacy"] - d["osm_jak"], 0)
    return {
        "people_per_kendra": round(pop / jak) if jak and pop else None,
        "kendras_per_lakh": round(jak / pop * 1e5, 2) if pop else None,
        "outlets": outlets,
        "outlets_per_10k": round(outlets / pop * 1e4, 2) if pop else None,
        "centres": centres,
        "centres_per_kendra": None if centres is None else (round(centres / jak, 1) if jak else (float(centres) if centres else None)),
    }


def percentile_ranks(values, worse):
    """0 = best, 100 = worst. Ties share the same rank."""
    present = sorted(v for v in values if v is not None)
    if len(set(present)) <= 1:
        return [None for _ in values]
    out = []
    for v in values:
        if v is None:
            out.append(None)
            continue
        below = sum(1 for x in present if x < v)
        equal = sum(1 for x in present if x == v)
        r = (below + (equal - 1) / 2) / (len(present) - 1) * 100
        out.append(round(r if worse == "high" else 100 - r, 1))
    return out


def add_insights(districts, by_state=True):
    """Adds numbers and gap scores to each district dict.

    gap_score / gap_rank: compared with all districts given (all of India).
    gap_score_state / gap_rank_state: compared with districts of the same state.
    Districts with no population (no Census data) get no score.
    Returns the weights used for the all-India score."""
    for d in districts:
        d.update(district_numbers(d))
    scored = [d for d in districts if d["pop2011"]]
    weights = _score(scored, "")
    if by_state:
        groups = {}
        for d in scored:
            groups.setdefault(d.get("state", ""), []).append(d)
        for group in groups.values():
            _score(group, "_state")
    return weights


def _score(districts, suffix):
    ranks = {k: percentile_ranks([d[k] for d in districts], WORSE_WHEN[k]) for k in WEIGHTS}
    if not any(d["osm_pharmacy"] for d in districts):
        # Without OpenStreetMap pharmacies, 'outlets' would just repeat signal 1.
        ranks["outlets_per_10k"] = [None for _ in districts]
    used = {k: w for k, w in WEIGHTS.items() if any(r is not None for r in ranks[k])}
    total = sum(used.values()) or 1
    for i, d in enumerate(districts):
        parts = {k: ranks[k][i] for k in used if ranks[k][i] is not None}
        if not parts:
            d["gap_score" + suffix] = None
            continue
        wsum = sum(used[k] for k in parts)
        d["gap_score" + suffix] = round(sum(parts[k] * used[k] for k in parts) / wsum, 1)
        d["gap_parts" + suffix] = parts
    order = sorted((d for d in districts if d.get("gap_score" + suffix) is not None), key=lambda d: -d["gap_score" + suffix])
    for n, d in enumerate(order, 1):
        d["gap_rank" + suffix] = n
    return {k: round(w / total, 3) for k, w in used.items()}


def pincode_hints(district_lgd, pincodes, limit=5):
    """Pincodes inside a district that have government health centres but no
    Kendra and no mapped pharmacy: good places to look first.
    `pincodes` may be all pincodes or just the district's own."""
    hits = []
    for p in pincodes:
        if p.get("district_lgd") != district_lgd:
            continue
        if p["gov_facilities"] > 0 and p["jak"] == 0 and p["osm_pharmacy"] == 0:
            hits.append((p["gov_facilities"], p["pincode"], p["office"]))
    hits.sort(reverse=True)
    return [{"pincode": pin, "office": office, "centres": n} for n, pin, office in hits[:limit]]
