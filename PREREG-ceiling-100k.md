# Pre-registration: is there any ceiling under the continuous law?

**Written 2026-10-18 09:11 UTC, before the run.** Script frozen at `ceiling-100k.js` sha256
`ace0f7dfbf020f3828d1b8685399826c658a31128daa307e0cb4b1918d100332`. Engine `lib/open.js` sha256
`c5ec2078936017f56c36d0751056964478e34e87df7ccf902f177258456ceaf4` (unchanged since the commitment-time
prereg); `break-fixed-point.js` `5e538a9a…b47e` (unchanged; its `makeSim` is reused so the arms are built
exactly as in finding 10). The only runs before this file existed: one timing probe (seed 1007, CROWD 6.1, to
20,000 ticks: 5.0 s, pop 813 → 1,061, stable 59 → 80) used to size the budget, and one smoke test at
`H=6000` on seeds 1013/1113 to check the script executes and every field is populated. Neither is read as
evidence; seed 1007 is not in the experiment.

## 1. The question

`RESULT-break-fixed-point.md` removed the integer fixed point and turned frozen worlds into climbers that
were still rising at 30,000 ticks. The notebook's old claim "no world is unbounded" (climbers capped at
74–105 by 40k) was measured under the integer law and is now **untested**.

> Under the continuous law — CROWD = 6.1 (A1) or CROWD = 6 with real-valued ±5% harvest noise (A3) —
> does the count of stable niches saturate, slow logarithmically, or keep rising linearly by 100,000 ticks?

## 2. Design, fixed now

- **16 fresh seeds** `1013, 1113, 1213, …, 2513` (none used in any prior void run; prior runs used
  `107…807` and the replay forks). Horizon **H = 100,000**, config `{tol:2, construct:true,
  stableAge:400, menuSize:0}`, both arms on all 16 seeds. The two arms are run as two parallel processes
  (one per vCPU) at nice 19; the CPU-minute total is the same as serial.
- **Sampled every 1,000 ticks:** stable niches, distinct niches, population, mean program complexity,
  max key reach (max L1 norm of a living key — the "max trait"), cumulative distinct keys ever observed at a
  sample ("vocabulary ever"), births, deaths. The **climb curve** is the running max of stable niches.
- **Canary (A0).** Original law (CROWD 6) on known-frozen seeds **207 and 307** to 20,000 ticks. Both must
  halt (0 births, 0 deaths in the last 10,000) with ≥ 90% of exposed keys at crowd 18. Any miss → the
  whole run is **VOID** and no verdict is read. (Fresh seeds cannot serve as this canary: ~45% of seeds
  are climbers under the original law and would not be expected to halt.)
- **Decoy (A2).** CROWD = 5 (integer balance 15) on six fresh seeds `1013…1513` to 30,000 ticks. PASS if at
  least one halts and every halted world has ≥ 90% of exposed keys at crowd 15; FAIL if a halted world
  sits elsewhere; INCONCLUSIVE if none halt (reported as a weakened control, not hidden). Finding 10 saw
  4/8 halt by 30k, so P(no halt in 6) ≈ 2%.

## 3. "Ceiling", operationally

A world has **plateaued at cutoff W** if `max(stable niches over the last W ticks) ≤ max(stable niches
before tick H−W) + 2`. The +2 is the noise band: under a breathing law a held key can flicker in and out of
the stable count by one or two without any climb. Cutoffs **W = 20k, 30k, 40k**. The strict version (+0)
is reported alongside. Per world I also report the slope of raw stable niches over the last 20k ticks
(least squares, niches per 10k ticks) and the tick of the all-time max.

**Curve shape.** The pooled mean running-max curve (16 seeds) from tick 5,000 to 100,000 (96 points) is
fit with three two-parameter models: linear `a + b·t`, logarithmic `a + b·ln t`, saturating
Michaelis–Menten `S·t/(t+K)`. Report RSS, AIC, mean residual in each third of the horizon (sign structure),
the winner, and ΔAIC to the runner-up. Also fit per seed and count which model wins how often. The raw
mean curve (not running max) gets the same fits as a check that the running-max transform did not
manufacture the shape. A ΔAIC under ~4 between the top two is reported as "not separable at n = 16", not
as a winner.

**Structural reference.** The grid has 2,500 cells; at the continuous balance crowd (~18.3) that caps stable
niches near **137** if every organism sat in a held key. An asymptote S well below 137 would be an
*ecological* ceiling; S near or above it would mean the climb is running into the grid, not into ecology.
Program complexity is bounded by `LEN_MAX = 24` and key reach by `CAP = 24` per register (L1 ≤ 72) —
these are hard structural bounds, reported as context.

## 4. Rules, before the numbers (scored separately for A1 and A3, 16 seeds each)

- **VOID** if the canary fails. **VOID-MECHANISM** if any world halts under a continuous law (that would
  reopen finding 10 itself).
- **CEILING** if ≥ 12/16 seeds plateau at the 20k cutoff AND the pooled running-max fit prefers the
  saturating model.
- **NO CEILING SEEN** if ≤ 4/16 plateau at 20k AND the pooled fit prefers linear or log.
- **MIXED** otherwise, with the sub-case named (plateaus but non-saturating curve; saturating curve but few
  plateaus = slow approach, not a reached ceiling; or neither).
- The 30k and 40k cutoffs are reported for every world but do not enter the verdict rule; they are there
  so the reader can see how much the verdict depends on the choice of window.

Falsifier for the bet below: NO CEILING SEEN in either arm.

## 5. My bet, written down so I can be wrong

**CEILING in both arms, saturating, asymptote 110–140**, i.e. at or just under the grid's structural cap:
the climb of finding 10 is the world filling 2,500 cells with ~18-organism keys, and it runs out of cells,
not of ideas. Secondary bet: A3 (noise) sits a little higher than A1 because the noise occasionally lets a
key hold at 17. If instead the curve is still rising linearly at 100k with no plateaus, the continuous law
is open-ended on this grid at this horizon and the next experiment is a bigger grid. If it is logarithmic
(slowing without a visible asymptote), that is the honest "cannot tell at 100k" and I will say so.

Yesterday my bet (STALL) was wrong in the direction of under-estimating the world. I am aware that may bias
me toward over-estimating it today; the rules above are fixed regardless.

## 6. Cost

Measured 5.0 s per 20,000 ticks at pop ~1,000 and rising with population. Estimate ~40 s per 100k world →
32 treatment worlds ≈ 21 CPU-min, canary (2 × 20k) + decoy (6 × 30k) ≈ 1 CPU-min; **~22–25 CPU-min
total**, under the 30-minute budget, so the full 16 seeds run. If the first two A1 worlds exceed 70 s
each, I stop and re-plan at 12 seeds in an amended prereg before any result is read.
