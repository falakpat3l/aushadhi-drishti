# Seed files

Small, hand-checked tables that the build starts from. Each row says where it came from.

- `jak_district_counts.csv`: Jan Aushadhi Kendras opened, by district, as on 31 Dec 2025. Typed from the annexure to a Rajya Sabha answer published by PIB:
  https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf
  Gujarat total: 848 Kendras in 34 districts. India total: 17,990.
  The weekly job re-reads that PDF (and newer ones listed in `pipeline/config.py`) and refreshes this table.
- `district_aliases.csv`: spellings used by different sources for the same district, mapped to the Local Government Directory (LGD) code.
