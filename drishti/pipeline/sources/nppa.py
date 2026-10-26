"""NPPA ceiling prices for scheduled formulations (DPCO 2013).

Source: NPPA price notifications (Gazette S.O. orders), as PDFs. The parser
reads tables whose header names the formulation, dosage form and strength,
unit and ceiling price. The seed file pipeline/seeds/nppa_ceiling_prices.csv
is used when no PDF can be read.
"""
import csv
import re

from config import SEEDS

FIELDS = ["formulation", "form_strength", "unit", "ceiling_rs", "order", "source"]

COLUMNS = [
    ("ceiling_rs", ("ceiling price", "retail price", "price (rs", "price in rs", "price(rs")),
    ("form_strength", ("dosage form", "strength")),
    ("unit", ("unit",)),
    ("order", ("s.o.", "s. o.", "notification")),
    ("formulation", ("name of the scheduled formulation", "scheduled formulation", "name of formulation", "formulation", "medicine", "drug")),
]


def map_header(row):
    found = {}
    cells = [re.sub(r"\s+", " ", (c or "")).strip().lower() for c in row]
    for name, words in COLUMNS:
        for i, h in enumerate(cells):
            if i in found.values():
                continue
            if any(w in h for w in words):
                found[name] = i
                break
    return found


def rows_from_tables(tables, source=""):
    out, cols = [], None
    for table in tables:
        for row in table:
            if not row or not any(row):
                continue
            joined = " ".join(c or "" for c in row).lower()
            if "formulation" in joined and ("price" in joined or "unit" in joined):
                cols = map_header(row)
                continue
            if not cols or "formulation" not in cols or "ceiling_rs" not in cols:
                continue
            get = lambda k: re.sub(r"\s+", " ", (row[cols[k]] or "")).strip() if k in cols and cols[k] < len(row) else ""
            price = re.sub(r"[^\d.]", "", get("ceiling_rs"))
            name = get("formulation")
            if not name or not price:
                continue
            try:
                value = float(price)
            except ValueError:
                continue
            out.append({"formulation": name, "form_strength": get("form_strength"), "unit": get("unit"),
                        "ceiling_rs": value, "order": get("order"), "source": source})
    return out


def parse_pdf(path, source=""):
    import pdfplumber
    tables = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            tables.extend(page.extract_tables())
    return rows_from_tables(tables, source)


def load_seed():
    path = SEEDS / "nppa_ceiling_prices.csv"
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["ceiling_rs"] = float(r["ceiling_rs"])
    return rows


def write_seed(rows):
    with open(SEEDS / "nppa_ceiling_prices.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})
