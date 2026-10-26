"""Offline tests for the data build. Run: python3 -m unittest discover tests"""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))

import geo  # noqa: E402
import insights  # noqa: E402
from sources import cdsco, jak, nppa, osm  # noqa: E402


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


FIX = ROOT / "tests" / "fixtures"


class CdscoTest(unittest.TestCase):
    def test_titles(self):
        self.assertEqual(cdsco.month_from_title("NSQ ALERT FOR THE MONTH OF June 2025"), "2025-06")
        self.assertEqual(cdsco.month_from_title("STATE NSQ ALERT FOR THE MONTH OF MAY-2025"), "2025-05")
        self.assertEqual(cdsco.kind_from_title("List of spurious Drugs for the month of June-2025"), "spurious")
        self.assertEqual(cdsco.kind_from_title("STATE NSQ ALERT FOR THE MONTH OF June 2025"), "nsq_state")

    def test_links_from_alerts_page(self):
        html = """<table><tr><td>6</td><td>CDSCO NSQ ALERT FOR THE MONTH OF June 2025</td><td>2025-Jul-18</td>
        <td><a href="/opencms/opencms/system/modules/CDSCO.WEB/elements/download_file_division.jsp?num_id=MTI5Mjc=">pdf</a></td></tr>
        <tr><td>2</td><td>Circular regarding GST</td><td>2025-Oct-08</td>
        <td><a href="/opencms/opencms/system/modules/CDSCO.WEB/elements/download_file_division.jsp?num_id=MTM0ODc=">pdf</a></td></tr></table>"""
        links = cdsco.list_alert_links(html)
        self.assertEqual(len(links), 1)
        # The live page writes links with single quotes.
        self.assertEqual(len(cdsco.list_alert_links(html.replace('href="', "href='").replace('=">', "='>"))), 1)
        self.assertEqual(links[0]["month"], "2025-06")
        self.assertTrue(links[0]["url"].startswith("https://cdsco.gov.in/"))

    def test_parse_sample_pdf(self):
        rows = cdsco.parse_pdf(FIX / "cdsco_sample.pdf")
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["batch"], "PT2401")
        self.assertIn("Baddi", rows[0]["maker"])
        self.assertEqual(rows[1]["reason"], "Assay")
        self.assertEqual(cdsco.find_pincode(rows[0]["maker"]), "173205")


class AlertCountsTest(unittest.TestCase):
    """The published alerts file must hold counts only (CDSCO terms)."""

    class FakePlaces:
        def coarse(self, address, pincode=None):
            return (72.97, 21.82, "district", "Bharuch, Gujarat") if "Bharuch" in address else None

        def state_in(self, text):
            return "Gujarat" if "Gujarat" in text else None

        def state_point(self, name):
            return (72.23, 22.31)

    def test_counts_only(self):
        from medicines import summarise
        rows = [
            {"product": "Pantoprazole Tablets 40 mg", "batch": "PZ99", "maker": "M/s Example Labs, Bharuch, Gujarat",
             "reason": "Assay", "reporter": "FDCA Gujarat", "month": "2025-06", "kind": "nsq_state", "src": 0},
            {"product": "Pantoprazole Tablets 40 mg", "batch": "PZ99", "maker": "M/s Example Labs, Bharuch, Gujarat",
             "reason": "Assay", "reporter": "FDCA Gujarat", "month": "2025-06", "kind": "nsq_state", "src": 0},
            {"product": "Amoxycillin Capsules", "batch": "AX1", "maker": "M/s Real Maker, Somewhere",
             "reason": "Spurious", "reporter": "FDA Gujarat", "month": "2025-06", "kind": "spurious", "src": 0},
        ]
        data, unique = summarise(rows, self.FakePlaces(), [{"title": "t", "url": "https://cdsco.gov.in/"}])
        self.assertEqual(len(unique), 2)
        self.assertEqual(data["months"][0]["nsq"], 1)
        self.assertEqual(data["months"][0]["spurious"], 1)
        self.assertEqual(sum(c[3] for c in data["counts"]), 2)
        self.assertEqual(data["places"][1][3], "Reported in Gujarat")
        text = json.dumps(data)
        for secret in ("Pantoprazole", "PZ99", "Example Labs", "Real Maker", "Assay"):
            self.assertNotIn(secret, text)


class AllIndiaTest(unittest.TestCase):
    def test_wrapped_state_name(self):
        text = """646 The Dadra and Nagar Dadra And Nagar Haveli 21
Haveli and Daman and
Diu
647 Daman 16
648 Diu 3
649 Tripura Dhalai 3
Total 43"""
        rows, total = jak.parse_annexure(text)
        self.assertEqual(total, 43)
        self.assertEqual([r[0] for r in rows[:3]], ["The Dadra and Nagar Haveli and Daman and Diu"] * 3)
        self.assertEqual(rows[3][:2], ("Tripura", "Dhalai"))

    def test_seed_is_all_india(self):
        rows = jak.load_counts()
        self.assertEqual(len(rows), 767)
        self.assertEqual(sum(r["kendras"] for r in rows), 17990)

    def test_india_outline_is_official(self):
        """The background map must show India as the Survey of India does."""
        from shapely.geometry import Point, shape
        data = json.loads((ROOT / "public" / "basemap" / "india-basemap.json").read_text())
        india = shape(data["india"])
        for name, lon, lat in [("Gilgit", 74.31, 35.92), ("Muzaffarabad", 73.47, 34.37), ("Aksai Chin", 79.3, 35.3),
                               ("Tawang", 91.86, 27.59), ("Leh", 77.58, 34.15), ("Bharuch", 72.98, 21.7)]:
            self.assertTrue(india.buffer(0.01).covers(Point(lon, lat)), f"{name} must be inside India")
        for name, lon, lat in [("Lahore", 74.35, 31.55), ("Kathmandu", 85.32, 27.7), ("Dhaka", 90.41, 23.81)]:
            self.assertFalse(india.covers(Point(lon, lat)), f"{name} must be outside India")
        for n in data["neighbours"]:
            self.assertLess(shape(n["geometry"]).buffer(0).intersection(india.buffer(-0.05)).area, 0.01, f"{n['name']} overlaps India")

    @unittest.skipUnless(osm.osmium_ready(), "osmium-tool not installed")
    def test_osm_extract(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            items = osm.extract(FIX / "osm_sample.osm.pbf", tmp)
        kinds = sorted(i["kind"] for i in items)
        self.assertEqual(kinds, ["hospital", "pharmacy", "pharmacy", "pharmacy"])
        self.assertTrue(any(i["jak"] for i in items))
        self.assertFalse(any("Ramesh" in json.dumps(i) for i in items), "pharmacy names must not be kept")


class WorldTest(unittest.TestCase):
    def test_singapore_census_table(self):
        import tempfile
        import world
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as t:
            t.write("Number,Total_Total,Total_60_64,Total_65_69,Total_90andOver\nTotal,9,1,1,1\nBedok - Total,100,10,7,3\nBedok North,50,5,3,1\n")
        self.assertEqual(world.sg_census(t.name), {"BEDOK": {"people": 100, "aged_65_plus": 10}})

    def test_access_score(self):
        import world
        from shapely.geometry import box as b
        regions = [{"id": i, "name": str(i), "geom": b(i, 0, i + 1, 1), "people": 1000 * (i + 1), "aged_65_plus": 100 * (i + 1)} for i in range(3)]
        world.add_measures(regions, [[0.5, 0.5, "a"], [0.6, 0.5, "b"], [1.5, 0.5, "c"]])
        self.assertEqual([r["pharmacies"] for r in regions], [2, 1, 0])
        self.assertEqual(regions[0]["access_rank"], 3)  # most pharmacies per person: best served
        self.assertEqual(regions[2]["access_rank"], 1)  # people but no pharmacy: worst served


class NppaTest(unittest.TestCase):
    def test_parse_sample_pdf(self):
        rows = nppa.parse_pdf(FIX / "nppa_sample.pdf")
        self.assertEqual([r["formulation"] for r in rows], ["Paracetamol", "Pantoprazole"])
        self.assertEqual(rows[0]["ceiling_rs"], 0.99)
        self.assertIn("1581", rows[0]["order"])


if __name__ == "__main__":
    unittest.main()
