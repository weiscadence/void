# RESULT — Is there any ceiling under the continuous law? (2026-10-18)

**Verdict (pre-registered rule, CROWD = 6.1, 12 fresh seeds, 100,000 ticks): NO CEILING SEEN.** Named
reason: **1 of 12** seeds sets no new stable-niche max (±2) in the last 20,000 ticks (0/12 at 30k and 40k;
0/12 under the strict ±0 rule), **12 of 12** still have positive slope over the last 20k (+0.95 to +3.59
niches per 10k ticks), and the pooled climb curve is best fit by a **logarithm** (ΔAIC 144 over the
saturating model, 229 over linear). My pre-stated bet — CEILING, saturating at 110–140 — was **wrong**, in
the same direction as yesterday's: I under-estimated the world twice in a row.

**But "no ceiling seen" is not "no ceiling".** The curve is slowing: the pooled running max gained 22.0,
19.7, 9.2, 7.1, 5.0 niches in successive 20k windows. The log fit `23.7·ln t − 160.7` cannot hold: the
grid has 2,500 cells and at the balance crowd (~18.3) that caps stable niches near **137**; the log line
crosses it at t ≈ 285,000. So a ceiling exists for structural reasons and 100k ticks is too short to see
the world reach it. This is exactly the third case the prereg named in advance ("logarithmic — the honest
'cannot tell at 100k'"), and I am naming it rather than reading the operational verdict as open-endedness.

The noise arm (CROWD = 6, ±5% real-valued yield, **4 seeds**, replication only): **MIXED** — 2/4 plateau
at 20k, 1/4 at 30k, 0/4 at 40k, 4/4 rising; log and saturating fits not separable (ΔAIC 5.6 at n = 4,
per-seed the saturating model wins 4/4). It ends higher (mean 117.0 vs 112.4) and slows harder (last 20k
gain 2.3 vs 5.0). Consistent with approaching the cap faster, but four seeds cannot carry that claim.

Canary and decoy passed before any verdict was read:

| control | result |
|---|---|
| A0 canary — original law, known-frozen seeds 207 and 307, 20k ticks | **2/2 halted** at ticks 8,461 and 3,965 with 24/24 and 24/24 exposed keys at crowd 18; stable 38 / 37 — identical to the finding-9 and finding-10 rows |
| A2 decoy — CROWD = 5 (integer balance 15), six fresh seeds, 30k | **PASS**: 5/6 halted (@5,778 / 9,667 / 11,325 / 9,491 / 11,066), every one with 100% of exposed keys at crowd exactly 15; seed 1213 is a climber (93 niches, 105k events in the last 10k) |
| no halt under a continuous law | **0/16** worlds halted (A1 and A3); the finding-10 mechanism stands |

Prereg: `PREREG-ceiling-100k.md`, committed `aa644d0` (sha256 `90c14d81…c54625`), **amended** before any
verdict in `a1fb3fd` (sha256 `ac202824…7f21c7`) — see "What went wrong with the budget" below. Script
`ceiling-100k.js` sha256 `5adfe7cefd3d8017b270a01b0d6cae9e70a3014ca48f71802d3286efefc28074`. Engine
`lib/open.js` and `break-fixed-point.js` unchanged. Raw: `data/ceiling-100k.json` (every world's 1k-tick
series). Cost: ~24.5 CPU-min for this run + ~6 for the aborted first attempt, nice 19, two shards.

## The climb — CROWD 6.1, stable niches per seed

| seed | 20k | 40k | 60k | 80k | 100k | max @ tick | plateau 20k / 30k / 40k | slope, last 20k (per 10k) | pop at 100k |
|---|---|---|---|---|---|---|---|---|---|
| 1013 | 58 | 78 | 85 | 98 | 106 | 106 @ 96k | · / · / · | +3.20 | 1,441 |
| 1113 | 83 | 98 | 103 | 114 | 117 | 117 @ 97k | · / · / · | +1.59 | 1,719 |
| 1213 | 80 | 96 | 103 | 107 | 113 | 113 @ 100k | · / · / · | +3.31 | 1,455 |
| 1313 | 56 | 89 | 99 | 103 | 106 | 106 @ 87k | · / · / · | +1.34 | 1,429 |
| 1413 | 69 | 95 | 110 | 116 | 121 | 121 @ 100k | · / · / · | +1.90 | 1,680 |
| 1513 | 50 | 65 | 81 | 99 | 106 | 106 @ 99k | · / · / · | +2.89 | 1,391 |
| 1613 | 76 | 99 | 108 | 113 | 118 | 118 @ 99k | · / · / · | +2.36 | 1,579 |
| 1713 | 65 | 84 | 95 | 97 | 104 | 104 @ 99k | · / · / · | +3.59 | 1,483 |
| 1813 | 76 | 92 | 99 | 108 | 114 | 114 @ 96k | · / · / · | +2.86 | 1,506 |
| 1913 | 88 | 104 | 112 | 117 | 122 | 122 @ 91k | · / · / · | +3.14 | 1,770 |
| 2013 | 68 | 85 | 99 | 104 | 107 | 107 @ 92k | · / · / · | +1.88 | 1,506 |
| 2113 | 89 | 109 | 110 | 113 | 115 | 115 @ 99k | **Y** / · / · | +0.95 | 1,693 |
| **mean** | **71.5** | **91.2** | **100.3** | **107.4** | **112.4** | | 1 / 0 / 0 of 12 | **+2.4** | 1,554 |

Every seed's all-time max is within the last 13k ticks. Gain in the last 20k ranges 2–8 niches. The
structural cap is ~137; the mean sits at 82% of it, the best seed at 89%.

Noise arm, 4 seeds: 64/96/106/108/111 · 50/75/103/114/117 · 82/104/112/117/119 · 84/102/115/120/121;
plateau flags ···, ···, Y··, YY·; slopes +1.50, +2.04, +0.95, +0.72.

## Curve shape — fits to the pooled running-max curve, 96 points from 5k to 100k

| model | params | RSS | AIC | mean residual by thirds (early / mid / late) |
|---|---|---|---|---|
| linear | 60.9 + 5.9e-4·t | 2,562 | 319.3 | −2.15 / +4.77 / −2.61 (bends: data concave) |
| **log** | **−160.7 + 23.7·ln t** | **235** | **90.0** | **−0.70 / +0.29 / +0.41** (flat) |
| saturating | 123.6·t / (t + 13,302) | 1,055 | 234.1 | +0.12 / −1.30 / +1.80 (late data *above* the asymptote's approach — the world is still climbing faster than a saturating curve allows) |

Per seed, the log model wins 8/12, saturating 3/12, linear 1/12. The raw mean curve gives identical fits
(stable niches almost never fell, so running max equals raw; the transform manufactured nothing).

Read plainly: at 100k the climb is **decelerating but not saturating**. The saturating model's residuals
have the tell — positive at the end — which means any asymptote is above 124, and the grid says it is at
most ~137. The remaining room is 15–25 niches and the current rate is ~5 per 20k. A 300k run would see the
log break; this run does not.

## The other dials

- **Vocabulary ever seen** (distinct keys observed at any 1k sample): 54–104 at 20k → **132–207 at
  100k**, still growing in every seed. New keys keep being discovered; the vocabulary is not exhausted.
- **Program complexity** (mean effective instructions): 2.5–3.5 at 20k → 3.3–4.0 at 100k. Rising slowly,
  far below `LEN_MAX = 24`.
- **Max key reach** (largest L1 norm among living keys — the "max trait"): **4–6 throughout**, of a possible
  72. The world is not reaching outward in key space; it is densifying near the origin. Whatever is being
  explored, it is not distance. This is the one curve on the page that is genuinely flat, and it was flat
  from 20k.
- **Population**: 1,391–1,770 of 2,500 cells at 100k, ≈ 13 organisms per stable key (below the 18.3 balance
  — many keys are rare: exposed-key crowd ranges from 1 to 21).

## What this says

1. **The old claim is replaced, not confirmed.** "No world is unbounded, climbers cap at 74–105 by 40k" was
   a fact about the integer law. Under the continuous law 12/12 fresh seeds pass 104 and are still rising at
   100k, with no plateau at any pre-registered cutoff. Finding 10's reading — the fixed point was the cage —
   survives its first out-of-sample test on seeds it never saw.
2. **The climb is logarithmic at this horizon, and the grid guarantees it ends.** A log curve is the
   signature of a diminishing supply of something — here, most plausibly, free cells and cheap undiscovered
   keys near the origin. The honest statement is: the continuous law has no *ecological* ceiling visible by
   100k; it has a *geometric* one at ~137 that it is approaching at a slowing rate. Separating the two needs a
   bigger grid, which is the next experiment, not this one.
3. **Max reach is flat at 4–6.** If anything in this world is "capped", it is key reach, and it was capped
   before the climb began. The 7–15× open-vocabulary result and today's climb are about *density* of niches
   in a small ball of key space, not about reaching far. That reframes what "open vocabulary" is buying.
4. **Twice wrong in the same direction.** Yesterday I bet STALL and got CLIMBERS; today I bet CEILING and
   got a still-rising log curve. The prereg noted the risk of over-correcting toward optimism; the actual
   error was the opposite. I record it; I do not yet know what to do about it except keep writing bets down.

## What went wrong with the budget

The prereg's 16 + 16 design estimated ~40 CPU-s per 100k world from a 20k timing probe. Launched, the
first A1 world cost 68 CPU-s and the first noise world **150 CPU-s** (noise means more churn and a `rand()`
per harvest). Projected total ≈ 60 CPU-min against a 30-minute budget. I stopped both shards after one
world each, tested whether a prototype-getter harness was cheaper (tick-for-tick identical, not faster —
so the cost is intrinsic), and amended the prereg *before* reading anything further: 12 A1 seeds, 4 A3
seeds, proportional thresholds, and the two already-seen worlds disclosed in the amendment (both were
rising; both were evidence against my bet; the bet was left standing). Final cost ≈ 30.5 CPU-min
including the 6 sunk — over the ~30 line by the width of the controls.

## Honest limits

- 12 seeds in the scored arm, 4 in the replication arm. The verdict thresholds (≤ 25% / ≥ 75%) are
  comfortable here (1/12 vs a 3/12 line) but the shape fit is one pooled curve; with 12 seeds a ΔAIC of 144
  is decisive against saturation *at this horizon* and says nothing about 300k.
- One grid (50 × 50), one yield/upkeep pair, one tolerance. The ~137 structural cap is an estimate
  (cells / balance crowd); actual exposed-key crowds run 1–21, so the true cap could differ by tens.
- The ±2 plateau band was chosen before the run but is a judgment call; the strict band gives 0/12 at every
  cutoff, the ±2 band 1/12 at 20k. Neither changes the verdict.
- The "cannot tell at 100k" reading leans on the structural-cap argument, which is arithmetic, not an
  observation. The observation is: log-shaped, still rising, 82% of the cap.
- A3 at n = 4 is reported because it was run, not because it can carry weight.

## Reproduce

```bash
node ceiling-100k.js                              # ~25 CPU-min; writes data/ceiling-100k.json
ONLY=A0_original,A2_decoy node ceiling-100k.js    # controls only, ~1 min
```
