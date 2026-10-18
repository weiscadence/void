# Pre-registration: what sets the ecological level? one dial at a time

**Written 2026-10-18 10:04 UTC, before the run.** Script frozen at `dial-sweep.js` sha256
`c5c4dd83ea4c9ac1377eb80b9d9fd4d33774a0f797303230db6d7f130098d993`. Engine `lib/open.js`
`c5ec2078…56ceaf4` (unchanged since the commitment-time prereg). `ceiling-100k.js` `5adfe7ce…8074` (its `runWorld`
and A0 arm reused for the canary). Baseline `data/ceiling-100k.json` sha256 `13f2ede2…524e1` (the finding-11 run).

Runs before this file existed, disclosed and not read as evidence: (a) a 5k-tick timing probe on seed 1013 at yield
3/4/5/6, mutation ×2 and ×0.5, and influx 100 — CPU 0.86/0.87/1.95/2.47/1.28/0.79/0.80 s; stable niches at 5k
47/37/53/62/56/30/37, pop 453/568/953/1,158/692/478/568 (influx 100 reproduced yield 4 exactly, as the code says
it must); (b) a 2k smoke test of the script on seed 1013 (decoy identical to the baseline over 2 samples; Y3 39
niches / 403 pop, M2 50 / 662 vs baseline 33 / 546 at 2k). Early counts are founder-patch effects (finding 12 saw
the same at 5k) and say nothing about 40k; I record them because I saw them, and note the 5k yield-3 count was
*above* yield 4 — against my bet below.

## 1. The question

Finding 12: the ~95–100 stable-niche level at 40k (and the ~1,150–1,220 population) ignores a 3× increase in room.
The level is the law's. What in the law sets the NUMBER of niches, as opposed to the number of individuals?

Ecology's candidates (searched today; Brave returned Storch et al. 2018 "more-individuals hypothesis", Hurlbert &
Jetz 2010 "more than more individuals", Furness et al. 2021 individual-based test, Chow et al. 2004 Avida
productivity–diversity; one query 429'd; all treated as untrusted pointers, not authority):

- **(E) Energy / more-individuals.** Richness tracks the number of individuals the energy supply can hold.
  Prediction here: raise total energy input and niches rise WITH population.
- **(A) Balance arithmetic.** A full key holds CROWD·(YIELD/UPKEEP − 1) organisms (12.2 / 18.3 / 24.4 / 30.5 at
  yield 3/4/5/6 with CROWD 6.1). If population ∝ energy and crowd-per-key ∝ energy, the niche COUNT is invariant
  to energy: population moves, niches do not. (This is what the finding-12 population invariance would predict if
  "~65 full keys × 18.3" is the whole story.)
- **(T) Turnover (Hubbell θ = 2Jν).** Richness ∝ community size × origination rate. Prediction: mutation load
  moves niches without moving population.

The `STABLE_AGE` threshold is a **lens**, not a world dial — the engine reads it only in `stats()`. It is reported as
a curve (stable count at ages 100/200/400/800/1600/3200 at each cutoff) at zero cost, so the reader can see how
much of "the level" is the choice of 400. Lifespan has no dial in this engine (death is energy ≤ 0 only); stated,
not swept.

## 2. Design, fixed now

- 50×50 grid, `{tol:2, construct:true, stableAge:400, menuSize:0}`, **CROWD 6.1**, H = **40,000**, sampled every
  1k. Seeds **1013, 1113, 1213, 1313** (all in the baseline's 12). Serial, nice 19, checkpoint JSON after every world.
- **Yield dial:** Y3, Y5, Y6 (new runs); Y4 = the stored baseline truncated to 40k (`A1_irrational`), matched
  4-seed subset used for every comparison; the 12-seed mean reported alongside. Balance crowds 12.2 / 18.3 / 24.4 /
  30.5 — none integer, so the continuous law is preserved in every arm (an integer balance would re-create the
  finding-10 halt and confound the dial).
- **Mutation dial:** (MUT_PT, MUT_INDEL) × 0.25 / 0.5 / 2 of (0.08, 0.10) = M025, M05, M2; M1 = the baseline.
- **Measured** per 1k: stable niches, distinct, pop, prog complexity, max key reach, keys-ever, births, deaths,
  and **energy actually harvested per tick** (the engine's harvest formula evaluated on the live census every 50
  ticks — the real throughput, not the yield constant). Lens curve at each cutoff.
- Run order: canary, decoy, Y3, M05, M2, M025, Y5, Y6 (the expensive arms last so the stop rule can cut them).

## 3. Controls

- **Canary.** Original integer law (CROWD 6) on known-frozen 207, 307 to 20k must halt with ≥ 90% exposed keys at
  crowd 18. Miss → **VOID**.
- **Decoy / harness.** `influx = 100` at yield 4 on seeds 1013, 1113. `influx` reads like an energy dial, but
  `lib/open.js` only adds it to the pool when `conserveEnergy` is on (line 238), so in this open mode it is inert by
  construction. Both runs must reproduce the stored baseline's stable AND population series **sample for sample**.
  This is simultaneously the decoy (a dial that must do nothing) and the harness check that the stored baseline is
  the same world this script runs. Any mismatch → **VOID**.

## 4. Rules, before the numbers (read at 40k; 20k and 30k reported)

Let the yield points be (Y−1) = 2, 3, 4, 5 and **e_niches**, **e_pop** the least-squares slopes of ln(mean stable),
ln(mean pop) on ln(Y−1) over the arms run. Let **up-steps** be how many of the consecutive yield steps raise the mean
niche count.

- **ENERGY-LIMITED** if e_niches ≥ 0.5 AND e_niches/e_pop ≥ 0.5 AND up-steps ≥ (steps − 1).
- **ARITHMETIC-INVARIANT** if |e_niches| ≤ 0.2 AND e_pop ≥ 0.5.
- **INVERSE** if e_niches ≤ −0.3 (more energy, fewer niches — crowd-per-key wins).
- **MIXED** otherwise, with the failed bands named.

Mutation dial, each arm vs the matched baseline: **TURNOVER-LIMITED** if some arm moves niches ≥ 15% while its
population moves < 10%, and no arm moves both; **MUTATION-INERT** if every arm moves niches < 10%; **MIXED
(mutation)** otherwise, directions named.

Reach: **REACH UNPINNED** if any treatment arm's mean max key reach at 40k ≥ the 12-seed baseline mean + 2;
**PINNED** otherwise.

Small n: 4 seeds per arm. Elasticities are on arm means; per-seed values are in the JSON and the RESULT reports the
spread. Nothing below p-value theatre is claimed.

## 5. My bet, and the record

**Bet: ENERGY-LIMITED on the yield dial** (e_niches 0.5–0.8, e_pop ≈ 1): more energy → more births → more mutant
exploration and more lock-building → more held keys. **And TURNOVER matters:** M2 lowers niches ≥ 15% (keys fail to
hold 400 ticks at double mutation) while population stays within 10% — so the overall picture would be "both E and T,
A false". Falsifier for the yield bet: e_niches < 0.3, or a non-monotone niche sequence. Falsifier for the mutation
bet: M2 within ±15% of baseline, or population moving with it.

Record: my last three bets missed — STALL (worlds climbed), CEILING (no ceiling at 100k), GEOMETRIC (α = 0.07). Two
under-estimated the system and one over-estimated it. The 5k probe already leans against this bet (yield 3 > yield
4 at 5k). I leave it standing because it is what I actually believe about 40k.

## 6. Budget and stop rules

Measured 5k costs (above) scale ~2.6× over a 40k run (finding 12: 18 CPU-s per 50×50 world at yield 4). Estimate:
Y3 4×16, M05 4×15, M2 4×30, M025 4×14, Y5 4×45, Y6 4×60, decoy 2×18, canary ~10 → **~13 CPU-min**, hard cap
**20 CPU-min**. Stop rules, written now: if the first Y6 world exceeds 100 CPU-s, Y6 runs 2 seeds; if the running
total projects past 20 min, drop Y6 entirely and say so. `/proc/pressure/cpu` some-avg10 > 50 → SIGSTOP until it
falls (a headless chrome owned by the gateway was already at ~190% CPU before this run; pressure spikes may be its).

## 7. What each outcome would mean

- ENERGY-LIMITED: the ~100 level is an energy budget; the knob for a richer void is yield, and the population
  invariance of finding 12 was energy invariance in disguise.
- ARITHMETIC-INVARIANT: the level is set by something else entirely — energy fills keys rather than making them —
  and the search moves to the key landscape (reach pinned at 5–6 is then the lead).
- TURNOVER-LIMITED: the level is a birth–death balance of held keys — Hubbell's θ in a grid.
