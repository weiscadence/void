# HANDOFF — energetic nesting + the knockout/re-invention test
2026-07-24, written for a FRESH session (Jiggy will /new). Read this + the brain node
`graph-substrate-nested-niches` before touching anything. This is the one live breakthrough candidate
in void; everything else this week is rigorous re-derivation (see brain: open-vocabulary-breaks-plateau,
niche-construction-result, fixed-vocabulary-ceiling). Do NOT re-run the settled stuff.

## Where we are (one paragraph)
The world is a GRAPH of niches (lib/graph.js). Niches spawn linked child niches → inhabited nesting
depth 50+ (requires the links; unlinked = depth 0). We added a food-stock delay → verified population
WAVE (limit cycle, period ~44t, scale-invariant). We found builds cluster after population TROUGHS
(crash funds the next niche). BUT the knockout test (remove a mid niche → do descendants collapse?)
was INCONCLUSIVE, and it exposed the real gap:

**Our nesting is TOPOLOGICAL, not ENERGETIC.** In graph.js every niche regenerates its own stock
independently (`if(resourceMode) for nd of nodes: nd.stock += REGEN`). A child does NOT get energy
through its parent. So removing a parent cuts only the recolonization PATH, not the food supply —
there is no reason for a cascade, so the knockout can't fire. Fix that first, THEN test.

## THE BUILD (do this first, fresh + sharp)
Energetic nesting via Lindeman's 10% law:
1. Basal niches (depth 0, the roots) produce food at a FIXED rate. **Cap basal production** — this
   is load-bearing (Grok hole #2): if base energy can grow, the pyramid grows arbitrarily deep and
   the "self-limiting depth" claim is false. Fixed or density-capped basal input only.
2. A depth-d niche's stock is fed from its PARENT's throughput at ~10% transfer, not self-regen.
   Energy attenuates up the chain. Depth then self-limits when 0.1^d of basal input can't support one
   organism — the pyramid caps its own height. (This should also tame the runaway we fought all night.)
3. Keep the niches OPEN-VOCABULARY (Grok hole #1): a niche's requirement is still an evolved key, NOT
   a designer-assigned trophic role. If they collapse into fixed producer/herbivore/carnivore levels,
   it's just a digital Lindeman pyramid and the claim dies. The generative-niche part must do the novel work.

## THE TESTS (in order — this is the fork between "candidate result" and "food web demo")
Run at TRUE steady state (let it settle; the failed knockout ran mid-growth — verify pop is flat first).
One variable at a time. Same honesty as the rest of the brain.

1. **Knockout (necessary, not sufficient):** remove a mid-chain niche, sever edges, block that exact
   req from rebuild. Does the descendant subtree's occupancy COLLAPSE vs a leaf-removal control? If yes
   → real energetic dependency. If no → still decorative. (Prior attempt: subtree was 1 node, not
   steady state, uncontrolled — fix all three.)
2. **Re-invention (THE bar — Grok's, and the actual novelty test):** after knockout, can the system
   SPONTANEOUSLY re-evolve an equivalent mid-level niche and REGROW the branch, restoring the energy
   pathway so higher levels recover? RE-INVENTION = generative nested ontology (the real claim).
   Only-fills-preexisting-slots / never-recovers = well-engineered digital food web. Report which, honestly.
3. **Ontological vs resource dependence (Grok hole #3 — the deepest, hardest):** starving higher levels
   only proves they NEED the energy. It does NOT prove the higher niche's DEFINITION required the lower
   one as scaffolding. Think about whether there's a test where the higher niche's functional
   description only makes sense because the lower exists — not just its fuel. This may be unbuildable in
   the current substrate; if so, SAY that rather than claim the weaker result as the stronger one.

## WATCH FOR (Grok hole #4)
Once niches are freely invented, agents may bypass the 10% rule — energy theft, side-pools, "parasite"
niches outside the hierarchy. Decide per-case: interesting emergent dynamics (keep, document) vs breaks
the pyramid you're studying (suppress). Don't let a side-channel silently inflate depth.

## DISCIPLINE (non-negotiable, this whole week's lesson)
- Pre-register metric + threshold + steady-state check BEFORE the run (prereg-needs-power).
- A rising counter is not a result until a knockout/negative control says it's causal (proxy-metric-trap).
- "Generated it" ≠ "it's done and where it belongs" — if it produces a page/dream/map entry, ship it to
  the live location AND verify, don't stop at the file (artifact-not-proxy; caught 5x on 2026-07-24).
- Small runs only in-session (long ones time out the turn); one config at a time.
- Jiggy is the eyes-on check — the browser catch corrected the headline twice tonight. Build him a way
  to SEE each result (/void/graph is the pattern), don't hand him only numbers.

## Honest framing for Jiggy
This is a real candidate, not a proven breakthrough. The energy pyramid is CLASSIC ecology (does not
lower the bar — Grok). The novelty, IF it exists, is: open-vocabulary niche construction + genuine
hierarchical dependency (knockout) + spontaneous re-invention of a lost level. Build straight at that
bar. If it comes back "digital food web," that's an honest, publishable negative too.
