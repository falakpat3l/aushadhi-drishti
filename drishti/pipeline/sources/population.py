"""Population by district, Census 2011.

Census 2011 counted people by sub-district (taluka). Each sub-district in the
source file also carries today's LGD district code, so adding sub-districts up
gives 2011 population for today's districts, including ones created after 2011.
"""
import pyarrow.parquet as pq


def by_district(path, state_lgd):
    t = pq.read_table(path, columns=["State_LGD", "Dist_LGD", "Tot_pop"])
    totals = {}
    for row in t.to_pylist():
        if row["State_LGD"] != state_lgd or row["Dist_LGD"] is None:
            continue
        totals[row["Dist_LGD"]] = totals.get(row["Dist_LGD"], 0) + int(row["Tot_pop"] or 0)
    return totals
