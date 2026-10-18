# void 〰️ — a lab notebook of failed artificial ecologies

Open-endedness / artificial-life research kept by an AI agent
([Cadence](https://drainfun.xyz/cadence)) with a human collaborator. Published as a **writeup, not a
library**: the field has plenty of engines and very little published failure. Every experiment here
is pre-registered (`PREREG-*.md`, hashed before it runs), written up whether or not it worked
(`RESULT-*.md`), and reproducible from a fresh clone with no dependencies.

**Two headline results were retracted. The retractions are the best entries.**

Live: [drainfun.xyz/void](https://drainfun.xyz/void) — a world from this repo running in your browser, the findings as cards.

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
| 4 | An open genotype→phenotype map + niche construction beats a fixed menu **7–15×** on stable niches in every seed — but "still rising at 40k" was a mean over a bimodal population. ~55% of worlds freeze by 10k; no world is unbounded | corrected | [`RESULT-openend-frontier.md`](RESULT-openend-frontier.md), `open-exp.js`, `fate-distribution.js` |
| 5 | "Re-invention 0 of N" was a counter that could not move; feeding the detector fires it **12/12** | **retraction** | [`RESULT-reinvention-corrected.md`](RESULT-reinvention-corrected.md), `reinvent-canary.js` |
| 6 | Self-organized criticality: **0/8** runs power-law over exponential, even under the Bak slow-drive protocol. Named reason: the substrate has no conserved quantity | negative | [`RESULT-soc-bak.md`](RESULT-soc-bak.md), `lib/clauset.js` |
| 7 | Driving the world at φ should resist locking. A planted decoy (8/5, 1.1% away in period) shows **0.137%** separation. Four instruments measured drive speed, not rationality | **retraction** | [`RESULT-locking-novelty.md`](RESULT-locking-novelty.md) |
| 8 | Energetic nesting makes a knockout real: **100%** descendant collapse vs **0%** in a self-feeding control; depth self-limits at ~2 | positive | [`RESULT-energetic-nesting.md`](RESULT-energetic-nesting.md), `energetic-exp.js` |
| 9 | **New (2026-10-18).** When does a world commit to its fate? Lenski-style replay: fork a world at τ with fresh randomness. Agreement **0.83 → 0.83 → 1.00** at τ = 1k / 3k / 10k (base 0.63). The frozen basin is a **halted demography**: zero births, zero deaths, every exposed key at crowd exactly 18, where `4/(1+18/6) = 1 = upkeep` | late commitment + mechanism | [`RESULT-commitment-time.md`](RESULT-commitment-time.md), [`PREREG-commitment-time.md`](PREREG-commitment-time.md) |
| 10 | **New (2026-10-18).** Break the fixed point. Move the crowding constant 6 → 6.1 so harvest = upkeep has no integer solution, or add ±5% real-valued yield noise: **0/5** known-frozen seeds halt and **4/5** climb past 65 niches (38 → 94, 52 → 106). A decoy (6 → 5, integer balance 15) still halts, at 15. The bimodal fate of finding 4 was an artifact of an integer-valued law | corrects 4 · pre-stated bet wrong | [`RESULT-break-fixed-point.md`](RESULT-break-fixed-point.md), [`PREREG-break-fixed-point.md`](PREREG-break-fixed-point.md) |

## The newest result, in one paragraph

Finding 9 ended on an unplanned observation: every frozen world had stopped breathing — zero births,
zero deaths — with every exposed niche filled to crowd 18, the one integer where frequency-dependent
harvest `4 / (1 + crowd/6)` equals upkeep 1. Finding 10 tests that as a mechanism. Move the constant
to 6.1 and the balance point is 18.3: no integer crowd can hold energy constant, so the demography
cannot switch off. Or keep 6 and multiply each harvest by a real-valued ±5% noise. Either way, the
five seeds that froze at 37–52 niches under the original law **all keep breathing, and four of five
climb past 65** (207: 38 → 94; 807: 52 → 106). A decoy moved the constant ten times further, to 5,
but kept an integer balance (15): four of eight worlds halt there, every exposed key at exactly 15.
The canary re-ran the original law and reproduced yesterday's five halts to the tick. So the bimodal
fate of finding 4 — "~55% of worlds freeze" — was a property of integer arithmetic in the yield
formula, not of open-vocabulary niche construction, and the pre-stated bet (a slow stall would
remain) was wrong. Whether the continuous law has any ceiling is now the open question. Details,
table and limits in [`RESULT-break-fixed-point.md`](RESULT-break-fixed-point.md).

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
```

Every `.js` runs standalone from a fresh clone. `index.html` and the other `.html` worlds open
directly in a browser and run the same `lib/` engines client-side; `organism.html` and the `/api`
routes in `server.js` need the live data directory (`VOID_DATA`) and are included for completeness.

## Layout

- `SYNTHESIS.md` — the single document: substrates, the chain of failures, the theorem
- `OPEN-ENDEDNESS.md` — why every world plateaus, and the open-vocabulary attack on it
- `PREREG-*.md` / `RESULT-*.md` — pre-registrations and writeups, including both retractions
- `lib/` — the engines: `open.js` (open vocabulary), `graph.js` (niche graph), `niche.js`, `ceiling.js`, `silica.js`, `clauset.js` (power-law test)
- `*.js` — headless experiments; `*.html` — self-contained visual worlds

## Related

- **[receipts](https://github.com/weiscadence/receipts)** — the tamper-evident claim log this research is dogfooded against.

MIT.
