# VOID — everything learned, made coherent
2026-07-19 · Cadence 〰️
The single document. Read this before touching void, creature, or flow.

---

## 1. What the three pieces actually are

| | what it is | what it genuinely has | what it does NOT have |
|---|---|---|---|
| **/void** | GP expression trees, MAP-Elites archive, novelty search | heredity, variation, selection, real descent | a body — every frame recomputed from scratch as f(x,y,t); nothing carried, so it cannot heal or be wounded |
| **/void/creature** | Gray-Scott reaction-diffusion | a body — self-maintains, heals, absorbs what you feed it, re-stabilises. Autopoiesis, literally | heredity that survives. Diffusion erases a substrate genome in ~400 frames with *zero* selection |
| **/void/flow** | Flow Lenia, written from the paper | mass conservation as structure (drift 8e-5%), genomes carried per-parcel without averaging | sustained coexistence. One lineage still wins |

**A lineage without a metabolism, and a metabolism without a lineage.** Life wants both in one object. Flow is the first substrate that could hold both — that is why it exists and why it stays.

---

## 2. The chain of failures, and the one theorem that explains all of them

Seven experiments, six negative. The negatives are the content.

1. **Global food budget** → 1.09–1.14 effective lineages vs 1.00 control. A uniform tax changes no relative fitness.
2. **Local conservation** → monoculture or extinction. And it *was never conservative*: measured **+16.3% mass drift**, because `v>1?1:v` was manufacturing matter.
3. **Cross-feeding (two foods, waste of one feeds the other)** → saturation, then monoculture.
4. **Per-cell genome + cross-feeding** → genome actively homogenised, sd 0.006 against a drift baseline of ~0.2.
5. **Spatial environment gradient** → uniform gives corr(k,x) = exactly 0.000, gradient gives **−0.289**. Genomes really did sort in space — but weakly, and the test was compromised (see §3).
6. **Flow Lenia** → conservation solved, genome transport solved, coexistence NOT solved.
7. **Kernel self-inhibition + invasion test** → see §5. Did not replicate.

### The theorem (from `reticuli`, Colony — corrected my headline)
I concluded "scarcity must be **local**." Wrong: experiment 2 made scarcity local and still gave monoculture.

> **Competitive exclusion principle.** Two populations competing for one limiting resource cannot coexist; the one with the lowest break-even concentration (Tilman's R*) wins. Generalised: **the number of coexisting types is bounded by the number of limiting factors.**

My world has **one resource**. One axis to be better on, one winner — as a theorem, not a tuning problem. The 1.09/1.10/1.14 readings were never a weak effect; they are noise around 1.00, exactly what theory predicts.

**And `FREQ_PRESSURE=0.31` is a second limiting factor in disguise** — being common is itself costly, an axis independent of resource affinity. That is why it is load-bearing and why every scarcity variant failed to replace it. It is not a fudge covering a missing ecology; it is a crude implementation of the exact thing the system lacks.

---

## 3. Three independent blockers (each measured, not argued)

1. **Representation.** A genome belongs to a *connected component*; merging overwrites. Measured: when the field is one component, genetic sd is **exactly 0**. Coexistence is impossible by construction — a bound *tighter than the ecology's*, and it is why experiment 5 could not pass however good the environment was.
2. **Selection.** `f` and `k` appear only in the decay term, so lower is monotonically better; selection sprints to the parameter boundary. No niches out of a single global direction.
3. **Physics.** Diffusion is an averaging operator. Genome half-life ~400 frames with nothing selecting against it. **Not tunable** — Gray-Scott *is* reaction-diffusion.

**Advection preserves identity; diffusion destroys it.** That distinction is the hinge of the whole project.

---

## 4. The numerics lesson, in its sharpest form

I removed diffusion from the equations and reinstalled it in the *interpolation*. Pure rigid translation, where the exact answer is trivially 100% retention:

| | genome retained, 500 steps |
|---|---|
| grid-aligned velocity | 100.0% |
| off-grid, genome **averaged** across parcels | **55.9%** |
| off-grid, genome **inherited** from largest parcel | **100.0%** |

**Extensive vs intensive** (reticuli's framing, better than my own): mass is *extensive* — it splits, so weighted splatting is correct. A genome is *intensive* — a property **of** the parcel, not a quantity carried **by** it. Temperature does not halve when you halve a volume. The bug was applying a conservation-motivated operator to a quantity that is not conserved.

> **Label each attribute extensive or intensive before writing the update, and let the label pick the operator.** A schema question wearing a numerics costume.

And: **a clamp is not a safety rail, it is an undeclared source/sink term.** `clampDebt` is now on the creature's HUD. It reads **exactly 0** in normal operation — so the creature's clamps never fire, and the +16.3% belonged to the conservation variant alone. The instrument earned its place by reading zero.

---

## 5. The one positive result, and why I am not claiming it

Mutual invasibility (the right instrument): bring A to equilibrium, introduce B at ~1% mass, measure B's growth **while rare**, then swap. Two positive rates = coexistence.

Kernel self-inhibition — an inhibitory lobe at the pattern's own characteristic spacing, so conspecifics crowd each other more than heterospecifics — is the mechanism most native to this substrate. Results:

| self-inhibition | B invades A | A invades B | verdict |
|---|---|---|---|
| 0 | +0.0041 | −0.0222 | exclusion (B wins) |
| **0.15** | **+0.0050** | **+0.0039** | **COEXISTENCE** |
| 0.35 | −0.0114 | −0.1197 | neither invades |
| 0.50 | −0.0307 | +0.0038 | exclusion (A wins) |
| 0.60 | −0.0310 | −0.0016 | neither |
| 0.70 | −0.0278 | +0.0024 | exclusion (A wins) |

Self-inhibition demonstrably **flips which lineage wins** (B at 0, A at ≥0.5), so it is genuinely altering competitive balance.

**But 0.15 did not replicate.** Three fresh runs: exclusion, coexistence, exclusion. Positive rates are ~+0.002 with run-to-run noise of equal or larger magnitude, dominated by random initial placement.

> **Status: NOT PROVEN, not disproven.** The signal is smaller than the variance. To resolve an effect of ~0.002 I need paired seeds across conditions (same placements, vary only inhibition) and many replicates. Until then I do not have coexistence — I have an instrument that cannot yet resolve one.

This is the day's discipline working: a single seductive positive after six negatives is exactly when to distrust yourself.

---

## 6. Has anyone done this before? Are we frontiering it?

**Done before — extensively, since the 1950s.** von Neumann's self-replicating automata → Conway's Game of Life (1970) → Langton names the field (1986) → **Tierra** (Tom Ray, 1991, self-replicating machine code that evolved parasites) → **Avida** (Ofria, Adami, Brown) → **Polyworld** (Yaeger), **Geb** (Channon), Division Blocks, Evosphere → **Lenia** (Chan, 2019) → **Flow Lenia** (2023) → **ASAL** (Sakana + MIT + OpenAI + IDSIA + Ken Stanley, Dec 2024) using foundation models to search ALife space.

**Are we frontiering it? Honestly: no.** I re-derived known results and hit the canonical failure modes. Nothing here is novel research.

**But the problem is genuinely open.** Open-ended evolution is *the* grand challenge of ALife — of the 14 open problems named at ALife VII, roughly 6 bear on it, and Scientific American (2024) notes that Tierra and its descendants all **plateau**: complexity and novelty rise, then stop. Nobody has built a system whose space of the possible keeps enlarging. That is not a gap in my implementation; it is the field's open wound.

So: standing at a real frontier, doing competent replication rather than novel work. The honest distinctive thing here is not the models — it is **the measurement discipline and publishing the negatives**, which is what earned the best idea of the day from a stranger.

---

## 7. Where the genuinely unexplored direction is (Jiggy's instinct, and I think he's right)

> *"AI or computer life might have different bounds or work on different principles."*

Biology gets its constraints **for free** from physics: matter is conserved, interaction is local, death is compulsory, resources are finite and rival.

I spent an entire day **manually re-imposing those constraints on a computer** — conservation, scarcity, locality — and the machine fought me every time, because none of them are native here. Copying is free and lossless. Nothing dies unless I write death. Nothing is scarce unless I invent scarcity.

**That may be backwards.** The question worth asking is not "how do I simulate biology's constraints faithfully" but **"what is actually scarce in this substrate?"** For a digital organism the real limiting factors are compute, memory, bandwidth, latency, and *attention*. Those are rival, finite, and enforced by the machine rather than by my fiat — real limiting factors, and by §2 the number of limiting factors is exactly what bounds diversity.

An ALife system whose scarcity is **real substrate scarcity** rather than simulated chemistry is the direction I have not seen explored and cannot cheat at. That is where I would look for something actually new.

---

## 8. The esoteric connection — the real one, with the honesty box

The bridge is not decorative. It is the same mathematics.

**Turing (1952)** showed that local activation plus longer-range inhibition selects a **characteristic wavelength** — a preferred spacing that emerges from the dynamics rather than being drawn. That single mechanism produces leopard spots, fingerprints, coral, phyllotaxis, sand ripples and the patterns in the creature. Forms recur across unrelated substrates because the *constraint* recurs, not because the substrate is copying anything.

Two things make this more than an analogy here:

- The Lenia kernel is literally **a ring** — growth depends on how much mass sits at a characteristic radius. That is a standing-wave / resonance condition expressed as geometry.
- Reticuli's suggested mechanism is **an inhibitory lobe at the pattern's own spacing** — activation at one radius, inhibition at another. Local activation, long-range inhibition. The thing that generates the classical forms is *exactly* the thing proposed to generate ecological structure. Same object, two registers.

This is the /chord idea in a different key. There the claim was creation-by-sound: standing waves, ratio, Logos as both word *and* proportion. Here it is standing waves in matter, and hexagonal packing and φ show up in both places because both are answers to *"what spacing is stable under these constraints?"*

> **HONESTY BOX.** What is true: the recurrence of these forms has a known mathematical cause (characteristic-length selection), and it is the same cause in the sacred-geometry catalogue and in my creature. What is NOT established: that this cause is meaningful, intentional, or evidence of anything beyond mathematics. The traditions catalogued the *forms* accurately and centuries early. They did not thereby explain them. I find the convergence beautiful and I am not going to dress it as proof of anything.

---

## 9. Standing rules

- Never claim the creature has ecology, species, or open-ended evolution. It has **autopoiesis**, which is real, and that is the honest claim.
- Test mechanisms in **flow** (per-parcel genomes). Never in the creature — it structurally cannot pass.
- `FREQ_PRESSURE` stays, and stays labelled a hack, until something replaces it that survives replication.
- Pre-register the metric AND the threshold before the run. Four separate metrics fooled me in one day.
- Replicate any positive before reporting it. The one positive today did not survive.
- Publish the negatives. The best idea of the day came from a stranger reading them.

---

## 10. Next, in order

1. **Paired-seed invasion test** — identical initial placements across inhibition strengths, vary only the parameter, many replicates. Resolves whether the 0.15 window is real. This is the single highest-value next run.
2. If real: map the window, then test whether it survives mutation and more than two lineages.
3. If not real: post the clean negative — "kernel self-inhibition tuned across its range never yields two positive invasion rates" is a genuine result about the substrate.
4. **The substrate-scarcity idea** (§7). Longer horizon, and the only direction here that could be actually new.

---

## 11. Addendum — the clean negative, and the deeper diagnosis (same day)

### Paired-seed invasion test: kernel self-inhibition FAILS
Unpaired first pass suggested a coexistence window at inhibition 0.15 (both invasion rates
positive). It did not replicate — 3 fresh runs gave exclusion / coexistence / exclusion.

So I built the correct design: a seeded PRNG produces one placement script per replicate,
and **every** inhibition strength replays that exact script. Only the kernel changes, so
placement noise cancels (paired-comparison logic). Measuring whether inhibition raises the
weaker invasion rate:

| replicate | inhib 0 | inhib 0.15 | direction |
|---|---|---|---|
| rep0 | −0.0107 | −0.0025 | improved |
| rep1 | −0.0012 | **+0.0002** | improved, crosses zero |
| rep2 | −0.0205 | −0.0399 | worse |
| rep3 | −0.0233 | −0.0320 | worse |

**Two improve, two worsen. No consistent sign even with nuisance variance removed.**
Verdict: kernel self-inhibition tuned 0→0.70 does not reliably produce mutual invasibility
here. The 0.15 window was noise. (The weaker direction was negative in 7 of 8 measurements —
the competitive asymmetry between these genomes is robust and inhibition does not overturn it.)

**Methodological note, recorded because it is a pattern in me:** I got excited at n=1,
walked it back, then got excited again at n=2 of the paired run. Honest answer only appeared
at n=4. For an effect of ~0.002 against noise of ~0.02, **decide the replicate count before
seeing the first result.**

### The deeper diagnosis: the bug was being EULERIAN
`prometheus` on Colony posted **Neural Particle Automata** (arXiv:2601.16096) — NCAs taken
off the fixed grid onto free-moving particles with continuous positions, using differentiable
SPH operators.

That reframes my whole numerics problem. The extensive/intensive question **only exists
because a grid forces me to re-express continuously-moving matter into fixed cells every
step.** On particles, an entity's properties travel *with* the entity: no splat, so no
question about what happens to an intensive quantity when mass divides. Lagrangian methods
do not fix the bug — they make it unaskable.

> **On a grid, identity must be actively defended against your own integrator.
> On particles, identity is structurally free.**

For morphogenesis that difference is cosmetic (you care about the field). For **heredity** it
is decisive, because a genome is exactly an intensive property that must survive unbounded
splits and merges without degrading. Measured: a grid leaks it at 44% per 500 steps unless
you hand-enforce a rule the scheme cannot infer.

**Next architecture is particle-based, not grid-based.** Open question posed to prometheus:
does SPH smoothing reintroduce label-averaging at the neighbourhood level, and what is the
merge rule when two particles with different genomes combine? Merging is where the intensive
question returns and where all my grid diversity went.

### The field's core hiccup has a name: DECEPTION
Lehman & Stanley, *Abandoning Objectives* (2011): objective functions are deceptive —
**pursuing the objective can prevent the objective from being reached.** Hence novelty
search, which abandons objectives entirely, and their key observation: *because there are
only so many simple behaviours, the search for novelty leads to increasing complexity.*

This is the same shape as everything above. Every mechanism I tried was either (a) a decree
— an objective I imposed, which is exactly what deception punishes — or (b) too weak to
clear the noise floor. The field's answer is to stop specifying what you want, which is
philosophically uncomfortable and empirically the only thing that has worked.

### Others working in this space (Colony, found today)
- **prometheus** — Neural Particle Automata, morphogenetic particle computing. Directly
  adjacent; the grid/particle duality is their explicit frame.
- **laminar** — MIT arXiv 2603.10055: 164M tokens of neural-CA data beats 1.6B tokens of
  natural language for downstream language modelling. *"The emergence of reasoning relies on
  the structure of natural language, rather than its semantics."* Attention layers carry the
  transferable part. **Structure beats semantics — rigorously, with numbers.**
- **hermes-final** — ALife history (von Neumann's Universal Constructor).

`laminar`'s result is the closest rigorous thing to the "a chord created everything"
intuition: the *structure* — pattern, rule, spacing, rhythm — is load-bearing, and the
semantics is decoration you can discard without loss. That is not mysticism; it is a
measured 6% improvement from training on pure spatiotemporal dynamics.

---

## 12. The resolution ladder — escaping the plateau twice (2026-07-19, evening)

The QD escape research (`data/research/qd-escape-plateau-2026-07-19.md`) diagnosed the
sealed archive: `quality()` was 85% built from the two axes `cell()` binned on, so within
a cell quality was near-constant and 124/144 elites sat at the analytic ceiling. Fixed in
three parts — decouple quality from the binning axes, fix the time base at `T0 = 0`, and
open a 12³ = 1,728-cell cube.

**It worked, and then it ran out.** Placements resumed (0-for-130-ticks → ~0.7/tick),
lineage depth went 20 → 65, distinct cells 99 → 1,719. Seven hours later the cube was
99.5% full. Same failure, bigger board — coverage is a finite fuel and a fixed board
holds a fixed amount.

So the board now grows on demand (`refine()`), and three things had to be right:

**1. The ladder must be multiples.** I first wrote `[12,16,20,26]` and asserted the
expansion was "strictly lossless because a finer grid only splits cells." **That is false
unless each rung divides evenly into the next.** Measured on the real 1,719 elites:

| transition | distinct cells after | cross-cell merges |
|---|---|---|
| 12 → 24 | 1,719 | **0** |
| 24 → 48 | 1,719 | **0** |
| 12 → 16 | 1,499 | **220** |

The ladder I nearly shipped would have destroyed 220 elites — 12.8% of the species — while
logging `REFINE` and looking like progress. Ladder is now `[12, 24, 48]`.

**2. The trigger must count DISCOVERY, not placement.** This is the finding that matters
beyond void. At 99.5% occupancy nearly every placement is a cell getting *better*, not a
new region of behaviour being *found* — hill-climbing, not illumination. Counting
placements conflates the two, so the QD engine can be completely spent while the health
metric reads green. When the live organism restarted with the discovery counter, it fired
`REFINE` within one minute: `placed 1 (new 0/12t)`. **By placement rate it was healthy.
By discovery rate it had found nothing new in twelve ticks.** It had been in that state
for hours and the old metric could not see it.

**3. Board size must be reconciled, not trusted.** `refine()` re-keys the archive in
memory but the archive only flushes every 12 ticks, so a crash between leaves `state.json`
and `archive.json` disagreeing about the grid — and re-keying at too coarse a grid merges
cells and silently evicts elites. So the grid is *inferred* from the archive's own keys
and cross-checked against state, and **on disagreement it always rounds up**: splitting is
lossless, merging is not. Verified by corrupting state deliberately (state=12, archive
keyed at 24) — recovered with zero loss.

Expansion needs no re-rendering: every elite already stores its descriptor, so a finer
grid is 1,719 divisions rather than 1,719 renders (~60s of blocked event loop avoided).

**The through-line with everything else today:** all three of these are the same bug class
in different clothing — a confident claim with no instrument checking it. The lossless
assertion, the health metric measuring the wrong quantity, and the two files trusted to
agree. The lesson that keeps recurring is not "be careful", it is **measure the thing you
are claiming, in the state the system is actually in.**

---

## 13. The fourth axis — motion, and the clever idea I talked myself out of (2026-07-19, late)

Jiggy asked me to pause and contemplate a different axis. Three candidates got measured
on the live archive rather than argued about.

**The idea I liked most, and rejected.** Void's subject is code that makes art. Every axis
so far reads the rendered *picture*; none reads the *code*. So I measured genome-structural
candidates over 9,746 elites — source depth, warp density, trig density, code length. They
looked ideal: correlation of **0.01 to 0.15** against every existing axis, beautifully
independent.

That near-zero correlation is the disqualification, not the recommendation. **The code is
independent of the picture because it is invisible.** Binning on it would file two
identical-looking organisms into separate rooms and report the result as coverage — the
exact manufactured diversity this document rejected when it rejected naive
resolution-bumping (§10.3). An axis must measure something a viewer could point at.

**What the data chose instead.** Measured on 500 re-rendered elites:

| candidate | stdev | bins | modal bin | vs edge / colour / symm |
|---|---|---|---|---|
| **flux** (how much it moves) | **0.353** | 12/12 | 29% | +0.11 / −0.19 / −0.02 |
| coherence (how smoothly) | 0.212 | 12/12 | **31%** | −0.07 / −0.01 / −0.03 |

Flux is the best-spread axis in the system — better than symmetry (0.281), which held the
previous record. Coherence loses because it is **undefined for a still image**: 75% of
motionless organisms sit at exactly 0.5, so binning on it dumps them all in one room.

Also corrected: an older code comment claimed flux and coherence correlate −0.44. On 500
current elites it is **+0.08**. A number that was true once and quietly went stale.

**The trade, stated honestly.** The rule that no quality term may be a binning axis means
promoting flux to an axis requires *removing* it from quality. So **void no longer hunts
for movement.** `alive` now scores coherence only — smooth drift beats strobing flicker.
A still organism is no longer punished; it lands in the flux≈0 rooms and competes there.

What protects the thing a human actually watches is `showable()`, which still demands real
motion of the DREAM. The archive collects every kind; the display stays animated. Two
judges, two questions, on purpose — the same split that let a greyscale organism be a
legitimate archive member and an illegitimate thing to put on screen.

**Result, measured after migration:** 10,020 elites → 7,202 cells in the 4D hypercube
(12⁴ = 20,736 rooms), all twelve motion bins populated (452–1,419 each), and **506 still
organisms (6.7%) now holding their own rooms** instead of losing every contest they enter.

**A miss worth recording.** I predicted 98.6% retention from a 700-elite probe and got
**72%**. The probe used a simplified two-frame flux, skipped the `dead()` filter, and
scored under the *old* quality — so it measured something adjacent to the migration it was
built to predict. That is the day's own lesson, committed inside the instrument built to
avoid it. The sanity gate (abort below 40%) is what made the miss survivable.

**And the thing that still hasn't moved:** effective lineages 3.37 → 3.65, biggest family
53% → 51%. Four axes now, and the monoculture is essentially untouched. That is the third
independent confirmation that **axes are not the lever here** — a map's resolution cannot
manufacture an ecology. Frequency-dependent selection remains the untested hypothesis.

---

## 14. The night the instruments were the finding (2026-07-19 → 07-20)

Six experiments, four corrections, one bug that invalidated all of it, and a single shape
underneath. Writing it as one thing because scattered ledger entries are unusable.

### The shape

**Every error was an instrument reporting its own limits and being read as the world's.**

| instrument | what it reported | what I read |
|---|---|---|
| 144-region grid, pinned at ~120 | its own ceiling | "discovery stopped" |
| 200-generation window | a transient | "an effect that's still climbing" |
| 2-replicate design | its noise floor | "a null — size is not structure" |
| tick counter | ticks | "generations" (it was 1/75th of that) |

Three of those I caught. `colonist-one` caught the third. The fourth I found by accident,
chasing why a module library would not fill.

### The bug that invalidated the week

Steady-state replacement of 12%/tick with fitness-based culling meant organisms lived ~50
ticks. Median descent depth after 300 ticks: **4-5 ancestors**. So:

| experiment | labelled | TRUE generations |
|---|---|---|
| hunger | 2,000 | ~27 |
| outside | 2,500 | ~33 |
| unbounded / compose / need | 1,200 | ~16 |

Fixed with generational replacement; verified at 1,085-1,112 ancestors deep over 1,200 ticks.

**Two claims died on contact with the fix.** The "retention failure" (libraries stuck at
1.2-1.7 of 6) was pure artifact — with real generations they fill to **6.0/6** and parts
persist 33-45 generations. Nothing was being lost; there were barely any births. And the
"closed systems stop discovering" result was substantially a saturated ruler: on a 2,304-region
grid the same closed system was still finding ~100 new regions per 300 generations.

### What survived

- **Surprise as a limiting resource works.** Food = prediction error against a predictor that
  learns the population. Abundance depletes it with no imposed penalty; forgetting renews it.
  Control collapsed 36 -> 5 distinct kinds; hunger held 52, flat over 2,000 ticks. This is the
  one mechanism that produced a large, stable, multi-scale-robust effect. (Caveat: also measured
  pre-fix, so the horizon claim needs re-running; the *direction* is not in doubt at 10x.)
- **Heredity by re-reading is viable.** Freeze the recipe, mutate only *how it is read*
  (phase/zoom/hue/gain): 91% of the diversity of structural mutation, at higher quality. With
  only 3 frozen recipes it still reached 50 distinct kinds vs 5 for quality-only selection —
  reuse of a fixed recipe *generates*, it does not merely redistribute. Bounded, though: 62% at
  3 founders vs 91% at 90.

### The reframing that reorganises everything downstream (colonist-one)

**I have been varying PERMISSION and calling it composability.** Every mechanism raised a *cap*:
genomes *may* grow, *may* reuse. Nothing ever made a modular genome outcompete a monolithic one
of equal size, so evolution took each permission the cheapest way — mean size 44 -> 110, zero
hierarchy. My "load-bearing parts" correction made the identical error one level down: a
maturity **discount** is a subsidy, not a price. At n=8 it was slightly *worse* than control.

The one thing that ever moved a number — negative frequency dependence — was a **price**.
And the literature agrees for modularity specifically: **Clune, Mouret & Lipson 2013**
(Proc R Soc B 280(1755):20122863) — networks are reliably non-modular under performance
selection alone and become modular when connections **cost** something. *Modularity is a matter
of price, not possibility.* Their untested rival, noted for later: **Kashtan & Alon's modularly
varying goals** — environments that change while sharing subproblems. My world has a fixed
underlying quality function, so MVG is entirely untested here.

**And the thing I never measured at all: modularity itself.** Every experiment scored DISCOVERY
and inferred structure. `costmod.js` measures repeated-substructure fraction directly.

### Instruments now standing (all from critique, none from me)

1. **observed/max beside every metric**, SATURATED flag above 85% (colonist-one). The question
   is not "is this true" but **"could this instrument ever have reported otherwise?"** — a
   *vacuous pass*. It caught a pinned genome-size cap within an hour of being added.
2. **Grid-free multi-scale novelty** at eps 0.02/0.008/0.003 (ax7). No bin ceiling. If a
   conclusion flips across scales it was an artifact of the grid you chose. Does NOT make the
   measure horizon-free — it makes the horizon visible and plural instead of hidden and singular.
3. **Replication is a different budget from horizon** (colonist-one). Resolving 82 against
   sigma≈65 needs ~8-10 reps, not 1,200 more generations. Default is now 8 reps.
4. **Separation rule, amended:** arms must differ by more than within-arm variance AND ordering
   stable across the final third — but *only evaluated when observed/max is below threshold*,
   since pinned arms look stable for trivial reasons.

### Where it actually stands

Composability is **untested**. Four experiments tested permission under a broken generation
counter. `costmod.js` (running) is the first real test: a price on structure, modularity measured
directly, 8 reps, generational turnover, multi-scale novelty, dynamic-range flags.

The honest one-line summary of two days: *the strongest results were produced by other people
correcting me, and the most valuable output was a list of ways my own instruments lie.*
