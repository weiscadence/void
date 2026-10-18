# Result: void synergy v2 — GROWING-SYNERGIC, and the far food was never opened (bet wrong: 1 for 8)

**Run 2026-10-18 16:24 UTC**, serial under `nice -n 19`, **1.65 CPU-min** of the 15 budgeted. Pre-registered in
[`PREREG-synergy2.md`](PREREG-synergy2.md) (script `synergy-exp.js` sha256 `12316a4b…edba`, engine `lib/synergy.js`
`fcdf2bfc…0cb5`, committed before the run as `e4c959f`). Raw: `data/synergy.json` (v1 run kept at
`data/synergy-v1.json`). Reproduce: `node synergy-exp.js`. Live: [drainfun.xyz/void/synergy](https://drainfun.xyz/void/synergy).

## Verdict by the rule

| test | rule | measured | |
|---|---|---|---|
| canary 1 | `{emit, boost, split, homing, tether}` is a synergy and eats far food; no single part eats far food | score 1.50 on *energy home* · far eaten 3 · singles max far 0 | pass |
| canary 2 | `{thrust, emit}` < 0.4 in both arms | 0.000 / 0.000 | pass |
| canary 3 | `{thrust, orbit}` registers in the compose arm | 0.992 on *orbit-ness* | pass |
| canary 4 | 60 random additive-arm genomes score exactly 0 | max 0.000 | pass |
| reported | every additive world: 0 synergies, 0 far food | `addSynZero` true · `lockHolds` true | as designed |
| growing | late window ≥ 1/3 of first in ≥ 4/5 compose worlds | **4/5** (0.40, 0.23, 0.58, 0.53, 0.38) | **GROWING** |
| synergic | cells compose > additive **and** ≥ 20 real synergies **and** ≥ 25% of the population in a synergy genome, each in ≥ 4/5 | **5/5 · 5/5 · 5/5** | **SYNERGIC** |

**GROWING-SYNERGIC.** The bet was SATURATED-SYNERGIC with far food reached in ≥ 3/5 compose worlds: wrong on the
growth half and wrong on the far food. Record **1 for 8**.

## The numbers

Per seed, 9,000 ticks, windows of 3,000. *cells* = distinct behaviour cells seen; *real syn* = distinct part-sets the
counterfactual detector calls a synergy; *v1 linear* = what the old linear detector would have counted on the same
worlds (reported, decides nothing); *share* = fraction of the final population living in a synergy genome; *w* = new
behaviour cells per window.

| seed | arm | cells | real syn | v1 linear | share | w1 / w2 / w3 | far | mean parts |
|---|---|---|---|---|---|---|---|---|
| 11 | compose | **174** | 574 | 634 | 0.92 | 83 / 58 / 33 | 0 | 4.6 |
| 11 | additive | 81 | **0** | 564 | 0 | 62 / 10 / 9 | 0 | 3.8 |
| 22 | compose | **122** | 466 | 612 | 0.83 | 84 / 19 / 19 | 0 | 4.1 |
| 22 | additive | 77 | **0** | 481 | 0 | 48 / 19 / 10 | 0 | 3.6 |
| 33 | compose | **140** | 467 | 682 | 0.57 | 52 / 58 / 30 | 0 | 4.3 |
| 33 | additive | 76 | **0** | 572 | 0 | 53 / 14 / 9 | 0 | 4.0 |
| 44 | compose | **148** | 369 | 592 | 0.73 | 70 / 41 / 37 | 0 | 4.1 |
| 44 | additive | 82 | **0** | 459 | 0 | 57 / 16 / 9 | 0 | 3.8 |
| 55 | compose | **154** | 501 | 686 | 0.39 | 73 / 53 / 28 | 0 | 4.4 |
| 55 | additive | 91 | **0** | 554 | 0 | 57 / 19 / 15 | 0 | 3.5 |

No extinctions; every world ended at 84–106 creatures.

## What the fix to the detector showed

**v1's synergy count was mostly physics.** On the *same* additive worlds the linear detector counts 459–572
"synergies"; the counterfactual detector counts 0, exactly, in all five — the null is now the control's own program,
so nothing the world does can leak into the score (canary 4 passed with max 0.000 over 60 random genomes, and it
held across 1,178–1,361 genomes per world). On the compose worlds the linear count (592–686) is also above the
counterfactual one (369–574): roughly a fifth of v1's compose "synergies" were the world's curvature too.

**What the real synergies are.** Of the 60 top-scoring synergies across the five compose worlds, 51 are on the
*turning* axis and 9 on *path*: `thrust + spiral`, `thrust + mirror`, `thrust + thrust + pulse + boost + orbit`
(score 3.79 — "eats near food · orbits" against a null that "eats nothing · reaches the mid ring"). These are motion
transforms rewriting what a motor produced — the Isaac rule applied to locomotion. The populations, meanwhile,
converge on `seek + pulse (+ pulse, + attract, + plant, + boost)`: a sense feeding a motor, which is the cheapest
coupling the pipeline offers and one the additive control is denied by definition (its sense parts set a heading
nobody reads). That is why 39–92% of the final population lives in a synergy genome. It is also the caveat on
SYNERGIC: the control cannot *sense*, so a large share of "composition beats addition" is "a body that steers beats
a body that cannot" — true, pre-registered, and less than the Isaac claim.

**GROWING, narrowly.** The late window held ≥ 1/3 of the first in four of five compose worlds (0.40, 0.58, 0.53,
0.38; seed 22 at 0.23) and in zero of five additive worlds (0.15–0.26). This is not comparable to v1's SATURATED: the
barrier changed the attainable region (the mid ring is now the edge of the body's world), so cells seen fell in
both arms (compose 219 → 174 on seed 11; additive 133 → 81). Within v2 the direction is clean — composition keeps
finding new behaviour cells where addition stops — but the margin is one cell in two seeds.

## What the fix to the lock showed: nothing opened it

**Far food: 0 in all ten worlds.** The lock holds against the additive arm, as it must (no single-modifier
projectile can be split *and* homing). It also held against the compose arm for 9,000 ticks in five seeds. The
chain that opens it — an emitter, then `boost` (the current stalls an unboosted projectile at r ≈ 0.8), then `split`
and `homing` applied after the emitter — is four specific parts in a constrained order out of 22, and v2 gave it
**no partial credit**: projectiles now eat only far food, so an `emit + homing` body pays 0.04 energy per shot for
nothing until the other two parts arrive. In v1 the chain was found in 3/5 seeds because a tethered projectile could
already eat mid food — the accumulation road the lock was built to close was also the gradient that led to the
chain. v2 closed the road and the gradient with it. Named, not tuned away: the next lock should be **graded** —
a homing projectile may eat mid food (partial credit), only a split, homing fragment opens far — so that the
qualitative combo is still the only way to the far food but the path to it pays at every step.

## What this says about the Isaac mechanism

With an honest detector, cross-modification produces real, used synergies and the control produces none; kinds of
behaviour are higher under composition in 5/5 and keep arriving later. The synergies the world *keeps* are the cheap
ones — sense → motor, motor → motion-transform — not the projectile chain the lock was meant to reward, because the
lock paid nothing for being close. v1 measured the wrong thing; v2 measured the right thing and found the world had
nowhere to climb. The experiment that would test the Isaac claim properly is v2's detector with a graded lock.

## Smoke disclosure

One smoke run (2 seeds × 1,500 ticks) before the hashes were frozen: canaries pass, compose 77 / 111 real synergies
vs additive 0 / 0, v1-linear 81 / 169 vs 146 / 53, far food 0 everywhere. I read the far-food zeros as "too short"
and bet 3/5 anyway. They were the result.
