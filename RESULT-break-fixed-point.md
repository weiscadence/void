# RESULT — Break the fixed point (2026-10-18)

**Verdict (pre-registered rules): HALT REMOVED, and the former-frozen worlds are CLIMBERS.** Under
both treatments — `CROWD = 6.1` (balance crowd 18.3, no integer) and real-valued harvest noise
(`CROWD = 6`, yield × (1 + 0.05·u)) — **0 of 5** known-frozen seeds halt, and **4 of 5** reach the
climber threshold (≥ 65 stable niches) by 30,000 ticks. Named reason: the only thing that changed
between a world that stops at 38 niches forever and one that reaches 94 is whether
`YIELD / (1 + crowd / CROWD) = UPKEEP` has an integer solution. My pre-stated bet (STALL — a slow
basin would remain) was **wrong**, in the interesting direction.

Canary and decoy both passed before the verdict was read:

| control | result |
|---|---|
| A0 canary — original law, five known-frozen seeds | **5/5 halted**, 24/24, 24/24, 24/24, 24/24, 26/26 exposed keys at crowd 18; stable niches 38/37/40/37/52 and halt ticks 8,461/3,965/5,106/5,492/9,201 identical to yesterday's rows |
| A2 decoy — `CROWD = 5`, balance crowd **15** (integer, constant moved 10× further than the treatment) | **PASS**: 4/8 worlds halted, all four with every exposed key at crowd exactly 15 (17/17, 24/24, 25/25, 20/20); two more worlds (407, 807) are nearly halted at 15 with ~270 and ~180 events in the last 10k |

Prereg: `PREREG-break-fixed-point.md`, sha256 `3177b47adaa46fc212e818dd007a0473e416d14856392aee8d82da03ed3acfae`
(committed before the run, `de9521b`). Script: `break-fixed-point.js`, sha256
`5e538a9aab00d5f9d9f7927c55e9a5542fa2c44cac62fb9dafb1a3d36f43b47e` (unchanged). Engine `lib/open.js`
unchanged since the commitment-time prereg (`c5ec2078…ceaf4`). Raw: `data/break-fixed-point.json`.
Run: 32 worlds, horizon 30,000, ~5 CPU-minutes at nice 19.

## The table — stable niches at 10k / 20k / 30k

| seed | yesterday's fate | A0 original (CROWD 6) | A1 CROWD 6.1 | A2 decoy CROWD 5 | A3 noise ±5% |
|---|---|---|---|---|---|
| 207 | frozen | 38 / 38 / **38** halted @8,461 | 49 / 74 / **94** | 17 / 18 / 18 halted @11,325 | 67 / 80 / **93** |
| 307 | frozen | 37 / 37 / **37** halted @3,965 | 40 / 56 / **64** (ambiguous) | 50 / 50 / 50 halted @6,067 | 34 / 37 / **40** breathing, crowd 17–18 |
| 507 | frozen | 40 / 40 / **40** halted @5,106 | 55 / 65 / **75** | 58 / 82 / 90 | 67 / 79 / **87** |
| 707 | frozen | 37 / 37 / **37** halted @5,492 | 42 / 51 / **67** | 22 / 22 / 22 halted @1,028 | 44 / 66 / **89** |
| 807 | frozen | 52 / 52 / **52** halted @9,201 | 72 / 92 / **106** | 47 / 47 / 47 (184b/182d) | 63 / 76 / **90** |
| 407 | ambiguous | 51 / 58 / 63 | 58 / 77 / 86 | 58 / 60 / 60 (271b/271d) | 89 / 101 / 104 |
| 107 | climber | 66 / 83 / 90 | 53 / 75 / 91 | 58 / 73 / 86 | 53 / 77 / 108 |
| 607 | climber | 63 / 76 / 81 | 73 / 94 / 102 | 60 / 60 / 60 halted @13,401 | 81 / 98 / 107 |

Bold = the five scored seeds. Births + deaths in the last 10,000 ticks for the five under A1:
142,109 / 4,977 / 35,039 / 25,298 / 158,681. Under A0: 0 / 0 / 0 / 0 / 0.

Mean 20k→30k drift in stable niches for the five: **+12.6** (A1), **+11.0** (A3). They are still
rising at the horizon. 807, the slowest to halt yesterday, is the strongest climber today (106, higher
than either original climber reached).

## What this says

1. **The mechanism is confirmed by its falsifier surviving.** One halted world under CROWD = 6.1 would
   have killed the story; there were none, under either way of removing the integer. The decoy shows
   the perturbation size is irrelevant: moving the constant by −1 keeps the halt (at the new integer,
   15), moving it by +0.1 removes it. Only integrality matters.

2. **The cage was the fixed point, not exploration breadth.** `RESULT-openend-frontier.md` read the
   ~55% low-fate fraction as a *dynamical* freeze and the steering follow-up found early exploration
   breadth predicts it. Both observations stand as observations, but the causal reading changes: a
   world freezes when every exposed key fills to 18 before the world finds a new key, and more early
   exploration just means more keys to fill. Give the demography a heartbeat and the same seeds find
   the new keys anyway. **The bimodal fate of finding 04 is an artifact of an integer-valued law.**

3. **The noise arm rules out "more yield".** CROWD 6.1 gives every organism slightly more energy, so a
   critic could say the climb is a richer world, not a removed fixed point. A3 keeps CROWD = 6 and adds
   zero-mean noise — no extra energy on average — and gets the same 4/5. (It also gets the three
   highest counts in the run, 104/107/108, which I note and do not interpret.)

4. **"No world is unbounded" still stands, but it is now untested rather than shown.** The old
   ceiling for climbers (74–105 at 40k) was measured under a law where 17/54 of a climber's exposed keys
   were *also* sitting at 18. Whether the continuous law has a ceiling at all is now the open question;
   30k is too short to say.

## What this corrects

- `RESULT-openend-frontier.md`: "~55% of worlds freeze by 10k" is true **of the integer law** and should
  not be read as a property of open-vocabulary niche construction. "The freeze is dynamical, not a
  structural cap" was half right yesterday and is now wrong in a specific way: it is a structural
  property of the yield formula's integer arithmetic. The 7–15× open-vs-menu result is untouched (both
  arms ran the same law).
- `RESULT-commitment-time.md`: "late commitment at τ = 10,000" is correct as measured and is now
  understood as *the time the last exposed key hits 18*. The real state-dependence result — climbers
  never fell back while breathing — is the part that is about the world rather than the formula.
- The steering result (`leading-indicator.js`, `intervention-sweep.js`): the lever is real, the
  explanation of why it works is replaced by the one above.

## Honest limits

- Five scored seeds; 4/5 clears the pre-registered ≥ 3/5 line by one world. Seed 307 lags in both
  treatments (64 ambiguous; 40 with crowd 17–18 and only 1,600 births in 10k — it is breathing but
  barely; a longer horizon is the obvious check and I have not run it).
- Horizon 30,000, one grid size, one yield/upkeep pair. The decoy's two "nearly halted" worlds (407,
  807 at 15 with ~200 events) suggest the integer attractor can also be approached without being
  reached by 30k; descriptive only.
- The wormhole found no named precedent for this artifact class and one search was rate-limited; the
  absence of a name in my search is not evidence that the literature lacks one.
- Everything here is one engine. The claim that transfers is methodological: **a plateau in an
  individual-based model with integer counts and an exact-balance condition should be checked for a
  zero-event halt before it is read as ecology.**

## Reproduce

```bash
node break-fixed-point.js        # ~5 CPU-minutes; writes data/break-fixed-point.json
```
