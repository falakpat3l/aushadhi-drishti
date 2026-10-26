"""Offline tests for the data build. Run: python3 -m unittest discover tests"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))

import geo  # noqa: E402
import insights  # noqa: E402
from sources import jak, osm  # noqa: E402


class AnnexureTest(unittest.TestCase):
    def test_rows_and_total(self):
        text = "\n".join([
            "S. No. State / Union territory District Number of",
            "JAKs opened",
            "171 Goa South Goa 10",
            "172 Gujarat Ahmedabad 117",
            "173 Amreli 16",
            "646 The Dadra and Nagar",
            "Haveli and Daman and",
            "Diu",
            "Dadra And Nagar Haveli 21",
            "647 Daman 16",
            "Total 180",
            "Annexure-II",
            "man And Nicobar Islands 3",
        ])
        rows, total = jak.parse_annexure(text)
        self.assertEqual(total, 180)
        self.assertIn(("Gujarat", "Ahmedabad", 117), rows)
        self.assertIn(("Gujarat", "Amreli", 16), rows)
        self.assertIn(("The Dadra and Nagar Haveli and Daman and Diu", "Daman", 16), rows)
        self.assertEqual(sum(r[2] for r in rows), 180)

    def test_seed_table(self):
        rows = jak.load_counts("Gujarat")
        self.assertEqual(len(rows), 34)
        self.assertEqual(sum(r["kendras"] for r in rows), 848)
        bharuch = [r for r in rows if r["district"] == "Bharuch"][0]
        self.assertEqual(bharuch["kendras"], 14)


class OsmTest(unittest.TestCase):
    def test_parse_keeps_only_needed_fields(self):
        items = osm.parse(ROOT / "tests" / "fixtures" / "overpass_sample.json")
        pharmacies = [i for i in items if i["kind"] == "pharmacy"]
        hospitals = [i for i in items if i["kind"] == "hospital"]
        self.assertEqual(len(pharmacies), 2)  # the duplicate at the same spot is dropped
        self.assertEqual(len(hospitals), 1)   # the relation without a position is skipped
        for p in pharmacies:
            self.assertNotIn("name", p)        # shop names are not kept
            self.assertNotIn("phone", p)
        self.assertTrue(any(p["jak"] for p in pharmacies))
        self.assertEqual(hospitals[0]["name"], "Civil Hospital Bharuch")


class NamesTest(unittest.TestCase):
    def test_norm_and_aliases(self):
        self.assertEqual(geo.norm("The Dangs"), geo.norm("Dangs"))
        aliases = geo.load_aliases()
        self.assertEqual(aliases[(geo.norm("Gujarat"), geo.norm("Vav-Tharad"))][0], 441)
        self.assertEqual(aliases[(geo.norm("Gujarat"), geo.norm("Dahod"))][0], 445)


class StoreColumnsTest(unittest.TestCase):
    def test_no_personal_columns(self):
        for col in jak.STORE_COLUMNS:
            self.assertNotIn("contact", col)
            self.assertNotIn("phone", col)
            self.assertNotIn("name", col)


class GapScoreTest(unittest.TestCase):
    def district(self, name, pop, jak, pharm=0, phc=0):
        return {"name": name, "pop2011": pop, "jak_official": jak, "osm_pharmacy": pharm, "osm_jak": 0,
                "phc": phc, "chc": 0, "hospital_gov": 0}

    def test_ranks(self):
        self.assertEqual(insights.percentile_ranks([1, 2, 3], "high"), [0.0, 50.0, 100.0])
        self.assertEqual(insights.percentile_ranks([1, 2, 3], "low"), [100.0, 50.0, 0.0])
        self.assertEqual(insights.percentile_ranks([5, 5], "high"), [None, None])

    def test_more_people_per_kendra_means_bigger_gap(self):
        ds = [self.district("A", 1_000_000, 20, 50, 10), self.district("B", 1_000_000, 2, 50, 10),
              self.district("C", 1_000_000, 10, 50, 10)]
        insights.add_insights(ds)
        top = max(ds, key=lambda d: d["gap_score"])
        self.assertEqual(top["name"], "B")
        self.assertEqual(top["gap_rank"], 1)

    def test_no_osm_drops_outlets_signal(self):
        ds = [self.district("A", 100, 1, 0, 5), self.district("B", 100, 2, 0, 1)]
        weights = insights.add_insights(ds)
        self.assertNotIn("outlets_per_10k", weights)
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=2)


if __name__ == "__main__":
    unittest.main()
