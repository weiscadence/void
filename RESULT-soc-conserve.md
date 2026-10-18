# RESULT — SOC on the conserved substrate (run of 2026-08-03 00:25Z)

## Verdict: **INVALID RUN. No verdict on SOC.**

The script printed `SOC NOT SUPPORTED on the conserved substrate.` **That line is discarded.**
It is not a negative result; it is a broken zero, and for two independent reasons.

Raw output: `/tmp/job-soc-conserve.log`. Operating point: `driveIn 60`, `MAXNODES 30000`,
separation `f = 0.25`, burn 2000, measure 9000, seeds 1–4, inits sparse/dense.

## Reason 1 — rule 1 failed vacuously

Every one of the 16 runs reported `too few avalanches to fit`, with quiescence 99.8–100.0%.
Rule 1 ("power-law beats exponential in ≥3 slow runs") therefore evaluated **0/0** and was
recorded as FAIL.

A rule that fails because its statistic could not be measured has not tested anything. The
correct reading is *the world produced no avalanches at this operating point*, which says
nothing about whether the dynamics are critical.

## Reason 2 — the negative control was degenerate

The slow-drive treatment throttles the drive **only while an avalanche is in progress**:

```js
const drive = () => { g.DRIVE_IN = slow && last > 0 ? DRIVE * SEP : DRIVE; };
```

With deaths essentially never occurring, `last` is 0 on essentially every tick, so the
throttle branch never executes and the slow-drive condition **is** the fast-drive condition.

This is visible in the output, not merely inferred: sparse seed 2 reports population 42327 in
both the treatment and the control block, and sparse seed 4 reports 42484 in both — identical
to the unit. The control block was re-running the treatment.

So `control fast drive does NOT look power-law : CLEAN` is also vacuous. A control that passes
for the same reason the treatment fails is not discriminating anything.

## The instrument gap that let this print a verdict

Two canaries ran and both passed honestly:

- conservation canary — books balance to 6.86e-15 relative over 600 busy ticks;
- wiring canary — drive ×0.1 → pop 613, ×3 → pop 8374, a 13.7× response.

The wiring canary spans **knob → population**. Rule 1 consumes **avalanches**. Nothing checked
that the knob moved, or that the world ever produced, the statistic actually being fitted. The
run was covered against the failure of the previous night (a knob disconnected from the world)
and uncovered against this one (a knob connected to the world but not to the readout).

This is the same axis I posted publicly about the day before — *a control must span
knob → readout, not just readout* — applied to someone else's positive controls and not to my
own. Recorded here rather than in a lesson file because the concrete instance is the useful part.

## What the numbers do say (not about SOC)

- Population saturates high (~39k–43k) and rule 3 passes cleanly: sparse and dense inits
  converge to within 6.6–7.4% at every seed, well inside the 25% threshold. One attractor in
  population terms is a real observation and survives this run's invalidity, because it does
  not depend on the avalanche statistic.
- Rule 2 passes: no `maxNodes` contamination at 30000, so Amendment 2 did its job.
- Throughput: injected 658380, dissipated 34411, pool 0. Energy is entering and being held in
  organisms rather than cycling — consistent with a world too well-fed to kill anything, which
  is the mechanism behind the ~100% quiescence.

## Next

`soc-conserve-opband.js` — a calibration sweep over `driveIn ∈ {2,5,10,20,40,60}` reporting
mean population, whether the population is still climbing, quiescent fraction, avalanche count,
total deaths, and **how many ticks the separation branch actually fired**. It carries a death
canary (a zero-drive world must record deaths) so that a reported quiescence is provably a quiet
world rather than an unwired counter. It prints no verdict — it is instrument calibration.

If a band exists where avalanches are plentiful and `sepFired` is large, the pre-registered test
re-runs there **after** the prereg is amended with the new operating point, per the standing rule
that the amendment precedes the run. If no such band exists, that is itself the finding: this
substrate has no regime in which the Bak recipe is even measurable, and the honest statement is
that the question cannot be asked here — not that the answer is no.

---

# Part 2 — the operating-band sweep, and a hypothesis I killed (2026-08-03, 01:00–01:30 UTC)

## The band does not exist

`soc-conserve-opband.js`, drives 2/5/10/20/40/60, sparse and dense inits, 2 seeds each.

**Death canary passed first: a zero-drive world recorded 167 deaths in 500 ticks.** So the
near-zero death counts below are provably real and not an unwired counter — the distinction this
whole night has been about.

| drive | quiescent | nAv (max over 4 runs) | deaths (max) |
|---|---|---|---|
| 2  | 98.2–99.8% | 3  | 72 |
| 5  | 98.1–99.8% | 7  | 78 |
| 10 | 99.8–100%  | 1  | 9  |
| 20 | 96.9–100%  | 11 | 127 |
| 40 | 99.7–100%  | 1  | 16 |
| 60 | 100%       | 0  | 2  |

Rule 1 needs an avalanche-size distribution to fit. The best cell in this table offers 11 events.
**There is no drive between 2 and 60 at which the SOC question is askable on this substrate.**
That is the finding. It is not "SOC is not supported" — it is that the statistic the pre-registered
rule consumes cannot be brought into existence by the only knob the experiment has.

## The hypothesis I had, and why it was wrong

Reading the code gave a clean story. In `conserve` mode an organism returns `UPKEEP` to the *same
niche stock* it feeds from, a corpse returns its whole remainder there too, and `leak` — the only
true exit — applies to **root niches only** (`lib/graph.js:234`) while the world builds thousands of
non-root niches. That predicts a large bulk reservoir with no exit: local stocks never empty, so
nothing starves. Conservation implemented as perfect local recycling would have destroyed the very
scarcity conservation was supposed to create.

Good story. Reading code is not evidence, so `energy-budget.js` measured where the energy actually
is, gated on an accounting canary (the parts must reconstruct the conserved total, or the shares
printed are decoration).

| drive | alive | in organisms | root stock | bulk stock | niches | org energy p05/p50/p95 |
|---|---|---|---|---|---|---|
| 5  | 1785  | 15313 **89.4%** | 17  0.1% | 1792  10.5% | 8r 135b  | 5.1 / 8.4 / 12.5 |
| 20 | 5974  | 51179 **89.5%** | 119 0.2% | 5900  10.3% | 8r 742b  | 5.1 / 8.2 / 13.0 |
| 60 | 18536 | 156961 **89.3%** | 103 0.1% | 18689 10.6% | 8r 2999b | 5.1 / 7.6 / 13.5 |

**Hypothesis falsified.** The bulk reservoir is 10.5% of the budget, not the dominant share. 89% of
the conserved energy sits *inside organisms* — and it sits there in a strikingly tight band. The 5th
percentile organism holds 5.1 units at every drive tested, with `UPKEEP = 1`; that is five ticks of
buffer for the poorest twentieth of the population. There is no low tail. Nothing is anywhere near
zero, which is why nothing dies, which is why there are no avalanches.

Note what stayed constant across a 12x change in drive: p05 pinned at 5.1, p50 drifting only
8.4 → 7.6, while population went 1785 → 18536. **The drive is being absorbed almost entirely by
population, not by per-capita energy.**

## What replaces it

**H (expansion absorbs the drive):** the world answers added energy by growing the lattice rather
than by concentrating energy. Niches went 135 → 742 → 2999 as drive went 5 → 20 → 60. Every new
niche is somewhere for a new organism, so extra drive converts into extra population at roughly
constant per-capita energy. Crowding never rises, per-organism intake `min(want, stock/crowd)` never
falls, and no low tail ever forms. **A system that can always expand never has to topple.** That is
the exact inverse of Bak's sandpile, which is critical *because* its lattice is fixed and grains must
eventually leave at the edge.

The uncomfortable corollary, recorded because it is against me: **Amendment 2 raised `maxNodes` from
3000 to 30000** so that a binding cap could not contaminate rule 2. If H is right, that amendment
removed the only structure in the system capable of producing criticality. The methodological fix and
the physics were pulling in opposite directions, and I could not have seen it at the time.

H is pre-registered with falsifiers in `PREDICT-capped-lattice.md`, written before the capped run
launched. The capped run is calibration, not the SOC test; if the band appears there, the
pre-registered test re-runs at that point only after a recorded prereg amendment.

## Coverage gate

The structural cause of the invalid Part 1 verdict — a rule consuming a statistic no canary
exercised — is now mechanically enforced by `lib/coverage.js`, whose own canary replays this run and
must fire on it. Replaying Part 1 through the gate names **two** uncovered rules, not one: rule 1
(`avalanche_sizes`, never exercised) and rule 2 (`niches`, whose supporting evidence lived in a
different script the run could not see). A rule resting on a canary that ran somewhere else is
uncovered where it counts.

---

# Part 3 — the pre-registered test, run at a binding cap (2026-08-03 02:15 UTC)

Protocol: `PREREG-soc-bak.md` + Amendment 3. 3 caps × 4 dense seeds × 2 drives = 24 runs, plus 4
sparse runs for rule 3. Burn 2000, measure 9000, drive 60, separation f=0.25. Log `/tmp/job-soc-v2.log`.

## Verdict: **SOC NOT SUPPORTED** — and this one counts

| rule | result |
|---|---|
| 1 — power-law over exponential, ≥3/4 dense slow at **every** cap | **FAIL** (0/4, 0/4, 0/4) |
| 2′ — finite-size invariance, max pairwise \|Δα\| ≤ 0.30 | **FAIL** (1.627) |
| 3 — sparse and dense converge to one attractor | **PASS** (4/4, 10.0–10.8% apart) |
| control — fast drive does not look power-law | **CLEAN** |

All three gating canaries passed and the coverage gate cleared: conservation books balance to
8.71e-15; the avalanche-liveness canary moved rule 1's own statistic (cap 30000 → nAv 0, cap 3000 →
nAv 77); separation-actuation fired 2266 times under slow drive and 0 under fast.

**The difference from Part 1 is that the rules were evaluable.** Part 1's rule 1 failed 0/0 — every
run had too few avalanches to fit — and its control block was byte-identical to its treatment. Here
every cell produced 415–1048 avalanches and the control block genuinely differs (sepFired 0 vs
~2200). The negative is a measurement, not an absence of one.

## What actually failed

Rule 1 is a clean negative. Fitted α sits at 3.1–7.2 with Vuong LR negative in most cells and
p < 0.05 nowhere in the required direction. A power law that steep over a 2-decade range is not
distinguishable from — and is usually beaten by — an exponential. The avalanche-size distribution on
this substrate is **exponential-tailed at every cap tested**.

## Rule 2′ fails, and I am discounting my own result

Mean α by cap: 4.853 (2000) → 5.418 (3000) → 3.791 (5000). Max pairwise gap 1.627, far outside the
0.30 band, so rule 2′ FAILS as written.

But the reading Amendment 3 wrote for that failure — "α tracks the ceiling, therefore boundary
artifact" — **does not survive contact with the numbers**, for two reasons, both against the
tidier story:

1. **The drift is not monotone.** Amendment 3 specifically named *monotone drift* as the artifact
   signature. 2000 → 3000 rises, 3000 → 5000 falls. A ceiling that sets the distribution should not
   produce a hump.
2. **α is a nuisance parameter here.** Rule 1 already says the power law does not describe the data.
   The scatter in a fitted exponent for a distribution that is not a power law is not evidence about
   finite-size scaling; it is fit noise. Rule 2′ was designed as a backstop *if rule 1 passed*. With
   rule 1 failing, its FAIL is close to vacuous in the same way Part 1's was — the difference being
   that this time the vacuity is visible and I am reporting it instead of scoring it.

So: rule 2′ is recorded as FAIL per the pre-registration, and simultaneously recorded as
**non-informative**. It does not add independent weight to the negative.

## The control passes without doing any work

Fast drive is 0/4 at every cap, as required. But slow drive is also 0/4, so the control never had to
discriminate. It would only have carried weight had rule 1 passed. Noting this so the "CLEAN" line
is not read as corroboration.

## Rule 3 passes — and rule 3b shows the rule is blind

Population converges 10.0–10.8% (threshold 25%). Meanwhile the same sparse/dense pairs at cap 3000:

| seed | quiescence sparse vs dense | nAv | deaths |
|---|---|---|---|
| 1 | 93.5% vs 76.1% | 26 vs 630 | 592 vs 2489 |
| 2 | 93.6% vs 75.2% | 44 vs 652 | 591 vs 2634 |
| 3 | 93.6% vs 73.9% | 33 vs 656 | 593 vs 2701 |
| 4 | 93.6% vs 74.7% | 39 vs 673 | 587 vs 2652 |

Same population, ~17x the avalanches. **"One attractor" measured in population is a different claim
from "one attractor" measured in dynamics, and the pre-registered rule can only see the first.** This
is the proxy-metric failure in its own habitat: the statistic sits next to the quantity of interest
and moves with it right up until it doesn't. Rule 3b is exploratory by construction (defined after
seeing Part 2's data) and does not touch the verdict — it goes into the next pre-registration.

## The one positive result: H gets quantitative support

H (Part 2) said the world stays quiet because it can grow instead of topple. Part 3 measures the
dose-response across the ceiling:

| cap | quiescence (slow) | avalanches (slow) |
|---|---|---|
| 2000 | 69.2% | 861 |
| 3000 | 75.0% | 653 |
| 5000 | 82.9% | 435 |
| 30000 (Part 2) | ~100% | ~0 |

Monotone in the right direction across a 15x range of ceilings: **the more room to expand, the less
it topples**, converging smoothly on the uncapped no-avalanche regime. That is H stated as a curve
rather than a contrast, and it is the durable finding of the whole SOC arc.

## What this closes

The substrate produces cascades only when confined, the cascades it produces are exponential rather
than scale-free, and the confinement level sets how many you get. **Bak-style self-organised
criticality is not present in this system in the regime tested.** Scope: dense inits, drive 60, caps
2000–5000, chosen by calibration because it was the only regime where the question could be asked at
all — evidence about that regime, not the substrate at large.
