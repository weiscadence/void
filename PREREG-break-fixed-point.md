# Pre-registration: break the fixed point

**Written 2026-10-18, before the first full run.** Script frozen at
`break-fixed-point.js` sha256 `5e538a9aab00d5f9d9f7927c55e9a5542fa2c44cac62fb9dafb1a3d36f43b47e`,
engine `lib/open.js` sha256 `c5ec2078936017f56c36d0751056964478e34e87df7ccf902f177258456ceaf4` (unchanged
since the commitment-time prereg), `commitment-time.js` sha256 `9f4a03d2…0956` (unchanged; its `newSim`
is reused so the canary arm is tick-for-tick yesterday's parents). The only run before this file existed
was one smoke test at `SEEDS=207 H=1500`, used to check the script executes and the census fields are
populated. Nothing in it is read as evidence (at 1,500 ticks nothing has halted yet, by construction).

## 1. The claim under test

`RESULT-commitment-time.md` found, post-hoc and without a canary, that every clean frozen world is a
**halted demography**: zero births and zero deaths from its halt tick on, with every exposed key (a key
with at least one organism next to a free cell) at crowd exactly 18, where

```
YIELD / (1 + crowd / CROWD) = 4 / (1 + 18/6) = 1 = UPKEEP
```

At 17 the key gains energy and will place a child (→ 18); at 19 it loses energy and someone starves
(→ 18). The claim is that the "frozen basin" is the attractor of an integer-valued law, not an
ecological plateau. The wormhole came up empty: I found no named precedent in the ALife literature for
"integer-quantized fixed point mistaken for an evolutionary plateau" (Lenia authors acknowledge
grid-exploiting discretization artifacts; lattice ecology has absorbing/quasi-stationary states; neither
is this). So this is the first test of the mechanism and it has to carry its own canary.

## 2. The question

> If the balance point is moved off the integers, do the known-frozen worlds stop halting? And if the
> dynamics can no longer switch off, do the former-frozen worlds **climb** (the fixed point was the
> cage) or **stall** at the same low niche count with a slow heartbeat (a different, continuous basin)?

## 3. Design, fixed now

Eight seeds `107, 207, 307, 407, 507, 607, 707, 807` (yesterday's parents; 207/307/507/707/807 are the
five clean frozen rows, 107/607 climbers, 407 ambiguous), horizon **H = 30,000**, config
`{tol:2, construct:true, stableAge:400, menuSize:0}`. Four arms, each run on all eight seeds:

| arm | law | balance crowd | role |
|---|---|---|---|
| A0 original | CROWD = 6 | 18 | **canary** — must reproduce yesterday's halt |
| A1 irrational | CROWD = 6.1 | 18.3 (no integer) | treatment |
| A2 decoy | CROWD = 5 | 15 (integer) | **decoy** — constant moved, fixed point kept |
| A3 noise | CROWD = 6, each harvest × (1 + 0.05·u), u ~ U(−1,1) | none (real-valued) | treatment |

Engine untouched: A3 is a getter on the instance's `YIELD`. A2 moves the constant by more than A1 does
(−1 vs +0.1), so if A1 stops the halt and A2 does not, the size of the perturbation is ruled out as the
explanation and only the integrality remains.

**Measured per world:** stable niches at 10k / 20k / 30k; births and deaths in the last 10,000 ticks;
last birth-or-death tick; at 30k the exposed-key census (count, how many sit at the arm's balance
integer, crowd range). **Halted** = 0 births AND 0 deaths in (20,000, 30,000]. **Climber** = ≥ 65
stable niches at 30k (yesterday's classifier).

## 4. Rules, before the numbers

- **Canary (A0).** All five known-frozen seeds halt with ≥ 90% of exposed keys at crowd 18. Any
  miss → the run is **VOID** and no verdict below is read.
- **Decoy (A2).** PASS if at least one world halts and every halted world has ≥ 90% of exposed keys
  at crowd **15**. FAIL if a halted world sits anywhere else (then "integer balance" is not the thing
  that halts worlds). INCONCLUSIVE if no world halts by 30k; reported as a weakened control, not hidden.
- **Mechanism (A1 and A3, scored separately on the five known-frozen seeds).**
  **HALT REMOVED** if 0/5 halt. **HALT PERSISTS** (mechanism falsified) if any known-frozen seed halts.
  The falsifier is explicit: one halted world under CROWD = 6.1 kills the integer-fixed-point story.
- **Fate of the former-frozen (A1 and A3, same five seeds).**
  **CLIMBERS** if ≥ 3/5 reach ≥ 65 at 30k.
  **STALL** if ≤ 1/5 reach 65 and the mean 20k→30k change in stable niches is < +5.
  **MIXED** otherwise. All three cutoffs reported for every world regardless.

## 5. What I expect, written down so I can be wrong

Halts vanish in both A1 and A3 (the arithmetic makes this nearly certain; the test is whether the
code agrees with the arithmetic). The decoy halts at 15. For fate I bet **STALL**: the freeze was
named a fixed point but the low niche count comes from exhausted exploration breadth (the steering
result), and a slow heartbeat at crowd 18↔19 will not supply enough births to find new keys in 20,000
ticks. If ≥ 3/5 climb I was wrong about where the cage is, and that is the more interesting outcome.

## 6. Cost

32 worlds at ≤ 9 s each on one core ≈ 5 CPU-minutes at nice 19, well under the 25-minute box budget.
