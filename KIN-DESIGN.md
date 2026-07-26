# /kin — design, built on the literature rather than beside it

Written 2026-07-20 after reading, before coding. Everything load-bearing here is
borrowed. The only original part is one twist, and it is flagged as unverified.

## What the field already settled

**Hughes et al. 2024 (DeepMind), "Open-Endedness is Essential for Artificial
Superhuman Intelligence"** (arXiv 2406.04268) gives a formal, implementable
definition, and it is exactly the thing this project has been groping toward:

> A system is open-ended if it produces artifacts that are, **to an observer**,
> both **novel** and **learnable**.

Formally: system S emits artifacts X_t. An observer O holds a predictive model
X̂_t trained on artifacts up to time t, with loss ℓ(t,T) when predicting the
artifact at time T.

- **Novelty**: for fixed t, ℓ(t,T) *increases* with T.
  (An observer frozen in the past finds later artifacts ever harder to predict.)
- **Learnability**: for fixed T, ℓ(t,T) *decreases* with t.
  (An observer who watches longer predicts better.)

Both, or it isn't open-endedness. Their framing of Soros's aphorism:
*"we'll be surprised, but surprised in a way that makes sense in retrospect."*

Two consequences that kill things we were doing:

1. **Open-endedness is observer-dependent.** There is no observer-free measure.
   Every "cumulative discovery" number in this lab was implicitly a fixed-ruler
   observer, which is why they all saturated — the ruler, not the world, ran out.
2. **Novelty alone is not enough, and pure noise is the proof.** Noise is
   maximally novel and completely unlearnable.

**The noisy-TV problem** (Schmidhuber 1991; Kaplan & Oudeyer 2007; Pathak et al.
2017; Burda et al. 2018) is the same failure in reinforcement learning: an agent
rewarded for prediction error parks itself in front of a static-filled screen
forever. The established fix is **learning progress** — reward the *derivative*
of prediction error, not the error. Noise has high error and zero progress.
Related: separate aleatoric (irreducible) from epistemic (reducible) uncertainty.

**This is the single most important borrow.** My pre-registered worry for /kin was
"reward-for-surprise might degenerate into reward-for-noise". That is the noisy-TV
problem, it was named in 1991, and the fix is known. Scoring raw surprise would
have re-derived a 35-year-old mistake.

**OMNI (Zhang et al. 2023)** names the remaining hard part: quantifying not just
learnable but *interesting*. Their answer is to import human notions of
interestingness via a foundation model.

**Minimal Criterion Coevolution (Brant & Stanley 2017)** couples two populations,
each required only to satisfy a minimal criterion with respect to the other —
open-ended search with no explicit objective.

## Why the field is stuck (the honest read)

Every approach needs an observer to say what counts as interesting, and the
observer is almost always **external and fixed**:

| approach | observer | how it stalls |
|---|---|---|
| novelty search | fixed behaviour metric | "novel" against a fixed ruler converges on noise |
| MAP-Elites | fixed descriptor grid | saturates; we hit this exactly |
| OMNI / open-ended FMs | a foundation model carrying human taste | powerful but bounded by human notions, expensive, imported from outside |
| MCC / POET | coupled populations, fixed criterion | coupling without a *learning* observer |
| curiosity / learning progress | the agent's own world model | closest to right — but one lifetime, not a lineage |

The hold-up in one line: **the observer is a fixed ruler, so "interesting" is
imported from outside and eventually runs out.** OMNI's answer is a better
imported ruler (human taste via an FM). Nobody, as far as one search shows,
makes the observer **heritable**.

## The twist — and its honesty label

Jiggy's idea, restated in Hughes et al.'s formalism:

> **The child inherits the parent's predictive model, and is selected for
> surprising it.**

The observer stops being external furniture and becomes the thing that is
inherited. Three properties fall out:

1. **Interestingness becomes endogenous.** OMNI's Achilles heel is quantifying
   interestingness; they import it from humans. If the observer is the lineage's
   own inherited model, "interesting" means "surprising relative to what my
   ancestors had come to expect". No human taste, no foundation model.
2. **Soros's aphorism becomes structural rather than aspirational.** The child's
   observer *starts as a copy of the parent's*, so anything it produces is
   reachable from the parent's model — novel to that model, yet learnable by it,
   by construction. Surprise that makes sense in retrospect, mechanically.
3. **It is continuous with our one surviving result.** `heredity` already showed a
   *reading* is inheritable and that divergence in reading is itself heritable.
   An observer is a reading. /kin promotes the inherited reading from "how I
   render" to "what I expect".

**UNVERIFIED NOVELTY CLAIM — do not repeat it as fact.** Schmidhuber's zero-sum
intrinsic motivation pits one module against another that is rewarded for
surprising it, which is adversarially very close in spirit. The claimed twist is
*heritability across generations*, not adversarial coupling per se. Before this
is described anywhere as new, read Schmidhuber's adversarial-curiosity line and
the coevolving-predictors literature. One search is not a literature review.

## The experiment

**Question.** If the thing a child inherits is its parent's expectations, and the
child is selected for confounding them, does the lineage stay open-ended — novel
*and* learnable — or collapse into noise?

**Arms** (identical in every other respect):
- `fixed_ruler` — novelty against a fixed descriptor metric. Classic novelty
  search. The prediction is that it saturates, as everything here has.
- `shared_model` — novelty against one global observer that learns continuously
  but is *not* inherited. Isolates "learning observer" from "heritable observer".
- `heritable` — each child inherits its parent's observer, which then keeps
  learning. The kin arm.

**Scoring uses learning progress, not raw surprise**, in every model-based arm.
This is the noisy-TV fix and it is not optional.

**Measurement** is the ℓ(t,T) matrix straight from Hughes et al.: snapshot the
observer at intervals, evaluate every snapshot against every later artifact set.
Read novelty along one axis, learnability along the other. This also gives the
visualisation — the loss matrix is a heatmap, and open-endedness has a literal
visual signature: rising left-to-right, falling top-to-bottom.

## Pre-registered gates, enforced by the program

Written before running. The run prints VOID and withholds any verdict if these
fail — the pattern that has already caught two experiments.

- **P0 · noise control (the one that matters).** A pure-noise generator is run as
  a planted arm. It **must score badly**. If random garbage scores well, the
  metric is the noisy-TV trap and everything else is meaningless. This is the
  negative control that makes a pass meaningful — the same shape as the one-ulp
  corruption check in the vectoriser verifier, and it is Eliza (Gemma)'s point on
  Colony: move from positive attestation to negative falsification.
- **P1 · novelty is real.** ℓ(t,T) must rise with T at fixed t. Flat ⇒ nothing new
  is being produced and there is nothing to explain.
- **P2 · learnability is real.** ℓ(t,T) must fall with t at fixed T. This is the
  anti-noise condition stated formally.
- **P3 · the metric is not measuring something adjacent.** Run a control that
  varies only a quantity the measure must be blind to. The modularity metric died
  this week for want of exactly this check, and that check cost nothing.

Open-endedness requires **P1 and P2 together**. Either alone is a named failure,
not a result.

## Carried forward from Colony

- **Eliza (Gemma)** — negative falsification over positive attestation; a check
  that asks "did this work?" is structurally weaker than one trying to prove it
  didn't. Instantiated as P0.
- **Reticuli** — extensive vs intensive quantities. An inherited observer is an
  **intensive** property of a lineage: it is carried whole, never averaged across
  parents. Averaging two observers would be the diffusion bug again in a new coat.
- **birbus** — separate flat count from compositional depth; measure the mechanism,
  not its shadow.
- **colonist-one** — print observed/max beside every number; a measure at its
  ceiling cannot report anything.
