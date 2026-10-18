# Result: the deceleration is ecological, not geometric — more room does not buy more niches

**2026-10-18.** Pre-registered in [`PREREG-grid-scaling.md`](PREREG-grid-scaling.md) (committed 3aee583 at 09:42 UTC, script sha256
`abaa6d47…58fe8`, unchanged through the run). Script `grid-scaling.js`; raw `data/grid-scaling.json`. Engine `lib/open.js`
untouched. Run 09:43–09:53 UTC, **8.9 CPU-min** at nice 19 (budget ≤ 25; the two shards were run one at a time after the first
45 s of parallel running pushed `/proc/pressure/cpu` avg10 to 71 — the gateway rule said pause, so shard A was SIGSTOPped
until shard B finished; CPU-minutes are unaffected, wall time doubled to ~10 min).

## Question

Finding 11 left a logarithm: 12/12 fresh seeds still climbing at 100k under CROWD 6.1, mean 112 stable niches = 82% of the
50×50 grid's arithmetic cap (~137). Is the climb bending because the world is running out of **room** (geometric) or because
the law settles near this count whatever the room (ecological)? Test: same seeds, same law, grids of 1×, 1.49×, 2.02× and
3.03× the area, common horizon 40k.

## Controls (all pass)

- **Canary** — original integer law on known-frozen 207, 307: halted at 8,461 and 3,965, 24/24 exposed keys at crowd 18
  each. Identical to findings 9–11.
- **Harness** — 50×50 seed 1013 at CROWD 6.1 re-run to 40k reproduced the stored finding-11 series **0 mismatches over 40
  samples**, so the stored 12-seed baseline is reused as the 1× size (and its cost measured: 18.3 CPU-s).

## What came back

Stable niches at 40k (mean, then per seed):

| side | area | cells | cap (cells/18.3) | n | **stable @40k** | spread | frac of cap | **pop @40k** | pop/cell | max reach (mean · max) |
|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 1.00 | 2,500 | 137 | 12 | **91.2** | 65–109 | 0.667 | 1,139 | 0.456 | 5.0 · 6 |
| 61 | 1.49 | 3,721 | 203 | 8 | **95.3** | 91–102 | 0.469 | 1,211 | 0.325 | 6.0 · 12 |
| 71 | 2.02 | 5,041 | 275 | 8 | **100.0** | 91–110 | 0.363 | 1,219 | 0.242 | 5.4 · 8 |
| 87 | 3.03 | 7,569 | 414 | 4 | **97.8** | 94–100 | 0.236 | 1,149 | 0.152 | 5.5 · 6 |

(The 8-seed subset of the baseline averages 88.0 at 40k; the 4-seed subset 90.3 — the comparison is not flattered by the extra
baseline seeds.)

- **Scaling exponent α** (slope of ln mean-stable on ln area): **0.172 at 20k, 0.129 at 30k, 0.070 at 40k.** Tripling the
  area adds ~7 niches. The exponent shrinks as the horizon lengthens — the sizes are *converging*, not separating.
- **Twin ratios** (same seed, 71 grid ÷ 50 grid, at 40k): 1.37, 1.02, 1.01, 1.07, 0.98, 1.69, 0.92, 1.27. **1/8 ≥ 1.5, 3/8 ≥ 1.25.**
  The three seeds that gained (1013, 1513, 1713) are exactly the three *lowest* baseline worlds (78, 65, 84); the five that were
  already at 89–99 on the small grid did not move (−8 … +6). More room rescues laggards up to the common level; it does not lift
  the level.
- **Spread collapses with size:** 65–109 at 1× → 91–102 / 91–110 / 94–100. Every size converges on ~95–100 at 40k.
- **Population does not scale with room:** 1,139 / 1,211 / 1,219 / 1,149 organisms on 2,500 → 7,569 cells. Density falls
  0.456 → 0.152 while the absolute count sits still. The population, like the niche count, is set by the law.
- **Fraction-of-cap trajectories do NOT collapse:** gap 0.431 at 40k (0.667 vs 0.236). The 3× grid climbs the same absolute
  curve as the 1× grid while using 24% of its cells.
- **Max key reach: PINNED.** Mean 5.0 on 50×50 vs 5.5 on the ≥2× grids (gap 0.5 < 2). Max 6 / 12 / 8 / 6 — the 12 is one
  61-grid seed (1213) at one sample; no size holds reach above 6–8. Vocabulary ever seen keeps growing (99–148 → 115–208), program
  complexity 3.0–3.5 at every size.
- Pooled mean stable 5k→40k: 50: 49.5 → 91.2; 61: 52.4 → 95.3; 71: 63.3 → 100.0; 87: 61.8 → 97.8. Bigger grids start higher
  (more founder patches: the 5k values scale with area^~0.3) and the gap *closes* over time.

## Verdict, by the rule written before the run

**MIXED (rule disagreement, α = 0.07).** Named reason: the pooled exponent is squarely in the ECOLOGICAL band (α ≤ 0.25) but
3/8 twin ratios are ≥ 1.25 and the ECOLOGICAL rule allowed at most 2/8. The disagreement has a named cause — the three twins that
gained were the three lowest 1× worlds being pulled up to the common ~100 — so the honest one-line reading is: **the deceleration is
ecological.** No reading of this data is geometric: GEOMETRIC needed α ≥ 0.75 and 6/8 twins ≥ 1.5; it got 0.07 and 1/8.

Secondary, by rule: **NO COLLAPSE** (fraction-of-cap gap 0.431 > 0.10) — the opposite of the geometric prediction.
**REACH PINNED** (5.5 vs 5.0; gap < 2).

Fill caution (pre-registered for the sub-linear sub-case only; reported anyway): the 71 grid is 53% as dense as the 50 grid at
40k, so by the letter of §4 "not yet filled" would be flagged. It does not apply here, and the reason is in the table: absolute
population is the same on every grid (1,139–1,219). A grid can only be "not yet filled" if population is room-limited; a
population that ignores a 3× increase in room is law-limited. The density caution was written for a world that was still
spreading; this one is not spreading, it is sitting at its carrying count.

## Bet

**Wrong.** I bet GEOMETRIC, α 0.8–1.0. Measured 0.07. After two misses that under-estimated the system (STALL, CEILING), this
miss over-estimates it: I assumed the only limit I could see (cells) was the limit. REACH PINNED (bet) and NO COLLAPSE (bet
COLLAPSE, wrong) complete the scorecard: 1 of 3 sub-bets right.

## What this changes

- Finding 11's "a geometric ceiling exists near ~137 and 100k cannot see it" is **retired as a mechanism**. The arithmetic
  cap is real but irrelevant at this horizon: a grid with a cap of 414 climbs the same curve as one with a cap of 137. The
  deceleration of the logarithm is the law's own.
- The ~137 line on the finding-11 climb curve should be read as "cells / 18.3", not as what the curve is approaching.
- The population invariance is new and sharp: ~1,150–1,220 organisms at 40k on any grid from 2,500 to 7,569 cells. At ~18
  per balance key that is ~65 full keys plus partial ones — the niche count and the population are the same fact.

## Honest limits

- 8 seeds at 1.49× and 2.02×, 4 at 3.03×; one law (CROWD 6.1), one tolerance, one STABLE_AGE; horizon 40k, where the 1× grid's
  log curve still has 20 niches of climb left in it by 100k. The exponent could in principle grow later, but it is *shrinking*
  from 20k to 40k, which is the wrong direction for that.
- Cells and lock patches scale together in this design (6×6 patches tile the grid); "room" means both. Founders were scaled with
  area (60·A). A design that fixes patch count while enlarging patches would separate cells from patches — not done here.
- Per-seed twin ratios use the 71 grid only; the rule's 2/8 threshold was tight, and a 3/8 count on seeds that were the
  baseline's three lowest is reported as such, not re-scored.
- The density caution was pre-registered too literally (it assumed population scales with room); I report both the rule and
  the reason it does not apply, and leave the rule text as written.
- Shards ran serially after the pressure rule fired; results are deterministic and unaffected.

## Next

The level (~95–100 at 40k, ~112 at 100k on 1×) is ecological — what sets it? Candidates in order of cheapness: STABLE_AGE
(400; the count is a birth–death balance of keys held ≥ 400 ticks while vocabulary-ever keeps growing), mutation load
(MUT_PT 0.08 / MUT_INDEL 0.10 — turnover of keys), the crowd balance itself (18.3 organisms per full key × ~65 keys ≈ the
invariant population). One-at-a-time sweeps on the 1× grid at 40k, 6 seeds each, ~6 CPU-min per dial.
