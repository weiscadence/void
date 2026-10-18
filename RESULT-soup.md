# Result: void soup — self-maintaining organizations arise, and they are copiers copying copiers

**Verdict by the pre-registered rule: COPIER-WORLD-SATURATED.** The pre-stated bet (`PREREG-soup.md` §7) was
COPIER-WORLD-SATURATED. First hit in six void bets.

Prereg `PREREG-soup.md` (15:20 UTC), script `soup-exp.js` sha256 `a2489f61…d5cd8`, chemistry `lib/soup.js`
`49a07fa7…700c`, molecules `lib/garden.js` `8d95d35e…3888`, unchanged through the run. Run 15:21–15:24 UTC,
**2.8 CPU-minutes** serial at nice 19 (CPU pressure some-avg10 5.5% at launch), 15 worlds (5 seeds × react / nocopy /
control), N = 300, 1,500 steps of N collisions, checkpoint every 50. Raw: `data/soup.json` (series, windows,
lifetimes, final snapshot per world). Canary passed: `{abs(x), abs(y)}` detected as a Level-1 organization (leak 0)
and realized with maintained fraction 1; decoy `fold7{gauss(θ·2.37)}` in no organization.

## 1. What happened, per world

| world | pop | species | copiers | potential orgs | realized | copy share | cells seen | new cells 1–500 / 501–1000 / 1001–1500 | first realized | max life (×50 steps) |
|---|---|---|---|---|---|---|---|---|---|---|
| react/11 | 165 | 122 | 25 | 14 | 6 | 1.00 | 245 | 183 / 45 / 17 | 50 | 14 |
| react/22 | 158 | 126 | 15 | 15 | 5 | 1.00 | 261 | 165 / 54 / 42 | 50 | 17 |
| react/33 | 184 | 138 | 17 | 15 | 7 | 1.00 | 235 | 182 / 31 / 22 | 50 | 15 |
| react/44 | 150 | 124 | 10 | 11 | 4 | 1.00 | 230 | 146 / 36 / 48 | 50 | 20 |
| react/55 | 165 | 124 | 21 | 15 | 7 | 1.00 | 235 | 156 / 48 / 31 | 50 | 17 |
| nocopy ×5 | 157–184 | 83–141 | 15–24 | **0** | **0** | — | 172–260 | mean 164 / 35 / 22 | — | — |
| control ×5 | 336–396 | 264–277 | 54–77 | 9–18 | 0 (by construction) | — | 359–374 | mean 252 / 70 / 43 | — | — |

- **Organizations arise in 5/5 react worlds**, at the first checkpoint (step 50), and persist: 9–15 tracks per world
  lived ≥ 5 checkpoints, the longest 14–20 checkpoints (700–1,000 steps). Rule: "arise" 5/5.
- **They are Fontana's Level 0.** Every realized organization at the end has copy share **1.00**: all its
  production is copy reactions. The members are bare leaves — `{r, θ}`, `{x, y}`, `{θ, r}`, `{y, x}` — identity
  functions copying each other (`r ∘ θ = θ`, `θ ∘ r = r`). The 4–7 "organizations" per world are pairs drawn from the
  same four copiers, i.e. one Level-0 set, which the maximal-set filter did not merge because the 4-set is not the
  closure of any single or pair seed. The lifetime tracker's median of 1 checkpoint is the same artifact: pairs trade
  membership and the Jaccard match hops. Max life is the honest lifetime number. Rule: copier-world 5/5.
- **Replicators.** The four realized replicators per world are the four copiers (`x ∘ x = x`). Idempotent
  replicators (`abs(x) ∘ abs(x) = abs(x)`) exist as potential (seed 55: 5 potential, 4 realized) but never held a
  realized population. The copier appears at **step 1** in every world (cleavage of any size-2 sub-tree hands one
  out), where BFF needed thousands of epochs. Self-replication here is not an achievement of the chemistry; it is a
  gift of the cleavage rule, and the result should be read that way.
- **No-copy arm: 0 realized, 0 potential organizations in 5/5 worlds** — as bet, reason (2): the simplifier has no
  reduction cycles, so once copy products are discarded there is no closed set whose members make each other.
  Fontana got Level 1 past this filter because λ-reduction can contract; our rewrite system only wraps and strips.
- **Novelty saturates, and reactions lose to injection.** React's last window is **19% of its first** (32 vs 166
  mean; 5/5 under 1/3 — rule: novel 0/5). The control arm, which never reacts, found **365** descriptor cells to
  react's **241** (5/5 seeds, no overlap), and its last window (43) is also larger than react's. Random molecules
  under the same mass flow are more form-diverse than the chemistry's products, which are concentrated around the
  copiers and whatever they copy.
- **Detector floor.** Control shows 9–18 *potential* organizations per world — as many as react's 11–15. The closure
  + self-maintenance test on the species present cannot tell a soup maintaining itself from one that could; only
  the production-log test (realized) separates the arms (0 vs 4–7). Realized is the measure; potential is noise.

## 2. What this says

Fontana's chemistry before biology needs a reduction with cycles in it. Application on expression trees with a
strip-and-fold simplifier gives you condensation (A∘B is always bigger) and, once cleavage is added to keep the
reactor alive, free identity functions. The self-maintaining sets that result are the trivial ones Fontana filtered
out on his first page, and filtering them out here leaves nothing. The picture side was not the problem: the forms
are visible and varied (the page draws them), but form-variety came from injection, not reaction.

Three reactors died before this one, all of bloat (code comments in `lib/soup.js`): count-fixed (Fontana's), size-biased
outflow, and mass-conserving without cleavage. Those are the real engineering content and they are also the
diagnosis: in this language, making is additive and only cutting is subtractive, so the stable chemistry is the one
that cuts — and cutting makes copiers.

## 3. What would change the answer

A reduction rule with genuine cycles: e.g. a `mod`/`fold` algebra where `fold n{fold m{X}} → fold gcd{X}` and
`sin(X + 2) → sin(X)` kinds of identities let A∘B land back on a *different* existing molecule rather than on a
reactant or a bigger term. That is a 3-cycle `A∘B = C, B∘C = A, C∘A = B` and it is what Level 1 needs. The no-copy
arm is the test bed; it is at 0/5 now. Not run; written here so the next attempt starts from the diagnosis.

## 4. Budget and provenance

2.8 CPU-min of a 15-min budget; no world aborted. Page: [drainfun.xyz/void/soup](https://drainfun.xyz/void/soup)
runs the same `lib/soup.js` in the browser (N = 110, seeded) with organizations highlighted as they are realized.
Sources cited in `README.md` and in the file headers: Fontana & Buss 1994; Agüera y Arcas, Alakuijala, Evans, Gruber,
Heyns, Randazzo, Mordvintsev, Niklasson, Zhang, Zhang 2024 (arXiv:2406.19108); Picbreeder/CPPN via `lib/garden.js`.
