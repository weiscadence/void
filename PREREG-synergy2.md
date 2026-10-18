# Pre-registration: void synergy v2 — the same question, with the two named flaws fixed

**Written 2026-10-18 16:20 UTC, before the run.** Script frozen at `synergy-exp.js` sha256
`12316a4bdbbd940b10c7b4fa98ecdca934bbc93af26bb46ee37ac7aacdedd2ba`, engine `lib/synergy.js`
`fcdf2bfc9887b425350aad73fb35a925543644a46bdae08bf23943ddd1620cb5`. Both committed before the run; the v1 run
stays on disk as `data/synergy-v1.json` and in [`RESULT-synergy.md`](RESULT-synergy.md).

## 0. Why a v2

v1 ([`PREREG-synergy.md`](PREREG-synergy.md)) came back SATURATED-FLAT and named two flaws, in writing, as the reason
its synergy count meant nothing:

1. **The detector read the world's nonlinearity as synergy.** It predicted a combo's behaviour as a *linear sum* of
   single-part descriptors. Turning is not linear in the motion vector; the current has an equilibrium radius; food
   is reached or not. So the additive control — parts that by construction cannot read each other — registered
   698 / 435 / 629 / 712 / 591 "synergies", as many as the pipeline.
2. **The far food was reachable by stacking speed.** `thrust + boost + pulse` summed to enough outward speed to sit
   near the rim and let a one-modifier tethered projectile cover the rest. The lock separated *composition from a
   single part*, not *composition from accumulation*.

Both are fixed in the engine, nothing else is changed (palette, world, energy law, observer axes and bins, threshold
0.4, seeds, ticks, cutoffs all as v1):

- **(a) Counterfactual detector.** `synergy(P) = behaviour(P as pipeline) − behaviour(P as isolated clones composed
  additively)`, where the null is **simulated, not summed**: the same parts, in the same test arena and physics,
  but every tick each part is applied alone to a fresh copy of the creature's state and the isolated contributions
  (motion vectors, emissions, hooks) are summed before the physics step. The world's nonlinearity is now *inside*
  the null; only coupling between parts is left over. For an additive-arm creature the null and the actual are the
  same program, so the control scores **exactly 0** — if it does not, the detector is broken and the run is VOID.
  The v1 linear detector is still computed and reported (`linSeen`) so the inflation can be measured; it decides
  nothing.
- **(b) Qualitative lock.** A barrier at r = 0.70 stops every body (mid food at 0.56–0.68 is still body food).
  Projectiles eat only far food, and far food opens only to a projectile that has **split and is homing** — a
  modifier applied to a modified projectile, which no sum of independent single-modifier projectiles can carry.
  Homing now steers toward the richest food in range, so a plain homing projectile hovers at the far food without
  opening it. The additive arm cannot open the lock by construction; "far food compose > additive" is therefore the
  lock's check, not a finding, and is reported as `lockHolds`.

Smoke run before freezing (2 seeds × 1,500 ticks, disclosed, not evidence): canaries pass; compose synergies 77 /
111 against additive 0 / 0 (v1 linear detector on the same worlds: 81 / 169 vs 146 / 53 — the v1 count was mostly
physics); far food 0 in all four short worlds — the lock is harder than v1's and 1,500 ticks say nothing about it.

## 1. The question

Does composition produce **more real synergies** and **more kinds of behaviour** than the additive control, and does
discovery keep going?

## 2. Design, fixed now

- Seeds **11, 22, 33, 44, 55**, arms compose / additive (paired PRNG streams), **9,000 ticks**, checkpoint every 300.
  40 founders of 1–2 random parts, 60 near-food patches. Serial, `nice -n 19`, budget ≤ 15 CPU-min (abort marks a world).
- Per checkpoint: population, distinct genomes, behaviour cells (now / seen / new), real synergies (now / seen /
  new), **share of the population living in a synergy genome**, v1-linear synergies seen, far food per window, part
  counts, top-3 genomes.
- Cutoffs **3,000 / 6,000 / 9,000**: new cells, new synergies, far food per window.

## 3. Canaries (miss any → VOID)

1. `{emit, boost, split, homing, tether}` registers as a synergy in the compose arm **and** eats far food in the test
   arena (smoke: score 1.50 on *energy home*, far eaten 3); no single part eats far food.
2. `{thrust, emit}` (legs and a gun) scores below 0.4 in both arms.
3. `{thrust, orbit}` (orbit rewrites what thrust produced) registers in the compose arm — coupling the detector must see.
4. **The additive null:** 60 random additive-arm genomes of 2–6 parts all score **exactly 0**.
5. Reported, not gating: every additive world ends with 0 synergies seen (`addSynZero`) and 0 far food (`lockHolds`).

## 4. Verdict rule

- **GROWING** if new behaviour cells in window 6,001–9,000 ≥ 1/3 of window 0–3,000 in ≥ 4/5 compose worlds; else
  **SATURATED**.
- Suffix **-SYNERGIC** if, in ≥ 4/5 paired seeds, all three hold: (i) cumulative behaviour cells compose > additive;
  (ii) the compose world has found ≥ 20 distinct real synergies; (iii) at tick 9,000 at least 25% of the compose
  population lives in a synergy genome (synergies are *used*, not just found). Else **-FLAT**.
- Reported alongside: far food per window per arm; v1-linear counts per arm (the inflation); mean/max parts; top
  synergies with their behaviour in words next to the null's behaviour in words; extinctions.

## 5. Falsifier

If compose worlds find < 20 real synergies, or synergy genomes stay a minority of the population, cross-modification
is being found by the observer but not kept by selection — the Isaac rule makes combos the world does not pay for.
If cells seen are not higher under composition once the control's count is honest, v1's 4/5 was the old detector's
artefact too.

## 6. Cadence's bet

**SATURATED-SYNERGIC**, far food reached in ≥ 3/5 compose worlds but only after window 1 (the lock needs a 4-part
chain the founders do not have). Named reasons: v1 already showed 4/5 on cells with longer bodies in 5/5, and the
counterfactual detector removes the control's count without touching the pipeline's real couplings (`boost` on
`emit`, `homing` on `split`); saturation because the vocabulary is still 22 parts in 6 slots under a 12-axis observer.
Record: **1 for 7**. If GROWING, the lock did what `OBSERVATION-why-reach-is-pinned.md` said a lock should.
