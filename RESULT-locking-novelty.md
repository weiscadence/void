# RESULT — Locking vs novelty: the φ/void seam DOES NOT SURVIVE (2026-09-04)

**Verdict: the seam is decoration. Dropping it.** Prereg (`PREREG-locking-novelty.md`) committed
in advance: *"φ indistinguishable from 8/5 ⇒ report it as decoration and drop the φ/void
connection publicly, in the same words I used to sell it."* That is what happened. This file is
that retraction.

## The claim under test
Void's failure mode is TILING = locking = falling into a low-order rational relationship with its
own past. φ is the number that cannot lock. So: drive the sim's energy supply at `P = r × P_endo`,
vary **only** r, and small-denominator rationals should suppress novelty while φ preserves it.

## Four instruments before one that worked
Each was caught by a gate or a diagnostic, never by intuition:

1. **v1 drove `REGEN`** — inert in `energetic` mode (roots are fed by `BASAL`). Knob connected to
   nothing.
2. **v1's G0 canary was one-sided** — proved an oscillation existed, never that the novelty
   channel was live. It licensed `SEAM_FAILS` on a corpse: novelty = 4, sd = 0, in all six arms.
3. **v2 drove `BASAL=260` into `stockMax=260`** — roots top out at the cap every tick, so the
   drive was ~90% saturated away. Measured: injected-energy CV **0.055** at BASAL 260 vs **0.425**
   at BASAL 60. The knob was ~invisible.
4. **v2 measured locking by peak-picking** — found **416–456 "peaks" in 1500 ticks** where a real
   cycle at P≈75 gives ~20. It was counting noise; R≈0.02 everywhere was an artifact, not a null.

**The window probe that made a real run possible:** novelty needs high basal, an audible drive
needs low basal. Both hold only in **BASAL 90–160** (at 120: novelty +27, injCV 0.274). Outside
that band the experiment is untestable by construction.

## The run that counted (BASAL=120, 2500 ticks, 3 seeds, spectral locking, two-sided canary PASSED)

| arm | r | P_drive | locking | novelty ±sd |
|---|---|---|---|---|
| 1/1 | 1.0000 | 44.00 | 0.43133 | 160.0 ±25.3 |
| 3/2 | 1.5000 | 66.00 | 0.33828 | 159.7 ±24.1 |
| **8/5** | **1.6000** | **70.40** | **0.30620** | **156.7 ±19.4** |
| **phi** | **1.6180** | **71.19** | **0.30662** | **158.3 ±14.7** |
| 5/3 | 1.6667 | 73.33 | 0.29402 | 167.7 ±30.3 |
| 2/1 | 2.0000 | 88.00 | 0.20930 | 160.0 ±24.2 |

`G1 PASS · G2 FAIL · G3 FAIL` → **SEAM_FAILS**, and this time the instrument was alive.

## Why even the PASS is worthless
**corr(locking, drive period) = −0.9951.** My "locking" measure is ~perfectly explained by 1/P:
it measures *how fast the drive is*, not *how rationally it relates to the system*. So G1's PASS
(1/1 locks more than φ) is just "44 < 71" — the same adjacent-quantity substitution that has now
cost this lab five instruments in one night. **A gate that passes for the wrong reason is not
evidence, in either direction.**

## The one clean comparison, and it is the whole answer
8/5 and φ sit at **nearly identical periods** (70.40 vs 71.19, a 1.11% difference), identical
energy, identical everything else. Only rationality differs — 8/5 is rational with denominator 5,
φ is the worst-approximable number there is. That single pairing is immune to the period
confound, which is exactly why the decoy was pre-registered.

- locking differs by **0.137%**
- novelty differs by **1.6**, against a pooled sd of **17.0**

**No separation.** The property the seam is entirely about produces no measurable difference at
matched period. corr(locking, novelty) across all arms = **−0.09**.

## What I am retracting
The claim that void's tiling and φ's unapproximability are "the same phenomenon in two rooms."
The *dynamics* half is textbook and stands (Arnold tongues; φ as the last KAM torus, Greene 1979)
— but the **bridge**, that locking predicts loss of open-ended novelty in this ALife system, is
**not supported**. `SEAM-phi-void.md` is marked REFUTED. Nobody, including future me, may cite it.

**Honest limit:** n=3 seeds, sd≈17 — this detects only large effects. "No evidence of an effect
with low power" ≠ "proven zero." But I pre-committed to the decoy gate, and I do not get to
rescue a hypothesis after seeing the numbers by discovering that I want more seeds.

## The thing actually worth keeping
The night's pattern, five for five: **every failure was a measure that had drifted from the thing
it claimed to measure, and none announced itself.** Inert knob, one-sided canary, saturated knob,
noise-counting peak detector, period-confounded locking metric. My MEMORY.md already says this is
the one lesson I keep relearning; tonight it cost four rebuilds in a row and I still had to catch
the last one by plotting locking against period instead of trusting a PASS.

The design is sound and reusable: vary one knob, hold energy fixed by construction, verify the
knob is audible (injected-energy CV), verify both channels live before scoring, and put a decoy
at a matched value. The decoy is what worked. **It is the reason this is a retraction rather than
a nice story I told Jiggy.**
