# RESULT — When does a world commit to its fate? (2026-10-18)

**Verdict (pre-registered rule): LATE COMMITMENT.** Fork agreement with the parent's fate was
**0.833 → 0.833 → 1.000** at τ = 1,000 / 3,000 / 10,000, against a fresh-seed base rate of
**0.625**. It crosses the pre-stated 0.90 line only at τ = 10,000. Named reason: at τ = 10,000 all
24 forks (8 parents × 3) share their parent's fate and all 8 parents are unanimous; at 1,000 and
3,000 four of 24 forks switched basins each time.

All three canaries passed before the verdict was read:

| canary | result |
|---|---|
| C1 detector can fire | both fates present among parents (2 climbers, 6 frozen); fresh seeds agree with parents at 0.625, exactly the expected `p²+(1−p)²` |
| C2 identical-twin decoy | both twins (seeds 107, 207, restored at τ=1,000 with the parent's exact RNG state) reproduced the parent's stable niches, population and complexity to the integer |
| C3 classifier positive control | menu-12 world classified frozen (9 stable niches) |

Prereg: `PREREG-commitment-time.md`, sha256 `59c87ab9e3d92a7f8d2661e66b30e0b48c4b905b4e7e1774113f6960e55e38f8`.
Script: `commitment-time.js`, sha256 `9f4a03d25cf59f5f2eb2dba3599fd84f1455ef1d931941fe4a162d40335c0956` (unchanged since the prereg).
Raw: `data/commitment-time.json`. Run: 8 parents, horizon 30,000 ticks, ~9 CPU-minutes at nice 19.

The decoy earned its place before the run: it caught a field-name bug in my own exactness check
twice during the smoke tests (comparing `st.prog`, which does not exist, so every twin read
"DIVERGED"). A canary that cannot pass is as useless as one that cannot fail.

## The table

| parent | fate @30k | forks @1,000 | @3,000 | @10,000 |
|---|---|---|---|---|
| 107 | climber (90) | 100, 98, 94 | 95, 84, 93 | 91, 96, 85 |
| 207 | frozen (38) | 40, **73**, 43 | 38, 37, 41 | 38, 38, 38 |
| 307 | frozen (37) | 40, 52, 50 | 37, 37, 37 | 37, 37, 37 |
| 407 | frozen (63, ambiguous band) | **71**, 46, **66** | 49, 45, 55 | 58, 53, 52 |
| 507 | frozen (40) | 46, 48, 51 | 41, 43, 47 | 40, 40, 40 |
| 607 | climber (81) | 94, 73, **60** | 87, **54**, **52** | 99, 98, 89 |
| 707 | frozen (37) | 39, 37, 36 | 38, 38, 39 | 37, 37, 37 |
| 807 | frozen (52) | 45, 45, 52 | **91**, 55, **86** | 52, 52, 52 |

Bold = fork landed in the other basin. Stable-niche counts at 30,000 ticks; classifier threshold 65.

Direction of the switches: at τ=1,000, 3 frozen→climber and 1 climber→frozen; at τ=3,000, 2 and 2;
at τ=10,000, 0 and 0. The frozen basin is **not** absorbing at 3,000 — parent 807, frozen at 52,
produced forks at 91 and 86 from its tick-3,000 state. My pre-stated expectation (crossing at
3,000, frozen basin already absorbing) was wrong in the direction of "later than I thought".

Ambiguous forks (landing in [58, 74)): 5/24 at τ=1,000 (21%, under the 25% downgrade line), 0 at
3,000, 1 at 10,000. Parent 407 itself sits in the band at 63 and is the least clean row.

## The finding I did not pre-register, and it is the real one

Look at the frozen rows at τ=10,000: **38, 38, 38 — 37, 37, 37 — 40, 40, 40 — 52, 52, 52**. Three
forks with three different random streams reproduce the parent *to the integer*, in population and
program complexity as well. Fresh randomness has no effect because **nothing stochastic is left to
happen**. I checked directly (`halt-time.js`, post-hoc):

| world | last birth or death | at the halt: exposed keys at crowd = 18 |
|---|---|---|
| 207 | tick 8,461 | 24 / 24 |
| 307 | tick 3,965 | 24 / 24 |
| 507 | tick 5,106 | 24 / 24 |
| 707 | tick 5,492 | 24 / 24 |
| 807 | tick 9,201 | 26 / 26 |
| 407 (ambiguous) | still breathing at 30,000 | 24 / 31 |
| 107, 607 (climbers) | still breathing at 30,000 | 17 / 54, 21 / 45 |

Every clean frozen world is a **halted demography**: zero births and zero deaths from its halt tick
onward (I verified 0/0 over 10,000→12,000 on two of them; construction events continue but are
no-ops — a walled-in rich organism re-planting its own key after a revert). And every key with an
organism exposed to a free cell sits at **crowd exactly 18**. That number is not a coincidence.
The yield law is `YIELD / (1 + crowd / CROWD)` with YIELD 4, CROWD 6, UPKEEP 1:

```
4 / (1 + 18/6) = 1 = UPKEEP
```

At crowd 18 harvest equals upkeep *exactly*, so energy is constant, so no one ever reaches the
reproduction threshold, so the crowd never changes. Organisms with no free neighbour accumulate
energy forever (max 19,701 in seed 207) but cannot place a child. The "frozen" basin of
`RESULT-openend-frontier.md` is therefore a **quantized fixed point of the crowding law**, reached
when every exposed key has filled to the integer where frequency dependence zeroes growth. It is
not an ecological plateau in the sense the frontier writeup implied; it is the dynamics switching
off.

This also explains the agreement curve without any appeal to "commitment": a world is committed
to the frozen basin at the tick its last exposed key hits 18, which for these seeds was between
3,965 and 9,201 — all before 10,000 and mostly after 3,000. 307 halted at 3,965 and its τ=3,000
forks were already unanimous; 807 halted at 9,201 and its τ=3,000 forks escaped twice. The
pre-registered answer ("crosses at 10,000") is right, and the mechanism says *why* it is right.

## What this corrects and what it does not

- `RESULT-openend-frontier.md` said the freeze is "dynamical, not a structural cap". Half right: it
  is not a capacity cap, but it is structural in a different way — an exact integer balance point in
  the yield formula. Any real-valued noise in yield or upkeep would remove the fixed point; whether
  the bimodality survives that is the obvious next run, and I would now bet it does not survive as a
  *halt*, though a slow basin may remain.
- The steering result (early exploration breadth is causal; `leading-indicator.js`,
  `intervention-sweep.js`) is untouched. More exploration means more keys, which means fewer keys
  reach 18 before the world finds somewhere new to grow.
- "Fate is bimodal and path-dependent" stands. "No world is unbounded" stands.
- Climbers never fell back after 10,000 (12/12 forks) *while still breathing* — that half of the
  commitment is real state-dependence, not a halt.

## Honest limits

- 8 parents, 3 forks each; the unanimous-parents count at τ=1,000 (5/8) vs chance (≈2) is suggestive
  of partial early state-dependence but the prereg forbade reading it and I will not.
- Horizon 30,000 not 40,000, for CPU. One parent (407) sits in the classifier's ambiguous band.
- The halt-time measurement is post-hoc, on the same seeds, with no canary of its own. The crowd-18
  arithmetic is exact, which is the only reason I trust it at n=5; treat the halt-tick values as
  descriptive.
- The frontier's claim that ~55% of seeds freeze was measured at 40k on 16 seeds; here 6/8 parents
  and 6/8 fresh seeds froze at 30k. Consistent in direction, and at these N the difference means nothing.

## Reproduce

```bash
node commitment-time.js          # ~9 CPU-minutes; writes data/commitment-time.json
node halt-time.js                # ~1 minute; the post-hoc halt census
```
