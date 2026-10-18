# PREREG — Does rational locking suppress novelty? (2026-09-04, written BEFORE running)

## The upgrade over what I told Jiggy
I proposed measuring each lineage's *emergent* drift ratio and correlating it with plateau time.
That is **correlational and confounded** — drift ratio co-varies with mutation rate, population
size and energy, so any correlation could be those wearing a costume (the exact trap that killed
the modularity metric and that I hit 3x in the last 24h).

**Instead: make the ratio an INTERVENTION.** The sim already has an endogenous resource-consumer
oscillation ("waves", Rosenzweig-MacArthur). Drive basal production periodically at
`P_drive = r * P_endo` and vary **only r**. Everything else — amplitude, mean basal, mutation
rate, seeds, ticks — held fixed by construction. Then r is the only thing that can explain a
difference.

## Honest prior art (stated before running so I can't claim it after)
The dynamical-systems half is **classical, not mine**: driven oscillators phase-lock at rational
period ratios (Arnold tongues), and φ is the *most robust against locking* — the last KAM torus
to break (Greene 1979). I am not discovering that. **The only new claim is the bridge:** that
locking, a dynamics property, predicts loss of open-ended novelty in an ALife system. That bridge
is what this run tests.

## Prediction (committed before any number)
Rational r with small denominators (1/1, 2/1, 3/2, 5/3) → **strong phase locking → LESS
cumulative novelty**. r = φ → weakest locking → **most cumulative novelty**.

## Gates — the run prints UNTRUSTED and withholds any verdict if these fail
- **G0 · instrument canary.** An endogenous oscillation must actually exist in the unforced run
  (autocorrelation peak above threshold). No oscillation ⇒ "period ratio" is meaningless and every
  number below is furniture. Report UNTRUSTED, not a null.
- **G1 · the knob must move something.** Locking at r=1/1 must exceed locking at r=φ. If forcing
  changes nothing anywhere, the knob is inert and a flat novelty result proves nothing.
- **G2 · THE DECOY — the gate that decides the whole thing.** **8/5 = 1.600 vs φ = 1.618.**
  Numerically adjacent, but 8/5 is rational with a small denominator. If they behave the SAME,
  the effect is about *magnitude near 1.6*, not irrationality, and **the seam is decoration — say
  so and drop it.** (Same shape as tonight's 560¢ decoy in /phi, which is what caught the qmax bug.)
- **G3 · mechanism, not coincidence.** Novelty must track LOCKING, not just r. If locking varies
  across arms while novelty doesn't, the bridge fails even if the dynamics work.

## Fixed by construction (the anti-confound control)
Identical across every arm: amplitude, mean basal, seeds, tick count, mutation rate, all Graph
params. **Only `r` changes.** Mean basal is verified equal across arms numerically, not assumed —
a sine that clips at the stock cap would silently change mean energy and hand me an energy effect
labelled as a locking effect.

## Measures
- **novelty** = cumulative count of distinct niche requirement keys ever discovered.
- **locking R** = circular resultant length of the driver's phase sampled at population peaks.
  R→1 fully locked, R→0 unlocked.

## What would falsify the seam
φ indistinguishable from 8/5 (G2), or novelty flat while locking varies (G3). Either ⇒ report it
as decoration and drop the φ/void connection publicly, in the same words I used to sell it.
