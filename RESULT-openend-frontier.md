# RESULT — Open-endedness frontier: no world is unbounded; fate is bimodal & path-dependent (2026-08-13)

**Question (Jiggy's north star):** does the open-vocabulary + niche-construction engine (`lib/open.js`)
— "code that makes unique code" — sustain an unbounded complexity climb, and if not, what caps it?
Prior belief ([[open-vocabulary-breaks-plateau]], 2026-07-24): "sustained climb to 40k ticks,
20–40× past every prior plateau, still rising." Run 5× longer with per-seed discipline, that belief
does **not** survive as stated.

## Setup
`openend-frontier.js` — 3 arms, 200k ticks, log-spaced checkpoints, median across seeds, plus a
genome-length-cap probe. `highseed-longevity.js` — the two highest 40k-seeds run to 200k.
`fate-distribution.js` — 16 seeds to 40k, sorted, to see if fate is bimodal or a continuum.
Config: `{tol:2, construct:true, stableAge:400, menuSize:0}` (same as the original result).

## Findings

**1. No seed is unbounded — every world's cumulative novelty (C) eventually plateaus.**
- Seed 1 (a high-climber): stable/C 105→112→112→112→**113** across 40k→200k. Flat by ~80k.
- Seed 4 (a high-climber): 103→…→112→117→**118** at 200k — still creeping, but sharply decelerating.
- The frozen seeds settle by ~10k and never move.
So the honest answer to "where does the climb end?" is: **it always ends.** Even cumulative
ever-stable structure (which has no length cap) saturates.

**2. Fate is bimodal / strongly path-dependent — this is the real result.**
16 seeds, sorted stable-niche count @40k:
`39, 41, 41, 42, 44, 46, 50, 52, 58, | 74, 87, 88, 95, 100, 103, 105`
- **~55% freeze early** at a LOW ceiling (~40–58), by ~10k ticks.
- **~45% catch a slow high climb** to a HIGH ceiling (~74–118), reached ~80k+.
- There is a **gap** between the clusters (58 → 74), i.e. two basins, not a smooth ramp.
- **Complexity cleanly separates the fates:** frozen worlds sit at progComplexity 2.2–2.8;
  climbers at 3.0–3.8. The two fates have distinct signatures — early complexity may predict/cause
  which basin a world falls into.

**3. The freeze is dynamical, NOT a structural cap.** Doubling the genome-length limit (LEN_MAX
24→48) changed nothing: identical C=50, progComplexity at 5–11% of the ceiling. Worlds that freeze
stop exploring with enormous unused headroom.

**4. The open-vocabulary mechanism is still real.** Open beats the capped-menu control (menu-12)
7–15× on stable structure in every seed (menu freezes hard at C=7). The wall moved; it just didn't
disappear.

## What this corrects
The 2026-07-24 "20–40× sustained climb, still rising at 40k" caught the lucky ~45% of worlds
mid-climb, before their (higher, later) plateau, and reported a **mean over a bimodal set**. Both
that mean and my own first frontier read (a median of 3 seeds that landed on a frozen world) are the
same error: a single summary stat on a spread-out/bimodal distribution. See [[one-row-owns-the-mean]],
[[median-is-broken-for-binaries]]. The mechanism claim survives; the "unbounded/sustained
open-endedness" claim does not.

## The real frontier (unsolved, and now well-posed)
Not "does it plateau" (it does, everywhere) but: **what tips a world into the high basin vs. the low
one, and can that lever be set so every world catches the high climb — or never stops?** The clean
prog-signature split (2.2–2.8 vs 3.0–3.8) is the first handle: does early complexity *cause* the
basin, or just correlate? That's the next experiment — perturb early complexity and watch fate.

Data: `data/oe/frontier-200k.json`, `/tmp/highseed.log`, `/tmp/fate.log` (raw).

## Steering follow-up (2026-08-13) — the driver is EXPLORATION, not complexity; and it's a known law
`leading-indicator.js` (24 seeds): the earliest/strongest separator of high vs low fate is
EXPLORATION breadth (distinct keys discovered by t2000: 1.34x H/L), NOT progComplexity (weakest,
1.16x). Complexity is downstream. `intervention-sweep.js` (mutation multiplier × 16 seeds/level):
raising the exploration knob raises the alive-fraction monotonically — 0.5×→0%, 1×→44%, 1.5×→69%,
2×→94%, 3×→94% (saturates; error-catastrophe cliff is past 3×, not reached). So early exploration
is CAUSAL and steerable. **Honest framing: this is novelty search (Lehman & Stanley ~2011) +
Eigen's error catastrophe (1971) — established theory, not a discovery. Our contribution is only a
clean runnable testbed.** Shipped as interactive demo: drainfun.xyz/void/spark (`spark.html`,
`data/spark-data.json`). VOID THREAD PARKED here (Jiggy's call) — well-trodden ALife ground, no income.
