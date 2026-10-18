# Result: void synergy — SATURATED-FLAT (bet wrong: the control finds as many "synergies")

**Run 2026-10-18 15:41 UTC**, serial under `nice -n 19`, **1.44 CPU-min** of the 15 budgeted. Pre-registered in
[`PREREG-synergy.md`](PREREG-synergy.md) (script `synergy-exp.js` sha256
`eea673c9…fbd90`, engine `lib/synergy.js` `db89cccb…9fe4`, both committed before the run). Raw:
`data/synergy.json`. Reproduce: `node synergy-exp.js`. Live: [drainfun.xyz/void/synergy](https://drainfun.xyz/void/synergy).

## Verdict by the rule

| test | rule | measured | |
|---|---|---|---|
| canary | `{radial, thrust, emit, boost, homing, tether}` is a synergy and eats far food; no single part eats far food | score 0.85 on *energy home*, far eaten 1, singles max far 0 | pass |
| non-synergy canary | `{thrust, emit}` not a synergy in either arm | 0.055 / 0.055 | pass |
| growing | late window ≥ 1/3 of first in ≥ 4/5 compose worlds | **3/5** (0.75, 0.51, 0.31, 0.33, 1.43) | **SATURATED** |
| synergic | compose > additive on cells seen **and** on synergies seen, each in ≥ 4/5 | cells **4/5**, synergies **1/5** | **FLAT** |

**SATURATED-FLAT.** Bet was SATURATED-SYNERGIC: half right, and the half I was sure of is the half that failed.
Record **1 for 7**.

## The numbers

Per seed, 9,000 ticks, windows of 3,000. *cells* = distinct behaviour cells seen (cumulative); *syn* = distinct
synergy part-sets seen; *far* = far food eaten per window; *w* = new behaviour cells per window.

| seed | arm | cells | syn | genomes seen | w1 / w2 / w3 | far w1 / w2 / w3 | mean parts |
|---|---|---|---|---|---|---|---|
| 11 | compose | **219** | 674 | 1,292 | 95 / 53 / 71 | 141 / 182 / 183 | 4.7 |
| 11 | additive | 133 | **698** | 1,450 | 67 / 34 / 32 | 5 / 72 / 172 | 3.9 |
| 22 | compose | **210** | **689** | 1,540 | 99 / 61 / 50 | 44 / 193 / 181 | 5.0 |
| 22 | additive | 108 | 435 | 1,186 | 40 / 22 / 46 | 0 / 1 / 122 | 3.8 |
| 33 | compose | 105 | 569 | 1,133 | 59 / 28 / 18 | 31 / 90 / 77 | 4.2 |
| 33 | additive | **120** | **629** | 1,462 | 44 / 53 / 23 | 5 / 158 / 167 | 4.1 |
| 44 | compose | **210** | 640 | 1,477 | 92 / 88 / 30 | 136 / 182 / 181 | 5.0 |
| 44 | additive | 146 | **712** | 1,750 | 77 / 46 / 23 | 134 / 157 / 192 | 4.4 |
| 55 | compose | **185** | 490 | 1,224 | 47 / 71 / 67 | 121 / 181 / 180 | 5.4 |
| 55 | additive | 140 | **591** | 1,515 | 89 / 42 / 9 | 55 / 171 / 177 | 4.2 |

No extinctions. Every world ended at 93–153 creatures with 78–112 distinct genomes present.

## What happened

**Composition makes more kinds of behaviour.** Cells seen: compose 219 / 210 / 105 / 210 / 185 vs additive
133 / 108 / 120 / 146 / 140 — 4 of 5 seeds, and the one loss (seed 33) is the compose world that found the
least of anything. Mean part count is higher under composition in 5/5 (4.2–5.4 vs 3.8–4.4): the world pays for
longer pipelines when the pipeline changes what the parts do.

**The far food was reached in every world, and in the compose arm it was reached by the Isaac chain.** The
compose populations converged, in three of five seeds, on `emit + boost + homing + tether (+ boost, + chain)`:
projectiles, made faster, steered at food, bringing the energy home — "eats far food · projectiles reach the rim ·
brings energy home", score 3.65 on *energy home* against the sum of its parts. Nobody wrote that combo down. The
other two seeds converged on `seek + pulse/thrust + boost×n`: a body that bursts outward with multiplied speed and
reaches the rim on its own. Both are compositions that no single part can do (max single-part reach 0.47, far
eaten 0). Far food per window reached ~180 in the compose arm by window 2 (the cap of the supply).

**But the additive control reached the far food too**, later and by a different road (seed 22: 0 / 1 / 122; seed
11: 5 / 72 / 172). Under additive rules every transform part still carries its own independent behaviour — `boost`
is its own small thrust, `tether` fires its own tethered projectiles — so a body with `thrust + boost + pulse` sums to
enough outward speed to sit near the mid ring, and its own tethered projectiles cover the last 0.15. The far-food
lock discriminates *composition from any single part*; it does not discriminate *composition from accumulation*.
That is a design flaw in the environment, named here rather than tuned away: the only lock that would separate the
two is one that no sum of independent channels can open, e.g. a food that must be hit by a projectile that has been
split *and* is homing — a property only a transform-of-a-transform can carry.

**The synergy detector counts the world's nonlinearity, not the pipeline's.** The pre-registration said the
additive arm would be the floor of the synergy count, not zero. It was the ceiling: 698 / 435 / 629 / 712 / 591
distinct "synergies" in the control vs 674 / 689 / 569 / 640 / 490 under composition. The control's top synergies
are all on the *turning* axis — `orbit + spiral + tether + boost + mirror + pulse`, 2.97; `mirror + spiral +
mirror + thrust + tether + spiral`, 4.67 — bodies whose summed motion vectors (an orbit term plus a spiral term
plus a mirrored term) make a path that turns far more than any one term predicts, because turning is a nonlinear
function of the vector sum. The descriptor's "sum of single-part deviations" prediction is linear; the map from
motion vectors to a path is not; so additive mechanisms read as synergies. The measure is honest about what a
creature *does* and dishonest about *why*. A detector that separated the two would predict a combo's descriptor by
simulating the parts as independent channels (the additive arm's own semantics) and compare the compose pipeline
against *that* — the control arm becomes the null model of the detector rather than a second treatment.

**Saturation, as bet.** Three of five compose worlds held late-window discovery at ≥ 1/3 of the first; seeds 33
and 44 fell to 0.31 and 0.33 (the rule needed ≥ 0.333…; seed 44's 30 vs 92 misses by one cell). Two of five is not
a growth curve. The 22-part palette under a 6-slot cap, read by a 12-axis observer, is a bigger closed vocabulary:
it fills faster than `lib/ceiling.js`'s and then crawls, as `OPEN-ENDEDNESS.md` says a closed vocabulary must.
Across the five compose worlds the populations converged on two builds (the projectile chain and the boosted
runner); the kinds alive at tick 9,000 (78–86 genomes) are mostly neighbours of those two.

## What this says about the Isaac mechanism

Cross-modification earned its keep on one count and not the other. More behaviours (4/5), longer bodies (5/5), and
the far food reached by a chain that reads exactly like an Isaac synergy (homing × boost × tether × chain). But the
*measured* synergy count cannot tell the mechanism from the world, and a second road to the far food existed that
needed no cross-modification at all. The next lock has to be shaped so that only a transformed transform opens it,
and the next detector has to predict from independent channels, not from a linear sum. Both are written down above;
neither was run.

## Smoke disclosure

Two smoke runs (2 seeds × 1,500 ticks) before the hashes were frozen; they showed compose far food 40 / 17 vs 3 / 0
and the control already registering more synergies in one seed (98 vs 51). I read the first as support and the
second as noise. It was the result.
