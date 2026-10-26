"""Settings for the data build. Plain values only, so they are easy to change."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # drishti/
PIPELINE = ROOT / "pipeline"
SEEDS = PIPELINE / "seeds"
CACHE = PIPELINE / ".cache"                            # raw downloads, git-ignored
GEOCODE_CACHE = CACHE / "geocode.json"                 # kept between runs by the Actions cache
OUT = ROOT / "public" / "data"                         # what the website loads

# The build covers all of India. Bharuch (Gujarat) is the test district.
TEST_DISTRICT = {"state": "Gujarat", "lgd": 442, "name": "Bharuch"}

USER_AGENT = "aushadhi-drishti/0.1 (+https://github.com/falakpat3l/aushadhi-drishti)"

# Open datasets re-published on GitHub by the india-geodata project.
GEODATA = "https://github.com/yashveeeeeeer/india-geodata/releases/download"
URLS = {
    "lgd_districts": f"{GEODATA}/admin%2Fdistricts/LGD_Districts.parquet",
    "subdistricts_2011": f"{GEODATA}/census%2F2011/SubDistricts_2011.parquet",
    "pincodes": f"{GEODATA}/postal%2Fboundaries/Datagov_Pincode_Boundaries.parquet",
    "nic_health": f"{GEODATA}/healthcare%2Ffacilities/INDIA_HEALTH_FACILITIES_NIC.geojson",
    # Jan Aushadhi Kendras by district (Parliament answer annexures published by PIB).
    "jak_annexures": [
        "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf",
    ],
    "nominatim": "https://nominatim.openstreetmap.org/search",
}

# Map detail: how much to simplify shapes (degrees) and how many decimals to keep.
SIMPLIFY_DISTRICT = 0.004
SIMPLIFY_PINCODE = 0.001
DECIMALS = 4
