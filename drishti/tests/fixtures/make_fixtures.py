"""Makes the small sample PDFs used by tests/test_pipeline.py.
They copy the layout of CDSCO alert lists and NPPA price orders, with made-up rows.
Run: python3 tests/fixtures/make_fixtures.py"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

HERE = Path(__file__).resolve().parent
GRID = TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.black), ("FONTSIZE", (0, 0), (-1, -1), 7)])


def make(name, rows):
    doc = SimpleDocTemplate(str(HERE / name), pagesize=landscape(A4))
    doc.build([Table(rows, style=GRID, repeatRows=1)])


make("cdsco_sample.pdf", [
    ["S. No.", "Name of Drugs/medical device/cosmetics", "Batch No.", "Date of Manufacture", "Date of Expiry",
     "Manufactured By", "NSQ Result", "Drawn By", "From"],
    ["1", "Paracetamol Tablets IP 500 mg", "PT2401", "01/2025", "12/2026",
     "M/s Sample Pharma, Plot 4, Baddi, Distt. Solan (H.P.) 173205", "Dissolution", "CDSCO North Zone", "CDL Kolkata"],
    ["2", "Pantoprazole Gastro-resistant Tablets IP 40 mg", "PZ99", "03/2025", "02/2027",
     "M/s Example Labs, GIDC Ankleshwar, Dist. Bharuch, Gujarat", "Assay", "FDCA Gujarat", "CDTL Mumbai"],
])
make("nppa_sample.pdf", [
    ["Sl. No.", "Name of the Scheduled Formulation", "Dosage form & Strength", "Unit", "Ceiling Price (Rs.)", "Existing S.O. No. & Date"],
    ["1", "Paracetamol", "Tablet 500 mg", "1 Tablet", "0.99", "S.O. 1581(E) 25.03.2026"],
    ["2", "Pantoprazole", "Tablet 40 mg", "1 Tablet", "3.12", "S.O. 1581(E) 25.03.2026"],
])
print("made")
