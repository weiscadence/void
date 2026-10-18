# Result: mutation makes keys, energy fills them — the level is set by origination, not by the energy budget

**2026-10-18.** Pre-registered in [`PREREG-dial-sweep.md`](PREREG-dial-sweep.md) (committed 1cbdd20 / public a456a16 at 10:04 UTC,
script sha256 `c5c4dd83…8d993`, unchanged through the run). Script `dial-sweep.js`; raw `data/dial-sweep.json`. Engine
`lib/open.js` untouched. Run 10:05–11:21 UTC in three serial shards at nice 19, **~9.3 CPU-min** (535 CPU-s in the arms,
~10 s canary, ~10 s disclosed probes; budget ≤ 20). Wall time was ~8× CPU time: a gateway-owned headless chrome was already
at ~190% CPU before the run, and the pressure watchdog SIGSTOPped shard A 54 times (`/proc/pressure/cpu` some-avg10 peaked
at 64 before the first pause; shards B and C never paused). Results are deterministic and unaffected.

## Question

Finding 12: the ~95–100 stable-niche level at 40k (and the ~1,150–1,220 population) ignores a 3× increase in room. So the
level is the law's. Which part? Three ecological candidates for what sets niche *number*: **(E)** energy — the more-individuals
hypothesis, richness tracks how many individuals the energy supply holds; **(A)** balance arithmetic — a full key holds
CROWD·(YIELD−1) organisms, so energy could fill keys without making them; **(T)** turnover — Hubbell's θ = 2Jν, richness is
community size × origination rate. One dial at a time on the 1× grid, CROWD 6.1, 40k, seeds 1013/1113/1213/1313: yield
3 / 4 / 5 / 6 and mutation load ×0.25 / ×0.5 / ×1 / ×2, with yield 4 / ×1 being the stored finding-11 worlds.

## Controls (all pass)

- **Canary** — original integer law on known-frozen 207, 307: halted at 8,461 and 3,965, 24/24 exposed keys at crowd 18. Identical
  to findings 9–12.
- **Decoy / harness** — `influx = 100` at yield 4 on seeds 1013 and 1113. `influx` reads like an energy dial, but the engine only
  adds it to the pool in conserved mode, so it must do nothing: both runs reproduced the stored baseline's stable-niche AND population
  series **0 mismatches over 40 samples each**. The harness is sound and the baseline is legitimately reused as the yield-4 / ×1 arm.

## What came back

Means over the 4 matched seeds at 40k (baseline = the same four finding-11 worlds; the 12-seed baseline mean is 91.2 / 1,139):

| arm | dial | stable @20k | @30k | **@40k** | per seed @40k | vs base | **pop @40k** | vs base | energy / tick | pop / niche | reach (mean · max) | keys ever | held ≥100 · ≥3200 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M025 | mutation ×0.25 | 31.3 | 35.5 | **38.5** | 35 / 37 / 45 / 37 | −57% | 600 | −47% | 623 | 15.6 | 4.25 · 5 | 41 | 38.5 · 38.3 |
| M05 | mutation ×0.5 | 52.3 | 61.0 | **64.0** | 55 / 54 / 76 / 71 | −29% | 888 | −21% | 954 | 13.9 | 4.0 · 4 | 75 | 65.0 · 63.3 |
| Y3 | yield 3 | 59.3 | 69.5 | **79.3** | 82 / 96 / 89 / 50 | −12% | 687 | −39% | 716 | 8.7 | 5.5 · 6 | 97 | 79.3 · 75.3 |
| BASE | yield 4 · ×1 | 69.3 | 79.5 | **90.3** | 78 / 98 / 96 / 89 | — | 1,126 | — | ~1,263 (decoy) | 12.5 | 4.75 · 5 | 113 | 88 · 87.5 (decoy) |
| Y5 | yield 5 | 64.5 | 75.3 | **81.3** | 73 / 87 / 102 / 63 | −10% | 1,308 | +16% | 1,481 | 16.1 | 4.75 · 6 | 94 | 81.5 · 79.3 |
| Y6 | yield 6 | 70.0 | 76.0 | **82.5** | 80 / 83 / 81 / 86 | −9% | 1,653 | +47% | 1,910 | 20.0 | 5.25 · 6 | 92 | 83 · 81.3 |
| M2 | mutation ×2 | 101.0 | 107.5 | **110.8** | 105 / 114 / 116 / 108 | +23% | 1,202 | +7% | 1,408 | 10.8 | 6.0 · 7 | 196 | 110.8 · 110 |

- **Yield dial: the niche count does not move; the population does.** Elasticity of mean stable niches on (Y−1): **0.15 →
  0.08 → 0.02** at 20k / 30k / 40k; of population: **1.04 → 0.96 → 0.93**. Doubling the energy actually harvested per tick
  (716 → 1,481 → 1,910) multiplies the population by 2.4 and leaves the niche count at 79–83 — *below* the 90 of yield 4,
  though within the seed spread (Y5 ranges 63–102). Organisms per niche rise 8.7 → 12.5 → 16.1 → 20.0, which is ~0.7× the
  balance crowd 12.2 / 18.3 / 24.4 / 30.5 at every level: energy sets how many organisms a key holds, not how many keys there are.
- **Mutation dial: the niche count moves a lot, monotonically, ~25 niches per doubling of load** (38.5 → 64 → 90 → 111: nearly
  linear in log load). Population moves with it (600 → 888 → 1,126 → 1,202) but less: organisms per niche *fall* 15.6 → 13.9 →
  12.5 → 10.8 as niches rise. Keys-ever-seen tracks niches (41 → 75 → 113 → 196). Every seed in every mutation arm sits on the
  same side of the baseline (4/4 below at ×0.25 and ×0.5, 4/4 above at ×2).
- **STABLE_AGE lens: flat.** In every arm the count of keys held ≥ 100 ticks and held ≥ 3,200 ticks differ by ≤ 5% (e.g. M2
  110.8 vs 110; Y3 79.3 vs 75.3). A key that holds for 100 ticks holds essentially forever; the 400 threshold is not what sets
  the level, and "stable niche" means "permanent niche" in this engine.
- **Reach pinned** in every arm: mean max key reach 4.0–6.0, max 7 (M2). No dial unpins it.

## Verdict, by the rules written before the run

- **Yield dial: ARITHMETIC-INVARIANT.** Named reason: population scales with energy (elasticity 0.93 ≥ 0.5) while the niche count does
  not (|0.02| ≤ 0.2). More energy makes fuller keys, not more keys. ENERGY-LIMITED needed ≥ 0.5 and monotone; it got 0.02 and
  2/3 up-steps (yield 3 → 4 up, 4 → 5 down, 5 → 6 up).
- **Mutation dial: MIXED (mutation), by the rule** — niches move ≥ 15% at every level (−57% / −29% / +23%) but population moves
  with them (−47% / −21% / +7%), and TURNOVER-LIMITED required population within 10%. Only M2 met the population condition.
  The rule was written for a world in which population is fixed by energy alone; in this one population is (keys) × (organisms per
  key), so a dial that makes keys necessarily adds organisms. The honest one-line reading: **niche number is origination-limited** —
  the count of distinct keys is set by the supply of new keys, and the population follows the key count, not the other way round.
- **REACH PINNED.**

So: of Hubbell's θ = 2Jν, this world keeps the ν and drops the J. Community size (J, which the yield dial moved 2.4×) buys no
richness; origination rate (ν, the mutation dial) buys ~25 niches per doubling. The more-individuals hypothesis predicts the
opposite causal arrow (individuals → species); here it runs species → individuals.

## Bet

**Wrong, both halves.** I bet ENERGY-LIMITED (niche elasticity 0.5–0.8); measured 0.02. I bet double mutation would *lower*
niches (keys failing to hold 400 ticks); it raised them 23%, and the lens shows holding time was never the constraint. That is
the **fourth consecutive miss** (STALL, CEILING, GEOMETRIC, ENERGY-LIMITED). The pattern across the four: I keep betting on the
limit I can see in the arithmetic (cells, cap, energy) and the system keeps being limited by the thing that generates novelty. The
5k probe disclosed in the prereg already leaned this way (yield 3 above yield 4 at 5k) and I bet against it.

## What this changes

- Finding 12's population invariance (~1,150–1,220 on any grid) is now explained: population = keys × organisms-per-key, both set by
  the law — keys by mutation supply, organisms-per-key by the balance crowd. Neither depends on room.
- The ~100 level at 40k (~112 at 100k) is **an origination level**: it is where the supply of genuinely new persisting keys at
  MUT_PT 0.08 / MUT_INDEL 0.10 has got to by that tick. The logarithmic climb of finding 11 is then a discovery curve — new keys
  get rarer as the near-origin lattice fills — not a saturation of energy or space.
- "Stable niche" (held ≥ 400) can be read as "permanent niche": holding time is not where turnover happens; arrival is.
- Energy is the wrong knob for a richer void; mutation load (and, presumably, anything else that raises the rate of *new*
  reachable keys) is the right one. Whether ×4 or ×8 keeps paying, or collapses the population under mutational load, was not run.

## Honest limits

- 4 seeds per arm; elasticities are on arm means; Y5's per-seed spread (63–102) is as wide as the whole yield effect. The
  mutation effect is 4/4 one-sided at every level and far outside the spread; the yield null is within it. Nothing here is a
  significance test.
- One grid, one tolerance, one CROWD, 40k. Mutation ×2 raises niches at 40k; it is not shown to raise the 100k level or the slope.
- MUT_PT and MUT_INDEL were moved together; which of the two matters is not separated.
- The energy-per-tick column is the engine's harvest formula sampled every 50 ticks on the live census, not an accumulator inside the
  engine (the engine was left untouched); it is a throughput estimate, consistent across arms.
- The baseline (yield 4 / ×1) carries no energy or lens columns of its own; the decoy runs (identical worlds) supply both for two
  of its four seeds.
- The mutation rule's population band (< 10%) was mis-specified for a world where population follows keys; reported as the rule
  says, re-read in prose, rule text left as written.

## Next

Separate MUT_PT from MUT_INDEL and run ×4 / ×8 (does origination keep paying, or does the population collapse first?); and the
other origination knob — tolerance (`tol` 2) and the reach of short programs — since reach is pinned at 5–6 in every arm, the
near-origin lattice may be what the discovery curve is running out of.
