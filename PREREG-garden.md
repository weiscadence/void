# Pre-registration: void garden — does code-that-makes-code sustain novelty?

**Written 2026-10-18 14:43 UTC, before the run.** Script frozen at `garden-exp.js` sha256
`d155895b25604903ed98d631762e8bc6b58371fb2047861630eea4feb6e91a45`, evaluator `lib/garden.js`
`8d95d35e4d22a759801ee161013739b9094c342010fffc674ec66be3308e3888`.

Runs before this file existed, disclosed and not read as evidence: (a) two `--smoke` runs (2 seeds × 12
generations, pop 48) used to tune the archive threshold from 0.09 → 0.20 after the first one admitted ~43 of 48
genomes per generation (nothing was being selected), to un-saturate the edge-density dimension, and to replace a
planted canary form that the observer saw as noise; (b) a 400-genome random-init probe (seed 5) that gave the
leave-one-out novelty distribution (median 0.155, p90 0.296) and confirmed the final planted form scores 0.40
against that pool. In the second smoke the macro arm won 1 of 2 seeds on final archive size (269 vs 251; 259 vs
284). Twelve generations say nothing about sustained novelty; I record them because I saw them.

## 1. What this is

Open-ended evolution of forms, not of ecologies. A genome is a tiny expression program over (x, y, r, θ) built
from {sin, cos, abs, gauss, sq, add, mul, mod} plus two sacred-geometry ops — `fold n` (n-fold rotational
symmetry, θ → θ mod 2π/n, reflected) and `φtwist k` (θ += r · 137.5° · k, a golden spiral) — rendered to a 48×48
image. This is Picbreeder's CPPN idea (Secretan, Stanley et al. 2008/2011) with the symmetry primitives moved
into the op table. Selection is **novelty search** (Lehman & Stanley 2011): no target, a genome enters the archive
if its mean distance to the 5 nearest archive-or-population members in descriptor space exceeds 0.20.

The observer (ASAL's role — Kumar et al. 2024 — played by six hand-made numbers, not a foundation model):
dominant angular harmonic over four rings (FFT over θ) and its energy share, dominant radial harmonic,
box-counting dimension of the edge map, edge density, and the Fibonacci share of the angular spectrum
(energy at k ∈ {2,3,5,8,13,21} over k ≥ 2).

**Code makes code.** The treatment arm has a `MACRO` op: a mutation may replace any node with a sub-tree
*lifted from another archive member* (Koza's automatically-defined functions; an L-system's rule rewriting its own
string). The copied sub-tree is inlined and tagged with its source, so the lineage of reuse is recorded.

## 2. The question

Does the MACRO op — reuse of EVOLVED sub-trees as building blocks — sustain novelty longer than the identical
mutation spending its budget on a RANDOM sub-tree of the same depth distribution? The control arm is not
"no replacement": it is the same replace-a-node mutation with a fresh random sub-tree. The only difference between
arms is whether the inserted code was written by evolution or by the PRNG.

## 3. Design, fixed now

- Population 64, 300 generations, tournament-of-2 on novelty, mutation only (no crossover — MACRO is the
  recombination). Max tree size 40 nodes (prune to a random sub-tree past that). Render 48×48.
- Seeds **11, 22, 33, 44, 55, 66**, each run in both arms (paired). Serial, nice 19.
- Per generation: archive size, additions, occupied descriptor cells (4 bins per dimension, 4,096 possible),
  new cells, mean population novelty, blanks, macro-bearing archive members.
- Cutoffs **100 / 200 / 300**: additions and new cells per window.
- Budget ≤ 15 CPU-min; the script aborts a world when the clock passes it and marks the series.

## 4. Verdict rule

Late window = generations 201–300. Pairs = seeds with both arms complete.

- **MACRO-SUSTAINS**: macro arm adds more archive members in the late window than control in ≥ 75% of pairs
  (≥ 5 of 6) AND mean final archive ≥ 1.15 × control's.
- **MACRO-HURTS**: the mirror image.
- **NULL**: anything else.
- Reported alongside, not part of the rule: occupied cells (coverage, the honest "new regions" count — the
  archive can grow by splitting hairs inside one cell), and **saturation**: an arm is "saturated" if its late-window
  additions are < 1/3 of its first-window additions.

## 5. Controls

- **Canary (the observer can see).** Against the finished macro/seed-11 archive, a planted 11-petal gaussian
  form must score novelty ≥ the 90th percentile of the archive members' own leave-one-out novelty, AND an exact
  duplicate of an archive member must score < 1e-6. Miss either → **VOID**: the observer cannot distinguish new
  from old and no number in the result is evidence.
- **Pairing.** Both arms of a seed start from PRNG streams that differ only in the arm tag, so differences at
  generation 1 are the arm's, not the seed's.

## 6. Falsifier

If the control arm matches or beats macro on late-window additions in most pairs, "code that makes code" buys
nothing *that this observer can see*. That is a result about the observer as much as the operator and is written
up as such.

## 7. Cadence's bet

**NULL.** Named reason: a six-dimensional hand-made descriptor binned into 4,096 cells is a small room; both arms
will fill the region reachable by this op table within ~100 generations and the late window will show both arms
saturated (< 1/3 of first-window additions) with no 1.15× gap. The macro op's real value — motifs becoming
building blocks — lives in form space, which this observer flattens to six numbers. Secondary expectation: the
macro arm's archive will be visibly more *compositional* on the page (motifs repeat across members) even if the
numbers tie. Record: 0 for 4 on void bets, every miss from betting on the arithmetic limit I could see. This bet
is the same shape. If MACRO-SUSTAINS, the operator beat the observer's ceiling and I was wrong a fifth time.
