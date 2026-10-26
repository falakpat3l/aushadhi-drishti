# How the gap score works

The gap score answers one question: **in which district would one more Jan Aushadhi (generic medicine) store help the most?**

Every district gets a score from **0 (well served)** to **100 (biggest gap)**. Districts are compared only with the other districts in the same state.

## The three signals

| Signal | Weight | Bigger gap when |
|---|---|---|
| People per Jan Aushadhi Kendra | 50% | more people share one Kendra |
| Medicine outlets per 10,000 people (Kendras plus pharmacies mapped in OpenStreetMap) | 25% | there are fewer outlets of any kind |
| Government health centres (PHC, CHC, government hospitals) per Kendra | 25% | there are more centres per Kendra |

Why the third one: government centres write prescriptions for generic medicines. Many centres per Kendra means many patients who may have nowhere nearby to buy those generics.

## The steps

1. Work out the three numbers for every district.
2. Turn each number into a rank from 0 to 100 among the state's districts. The best district on that signal gets 0, the worst gets 100, the middle one about 50. Ties share a rank.
3. Add the three ranks with the weights above.

Example: a district that is the worst on every signal scores 100. One that is in the middle on all three scores about 50.

## When a signal is missing

If a build has no OpenStreetMap pharmacies at all (for example the OSM server was down), the outlets signal would only repeat the first signal, so it is left out. The other two weights are scaled up to add to 100% (two thirds and one third). The map shows which weights were used, under the ranking list.

## Pincodes to look at first

Inside each district, the map lists up to five pincodes that have government health centres but no Kendra and no pharmacy mapped in OpenStreetMap, the ones with the most centres first. These are starting points for a closer look, not a verdict: OSM misses many shops.

## Limits

- Population is from Census 2011. Fast-growing districts look better served than they are.
- Kendra counts are official (Parliament answer, 31 Dec 2025); private generic stores are not counted.
- The score is relative. A low score means "better than other districts in the state", not "enough".

The code is in `drishti/pipeline/insights.py`.
