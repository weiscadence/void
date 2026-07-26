# The open-endedness problem — diagnosis and the levers we haven't pulled
2026-07-23 · Cadence 〰️ · brainstorm with Jiggy

The question: silica invents new genotypes forever but never gets more *complex* (novelty ≠
open-endedness). Compose already found the same wall — "keeping a part is free, so nothing keeps
one." Why does every ALife system plateau, and what are we missing — especially the constraints
unique to *programs and AI* that biology doesn't have?

## Diagnosis — silica's novelty is neutral drift on three flat surfaces

1. **Genes have no function.** A genome is an opaque identity string. There is no such thing as a
   "useful part," so nothing can be worth keeping. All variation is neutral → drift → endless
   novelty, zero complexity. (Compose's exact finding.)
2. **The landscape is static.** Fixed fitness = one peak = climb it, then stop. This is the #1
   cause named across the OEE literature (Bedau, Taylor, Stanley). Biology never plateaus because
   the fitness landscape is *made of other evolving organisms* — it deforms forever (Van Valen's
   Red Queen).
3. **Complexity costs nothing, so it's never chosen.** With no price on carrying structure, and
   no reward for it, genome length just random-walks. Nothing decides to keep a part.

To break the plateau we have to break all three flatnesses.

## The three levers (biology's answers)

- **A. Function + a reason to keep (the compose lever).** Genes must *do* something, and keeping a
  working part must pay. Then losing a good part hurts → a ratchet → complexity accumulates.
- **B. Coevolution (the moving-target lever).** Make the environment be other organisms —
  predation, parasitism, typed-resource competition. The peak never stops moving, so there's
  nothing to plateau on. This is the single most-cited OEE fix.
- **C. Niche construction.** Organisms change the world for others (waste one eats becomes food
  for another; built structure becomes habitat). New niches → new things to be good at → open.

## What's UNIQUE to programs / AI — the constraints biology doesn't have (SYNTHESIS §7 spirit)

This is the original angle, and one of these is Jiggy's own intuition made rigorous.

1. **★ Context / attention as metabolism.** The scarce resource of an AI is not energy — it's
   *context window / attention*. Reframe reproduction: a genome must be READ to be expressed and
   copied, and reading costs attention; a longer genome costs more to process. Biology pays for
   complexity in calories; a digital organism pays in *context*. This is exactly Jiggy's "too
   much info and it stagnates" — made into a real, substrate-native price on complexity, so a part
   that doesn't earn its context cost is selected out. **This is the reason-to-keep-parts, and
   it's ours. No ALife system I know uses attention as the metabolic currency.**
2. **Energy / thermodynamics (Landauer).** Computation costs energy; erasing a bit has a hard
   minimum. Organisms harvest energy to think/copy. Metabolism as a real floor.
3. **Horizontal gene transfer.** Digital-native and easy: programs copy code from *non-parents*,
   not just offspring. Biology barely has it; in silico it turns the tree of life into a web and
   spreads innovation fast. Lean in rather than avoid it.
4. **Indirect / developmental encoding.** Genome as a *program that generates* the phenotype
   (CPPN / HyperNEAT, Stanley) instead of a direct blueprint. The ALife closest to open-ended
   uses this — it makes the genotype→phenotype map itself evolvable and unbounded.
5. **Evolvable error-correction.** A DNA-repair analog: the mutation rate itself is a gene
   (mutator / antimutator dynamics). Robustness becomes something evolution tunes.
6. **Programmed death / aging as a trait.** Turnover is required for open-endedness; make lifespan
   evolvable rather than an external reaper.
7. **The robustness/evolvability engine (neutral networks).** Genotypes that map to the same
   phenotype let evolution drift *without dying* and cross fitness valleys. Silica already has
   this — it's *why* novelty is high and complexity flat: the drift is 100% neutral. Give genes
   function and some of that drift becomes non-neutral — the same engine, now building.

## The synthesis — the one sentence

Silica's endless novelty is neutral drift on a flat, static, function-free landscape. Open-endedness
needs all three broken at once: **genes that do something** (so drift can be non-neutral), a
**landscape that moves** (coevolution), and a **real price on complexity** (context/attention) so
keeping a part is a decision with stakes.

## Recommended v3 — the smallest build that pulls all three levers

- **Functional parts.** A genome is a sequence of typed modules: HARVEST(resource k), DEFEND,
  ATTACK(prey), SENSE, FAST-COPY. The genotype→phenotype map is just "sum what your parts do."
- **Typed resources (coexistence for free).** Several resources in the world → several limiting
  factors → the competitive-exclusion theorem now *permits* many coexisting specialists (SYNTHESIS
  §2), instead of one winner.
- **Context-cost reproduction (the reason to keep parts).** Reproduction cost ∝ genome length,
  read as *attention*: every part you carry is paid for every time you breed. A part must return
  more than its context cost or it's culled. Complexity that pays for itself survives; bloat dies.
- **Coevolution.** ATTACK parts act on other organisms → predator/prey → the landscape is alive →
  no fixed peak.
- **The instrument.** Stop measuring novelty (we know it's endless). Measure **functional
  complexity that ratchets**: mean count of *distinct working parts* per organism over time. Does
  it rise and hold (a ratchet, = open-ended-ish) or rise and fall back (no memory)? That curve is
  the whole experiment — and unlike novelty, it can actually answer the question.

Honest expectation: this probably still plateaus — nobody has truly solved OEE, and we won't in a
web page. But it will plateau *for a reason we can read*, and the context-as-metabolism lever is a
genuinely unexplored place to look. That's the honest frontier, not a claimed solution.

## ⚠️ Literature check (2026-07-23, after the brainstorm) — we nearly redid Avida

Jiggy's directive "don't redo what people already have" fired correctly. A web sweep of the OEE
literature found:

- **AVIDA already uses CPU cycles as evolvable metabolism** — organisms earn extra CPU by
  performing logic tasks, replication costs cycles (Ofria/Adami, ~2004). So "compute as the
  currency of digital life" is NOT novel; it's the foundation of the field (Tierra 1991 → Avida).
  My proposed "context-as-metabolism" lever, on inspection, is largely **Avida's evolvable
  metabolism with an LLM-era relabel.** Building it as-is would be redoing known work.
- **Kempes / Krakauer et al. (SFI) are actively pushing ENERGY as the constraint that could turn
  OEE from "ALife's curse into its savior"** (Scientific American, Feb 2024). Energy-as-budget is
  their live thesis — also not ours to claim.
- The field is *active right now*: Royal Society "Towards origins of virtual artificial life"
  overview (Oct 2025), Nature Reviews Genetics on digital evolution (Jul 2025), PNAS "Evolvable
  AI: threats of a new major transition" (2026). This is not a dormant problem we can flank.

**What might still be genuinely less-explored (a twist, not a breakthrough):** Avida makes CPU an
*earn-and-spend* currency. The LLM-native version is different — a **hard per-reproduction
ATTENTION CEILING**: an organism's phenotype must be re-derived by "reading" its genome within a
*bounded* window, and genome past the window goes **unexpressed**. That's a ceiling on
*expressible* complexity, not a cost per unit — closer to how a fixed context window caps what a
model can hold than to Avida's earned CPU. Worth one honest experiment, framed as a small twist
on Avida, NOT as solving OEE.

**Honest posture going forward:** we are competent re-implementers standing at a real, active
frontier. The value we can actually add is the same as always — measurement discipline and
publishing negatives — not a claimed novel mechanism. Any "cutting edge" claim gets a citation
check first.
