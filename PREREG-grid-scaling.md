# Pre-registration: is the deceleration geometric or ecological?

**Written 2026-10-18 09:42 UTC, before the run.** Script frozen at `grid-scaling.js` sha256
`abaa6d477b88a5e967effaff7da151a8202269b632f3be3209f8224556758fe8`. Engine `lib/open.js`
`c5ec2078…56ceaf4` (unchanged since the commitment-time prereg). `ceiling-100k.js` `5adfe7ce…8074` (its
`runWorld` and A0 arm are reused for the canary, unchanged). Baseline `data/ceiling-100k.json` sha256
`13f2ede2a0a36541940802a6b52c80e04e3bc6ff8722b7324e73257ef91524e1` (the finding-11 run, committed d282004).

Runs before this file existed, disclosed and not read as evidence: (a) a timing probe, seed 1013 to 5,000 ticks
at sides 50/61/71/87 — 0.84/1.65/2.16/1.56 CPU-s, stable niches at 5k 37/56/71/62 (the 50×50 series matched
the stored baseline sample-for-sample); (b) a smoke test of the script at H = 4,000 on seed 1013, sides 61 and 71
(stable 54 and 68 at 4k), run only to check every field is populated and the shard-merge scorer executes. Early
counts are expected to scale with the number of founder patches (founders are born fed in their patch), so these
numbers say nothing about the 40k question; I record them because I saw them.

## 1. The question

Finding 11: under the continuous law (CROWD 6.1) 12/12 fresh seeds were still climbing at 100,000 ticks, along
a logarithm (23.7·ln t − 161), mean 112 stable niches = 82% of the 50×50 grid's ~137-cell cap. A logarithm cannot
say whether the climb is bending because the world is running out of **room** (geometric) or because the law
itself settles near ~110–120 whatever the room (ecological).

> Same seeds, same law, more room, shorter common horizon: does the stable-niche count at a fixed tick scale
> with grid area, or stay where it is?

## 2. Design, fixed now

- **Sizes.** Side 50 (area ×1.00, cap 2,500/18.3 ≈ 137) — the **baseline, reused** from
  `data/ceiling-100k.json` truncated to the common horizon (the engine is deterministic; the harness canary in §3
  checks this to the integer). Side **61** (×1.49, cap 203) and **71** (×2.02, cap 275) on **8 seeds**
  `1013, 1113, …, 1713` (all in the baseline's 12). Side **87** (×3.03, cap 414) as a far point on **4 seeds**
  `1013…1313`. Founders scale with area (60·A) so founding density is equal. The 6×6 lock patches tile the
  larger grid, so patch count scales with area as well: "geometric" here means *scales with room*, cells and
  patches together — this design cannot separate the two (stated as a limit in advance).
- **Horizon H = 40,000**, sampled every 1,000 ticks: stable niches, distinct, pop, program complexity, max key
  reach (max L1 norm of a living key), cumulative keys ever seen, births, deaths. Config `{tol:2,
  construct:true, stableAge:400, menuSize:0}`, CROWD 6.1, as in findings 10 and 11.
- **Cutoffs** 20k / 30k / 40k: everything below is reported at all three; the **verdict is read at 40k**.
- Two parallel shards at nice 19 (one per vCPU), merged and scored by `node grid-scaling.js --score a.json b.json`;
  the scorer is the same function the single-process path uses.

## 3. Controls

- **Canary (A0).** Original integer law (CROWD 6) on known-frozen seeds **207 and 307** to 20k must halt with
  ≥ 90% of exposed keys at crowd 18 (as in findings 9–11). Miss → **VOID**, no verdict read.
- **Harness canary.** 50×50 seed 1013 at CROWD 6.1 re-run to 40k must reproduce the stored stable-niche series
  of `data/ceiling-100k.json` **sample for sample (0 mismatches over 40 samples)**. Miss → the baseline cannot be
  reused → **VOID**. (This also measures the true 40k cost of a 50×50 world for the budget check.)

## 4. Rules, before the numbers

Let s(A) be the mean stable-niche count at 40k across the seeds run at area ratio A, and **α** the least-squares
slope of ln s on ln A across the sizes run (α = 1 means niches ∝ area; α = 0 means no dependence). Let the
**twin ratio** per seed be stable at 40k on the 71 grid ÷ stable at 40k on the 50 grid, same seed (n = 8).

- **GEOMETRIC** if α ≥ 0.75 **and** ≥ 75% of twin ratios (6/8) are ≥ 1.5.
- **ECOLOGICAL** if α ≤ 0.25 **and** ≤ 25% of twin ratios (2/8) are ≥ 1.25.
- **MIXED** otherwise, sub-case named: *sub-linear scaling (α = …)* if 0.25 < α < 0.75 — more room buys more
  niches but less than proportionally; *rule disagreement* if the pooled exponent and the per-seed twins point
  different ways. A sub-linear verdict carries a **fill caution** if the 71 grid's population density (pop/cells)
  at 40k is < 80% of the 50 grid's: then "not yet filled" (a horizon effect) cannot be excluded and the verdict
  is not read as ecological.
- **Collapse** (secondary): mean fraction-of-cap (stable ÷ cells/18.3) at 40k per size; COLLAPSE if the
  largest gap between sizes is ≤ 0.10; NO COLLAPSE otherwise. Reported, does not enter the main verdict.
- **Reach** (separate question): REACH UNLOCKED if the mean max key reach at 40k on any grid of area ≥ 2×
  exceeds the 50-grid mean (4–6 in finding 11) by ≥ 2; REACH PINNED otherwise.

Falsifier for my bet below: ECOLOGICAL, or MIXED with α < 0.5.

## 5. My bet, written down so I can be wrong

**GEOMETRIC**, α in 0.8–1.0: the finding-11 climb is the world filling cells with ~18-organism keys, and a
grid with twice the cells holds roughly twice the niches at the same tick. **REACH PINNED**: more room does not
buy reach, because reach is priced by program composition (every extra unit of L1 needs an instruction), not by
space. Secondary: COLLAPSE — the fraction-of-cap curves lie within 0.10 of each other.

My last two bets (STALL, then CEILING) both under-estimated the system. This one bets *with* the system
(room is the only limit I can see). If it is wrong in the ecological direction, the law has an intrinsic niche
count and the obvious next question is what sets it (STABLE_AGE? the crowd balance? LEN_MAX?). The rules above
are fixed regardless.

## 6. Cost and stop rule

Hard budget **≤ 25 CPU-min** at nice 19; the gateway must stay responsive (`/proc/pressure/cpu` avg10 checked
before launch and during; pause if > 50). Estimates from the baseline (68 CPU-s per 100k on 50×50, cost ∝
population, population grows through the run): 50×50 to 40k ≈ 20 CPU-s; 61 ≈ 30; 71 ≈ 40; 87 ≈ 60. Shard A =
8 × 61 + 4 × 87 ≈ 480 CPU-s; shard B = canary (~30) + harness (~20) + 8 × 71 ≈ 370 CPU-s. **Total ≈ 14 CPU-min**,
leaving a 1.7× margin for the kind of estimate miss finding 11 had.

**Stop rule, fixed now:** after the first completed world at each size, project the total from measured CPU-s.
If the projection exceeds 22 CPU-min, the 87 arm is dropped (→ three sizes, α on 50/61/71). If still over,
the 61 and 71 arms are cut to the first 6 seeds (twin thresholds become 5/6 and 1/6). Any cut is written here as
an amendment with the worlds already seen disclosed, before the merged scorer is run.
