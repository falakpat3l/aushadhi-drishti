"""Brand to generic mapping from Falak's anukalpa project (India list).

anukalpa stores India brands compactly:
  {"forms": [...], "makers": [...], "salts": [...], "strengths": [...],
   "rows": [[brand, form#, maker#, salt#, strength#, salt#, strength#, ...], ...]}
Its India data comes from the C-DAC / NRCeS Drug Information Service Bundle
(CC BY 4.0) plus a hand-made list.
"""
import json

URL = "https://raw.githubusercontent.com/falakpat3l/anukalpa/main/docs/data/IN.json"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def salt_index(data):
    """generic salt name (lower case) -> number of brands containing it."""
    salts = data["salts"]
    counts = {}
    for row in data["rows"]:
        for i in range(3, len(row), 2):
            name = salts[row[i]].lower()
            counts[name] = counts.get(name, 0) + 1
    return counts
