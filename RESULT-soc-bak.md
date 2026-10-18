# RESULT — SOC under timescale separation: a clean negative (2026-08-02)

Pre-registration: `PREREG-soc-bak.md` (written before run 1; Amendment 1 written before run 2).
Code: `soc-bak.js`, `soc-bak-ratio.js`. Model code (`lib/graph.js`) **unmodified** — treatment and
control run identical rules and differ only in the drive schedule.

## The question

`soc-selftune.js` proved the graph world is **bistable**, not critical. `soc-costsweep.js` showed a
local negative feedback collapses that bistability but overshoots to **subcritical**, with only a
knife-edge transition. The conclusion recorded then: *genuine SOC needs the Bak recipe — conserved
quantity + timescale separation (slow drive / fast relaxation)* — and that half was never built.

This built the timescale-separation half.

## What changed

Only the **drive schedule**: while a death cascade is running, food inflow is throttled to
`f × REGEN`; between cascades it is full. Add a grain, let the pile finish toppling, add the next.

It also replaced a **proxy**. Earlier runs estimated avalanches as peak-to-trough population drops,
which has no principled boundary. Under separation the avalanche has a real definition: *total
deaths across a maximal run of consecutive non-quiescent ticks* — everything that topples between
one grain and the next.

## Run 1 was vacuous, and saying so is the point

Pure Bak protocol (`f = 0`) returned SOC NOT SUPPORTED — from worlds at **population 0–5** with
91–100% quiescence. Four of eight runs were extinct. A dead world produces no avalanches for a
trivial reason, so that verdict was **not evidence about criticality**; it was the broken-zero
failure mode wearing a pre-registered verdict as a costume.

`soc-bak-ratio.js` then swept separation strength to ask whether *any* setting leaves a live world:

| f (inflow during cascade) | mean pop | alive | quiescent | live world? |
|---|---|---|---|---|
| 0.00 | 3 | 50% | 95.7% | no — starved (this is what run 1 measured) |
| 0.25 | 47 | 100% | 71.0% | **yes** |
| 0.50 | 55 | 100% | 66.8% | yes |
| 0.75 | 64 | 100% | 48.9% | yes |
| 1.00 | 65 | 100% | 37.1% | yes (no separation — the control) |

So separation and survival are compatible; run 1 had simply under-powered itself. Amendment 1 moved
the operating point to `f = 0.25` — the strongest separation with a living world — and **changed
nothing else**: same three rules, same thresholds, same 4 seeds × 2 inits, same negative control.

## Run 2 — the valid test

Living worlds (pop 10–41, alive throughout), genuine separation (73–86% quiescent vs 48–82% under
fast drive), 283–399 avalanches per run, zero node-cap contamination.

| rule | result |
|---|---|
| 1. power-law over exponential in ≥3 slow-drive runs | **FAIL — 0 of 8** |
| 2. no node-cap contamination | PASS |
| 3. sparse and dense converge to one attractor | **FAIL — 0 of 4** (30.8%, 47.7%, 69.6%, 69.4% apart) |
| control: fast drive does not look power-law | CLEAN (0 of 8) |

**SOC NOT SUPPORTED.** The Vuong likelihood ratio is negative in all 8 slow-drive runs — exponential
is favoured everywhere, never power-law.

## The one real signal, stated at its true size

Separation does *something*: it pulls the statistics toward the ambiguous middle. Under fast drive
the LR reaches −12, −24; under slow drive |LR| falls below 2.5 in 6 of 8 runs, and one (dense seed 3)
is genuinely undecidable at LR −0.11, p = 0.41. So timescale separation moves the world *away from
decisively exponential* — but it never arrives at power-law. **Less-exponential is not critical**,
and calling that a partial success would be the R²-on-CCDF mistake in a new costume.

Rule 3 is the more damning half: sparse and dense inits still land 31–70% apart. The bistability
wall that `soc-selftune.js` hit is **not** a drive-schedule artefact. It survives the Bak protocol.

## What this names

The pre-registration wrote down what a rule-1 failure would mean, before the run, and that
interpretation stands: the Bak recipe is **necessary but not sufficient here**, because this
substrate has **no conserved quantity**. Energy is *created* in the bulk by regen and *destroyed* in
the bulk by upkeep. In a sandpile the drive adds sand, toppling only *transports* it, and
dissipation happens only at the boundary — that conservation is what makes the critical state an
attractor. Here every tick is a source and a sink at every site, so there is nothing for the
dynamics to conserve and no reason for a critical state to attract.

Timescale separation was the cheap half of the recipe. **The expensive half — energy that is only
transported and dissipated at a boundary, never conjured cell-by-cell — is the actual next build**,
and until it exists, no amount of drive-scheduling will produce SOC in this world.

A second, smaller finding worth keeping: this substrate has **no free rest state**. In a sandpile,
waiting is free — between avalanches nothing happens. Here, organisms pay upkeep every tick, so
holding the drive off *is itself a starvation drive*. That is why `f = 0` killed the world, and it
is a real structural difference between metabolic models and the classic SOC toy models, not a
tuning problem.
