"""CDSCO drug quality alerts: 'not of standard quality' (NSQ) and spurious.

Where they come from
- Up to mid-2025: monthly PDFs listed on the CDSCO Alerts page.
- From Aug 2025: CDSCO's public NSQ portal (see portal.py), monthly.

What is kept per sample: month, product name, batch, maker as printed,
reason for failure, the lab or state that reported it, and the source link.

Fairness rules (also shown on the map)
- An NSQ result is about one batch, not the whole company.
- A spurious sample was NOT made by the company named on its label. So
  spurious samples are never pinned to that company's address; they are
  shown at the state that reported them.
"""
import re
from html import unescape

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

# Header words that identify each column, checked in this order.
COLUMNS = [
    ("batch", ("batch", "lot no")),
    ("maker", ("manufactured by", "name of manufacturer", "manufacturer", "mfd. by", "mfd by", "mfg. by", "mfg by", "name & address", "name and address")),
    ("mfg_date", ("date of manufacture", "date of mfg", "mfg. date", "mfg date", "manufacturing date", "d.o.m")),
    ("exp_date", ("expiry", "date of exp", "exp. date", "exp date")),
    ("reason", ("reason", "result", "failure", "nsq")),
    ("reporter", ("drawn", "reported", "tested by", "lab", "state", "from", "source")),
    ("product", ("name of", "drug", "product", "medical device", "cosmetic", "item")),
]


def kind_from_title(title):
    t = title.lower()
    if "spurious" in t:
        return "spurious"
    if "state" in t:
        return "nsq_state"
    return "nsq_central"


def month_from_title(title):
    """'NSQ ALERT FOR THE MONTH OF June 2025' -> '2025-06'."""
    t = title.lower()
    m = re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-.,']*(20\d\d)", t)
    if not m:
        return None
    return f"{m.group(2)}-{MONTHS[m.group(1)]:02d}"


def list_alert_links(html, base="https://cdsco.gov.in"):
    """From the Alerts page HTML, return monthly alert PDFs: title, month, kind, url."""
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        cells = [unescape(re.sub(r"<[^>]+>", " ", c)).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S | re.I)]
        link = re.search(r'href="([^"]*download_file_division\.jsp\?num_id=[^"]+)"', row)
        if len(cells) < 2 or not link:
            continue
        title = re.sub(r"\s+", " ", cells[1])
        tl = title.lower()
        if not any(w in tl for w in ("nsq", "not of standard", "drug alert", "spurious", "standard quality")):
            continue
        month = month_from_title(title)
        if not month:
            continue
        url = link.group(1)
        if url.startswith("/"):
            url = base + url
        out.append({"title": title, "month": month, "kind": kind_from_title(title), "url": unescape(url),
                    "revised": "revis" in tl})
    return out


def map_header(header):
    """Header cells -> {column name: index}."""
    found = {}
    cells = [re.sub(r"\s+", " ", (h or "")).strip().lower() for h in header]
    for name, words in COLUMNS:
        for i, h in enumerate(cells):
            if i in found.values():
                continue
            if any(w in h for w in words):
                found[name] = i
                break
    return found


def rows_from_tables(tables):
    """Turn pdfplumber tables into dicts. Header rows may repeat on each page."""
    out, cols = [], None
    for table in tables:
        for row in table:
            if not row or not any(row):
                continue
            joined = " ".join((c or "") for c in row).lower()
            if ("batch" in joined and ("name" in joined or "manufact" in joined)):
                cols = map_header(row)
                continue
            if not cols or "product" not in cols:
                continue
            get = lambda k: re.sub(r"\s+", " ", (row[cols[k]] or "")).strip() if k in cols and cols[k] < len(row) else ""
            product = get("product")
            if not product or product.lower() in ("na", "-"):
                continue
            out.append({k: get(k) for k in ("product", "batch", "maker", "reason", "reporter", "mfg_date", "exp_date")})
    return out


def parse_pdf(path):
    import pdfplumber
    tables = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            tables.extend(page.extract_tables())
    return rows_from_tables(tables)


PIN = re.compile(r"(?<!\d)([1-9]\d{2})\s?(\d{3})(?!\d)")


def find_pincode(text):
    m = None
    for m in PIN.finditer(text or ""):
        pass  # the last six-digit number in an address is usually the pincode
    return (m.group(1) + m.group(2)) if m else None
