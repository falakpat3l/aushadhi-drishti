# Seed files

Small, hand-checked tables that the build starts from. Each row says where it came from.

- `jak_district_counts.csv`: Jan Aushadhi Kendras opened, by district, as on 31 Dec 2025. Typed from the annexure to a Rajya Sabha answer published by PIB:
  https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781301.pdf
  All 767 rows, India total 17,990 (Gujarat 848 in 34 districts). Read from the PDF on 26 Oct 2026 and checked: rows add up to the stated total.
  The weekly job re-reads that PDF (and newer ones listed in `pipeline/config.py`) and refreshes this table.
- `district_aliases.csv`: spellings used by different sources for the same district, mapped to the Local Government Directory (LGD) code.
- `district_merges.csv`: districts in the boundary file that no longer exist (nine Rajasthan districts formed in 2023 and merged back in Dec 2024), and the district each is drawn inside.
