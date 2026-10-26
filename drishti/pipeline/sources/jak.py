"""Jan Aushadhi Kendras (PMBJP generic medicine stores).

1. District counts: official, from Parliament answer annexures (PIB PDFs).
   The seed table is typed from the latest annexure; the weekly job re-reads
   the PDFs and refreshes it when the text can be parsed.
2. Store points: only if a store list file is present
   (pipeline/seeds/jak_stores_<state>.csv). Contact names and phone numbers
   are never kept: the loader reads only the columns listed in STORE_COLUMNS.
"""
import csv
import re

from config import SEEDS

STORE_COLUMNS = ["store_code", "address", "pincode", "district"]

STATES = [
    "Andaman & Nicobar", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana",
    "The Dadra and Nagar Haveli and Daman and Diu", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
]
_ROW = re.compile(r"^\s*(\d{1,4})\s+(.+?)\s+(\d{1,5})\s*$")


def parse_annexure(text):
    """Read rows like '172 Gujarat Ahmedabad 117' then '173 Amreli 16'.

    The state is written only on the first row of each group, so it is
    carried forward. A long state name can wrap over several lines; that
    case is handled too. Returns (rows, total) where rows is a list of
    (state, district, count) and total is the 'Total' line, if found.
    """
    rows, state, total, wrapped = [], None, None, ""
    names = sorted(STATES, key=len, reverse=True)
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        t = re.match(r"^Total\s+(\d+)$", line, re.I)
        if t:
            total = int(t.group(1))
            break  # Annexure-II (a different table) follows
        m = _ROW.match(line)
        if m:
            middle = m.group(2).strip()
        else:
            # A wrapped state name, or the row that ends it without a serial number.
            plain = re.sub(r"^\d{1,4}\s+", "", line)
            end = re.match(r"^(.+?)\s+(\d{1,5})$", plain)
            if wrapped and end:
                rows.append((state, end.group(1).strip(), int(end.group(2))))
                wrapped = ""
                continue
            wrapped = (wrapped + " " + plain).strip()
            for s in names:
                if s.lower().startswith(wrapped.lower()) and len(wrapped) > 8:
                    state = s
                    break
            continue
        wrapped = ""
        for s in names:
            if middle.lower().startswith(s.lower() + " "):
                state, middle = s, middle[len(s):].strip()
                break
        else:
            # A long state name cut short on this line, for example
            # "646 The Dadra and Nagar Dadra And Nagar Haveli 21" with
            # "Haveli and Daman and Diu" on the next lines.
            hit = _state_prefix(middle, names)
            if hit:
                state, middle = hit
        if state:
            rows.append((state, middle, int(m.group(3))))
    return rows, total


def _state_prefix(middle, names):
    """(state, rest) when the line starts with the first 3 or more words of a state name."""
    low = middle.lower().split()
    for s in names:
        words = s.lower().split()
        for k in range(len(words) - 1, 2, -1):
            if low[:k] == words[:k] and len(low) > k:
                return s, " ".join(middle.split()[k:])
    return None


def load_counts(state_title=None):
    """Rows of the seed table (all states, or one state)."""
    out = []
    with open(SEEDS / "jak_district_counts.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if state_title and row["state"].lower() != state_title.lower():
                continue
            out.append({"state": row["state"], "district": row["district"], "kendras": int(row["kendras"]), "as_on": row["as_on"]})
    return out


def write_counts(rows, as_on, source):
    """Replace the seed table with freshly parsed rows (all states)."""
    path = SEEDS / "jak_district_counts.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["state", "district", "kendras", "as_on", "source"])
        for state, district, n in rows:
            w.writerow([state, district, n, as_on, source])


def load_stores(slug):
    path = SEEDS / f"jak_stores_{slug}.csv"
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return [{k: (row.get(k) or "").strip() for k in STORE_COLUMNS} for row in csv.DictReader(f)]
