# Design: opt-in stock sharing by pharmacies

Status: **design only, not built.** Nothing in this document runs today.

## 1. The idea in one line

Pharmacies that choose to join can say "we have this generic medicine in stock" for a short list of common medicines, and the map shows, per pincode, where those medicines are likely to be found.

## 2. What it must never do

1. Never show or keep a pharmacy's sales, purchase quantities, prices it pays, or who supplies it.
2. Never show anything about a pharmacy that has not said yes, in writing, through the steps below.
3. Never let pharmacies see each other's stock or prices. Sharing prices or stock between competitors can raise competition-law questions (Competition Act, 2002, section 3), so the system only ever publishes availability bands, never numbers, and never prices.
4. Never collect patient data. No prescriptions, no customer names.
5. Never become a place to order medicines. It is a map, not an e-pharmacy.

## 3. What a pharmacy shares

Only three choices per medicine, for a fixed list of about 50 common generics (taken from the Jan Aushadhi product basket and the National List of Essential Medicines):

| Choice | Meaning |
|---|---|
| In stock | at least a few days' normal supply |
| Low | might run out this week |
| Out | none now |

Plus, once: pharmacy type (retail, Jan Aushadhi Kendra, hospital pharmacy), pincode, and opening hours. No quantities. No prices. Each answer expires after 7 days unless refreshed, so the map never shows stale "in stock".

## 4. Consent, step by step (DPDP Act 2023 and Rules 2025)

A pharmacy is a business, but the person running it (often the owner and pharmacist) is a person, and their name and phone are personal data. So:

1. **Notice first.** Before joining, the pharmacy sees a short notice in English and Gujarati (later other languages): what is collected, why, how long it is kept, who sees it, and how to leave. This follows the notice rules in the DPDP Rules 2025.
2. **Clear yes.** A separate tick for each use: (a) "count us in pincode totals", (b) "show our shop as a dot by name" (off by default). No pre-ticked boxes.
3. **Easy no.** A one-tap "leave and delete my data" link in every message we send. Leaving removes the shop from the next map build, and its records are deleted within 7 days.
4. **Only what is needed.** The person's name and phone are used only to confirm the shop is real and to send the weekly reminder. They are never published and never leave the system.
5. **Verification.** The pharmacy gives its drug sale licence number. A volunteer checks it by hand against the state's public licence lookup where one exists (for example Jharkhand) or by a phone call, and records only "checked: yes/no and date". The licence number itself is not published.
6. **Records of consent** (who, what, when) are kept for as long as the data is, so that any question can be answered.

## 5. What the public map shows

- **Default:** for each pincode and each medicine, "likely available" when at least **3** joined pharmacies in that pincode say "in stock". With fewer than 3, it shows "not enough data". This stops anyone working out one shop's stock from the totals.
- **Only if a pharmacy chose (b):** its dot, its name, opening hours, and the medicines it marked in stock. Never "low" or "out", which could hurt its business.
- A delay of up to 24 hours before changes appear, so the map cannot be used to watch a shop in real time.

## 6. How it would work (all free tools)

```
Pharmacy phone            Small web form (static page on GitHub Pages)
     |                          |
     |  weekly reminder link    v
     +--------------------- Form posts to a free serverless function
                               (for example Cloudflare Workers free tier)
                                    |
                                    v
                             Small database (free tier, India region if available)
                             holds: shop id, pincode, choices, consent ticks, expiry
                                    |
                     nightly job builds one aggregate file
                                    |
                                    v
                public/data/stock_STATE.json  (pincode bands only, plus opted-in dots)
```

- Each shop gets a private link with a long random token instead of a password. No accounts.
- The map build only ever reads the aggregate file, never the database.
- The database keeps answers for 30 days, then deletes them. Consent records are kept while the shop is a member.

## 7. Risks and answers

| Risk | Answer |
|---|---|
| A shop lies "in stock" to attract customers | Only the pincode band is public by default; 3-shop minimum; a "report wrong info" link; volunteers can pause a shop |
| Someone fakes being a pharmacy | Licence check before any data counts |
| Competitors learn each other's stock | They never see individual answers; bands only, 3-shop minimum, 24-hour delay |
| Data leak | Little to leak: no prices, no quantities, no patients. Names and phones stored separately and encrypted |
| Legal change (e-pharmacy rules, DPDP Rules phases ending May 2027) | Review this design before launch and every six months; get a short legal opinion before going live |

## 8. Before building

1. Talk to 10 pharmacies in Bharuch: would they join, what would make it worth it, what worries them.
2. Ask the Bharuch district chemists' association for its view.
3. Get a short written legal opinion on DPDP and competition-law points.
4. Pilot in 3 pincodes for 2 months, then decide.
