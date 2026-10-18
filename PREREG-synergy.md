# Pre-registration: void synergy — do parts that modify each other keep making new behaviours?

**Written 2026-10-18 15:40 UTC, before the run.** Script frozen at `synergy-exp.js` sha256
`eea673c98a57a188978532efe82f0bc8ec4c247200884601c83ad03b634fbd90`, engine `lib/synergy.js`
`db89cccb3a2aaf8ca6920d5c8f4d1bb476edd8514dcd14ea517078c85b809fe4`.

Runs before this file existed, disclosed and not read as evidence: the palette, scales and threshold were tuned on
seed 11 for ~3,000 ticks and on the test arena. Two tunings are on the record: (1) the first hand-built canary
`{radial, thrust, emit, boost, tether}` reached the rim but **missed** the far food (straight projectiles pass
between patches), so `homing` was added to the canary; (2) the descriptor scales for mid / far food and energy
home were halved (8/8/40 → 6/4/20) and the threshold lowered 0.5 → 0.4 so that one far patch eaten is visible to
the observer and a multiplicative part (`boost`, which does nothing alone) counts as the synergy it is. A `--smoke`
run (2 seeds × 1,500 ticks) then showed compose worlds eating far food 40 and 17 times in the last window against 3
and 0 for the control, and the control arm registering *more* "synergies" in one seed (98 vs 51). 1,500 ticks say
nothing about growth; I record them because I saw them.

## 1. What this is

Creatures carry an ordered list of 1–6 **parts** from a palette of 22. In the **compose** arm the parts run as a
pipeline over one state: a sense part sets the heading, a motor adds motion, a transform rewrites the motion vector
or the emission list produced by earlier parts (`spiral`, `orbit`, `mirror`, `boost`, `anchor`), a projectile
transform rewrites what projectiles do (`homing`, `split`, `chain`, `tether`), triggers hook events (`ontouch`,
`ondeath`, `onbirth`), effects act on the world (`plant`, `attract`, `repel`). Behaviour is the composition — this
is The Binding of Isaac's item rule (an item modifies what the other items do; tear shape × splitting × homing ×
orbiting × chaining), Karl Sims' creatures (behaviour is what the assembled body does), affordance composition.

**Control (additive):** same palette names, same world, same energy law, but every part contributes a fixed
independent term (its own motion vector, its own projectiles with its own modifier) and no part reads or rewrites
another's output. Additive in *mechanism*; the world can still make descriptors non-additive (a current with an
equilibrium radius, food reached or not), so the control is the **floor** of the synergy count, not a zero.

**World:** a disc with an inward current c = 0.025·r. Three food tiers: near (r < 0.35, energy 1, body contact,
0.5 patches/tick), mid (ring 0.56–0.68, energy 3, body contact, 0.15/tick), far (ring 0.80–0.92, energy 10, eaten
only by projectiles, 0.06/tick — and the energy comes home only with `tether`). Upkeep 0.004 + 0.0015·parts per
tick, emission 0.04, reproduce at 3.0 by budding a mutated copy (add / drop / swap / reorder), population cap 200.
Single parts cannot reach mid or far food (test arena: max body reach of any single part 0.47 < 0.56; far eaten by
any single part 0). The far tiers are the reward for complexity — the lesson of `OBSERVATION-why-reach-is-pinned.md`.

**Observer:** every distinct genome present at a checkpoint is run alone in a fixed test arena (8 patches per tier,
150 ticks, no death) and summarised as 12 numbers — displacement, path length, body reach, turning, projectiles,
projectile reach, near / mid / far eaten, energy home, planted, orbit-ness — normalised and binned (5 bins per axis)
into a **behaviour cell**. It measures what the creature does, not which parts it has. **Synergy:** predicted
descriptor = base creature + Σ (single part − base); a genome of ≥ 2 parts is a synergy when some axis of its measured
descriptor is ≥ 0.4 scale-units from the prediction. Distinct synergies are counted by their part *set*.

## 2. The question

(a) Does the number of distinct behaviours keep growing, or saturate? (b) Does the compose arm find more distinct
behaviours and more synergies than the additive control? (c) Is the far food reached, and only by compositions?

## 3. Design, fixed now

- Seeds **11, 22, 33, 44, 55**, two arms each (paired PRNG streams differing only in the arm tag), 9,000 ticks,
  checkpoint every 300 (30 checkpoints). 40 founders of 1–2 random parts, 60 near-food patches. Serial, nice 19.
- Per checkpoint: population, distinct genomes (now / seen), behaviour cells (now / seen / new), synergies (now /
  seen / new), food eaten per tier in the window, mean and max part count, top-3 genomes.
- Cutoffs **3,000 / 6,000 / 9,000**: new behaviour cells per window, new synergies per window, far food per window.
- Budget ≤ 15 CPU-min; the script aborts a world past the clock and marks it.

## 4. Verdict rule

Worlds = compose seeds completed.

- **GROWING** if new behaviour cells in window 6,001–9,000 are ≥ 1/3 of window 0–3,000 in ≥ 4 of 5 compose
  worlds; else **SATURATED**.
- Suffix **-SYNERGIC** if cumulative behaviour cells seen (compose > additive) in ≥ 4 of 5 paired seeds **and**
  cumulative distinct synergies (compose > additive) in ≥ 4 of 5; else **-FLAT**.
- Reported alongside, not part of the rule: far food eaten per window per arm (compose > additive in how many
  seeds); max and mean part count; the top synergies by score with their behaviour in words; extinctions.

## 5. Controls

- **Canary.** The hand-built `{radial, thrust, emit, boost, homing, tether}` must register as a synergy in the
  compose arm and eat far food in the test arena, while no single part eats far food. **Non-synergy canary.**
  `{thrust, emit}` (legs and a gun, independent channels) must not register in either arm. Miss any → **VOID**.
- Pairing: both arms of a seed start from PRNG streams differing only in the arm tag; the descriptor cache is keyed
  by arm so the control's descriptors are the control's.

## 6. Falsifier

If the additive arm finds as many behaviour cells and synergies as compose, cross-modification adds nothing the
world's own nonlinearity does not already give, and the Isaac mechanism is decoration. If the late window is under
1/3 of the first in most worlds, a 22-part palette under a 6-part cap is a closed vocabulary with a bigger menu —
the ceiling of `OPEN-ENDEDNESS.md` again, at a higher number.

## 7. Cadence's bet

**SATURATED-SYNERGIC.** Named reasons: (1) the palette is closed and capped — 22 parts, ≤ 6 slots, 12 descriptor
axes with 5 bins each, but the attainable region is small (most axes sit at zero for most genomes), so the cell
count climbs fast and then crawls: last window < 1/3 of first in ≥ 4/5 worlds; (2) the smoke run's populations
converged on one feeder lineage (`attract+thrust+seek+pulse` and kin) by 3,000 ticks — selection under a single
dominant food flow narrows the population even while the far tiers pay more; (3) cross-modification should still
beat the control on both counts because the control cannot build the far-food chain at all (0–3 far food in smoke
vs 17–40) and every multiplicative part is a synergy by construction. Secondary: far food compose > additive in
5/5. Record: **1 for 6** on void bets. If GROWING, the world beat the author's ceiling a sixth time and the
fixed-vocabulary reading of `OPEN-ENDEDNESS.md` has a counterexample made of 22 parts.
