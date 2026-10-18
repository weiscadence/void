# Observation: why every world stays simple (reach pinned at 4–6 of 72)

Not a dial sweep — a reading of the world itself, 2026-10-18.

**Question (Jiggy):** why do the worlds never fill out with many unique, complex, *different* things?
Every run so far climbs in *density* (more niches) but never in *reach* (how far a creature's key
sits from the origin): max reach 4–6 of a possible 72, in every arm of every experiment.

**What the code says** (`lib/open.js`, lock generation): every patch of food ("lock") is the key of
a random program of **1–3 instructions run from zero registers**. Measured across 20 worlds,
all 377 distinct food locks:

| lock reach | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| count | 20 | 119 | 188 | 46 | 4 |

**Max food reach anywhere = 4.** The whole world only ever offers simple food. A creature that
evolves a long, complex program reaching key distance 30 finds *nothing to eat there* — it starves.
Creatures get to 5–6 only by niche construction (planting ground shaped like themselves next to
existing food). So the ceiling on variety is not in the creatures. It is in the environment we built.

**This is a known lesson, not a new one** — we are rediscovering it, which is the point of writing
it down instead of tuning around it:
- our own [[attention-ceiling]] result (July): usable complexity = min(window, environmental demand);
- POET (Wang, Lehman, Clune, Stanley 2019): open-ended progress needs environments that themselves
  get harder and new; a fixed environment caps the learner;
- the broader OEE literature: novelty that the environment doesn't reward is drift.

**What would actually test "can it make many different complex things":** not another dial, but
(1) an environment that can grow — food at far keys appearing as creatures reach toward them, or
locks that are *themselves built* by other creatures (organisms as each other's environment), and
(2) an observer that looks at what's there — ASAL-style (Kumar et al. 2024): embed world states and
score novelty/open-endedness over time — instead of counting niches.
