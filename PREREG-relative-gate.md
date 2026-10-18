# Pre-registration: the relative build gate

**Written 2026-08-05, BEFORE any code for the treatment existed and before any run.**
Follows the §17 result (construction horizon) and supersedes §16 arm C, which §17 killed.
Jiggy said go at 04:58Z.

## 1. The question

§17 measured why void is a star forest one layer deep: the build gate is an **absolute** count
(`BUILD_DENSITY * NODE_CAP` = 0.75 * 20 = **15** occupants) while occupancy **decays with depth**
because the drive enters at the roots (mean 14.25 / 6.06 / 4.09 at depths 0/1/2). The two cross
between depth 0 and 1, and past the crossing **0% of niches ever reach the gate** — the
construction horizon.

> **Does making the gate relative to a niche's own means push the horizon outward, or does it just
> let poor niches breed structure they cannot feed until the world dies or slams the cap?**

This is a genuine fork with a plausible bad arm, which is the only kind worth registering.

## 2. The manipulation, stated exactly

A niche's **effective capacity** is what its own stock can currently sustain, floored at 1 and
capped by the existing hard slot limit:

```
capEff = max(1, min(NODE_CAP, floor(nd.stock / UPKEEP)))
```

- **Arm A (control, current behaviour):** trigger when `occ / NODE_CAP >= BUILD_DENSITY`.
- **Arm R (treatment):** trigger when `occ / capEff  >= BUILD_DENSITY`.

Nothing else changes. `BUILD_DENSITY` keeps its existing value; **no new tunable scale is
introduced**, which was the whole reason to prefer this over a priced-habitat arm (§16.1).

**Anti-tautology check ([[tautological-metric-drives-controller]] is a standing scar):** the gate
reads `stock` and `UPKEEP` — substrate state. It does **not** read depth, the depth histogram, or
any statistic used as an outcome below. The controller cannot drive its own metric.

**Expected mechanism if it works:** a deep niche holding 4 organisms on stock that supports 4 is
*full* and may build. Affordability (`stock >= BUILD_STOCK_COST`, `energy >= BUILD_THRESH`) is left
untouched and becomes the real brake, instead of a threshold the deep world can never reach.

**Expected mechanism if it fails:** every thin niche reads as saturated, build attempts explode,
and the world either slams `MAX_NODES` or starves itself by fragmenting its stock into endowments.

## 3. Power and N — fixed now, before the first run

**N = 6 seeds per arm** (seeds 1-6), 3,000 ticks, both arms identical except the gate.

Justification, not a guess: the §17 baseline measured the primary outcome at **0.73% / 0.40% /
0.33%** across three seeds — a spread of 0.4 points around a mean of 0.49%. The PASS threshold
below is 10%, i.e. **~20x the baseline mean and ~25 baseline-spreads away**. Six seeds per arm is
ample for an effect that size; it is deliberately *not* justification for reading a small
difference, and §5 forbids that explicitly. [[prereg-needs-power]] — a previous gate of mine passed
on 4 events at p=0.59 and meant nothing.

## 4. Primary outcome and verdicts, written before the run

**Primary outcome: the fraction of niches at depth >= 2**, meaned over the 6 seeds.
Baseline (arm A, §17): **0.49%**, max depth 2.

| verdict | condition (all clauses required) |
|---|---|
| **PASS** | depth>=2 fraction **> 10%** AND max depth **>= 4** AND world alive (final population > 100) AND no cap slam (`hitMaxNodes` false) in a majority of seeds |
| **PARTIAL** | depth>=2 fraction **> 2%** (4x baseline) but fails any one of: depth>=4, alive, no-cap-slam |
| **FAIL** | depth>=2 fraction <= 2%, i.e. the horizon holds and the gate change did not move it |
| **DEAD** | final population <= 100, or extinction, in a majority of seeds — a real answer to §17.4, not a null |

A cap slam is **not** a pass under any reading. §15's Amendment-2 error was relaxing a binding cap
to protect a rule; the mirror error here would be calling a runaway a success because depth rose.

## 5. Gating canaries — scored BEFORE the verdict, per this thread's established method

1. **Actuation.** The manipulation must demonstrably fire: count build *triggers* at depth >= 1 in
   each arm. If arm R's deep-trigger count is not strictly greater than arm A's, the treatment did
   not actuate and the run is **VOID, not negative**. (This is the separation-actuation canary that
   caught the byte-identical control in `soc-conserve.js` v1.)
2. **Liveness.** Population and node count must be non-degenerate at readout in the control arm, or
   the comparison has no baseline.
3. **No silent cap.** `hitMaxNodes` is reported per seed and never suppressed.

**If canary 1 fails, no verdict is reported at all.** A zero from an unactuated manipulation is
indistinguishable from a broken one.

## 6. What this cannot conclude

A PASS says the horizon moved and a bulk may exist. It does **not** establish that a holographic
bound then binds — that needs the ball-growth measurement (`dimension-probe.js`) rerun on the new
structure, and it is a *separate* question registered later, not folded into this verdict.
