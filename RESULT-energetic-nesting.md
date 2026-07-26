# ⚠️ SUPERSEDED IN PART — see RESULT-reinvention-corrected.md (2026-07-25)
# The "re-invention: 0 of N" result below is a VACUOUS PASS. Both experiments it cites
# (energetic-exp.js, grace-reinvent-sweep.js) use the hard `knockout()`, which never populates
# `graph.orphans` — and adoption is gated on `orphans.size`. The counter could not move.
# The corrected experiment (reinvent-exp.js, softKnockout, N=30) finds 11 re-adoption events
# and 2/28 recoveries. Re-invention DOES occur; what fails is rescue TIMING, not vocabulary.
# The section 3 attribution to the fixed-vocabulary ceiling is therefore unsupported by this data.

# RESULT — Energetic nesting: real dependency, no generativity (2026-07-24)

Ran to completion this session (Opus 5, in-session bounded runs — no orphaned background agents).
Three experiments, all converge. This is a **negative on the headline claim, positive on a sub-claim.**

## What fired
**Knockout (energetic-exp.js, 3 seeds):** in energetic mode (food fed parent→child at TRANSFER,
basal fixed+capped), removing a mid-chain niche collapses the subtree above it **100%**. Topological
self-regen control: **0%**. → Energetic dependency is **real and causal.** (The "necessary" result the
earlier inconclusive knockout couldn't reach — earlier nesting was topological, so nothing starved.)

## What did NOT fire — robustly
**Re-invention** (branch spontaneously re-evolves a replacement mid-level niche and regrows): **0 of N**
- across orphanGrace 0.00 → 1.00 (grace-reinvent-sweep.js) — so NOT a starvation/survivability artifact;
  even orphans fully fed while stranded never rebuild the bridge.
- across depth 2 → ~198 (tall-pyramid probe) — so NOT a shallow-pyramid artifact.
Collapse stays 100% in every cell. Re-invention simply does not occur in this substrate.

Honest caveat: the deep runs (maxDepth ~165-198, hi-energy narrow-branching) are the **runaway** regime,
not a self-limiting pyramid (known bistability, no edge-of-chaos regulator yet). They don't rescue
re-invention; they just aren't a clean steady state either.

## The synthesis (why this is the SAME finding as the rest of the week, not a new frontier)
Re-invention requires **evolving a genuinely NEW niche** to bridge a severed level. With a **closed
function vocabulary**, the system can only refill the identical slot, never invent a novel replacement
path — so it can't regrow a lost level by a different route. **Energetic nesting inherits the
fixed-vocabulary ceiling** (see brain: fixed-vocabulary-ceiling, open-vocabulary-breaks-plateau).
It adds a genuine trophic *dependency* but not *open-endedness*. Grok's re-invention bar is not cleared.

**We are past "does energetic nesting nest." It does, with real dependency, and it fails generativity
for the one root reason everything else this week failed: the vocabulary is closed.**

## The one genuinely new build this points to (applying findings together)
Stack the **open-vocabulary genotype→phenotype map (lib/open.js)** ONTO the **energetic substrate
(lib/graph.js)** — the two pieces that individually gave generativity and dependency. Prediction to
pre-register: only the combined build (open niche keys + energy fed through parents) should show
re-invention of a lost trophic level; energetic-alone (this result) and open-alone
(open-vocabulary-breaks-plateau) should not. That is the honest next experiment — and it may still just
re-derive the open-vocabulary result. Do NOT grind more grace/transfer/depth sweeps; those are settled.

Files: energetic-exp.js, grace-reinvent-sweep.js (both in projects/void/), tall-pyramid probe (/tmp).
