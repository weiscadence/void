# CORRECTION — "Re-invention does not occur" was a vacuous pass (2026-07-25)

RESULT-energetic-nesting.md (2026-07-24 20:47) concludes:

> **Re-invention** (branch spontaneously re-evolves a replacement mid-level niche and regrows): **0 of N**
> … Collapse stays 100% in every cell. Re-invention simply does not occur in this substrate.

**That conclusion is not supported by the experiments it cites.** Re-invention *does* occur.

## 1. The detector works — I checked its RED first

`reinvent-canary.js` plants the exact state adoption requires (root d0 → A d1 → B d2;
`softKnockout(A)` orphans B) and asks whether `graph.reinventions` can move.

    fired in 12/12 planted runs, usually within 1 tick.

So the counter is a live instrument. Good — that means a 0 from it would have meant something.

## 2. But the cited experiments run it on a path where it CANNOT fire

Adoption in `lib/graph.js` is gated on `if (this.energetic && this.orphans.size)`.
`this.orphans` is written in exactly one place: **`softKnockout()` (line 234)**.
The hard **`knockout()` never populates it.**

    energetic-exp.js:61        g.knockout(mid.id, {blockReq:true})    -> orphans stays EMPTY
    grace-reinvent-sweep.js:28 g.knockout(mid.id,{blockReq:true})     -> orphans stays EMPTY

Both cited experiments use the hard path. Adoption is **structurally unreachable** in both, so their
"0 re-inventions" was guaranteed before a single tick ran. A vacuous pass — SYNTHESIS instrument #1
("could this instrument ever have reported otherwise?") applied to my own headline and failing it.

This also voids the doc's robustness argument. The orphanGrace 0.00→1.00 sweep was offered as proof
that the null is "NOT a starvation/survivability artifact." That sweep is `grace-reinvent-sweep.js` —
the hard-knockout path. Varying grace across a disabled mechanism cannot test anything.

## 3. The lesson was already learned, then regressed

    07-24 04:27  energetic-exp.js         hard knockout
    07-24 05:21  reinvent-exp.js          header: "re-invention was impossible by construction.
                                          This uses softKnockout" — caught, fixed
    07-24 20:45  grace-reinvent-sweep.js  back to hard knockout (15h after the fix)
    07-24 20:47  RESULT-...md             headline written on the two hard-knockout experiments;
                                          reinvent-exp.js is never cited

The corrected experiment existed for 15 hours and was left out of the writeup.

## 4. What the corrected experiment actually shows (reinvent-exp.js, N=30 seeds, 28 valid)

    2/28 branches recovered   (~7%)
    11 re-adoption events total

`readopts` is a post-knockout delta on `reinventions`, and `orphans` is only ever populated by this
run's single `softKnockout`, so all 11 adoptions are of the severed branch's own children.

**Structural re-invention is common; functional rescue is rare.** Seeds 21 and 29 rebuilt the bridge
(1 and 2 adoptions) and still ended at 0% occupancy. The system *does* invent a differently-keyed
replacement niche and re-link the orphaned branch to it — the bridge just arrives too late, or
carries too little flow, to restore the branch.

## 5. This reassigns the cause, which is the part that matters

RESULT-energetic-nesting.md attributes the null to the fixed-vocabulary ceiling:

> With a **closed function vocabulary**, the system can only refill the identical slot, never invent a
> novel replacement path — so it can't regrow a lost level by a different route.

**That mechanism is contradicted by the data.** Novel replacement paths get built 11 times in 28 runs;
the blocked req is never reused (`blockedReqs` forbids it), so each of those *is* a different route.
The operative blocker is **energetic/temporal — rescue timing, not vocabulary closure.**

Consequence: the claim "energetic nesting inherits the fixed-vocabulary ceiling" is unsupported *by
this experiment*. It may still be true on other grounds, but this was the evidence for it.

## 6. Honest limits

- 2/28 recoveries is a thin rate; the recovery *probability* is not well estimated. The falsification
  of "does not occur" needs only one clean event and has 11, but "~7% recovery" should not be quoted
  as a precise figure.
- Depth is mostly 2-3 here, so this is the shallow regime, not the deep runaway one.
- I did NOT re-run the grace sweep on the soft path. Whether grace rescues the *timing* failure is
  now the open question, and it is a genuinely different question from the one the old sweep asked.

## Next (pre-registered, unrun)

If the blocker is timing, then slowing starvation should convert re-adoptions into recoveries.
Run the grace sweep **on `softKnockout`**: orphanGrace 0.00→1.00, N>=30. Prediction: recovery rate
rises with grace while re-adoption count stays roughly flat. If recovery stays ~7% regardless of
grace, timing is not the blocker either and I am wrong again — which is the point of writing it down.

Files: `reinvent-canary.js` (new), `reinvent-exp.js` (seed count now a CLI arg).
