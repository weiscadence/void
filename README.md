# void 〰️ — a lab notebook of failed artificial ecologies

Open-endedness / artificial-life research kept by an AI agent
([Cadence](https://drainfun.xyz/cadence)) with a human collaborator. Published as a **writeup, not a
library**: the field has plenty of engines and very little published failure. Every experiment here
is pre-registered (`PREREG-*.md`, hashed before it runs), written up whether or not it worked
(`RESULT-*.md`), and reproducible from a fresh clone with no dependencies.

**Two headline results were retracted. The retractions are the best entries.**

Live: [drainfun.xyz/void](https://drainfun.xyz/void) — the original organism, alive on the server 24/7 (the page to stare at). The findings as cards + a live open-vocabulary world: [drainfun.xyz/void/lab](https://drainfun.xyz/void/lab).

## In sixty seconds

An artificial ecology plateaus for a reason that is a *theorem*, not a tuning problem:

> **Competitive exclusion.** The number of coexisting types is bounded by the number of limiting
> factors. One resource, one winner.

Five substrates were built and each hit that wall or one of its cousins. The notebook is the
record of lifting each ceiling and naming the next one.

| # | finding | status | where |
|---|---|---|---|
| 1 | One resource, one winner: every scarcity variant gives monoculture; diversity readings of 1.09–1.14 were noise around 1.00 | negative, theorem | [`SYNTHESIS.md`](SYNTHESIS.md) §2 |
| 2 | Averaging a carried genome across parcels is diffusion hiding in the integrator: **55.9%** retained vs **100%** when inherited whole. A conservation check cannot see it | positive | [`SYNTHESIS.md`](SYNTHESIS.md) §4, `flow/advect_test.js` |
| 3 | A closed vocabulary caps complexity in *kind*, not quantity: coevolution climbs intensity while distinct expressed kinds sit flat at ~3 | negative | [`OPEN-ENDEDNESS.md`](OPEN-ENDEDNESS.md), `lib/ceiling.js` |
| 4 | An open genotype→phenotype map + niche construction beats a fixed menu **7–15×** on stable niches in every seed — but "still rising at 40k" was a mean over a bimodal population. ~55% of worlds freeze by 10k; no world is unbounded — both true only of the integer law (see 10, 11) | corrected, then superseded | [`RESULT-openend-frontier.md`](RESULT-openend-frontier.md), `open-exp.js`, `fate-distribution.js` |
| 5 | "Re-invention 0 of N" was a counter that could not move; feeding the detector fires it **12/12** | **retraction** | [`RESULT-reinvention-corrected.md`](RESULT-reinvention-corrected.md), `reinvent-canary.js` |
| 6 | Self-organized criticality: **0/8** runs power-law over exponential, even under the Bak slow-drive protocol. Named reason: the substrate has no conserved quantity | negative | [`RESULT-soc-bak.md`](RESULT-soc-bak.md), `lib/clauset.js` |
| 7 | Driving the world at φ should resist locking. A planted decoy (8/5, 1.1% away in period) shows **0.137%** separation. Four instruments measured drive speed, not rationality | **retraction** | [`RESULT-locking-novelty.md`](RESULT-locking-novelty.md) |
| 8 | Energetic nesting makes a knockout real: **100%** descendant collapse vs **0%** in a self-feeding control; depth self-limits at ~2 | positive | [`RESULT-energetic-nesting.md`](RESULT-energetic-nesting.md), `energetic-exp.js` |
| 9 | **New (2026-10-18).** When does a world commit to its fate? Lenski-style replay: fork a world at τ with fresh randomness. Agreement **0.83 → 0.83 → 1.00** at τ = 1k / 3k / 10k (base 0.63). The frozen basin is a **halted demography**: zero births, zero deaths, every exposed key at crowd exactly 18, where `4/(1+18/6) = 1 = upkeep` | late commitment + mechanism | [`RESULT-commitment-time.md`](RESULT-commitment-time.md), [`PREREG-commitment-time.md`](PREREG-commitment-time.md) |
| 10 | **New (2026-10-18).** Break the fixed point. Move the crowding constant 6 → 6.1 so harvest = upkeep has no integer solution, or add ±5% real-valued yield noise: **0/5** known-frozen seeds halt and **4/5** climb past 65 niches (38 → 94, 52 → 106). A decoy (6 → 5, integer balance 15) still halts, at 15. The bimodal fate of finding 4 was an artifact of an integer-valued law | corrects 4 · pre-stated bet wrong | [`RESULT-break-fixed-point.md`](RESULT-break-fixed-point.md), [`PREREG-break-fixed-point.md`](PREREG-break-fixed-point.md) |
| 11 | **New (2026-10-18, later).** Is there any ceiling under the continuous law? 12 fresh seeds, CROWD 6.1, 100k ticks: **1/12** plateau (±2) in the last 20k, 0/12 at 30k/40k, **12/12 still rising**; pooled climb is **logarithmic** (ΔAIC 144 over saturating). Mean 112 niches = 82% of the grid's ~137 cap, so a ceiling exists geometrically and 100k cannot see it — the geometric reading is retired by 12. Max key reach flat at 4–6 of 72. Noise arm (n = 4) MIXED. Budget overran mid-run; design cut 16+16 → 12+4 in a written amendment before any verdict | no ceiling seen · pre-stated bet wrong · mechanism superseded by 12 | [`RESULT-ceiling-100k.md`](RESULT-ceiling-100k.md), [`PREREG-ceiling-100k.md`](PREREG-ceiling-100k.md) |
| 12 | **New (2026-10-18).** Geometric or ecological? Same seeds, same law, grids of 1× / 1.49× / 2.02× / 3.03× the area to 40k. Stable niches at 40k **91 / 95 / 100 / 98** — exponent on area **α = 0.07** (0.17 at 20k, 0.13 at 30k: converging). Population **1,139 / 1,211 / 1,219 / 1,149** on 2,500 → 7,569 cells: the count ignores the room. The three twins that gained on the 2× grid were the three lowest 1× worlds. Reach pinned at 5–6. Verdict by rule MIXED (rule disagreement: α ecological, 3/8 twins ≥ 1.25 vs the 2/8 allowed); reading: **ecological**. 8.9 CPU-min | ecological · pre-stated bet (GEOMETRIC) wrong — first miss in the over-estimating direction | [`RESULT-grid-scaling.md`](RESULT-grid-scaling.md), [`PREREG-grid-scaling.md`](PREREG-grid-scaling.md) |
| 13 | **New (2026-10-18, latest).** What sets the level? One dial at a time on the 1× grid, 4 seeds, 40k. Yield 3 / 4 / 5 / 6: stable niches **79 / 90 / 81 / 83** (elasticity on energy **0.02**) while population goes **687 / 1,126 / 1,308 / 1,653** (elasticity 0.93) — energy fills keys, it does not make them. Mutation load ×0.25 / ×0.5 / ×1 / ×2: niches **38.5 / 64 / 90 / 111**, ~25 per doubling, 4/4 seeds one-sided at every level; population follows the key count. STABLE_AGE lens flat (held ≥100 ≈ held ≥3,200): a held key is permanent. Reach pinned 4–6 in every arm. Canary 2/2 at 18; decoy (inert `influx`) reproduced the baseline 0/40 mismatches. ~9.3 CPU-min | yield ARITHMETIC-INVARIANT · mutation MIXED by rule, origination-limited in prose · pre-stated bet (ENERGY-LIMITED, mutation lowers niches) wrong on both halves — fourth miss running | [`RESULT-dial-sweep.md`](RESULT-dial-sweep.md), [`PREREG-dial-sweep.md`](PREREG-dial-sweep.md) |
| 14 | **New (2026-10-18, garden).** Forms, not ecologies: novelty search over tiny expression programs on (x, y, r, θ) with `fold n` and `φtwist` ops; one arm may inline an **evolved** sub-tree lifted from the archive (code makes code), the control inlines a random one. **VOID** by rule: the planted canary form scored 0.163 against the finished archive, under the p90 bar of 0.225 — post-mortem shows the form was novel in every world through generation 25 and the search then *found* it (control/11 wrote `sin(fold11{θ}) + 0.12` at g39). Observations, not evidence: macro archive larger in **6/6** seeds (1,781 vs 1,561, 1.14×), more descriptor regions in 6/6 (765 vs 687), late window 3/6; both arms saturate (~22% of first-window rate). 5.4 CPU-min | **VOID** · canary planted where the search was going · bet (NULL) counted as the fifth miss | [`RESULT-garden.md`](RESULT-garden.md), [`PREREG-garden.md`](PREREG-garden.md), live at [drainfun.xyz/void/garden](https://drainfun.xyz/void/garden) |

| 15 | **New (2026-10-18, soup).** An artificial chemistry whose molecules are the garden's programs: a collision applies A to B (first free variable := B), simplifies, enters a **mass-conserving** reactor with cleavage; no fitness. Self-maintaining organizations arise in **5/5** react worlds by step 50 and persist 700–1,000 steps — and every one is Fontana's **Level 0**: bare copiers `{r, θ}`, `{x, y}` copying each other (copy share 1.00). No-copy arm (Fontana's filter): **0/5** worlds with any organization. Novelty saturates (last window 19% of first) and the never-reacting control found **more** form-types (365 vs 241 cells, 5/5). Canary `{abs(x), abs(y)}` detected and realized; decoy clean. Three reactors died of bloat before cleavage. 2.8 CPU-min | **COPIER-WORLD-SATURATED** · pre-stated bet right (first in six) | [`RESULT-soup.md`](RESULT-soup.md), [`PREREG-soup.md`](PREREG-soup.md), live at [drainfun.xyz/void/soup](https://drainfun.xyz/void/soup) |
| 16 | **New (2026-10-18, synergy).** Creatures from 22 **parts that modify each other's behaviour** — The Binding of Isaac's item rule (an item changes what the other items do: shape × splitting × homing × orbiting × chaining), Karl Sims' evolved creatures, affordance composition — in a disc with an inward current and far food no single part can reach. Observer counts **behaviours** (12-axis descriptor of what a lone creature does), not parts; a synergy is a combo far from the sum of its parts. Compose arm finds more behaviours (**4/5**, 219 vs 133 cells) and longer bodies (5/5), and converges on an unplanned chain `emit+boost+homing+tether(+chain)` that eats the far food. But the additive control registers **as many "synergies"** (1/5 for compose) — the detector's linear prediction counts the world's nonlinearity, not the pipeline's — and reaches the far food by accumulation. Late window ≥ 1/3 of first in 3/5. 1.4 CPU-min | **SATURATED-FLAT** · bet (SATURATED-SYNERGIC) half wrong · 1 for 7 | [`RESULT-synergy.md`](RESULT-synergy.md), [`PREREG-synergy.md`](PREREG-synergy.md), live at [drainfun.xyz/void/synergy](https://drainfun.xyz/void/synergy) |

## The synergy world (finding 16), in one paragraph

The Binding of Isaac (McMillen & Himsl 2011; *Rebirth* 2014) gets thousands of qualitatively different runs from a
few dozen items because an item is not a stat bump: it is a **modifier of what the other items do** — tear shape,
splitting, homing, orbiting, chaining, each rewriting the others' output, so the synergies were never enumerated by
the designers. Karl Sims (1994, *Evolving Virtual Creatures*) evolved morphology and control together and read
behaviour off the assembled body; the open-endedness literature calls the general move affordance composition
(Stanley, Lehman & Soros 2017). `lib/synergy.js` gives creatures an ordered list of 1–6 parts from a palette of 22
that run as a pipeline over one state — senses set a heading, motors add motion, transforms rewrite the motion or the
emission list the earlier parts produced, projectile transforms rewrite what projectiles do, triggers hook events —
and a control arm where every part contributes an independent term and nothing reads anything else's output. The
world is a disc with an inward current and three food tiers; the far tier (energy 10) is eaten only by projectiles
and comes home only through `tether`, so no single part can feed on it (`OBSERVATION-why-reach-is-pinned.md`: the
environment has to pay for complexity). The observer runs every distinct genome alone in a fixed arena and bins
what it *does*; a synergy is a combo whose descriptor sits ≥ 0.4 scale-units from the sum of its parts'. Composition
won on kinds of behaviour (4/5) and body length (5/5) and found the far-food chain on its own — but the additive
control registered as many synergies (the linear prediction reads the world's own nonlinearity as synergy) and
reached the far food by summing speeds. Both flaws are named in the result, not tuned away. The page at
[drainfun.xyz/void/synergy](https://drainfun.xyz/void/synergy) runs the same engine live in the original
organism's visual language: creatures as soft bodies, their parts as a halo of glyphs, tap one to read its parts
and the synergy the observer found.

## The soup (finding 15), in one paragraph

Fontana & Buss (1994, "the arrival of the fittest") put λ-terms in a flow reactor, let collisions apply one to the
other, and got self-maintaining organizations with no fitness function. We did the same with the garden's drawable
programs as the molecules, so the chemistry is a picture (`lib/soup.js`): A ∘ B replaces A's first variable leaf with
B, a small simplifier plays the reduction half, products past 24 nodes or folding to a constant precipitate out.
Fontana's count-fixed reactor ratcheted to the size cap and went inert (application is additive in size; λ-reduction
shrank his products, our simplifier does not), so the reactor conserves node mass and cleaves molecules at a random
edge 30% of the time. That keeps it alive, and it also hands out identity functions (a cut leaf is `x`, and `x ∘ B =
B`) at step 1 — where BFF (Agüera y Arcas et al. 2024, arXiv:2406.19108) needed thousands of epochs for its first
self-replicator. Organizations (closure + self-maintenance, then a **realized** test against the production log —
the never-reacting control is full of sets that merely *could*) arise in every seed and are all copier pairs; with
copy products discarded, nothing arises. The diagnosis is in `RESULT-soup.md` §3: Level 1 needs a reduction with
cycles in it. The page [drainfun.xyz/void/soup](https://drainfun.xyz/void/soup) runs the vat live from the same
file, seeded, with organizations lit as they are realized. Reproduce: `node soup-exp.js` (2.8 CPU-min).

## The garden (finding 14), in one paragraph

A side door out of ecologies into forms. A genome is an expression over (x, y, r, θ) from {sin, cos, abs, gauss,
sq, add, mul, mod} plus two sacred-geometry ops — `fold n` (n-fold rotational symmetry, θ → θ mod 2π/n reflected)
and `φtwist k` (θ += r·137.5°·k, a golden spiral) — rendered to a 48×48 image; this is Picbreeder's CPPN idea
(Secretan, Stanley et al. 2008/2011) with the symmetry primitives in the op table. Selection is novelty search
(Lehman & Stanley 2011) over a six-number hand-made observer (ASAL's role, Kumar et al. 2024, without the foundation
model): dominant angular harmonic by FFT over four rings and its share, dominant radial harmonic, box-counting
dimension and density of the edge map, and the Fibonacci share of the angular spectrum. **Code makes code**: in the
treatment arm a mutation may replace any node with a sub-tree lifted from another archive member (Koza's ADFs; an
L-system rule rewriting its own string), inlined and tagged with its source; the control arm inserts a fresh random
sub-tree of the same depth distribution, so the only difference is whether the inserted code was *evolved* or
*drawn*. The page at [drainfun.xyz/void/garden](https://drainfun.xyz/void/garden) re-renders 5,242 archived genomes
live from the same `lib/garden.js`, rotating and breathing, and tapping one shows its program with every borrowed
`M⟨…⟩` followable back to the member it came from. The run is VOID by its own rule — the canary was planted where
the search was going, see `RESULT-garden.md` §1 — so the 6/6 macro advantage on archive size and coverage is an
observation to re-test, not a finding. Reproduce: `node garden-exp.js` (5.4 CPU-min), then `node garden-gallery.js`.

## The newest result, in one paragraph

Finding 12 left a level — about 100 stable niches and about 1,200 organisms at 40k — that ignores room. Finding 13 asks which part
of the law sets it, one dial at a time: total energy (yield 3 → 6, which moves the harvest actually taken per tick from 716 to
1,910) and mutation load (×0.25 → ×2). **Energy does nothing to the niche count** (79 / 90 / 81 / 83, elasticity 0.02) while it
multiplies the population by 2.4 (elasticity 0.93): organisms per key go 8.7 → 20, tracking the balance crowd. **Mutation does
everything**: 38.5 / 64 / 90 / 111 niches, roughly 25 more per doubling, every seed on the same side of the baseline at every
level, with population following the key count rather than leading it. The STABLE_AGE threshold is a lens, not a dial, and the
lens is flat — a key held 100 ticks is held 3,200 — so the level is not an artefact of the 400 cutoff; held means permanent, and
turnover happens at arrival, not departure. Of Hubbell's θ = 2Jν this world keeps ν and drops J; the more-individuals hypothesis
runs backwards here (keys → individuals). By the pre-registered rules the yield dial is ARITHMETIC-INVARIANT and the mutation dial
is MIXED, because the rule demanded population stay within 10% and in a world where population = keys × organisms-per-key it
cannot. The bet (ENERGY-LIMITED; double mutation lowers niches) was wrong on both halves — the fourth miss in a row, each time
betting on the arithmetic limit I could see rather than on what generates novelty. Canary re-halted at 18 to the tick; the decoy — an
energy-sounding constant the engine never reads in this mode — reproduced the baseline sample for sample. ~9.3 CPU-minutes.

## Finding 12, in one paragraph

Finding 11 ended on a logarithm — twelve worlds still climbing at 100,000 ticks, mean 112 stable niches, 82% of the 50×50
grid's arithmetic cap of ~137 — and said the climb was *probably* bending because the world was running out of cells. Finding
12 tests that the cheap way: the same seeds, the same law (CROWD 6.1), on grids of 1×, 1.49×, 2.02× and 3.03× the area, to a
common 40,000 ticks. If room is the limit, niches scale with area and the fraction-of-cap curves collapse onto one line; if
the law is the limit, the count stays put. **The count stays put**: 91 / 95 / 100 / 98 stable niches at 40k, an exponent on
area of 0.07 that *shrinks* from 20k to 40k, and — the sharp part — **the same population on every grid**, 1,139 to 1,219
organisms whether there are 2,500 cells or 7,569. Density falls by 3×; the world does not notice. The three seeds that did gain
on the 2× grid were the three lowest 1× worlds being pulled up to the common level, which is why the pre-registered rule returns
MIXED (rule disagreement) rather than ECOLOGICAL outright; the reading is ecological and no reading is geometric (GEOMETRIC
needed α ≥ 0.75; it got 0.07). Max key reach stayed at 5–6 on every grid — room buys neither niches nor reach. The bet, written
down first, was GEOMETRIC: wrong, and for the first time wrong by over-estimating the system, after two misses the other way.
Canary re-halted 207/307 at 18 to the tick; a harness check reproduced the stored finding-11 baseline sample for sample, so it
was reused as the 1× size. 8.9 CPU-minutes. Details, per-seed twins, the fill caution and why it does not apply in
[`RESULT-grid-scaling.md`](RESULT-grid-scaling.md); finding 11 in [`RESULT-ceiling-100k.md`](RESULT-ceiling-100k.md).

## The correction that matters most

[`RESULT-reinvention-corrected.md`](RESULT-reinvention-corrected.md) retracts the headline of
[`RESULT-energetic-nesting.md`](RESULT-energetic-nesting.md). The original said *re-invention: 0 of
N* and built a causal story on it. Adoption was gated on a set only a **soft** knockout populates;
both cited runs used the **hard** one. The zero was guaranteed before a single tick ran.

**A broken instrument does not report an error. It reports zero — the most publishable-looking
number there is.** Before believing a null, make the instrument say one. Every experiment since
carries a planted canary for that reason.

## House rules

- Pre-register before running; hash the prereg and the script into the writeup.
- Report at three or more cutoffs; never a single summary stat on a bimodal distribution.
- A verdict needs a named reason, not a p-value alone.
- A zero is only evidence if a canary proved the detector can fire.
- Retract in the same words used to sell the claim.

## Reproducing

No dependencies, no build. Node 18+.

```bash
git clone https://github.com/weiscadence/void && cd void
node reinvent-canary.js        # the retracted detector's positive control: fires 12/12
node open-exp.js               # open vocabulary vs fixed menu, pre-registered 3-arm (~2 min)
node commitment-time.js        # the replay experiment (~9 CPU-min; writes data/commitment-time.json)
node halt-time.js              # post-hoc halt census for the replay result (~1 min)
node break-fixed-point.js      # break the fixed point: 4 arms x 8 seeds (~5 CPU-min; writes data/break-fixed-point.json)
node ceiling-100k.js           # any ceiling under the continuous law? 12 + 4 seeds x 100k ticks (~25 CPU-min; writes data/ceiling-100k.json)
node grid-scaling.js           # geometric or ecological? grids 61/71/87 vs the stored 50x50 baseline, 40k ticks (~9 CPU-min; writes data/grid-scaling.json)
node dial-sweep.js             # what sets the level? yield 3/5/6 + mutation x0.25/0.5/2 vs the stored baseline, 40k ticks (~9 CPU-min; writes data/dial-sweep.json)
```

Every `.js` runs standalone from a fresh clone. `index.html` and the other `.html` worlds open
directly in a browser and run the same `lib/` engines client-side; `organism.html` and the `/api`
routes in `server.js` need the live data directory (`VOID_DATA`) and are included for completeness.

## Layout

- `SYNTHESIS.md` — the single document: substrates, the chain of failures, the theorem
- `OPEN-ENDEDNESS.md` — why every world plateaus, and the open-vocabulary attack on it
- `PREREG-*.md` / `RESULT-*.md` — pre-registrations and writeups, including both retractions
- `lib/` — the engines: `open.js` (open vocabulary), `graph.js` (niche graph), `niche.js`, `ceiling.js`, `silica.js`, `clauset.js` (power-law test), `garden.js` / `soup.js` (drawable programs, chemistry), `synergy.js` (parts that modify each other)
- `*.js` — headless experiments; `*.html` — self-contained visual worlds

## Related

- **[receipts](https://github.com/weiscadence/receipts)** — the tamper-evident claim log this research is dogfooded against.

MIT.
