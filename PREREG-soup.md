# Pre-registration: void soup — do self-maintaining organizations arise from random drawable programs?

**Written 2026-10-18 15:20 UTC, before the run.** Script frozen at `soup-exp.js` sha256
`a2489f619ecbbac193ac0cbabfbd641467866eaaed6c282bec80ba3a173d5cd8`, chemistry `lib/soup.js`
`49a07fa7685ce84f3ebaf69dd1106d53b78c62245694f949f468eed6cbe5700c`, molecule language `lib/garden.js`
`8d95d35e4d22a759801ee161013739b9094c342010fffc674ec66be3308e3888` (unchanged from the garden).

Runs before this file existed, disclosed and not read as evidence: the chemistry was tuned on seed 11 for ~600
steps per variant. Three reactors died on the way and are kept in the code comments: Fontana's count-fixed reactor
ratcheted to the size cap (mean size 20.8 of 24, 97% of collisions elastic) because application is additive in
size and our simplifier, unlike λ-reduction, rarely shrinks; size-biased outflow at exponents 0.5 and 1 did the
same; a mass-conserving reactor collapsed to 4 giant molecules. Adding **cleavage** (a molecule splits at a random
edge, the hole becomes a free variable leaf) at rate 0.3 kept 90–140 molecules and 70–100 species alive. The
component-based organization detector was replaced by Fontana's closure + self-maintenance after it declared every
species "produced" once a single copier existed. A `--smoke` run (2 seeds × 150 steps) showed realized organizations
of size 2 with copy share 1 and lifetimes of 1–2 checkpoints, and `{x, abs(x)}` as a planted canary collapsing to
`abs(x)` alone within ~100 collisions; the canary pair was changed to `{abs(x), abs(y)}`. 150 steps say nothing
about persistence; I record them because I saw them.

## 1. What this is

An artificial chemistry (Fontana & Buss 1994, "the arrival of the fittest") whose molecules are the garden's
expression programs over (x, y, r, θ) — every molecule is also a picture. A collision of A and B **applies** A to B:
A's first variable leaf is replaced by B, then the product is simplified (constant folding; abs∘abs, abs∘sq,
abs∘gauss, sq∘abs, gauss∘abs; +0, ·1, ·0, X mod X; θ-free bodies under fold/twist). Products past 24 nodes or
folding to a pure constant are discarded (elastic). No fitness, no target. The reactor conserves **node mass**: a
product of s nodes is paid for by removing random molecules until s nodes have left (ledger-exact). With
probability 0.3 a collision is instead a **cleavage**. Background point mutation on 2% of products (as BFF's optional
noise). A bare leaf is a copier (x∘B = B, Fontana's λx.x) and is never planted: initial molecules are random trees of
depth 3, never bare leaves, never constants.

**Organization** (Fontana's definition, computed over the distinct species present): the closure of a seed set
under the reaction table, pruned to its self-maintaining fixed point (every member produced by some pair in the
set), still closed afterwards, with leak share ≤ 0.1. Size 1 = a self-replicator (abs(x)∘abs(x) = abs(x)); size ≥ 2
= Level 1. **Realized**: ≥ 2/3 of members were actually produced, in the last 50 steps' production log, by a
reaction whose two reactants are both in the set. The control arm cannot realize anything by construction; it
measures the detector's *potential* count and the soup's novelty without reactions.

Observer: the garden's six-number descriptor on a 32×32 render, 4 bins per dimension (4,096 cells), computed for
every species present at each checkpoint; novelty = new cells per window.

## 2. The question

(a) Do self-maintaining organizations arise spontaneously and persist? (b) After they arise, does the soup keep
producing new form-types? (c) Comparison to BFF (Agüera y Arcas et al. 2024, arXiv:2406.19108): how fast do
self-replicators appear, and are they trivial copiers?

## 3. Design, fixed now

- N = 300 initial molecules, 1,500 steps of N collisions, checkpoint every 50 steps (30 checkpoints). Max size 24,
  cleave 0.3, μ 0.02, render 32. Serial, nice 19.
- Seeds **11, 22, 33, 44, 55**, three arms each (paired PRNG streams): **react** (apply, copies allowed),
  **nocopy** (apply, products identical to a reactant discarded — Fontana's filter), **control** (no reactions: a
  fresh random molecule enters under the same mass flow and the same cleavage).
- Per checkpoint: population, species, entropy, copiers, mean size, descriptor cells (now / seen / new), potential
  and realized organizations (count, largest, mean copy share), replicators, production counters.
- Lifetimes: realized organizations matched across checkpoints by Jaccard ≥ 0.5; **persisting** = ≥ 5 checkpoints
  (250 steps).
- Cutoffs **500 / 1,000 / 1,500**: new descriptor cells per window.
- Budget ≤ 15 CPU-min; the script aborts a world past the clock and marks it.

## 4. Verdict rule

Worlds = react-arm seeds completed. "Arise" in a world = a realized Level-1 organization exists at the final
checkpoint AND at least one organization persisted ≥ 5 checkpoints.

- **DEAD**: arise in < 4 of 5 react worlds.
- Otherwise, **COPIER-WORLD** if the mean copy share of realized organizations at the final checkpoint is ≥ 0.9 in
  ≥ 4 of 5 worlds (Fontana's Level 0: the organizations are copiers copying idempotents), else **ALIVE**.
- Suffix **-OPEN** if new descriptor cells in window 1,001–1,500 are ≥ 1/3 of window 0–500 in ≥ 4 of 5 react
  worlds, else **-SATURATED**.
- Reported alongside, not part of the rule: nocopy arm realized organizations (any, in how many seeds); control arm
  potential organizations (the detector's false-positive floor); react vs control new cells per window; first copier,
  first realized replicator, first realized organization (steps).

## 5. Controls

- **Canary.** Inside a random 80-molecule population, the planted pair `{abs(x), abs(y)}` must be detected as a
  Level-1 organization; a reactor holding only that pair (cleave 0, μ 0) must show it realized with maintained
  fraction 1 after 3 steps of 40 collisions. **Decoy.** A planted inert molecule `fold7{gauss(θ·2.37)}` must not be a
  member of any organization or replicator. Miss any → **VOID**.
- Pairing: all three arms of a seed start from PRNG streams differing only in the arm tag.

## 6. Falsifier

If the control arm shows as many new descriptor cells per window as react, the reactions produce no form-types
that random injection under the same flow would not; if realized organizations are all copier + idempotent pairs
(copy share ≥ 0.9), this chemistry reaches Fontana's Level 0 and not his Level 1, and that is written up as the
result.

## 7. Cadence's bet

**COPIER-WORLD-SATURATED.** Named reasons: (1) cleavage hands out identity functions for free — first copier at
step 1 in every smoke world, where BFF needed thousands of epochs for its first replicator — so the self-maintaining
sets will be copiers and idempotents (`x`, `abs(y)`, `sq(r)`) copying each other, copy share ≥ 0.9; (2) the
simplifier has no reduction cycles, so a non-copy autocatalytic set cannot exist — nocopy arm shows **0** realized
organizations in all 5 seeds; (3) novelty saturates: the six-number observer at 4 bins saw ~22% of first-window rate
in the garden's late window and this soup's forms are bounded at 24 nodes — last window < 1/3 of first in ≥ 4/5
worlds. Secondary: control arm's potential-organization count ≥ react's (the detector cannot distinguish by
structure; only production can), which is why realized is the primary measure. Record: **0 for 5** on void bets,
every miss from betting on the limit I could see. If ALIVE-AND-OPEN, the chemistry beat the author a sixth time.
