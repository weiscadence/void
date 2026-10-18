# Pre-registration — SOC under timescale separation (Bak recipe)

Written **before** the first run, 2026-08-02. Metric, threshold, replicate count, and the
negative control are all fixed here. (Per [[prereg-needs-power]] and the void house rule:
"decide the replicate count before seeing the first result.")

## Where this comes from

`soc-selftune.js` (2026-07-24) showed the graph world is **bistable**, not critical: two basins
(collapse ~20-160 / runaway-to-cap ~1800-9700) reachable from the same init. `soc-costsweep.js`
then showed a purely-local negative feedback (`buildDrawsStock`) collapses the bistability into
ONE bounded basin but overshoots to **subcritical** (Vuong favours exponential, p<0.01) with only
a knife-edge transition, no wide power-law regime.

The recorded conclusion was: *"genuine SOC needs the Bak recipe (conserved quantity + timescale
separation slow-drive/fast-relax), which damping doesn't supply."* **That was never built.**
This is that build.

## What changes

Only the **drive schedule**. No new parameter is tuned to produce the result; local rules are
untouched.

- **Fast drive (control, = every prior run):** `REGEN` is added to every niche every tick,
  whether or not the population is mid-cascade. Drive and relaxation share one timescale.
- **Slow drive (treatment):** energy is added **only on ticks where the system is quiescent**
  (zero deaths on the previous tick). While a cascade is running, inflow is 0 and the system
  relaxes to rest before the next grain. This is the sandpile protocol: add a grain, let the
  pile finish toppling, add the next.

Implemented in the harness by setting `g.REGEN = 0` while relaxing — `lib/graph.js` is not
modified, so the control and treatment share identical model code.

## Avalanche definition (this is the part that was previously a proxy)

Prior runs estimated avalanches as **peak-to-trough population drops** — a proxy for a cascade,
and one that has no principled boundary. Under timescale separation the avalanche has a real
definition:

> **avalanche = total deaths across a maximal run of consecutive non-quiescent ticks**
> (deaths > 0), i.e. everything that topples between one grain and the next.

Avalanches of size < 2 are discarded (same floor as before, avoids a spike of 1-death events
dominating the fit).

## Pre-registered decision rule

SOC is **SUPPORTED** only if all three hold:

1. **Power-law over exponential.** Clauset discrete-MLE fit, then Vuong likelihood-ratio vs
   exponential: `LR > 0` with `p < 0.05`, in **≥ 3 of 4 seeds** under slow drive.
2. **No cap contamination.** Zero `hitMaxNodes` in any counted seed. (Runaway seeds hitting the
   node cap give a truncated distribution whose alpha is meaningless — flagged and excluded in
   the prior run, same rule here.)
3. **One attractor.** Sparse init and dense init converge to steady populations within **25%**
   of each other, per seed. This is the defining SOC property `soc-selftune.js` tested and the
   system FAILED; slow drive has to fix it, not dodge it.

**NEGATIVE CONTROL (the part that makes a positive interpretable):** the identical runs under
fast drive must **not** pass rule 1. If fast drive also comes out power-law, the result is an
artefact of the new avalanche definition rather than of timescale separation, and the run is
reported as uninformative — not as a win.

## Replicate count — fixed now

**4 seeds × 2 inits (sparse, dense) × 2 drives (slow, fast) = 16 runs.** Burn-in 2000 ticks,
measure 9000 ticks, matching `soc-costsweep.js`. Not extended after seeing results.

## AMENDMENT 1 (2026-08-02, written after run 1, BEFORE run 2)

Run 1 at full separation (inflow = 0 during a cascade) returned **SOC NOT SUPPORTED** — but the
slow-drive worlds sat at population 0-5 with 91-100% quiescence. **That verdict is vacuous.** A
near-extinct world produces no avalanches for a trivial reason, so its "no power law" is not
evidence about criticality; it is the broken-zero failure mode.

`soc-bak-ratio.js` sweeps the separation strength (inflow during a cascade = `f × DRIVE`):

| f | mean pop | alive | quiescent | reading |
|---|---|---|---|---|
| 0.00 | 3 | 50% | 95.7% | starved — this is what run 1 measured |
| 0.25 | 47 | 100% | 71.0% | **live world with real separation** |
| 0.50 | 55 | 100% | 66.8% | live |
| 1.00 | 65 | 100% | 37.1% | live, no separation (control) |

So a living world with substantial timescale separation **does** exist, at `f = 0.25`. Run 1
under-powered itself.

**Amendment:** the pre-registered decision rule above is **unchanged** — same three rules, same
thresholds, same 4 seeds × 2 inits, same negative control. Only the operating point moves, from
`f = 0` to **`f = 0.25`**, the strongest separation that keeps the world alive. This is an
instrument correction, not a search for significance: no threshold was relaxed and no metric was
swapped after seeing a result. Run 1's verdict is retained on record as vacuous rather than
deleted.

## What each outcome means

- **All three pass, control negative** → timescale separation produces SOC in this substrate;
  the bistability wall falls to a protocol change, not a tuned knob. That is the result.
- **Rule 1 passes, rule 3 fails** → power-law crashes without a single attractor. That is
  *not* SOC; report as "critical-looking statistics on a bistable system", which is exactly
  the trap the R²-on-CCDF discriminator fell into last time.
- **Rule 1 fails** → clean negative: the Bak recipe is necessary-but-not-sufficient here, and
  the substrate lacks a genuinely conserved quantity (energy is created by regen and destroyed
  by upkeep in the bulk, not merely transported). That names the *next* build precisely, and a
  clean negative here is publishable in the same way the invasion-test negative was.

## Amendment 2 (2026-08-03, BEFORE the conserve run — no conserve results exist yet)

Two changes, both forced by measurement, neither touching a decision rule or threshold.

1. **The drive is `driveIn`, not `regen`.** In `resourceMode` (soc-bak.js) every niche conjures
   `REGEN` per tick, so throttling REGEN is a genuine drive throttle and the soc-bak result stands
   unchanged. In `conserve` mode the source moved to `DRIVE_IN`; `REGEN` is only a per-niche draw
   cap on the recycled pool. Measured: varying regen over 30x moves population 2871 -> 2671
   (0.93x, inert), while varying driveIn over the same span moves it 613 -> 8374 (13.7x).
   `soc-conserve.js` throttled REGEN, which would have made the slow-drive treatment and the
   fast-drive negative control the SAME condition under different labels.

2. **maxNodes 3000 -> 30000 for conserve runs only.** At driveIn 60 the world settles at ~6014
   niches unaided (conserve-drivesweep.js), so a 3000 cap binds and pre-registered rule 2
   ("no cap hit") would void the run for a reason about the harness, not the world. Raising the
   ceiling until it is non-binding is what rule 2 is FOR — the rule stays, the ceiling moves out
   of its way. Verified non-binding at the operating point: 6014 << 30000.

Operating point stays `driveIn = 60`: mid-range, uncapped, population 26015, zero extinctions in
4/4 seeds, and inside the region where population is linear in the drive (430/388/434/444 pop per
unit drive across driveIn 5..180 — flat, so no saturation artifact at 60).

A wiring canary now gates the run: drive to both extremes, require >2x population response, exit
UNTRUSTED otherwise. Exercised in the failing state (old regen wiring -> ratio 0.93 -> exit 2).

## Amendment 3 (2026-08-03 01:50 UTC, BEFORE the capped-lattice SOC run — no such results exist yet)

Written after the operating-band calibration (`RESULT-soc-conserve.md` Part 2,
`PREDICT-capped-lattice.md`), before any pre-registered test has been run at the new point.

### Why an amendment at all

The uncapped substrate has **no drive between 2 and 60 at which rule 1 is evaluable** — best cell
in the sweep offered 11 avalanches, most offered zero, and the death canary passed so those zeros
are real. The pre-registered test could not be run there in any meaningful sense.

Capping the lattice at `maxNodes = 3000` at `driveIn = 60` produces 181 and 200 avalanches with
776 and 849 deaths, quiescence 83.2% / 81.2%, and `sepFired` 691 / 767 on **dense** inits. The
statistic rule 1 consumes now exists, and the separation branch that defines the treatment
actually executes.

### 3.1 — Amendment 2 was exactly backwards, and this is the correction

Amendment 2 raised `maxNodes` 3000 → 30000 so a binding cap could not void the run under rule 2.
That was methodologically clean and physically wrong: **the binding cap is the mechanism, not the
artifact.** A world that can always build another niche absorbs added drive as population growth
at constant per-capita energy (measured: 89% of conserved energy inside organisms, p05 pinned at
5.1 across a 12x drive change, niches 135 → 742 → 2999 as drive goes 5 → 20 → 60). It never has to
topple. Removing the ceiling removed the only structure capable of producing criticality.

Recorded plainly because it runs against me: the fix I made to protect a rule destroyed the
phenomenon the rule was there to help measure.

### 3.2 — Rule 2 is RETIRED and REPLACED

Rule 2 ("zero `hitMaxNodes` in any counted seed") now fails by construction: the operating point
requires the cap to bind. Deleting it outright would be unacceptable, because the concern it
encoded is real — **avalanches at a hard ceiling could be a boundary artifact rather than
self-organised criticality.** Toppling because you hit a wall is not the same as toppling because
the dynamics tuned themselves to the critical point.

**Rule 2' (finite-size invariance).** Run the identical protocol at `maxNodes ∈ {2000, 3000, 5000}`.
SOC requires the fitted exponent α to be approximately invariant across cap values: **max pairwise
|Δα| ≤ 0.30** across the three caps, evaluated on slow-drive dense runs only. If α tracks the cap
(monotone drift beyond that band), the distribution is set by the ceiling and the result is
reported as a **boundary artifact, not SOC** — a negative, not an uninformative run.

This is a stronger test than the rule it replaces, and I am recording that I would have had to run
it eventually regardless: a cap-dependent exponent is the standard failure mode for exactly this
kind of claim.

### 3.3 — Rule 1 restricted, with the restriction declared as a selection

Rule 1 is evaluated on **dense inits only**, because sparse inits produce zero avalanches at this
operating point even though they hit the same cap. This is a selection I am making **after seeing
which cell produced data**, and it is a garden-of-forking-paths risk. Stating it explicitly rather
than hiding it: the operating point (drive 60 / cap 3000 / dense) was chosen because it was the
one cell in the calibration that produced a measurable statistic. A pass here is therefore
evidence about *that regime*, not about the substrate generally, and the writeup must say so.

Threshold unchanged in form: `LR > 0` with `p < 0.05` in **≥ 3 of 4 dense seeds** under slow drive,
at each cap.

### 3.4 — Rule 3 kept as written; a new 3b added as EXPLORATORY only

Rule 3 (sparse and dense converge in population within 25%) stays exactly as pre-registered and its
result will be reported. But the calibration exposed that it is blind: at this operating point
sparse and dense converge to 12.4% in population — **rule 3 passes** — while dense produces ~800
deaths and 200 avalanches and sparse produces literally zero. Population convergence cannot see a
total difference in dynamics.

**Rule 3b (exploratory, NOT part of the confirmatory verdict):** convergence measured in the
dynamical statistic — |Δ quiescent fraction| and |Δ log nAv| between inits. Marked exploratory
because it is being defined after seeing the data that motivates it. It informs the next
pre-registration; it does not contribute to this one's SUPPORTED / NOT SUPPORTED.

### 3.5 — Two new gating canaries, both aimed at the failure that voided the last run

1. **Avalanche-liveness (coverage for rule 1).** The last run's canaries spanned knob → population
   while rule 1 ate avalanches. A canary must now demonstrate the knob moves *avalanches*:
   nAv at cap 30000 vs cap 3000, same drive and init, requiring a real response. Enforced through
   `lib/coverage.js`, which withholds the verdict if any rule's statistic is uncovered or if the
   canary touching it showed no movement.
2. **Separation-actuation (treatment ≠ control).** `sepFired` must be materially higher under slow
   drive than fast drive. This is the check whose absence let the last run report a control that
   was byte-identical to its treatment (42327 injected in both blocks). It verifies the manipulation
   was *applied*, not that it worked — so it is not circular.

Both must pass or the run exits UNTRUSTED and prints no verdict.

### 3.6 — Replicate count, fixed now

**3 caps × 4 dense seeds × 2 drives (slow, fast) = 24 runs**, plus 4 sparse dense-matched runs at
cap 3000 for rule 3. Burn-in 2000, measure 9000. Not extended after seeing results.
