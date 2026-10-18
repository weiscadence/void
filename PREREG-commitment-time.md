# Pre-registration: when does an open-vocabulary world commit to its fate?

**Written 2026-10-18, before the first full run.** Script frozen at
`commitment-time.js` sha256 `9f4a03d25cf59f5f2eb2dba3599fd84f1455ef1d931941fe4a162d40335c0956`,
engine `lib/open.js` sha256 `c5ec2078936017f56c36d0751056964478e34e87df7ccf902f177258456ceaf4`.
The only runs before this file existed were two smoke tests at `PARENTS=2 FORKS=1 TAUS=500,1000 H=1500`,
used to debug the identical-twin canary (it caught a field-name bug in my own exactness check, twice).
Nothing in those runs is read as evidence.

## 1. Where this comes from

`RESULT-openend-frontier.md` (2026-08-13): the open-vocabulary + niche-construction engine has a
**bimodal fate**. Of 16 seeds run to 40k ticks, ~55% froze early at 39-58 stable niches and ~45%
climbed slowly to 74-105, with a gap between the clusters. The freeze is dynamical, not a capacity
cap (doubling genome length changed nothing). The steering follow-up found early *exploration
breadth* is the causal lever (mutation multiplier moves the alive fraction 0% to 94%).

What that leaves open is the **shape of the commitment**. The literature frames this two ways:
historical contingency in the Lenski long-term lines (Blount, Borland & Lenski 2008 replayed
*E. coli* from frozen fossils to ask whether a key innovation depended on earlier, invisible
potentiating steps), and the 2026 "ingredients of open-endedness" work (Earle et al., GECCO 2026,
replicating Picbreeder with VLMs) which isolates *narrative momentum* — memory of the path — as a
candidate ingredient. Both ask the same thing in different costumes: **is a world's fate in its
state, and from when?**

## 2. The question

> Fork a world at time tau with fresh randomness. At what tau do the forks already share the
> parent's fate? Early (fate is a founder effect set within ~1k ticks), late (a commitment time
> exists somewhere in 1k-10k), or never (a running lottery, fate not in the state even at 10k)?

Secondary, directional: is the frozen basin **absorbing**? Count forks of frozen parents that
climb vs forks of climbing parents that freeze. If frozen parents' forks never climb while
climbers' forks sometimes freeze, the low basin is a trap and only early intervention can work.

## 3. Design, fixed now

- Engine config identical to the frontier result: `{tol:2, construct:true, stableAge:400, menuSize:0}`,
  50x50 grid, seeds `p*100+7` for `p = 1..8` (the same family `fate-distribution.js` used).
- **Horizon H = 30,000 ticks** (not 40k; CPU budget on a 2 vCPU box is ~20 min at nice 19 and a
  climber costs ~9 s to 30k). The seed-107 timing run reached 102 stable niches at 30k vs 105 at 40k,
  so the separation is already present at 30k. This is a choice made for cost, stated here.
- **Fate classifier:** stable niches at H `>= 65` → climber, `< 65` → frozen. 65 sits in the
  58→74 gap measured at 40k. Any world landing in `[58, 74)` is flagged **ambiguous** and counted;
  if more than 25% of forks are ambiguous the classifier is too coarse for this horizon and the
  verdict is downgraded to INCONCLUSIVE regardless of agreement.
- **Fork times tau = 1,000 / 3,000 / 10,000** — three cutoffs, reported separately.
- **Forks F = 3 per (parent, tau)** → 24 forks per tau, 72 total. Each fork restores the parent's
  full snapshot (organisms, locks, construction tags, grid, niche ledger, counters) and continues
  with a fresh RNG stream seeded from `(parent, tau, f)`.
- **Unit of analysis is the parent**, because forks of one parent are correlated. The headline
  number is pooled agreement; the honest companion is *parents unanimous* (all 3 forks agree).

## 4. Power, stated before the run

Base-rate agreement for two independent worlds with climb probability p is `p^2 + (1-p)^2`; at
p≈0.45 that is ≈0.50. With 24 forks per tau the binomial SD at 0.5 is ≈0.10, so the PASS line
of 0.90 is ~4 SD above chance. With 8 parents and 3 forks each, the unanimous-parents count has
chance expectation ≈ 8 × (0.45^3 + 0.55^3) ≈ 2.1. These are small numbers; this is a first
measurement of a shape, not a precise estimate. I will not read differences between adjacent
cutoffs smaller than 0.15 as meaningful.

## 5. Verdicts, written before the run

| verdict | condition |
|---|---|
| **EARLY COMMITMENT** | agreement at tau=1,000 `>= 0.90` |
| **LATE COMMITMENT** | agreement `< 0.90` at 1,000 but `>= 0.90` by some later tau; report the crossing |
| **PARTIAL COMMITMENT** | agreement at tau=10,000 in `[0.75, 0.90)` |
| **LOTTERY** | agreement at tau=10,000 `< 0.75` |
| **INCONCLUSIVE** | ambiguous forks `> 25%`, or both fates not present among parents |
| **VOID** | any canary below fails; no verdict is read |

Every verdict must be reported with its named reason (the measured agreement vector and the
fresh-seed base rate), per the house rule.

## 6. Canaries, scored before the verdict

1. **C1 detector-can-fire.** Eight fresh seeds (`5000 + q*100 + 7`, nothing shared with any parent)
   are classified and paired against every parent. Their agreement must be `< 0.85` *and* both fates
   must appear at least twice among the 8 parents. If every world freezes (or every world climbs)
   the classifier cannot discriminate and a 1.0 agreement would be a broken zero in disguise.
2. **C2 identical-twin decoy.** For two parents, a fork restores the snapshot at tau=1,000 **and the
   parent's exact RNG state**. It must reproduce the parent's stable-niche count, population and
   complexity at H to the integer. A leaky clone makes every agreement number meaningless → VOID.
3. **C3 classifier positive control.** A menu-capped world (`menuSize:12`, known to freeze at ~7
   stable niches) must classify as frozen.

## 7. What I expect, so it can be wrong

I expect LATE COMMITMENT with the crossing at tau=3,000: the frontier result says frozen worlds
settle by ~10k, and the leading-indicator work says exploration breadth at t=2,000 is the
strongest predictor, so I expect 1,000 to be too early and 10,000 to be too late to be interesting.
I expect the frozen basin to be absorbing (0 frozen→climber escapes at tau=10,000). If forks of
frozen parents climb at tau=10,000, "frozen by 10k" was wrong and the freeze is shallower than
the frontier writeup implies — that would be the more useful result.

## 8. What this does not test

Nothing here says *why* a world commits — the mechanism (exploration breadth) is the prior result,
not this one. This measures only *when the state carries the fate*. It also does not test
whether the commitment is recoverable by intervention after tau; that is the obvious next run.
