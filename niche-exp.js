#!/usr/bin/env node
// niche-exp.js — the pre-registered test of niche construction. Discipline from SYNTHESIS §9-10
// and the brain (prereg-needs-power, proxy-metric-trap, canary-not-rule): decide the metric,
// threshold, and replicate count BEFORE seeing any number.
//
// ── PRE-REGISTRATION (written before the first run) ──────────────────────────────────────────
// DESIGN: paired seeds. For each seed s in 0..7, run TWO worlds identical except one switch:
//         CONTROL construct=false   vs   TREATMENT construct=true. Everything else equal.
// PRIMARY METRIC: effNiches = effective # of coexisting harvest specialists (exp of Shannon
//         entropy over organisms' realized harvest class), averaged over the last 25% of ticks.
// PRIMARY HYPOTHESIS (directional): niche construction SUSTAINS MORE coexisting specialists,
//         effNiches(TREATMENT) > effNiches(CONTROL).
// PASS THRESHOLD (v2, decided now, n=8 fixed): the mean paired difference (T−C) must be
//         >= MIN_EFFECT = 0.30 effective niches (a MINIMUM EFFECT SIZE, not just "beats noise" —
//         the v1 threshold passed on +0.008 because it lacked one; that is the prereg-needs-power
//         lesson, and I'm not repeating it), AND positive in >= 6 of 8 seeds, AND mean > 2*SD.
//         Miss any → NOT SUPPORTED. A 0.008 "win" is a rounding artifact, not a result.
// REGIME: hostile world (skew=0.85) where the fixed field gives control only ~1.8 niches, so
//         there is real headroom for construction to manufacture the niches the world denied.
// MECHANISM CHECKS (not the verdict, but required to interpret it):
//   • CANARY: builds>0 and builtFrac>0 in every TREATMENT run, and EXACTLY 0 in every CONTROL.
//             If construction never fires, the comparison is vacuous — say so, don't report a null.
//   • HERITABLE NICHE (the niche-construction signature): bornOnOwnBuiltFrac — fraction of births
//             landing on ground built by the child's OWN lineage. Compare to bornOnBuiltFrac (any
//             lineage). Own >> (any−own) means descendants preferentially inherit the world their
//             ancestors made — inheritance of an environment, not just genes. Structurally 0 in CONTROL.
//   • FAILURE MODE: if TREATMENT effNiches < CONTROL, construction COLLAPSED diversity (everyone
//             terraforms to one type) — the cross-feeding monoculture failure. A real negative.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const { Niche } = require('./lib/niche.js');

const SEEDS = 8, TICKS = 3000, TAIL = 0.25, MIN_EFFECT = 0.30;
// buildThresh/Cost low enough a NEWBORN on hostile ground can condition its own cell before
// starving (the pepper: a seed makes its own soil). The price stays real — with window=2,
// expressing CONSTRUCT eats one of two slots, so a builder harvests only ONE type (a forced
// specialist). That attention-slot tradeoff is the price, not the energy.
const REGIME = { resources: 4, window: 2, skew: 0.85, predation: false,
                 buildThresh: 3, buildCost: 3, buildP: 0.5 };
function run(seed, construct) {
  const sim = new Niche({ ...REGIME, seed: seed * 1000 + 7, construct });
  const tailStart = Math.floor(TICKS * (1 - TAIL));
  const acc = { effNiches: 0, fedFrac: 0, builtFrac: 0, bornOnBuilt: 0, bornOnOwnBuilt: 0, expr: 0, pop: 0, n: 0 };
  let builds = 0, extinct = false;
  for (let t = 0; t < TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) { extinct = true; break; }
    if (t >= tailStart) {
      const s = sim.stats();
      acc.effNiches += s.effNiches; acc.fedFrac += s.fedFrac; acc.builtFrac += s.builtFrac;
      acc.bornOnBuilt += s.bornOnBuiltFrac; acc.bornOnOwnBuilt += s.bornOnOwnBuiltFrac;
      acc.expr += s.exprComplexity; acc.pop += s.pop; acc.n++;
    }
  }
  builds = sim.builds;
  const n = acc.n || 1;
  return {
    extinct, builds,
    effNiches: acc.effNiches / n, fedFrac: acc.fedFrac / n, builtFrac: acc.builtFrac / n,
    bornOnBuilt: acc.bornOnBuilt / n, bornOnOwnBuilt: acc.bornOnOwnBuilt / n,
    expr: acc.expr / n, pop: acc.pop / n,
  };
}

console.log(`niche construction — paired-seed test | ${SEEDS} seeds × ${TICKS} ticks, tail ${TAIL*100}%\n`);
console.log('seed |  CTRL eff | TREAT eff |   Δeff | TREAT fed | built% | bornOwn% bornAny% | canary');
console.log('-----+-----------+-----------+--------+-----------+--------+------------------+-------');
const diffs = [];
let canaryOK = true;
for (let s = 0; s < SEEDS; s++) {
  const c = run(s, false), t = run(s, true);
  const d = t.effNiches - c.effNiches;
  diffs.push(d);
  const canary = (t.builds > 0 && t.builtFrac > 0 && c.builds === 0 && c.builtFrac === 0) ? 'ok' : 'FAIL';
  if (canary === 'FAIL') canaryOK = false;
  const flags = [];
  if (c.extinct) flags.push('C-extinct');
  if (t.extinct) flags.push('T-extinct');
  console.log(
    `  ${s}  |   ${c.effNiches.toFixed(2).padStart(6)} |   ${t.effNiches.toFixed(2).padStart(6)} | ${(d>=0?'+':'')}${d.toFixed(2).padStart(5)} |` +
    `    ${t.fedFrac.toFixed(2)}   |  ${(t.builtFrac*100).toFixed(0).padStart(2)}%   |   ${(t.bornOnOwnBuilt*100).toFixed(0).padStart(2)}%    ${(t.bornOnBuilt*100).toFixed(0).padStart(2)}%   | ${canary}${flags.length?' '+flags.join(','):''}`
  );
}
const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length);
const nPos = diffs.filter(d => d > 0).length;
console.log('-----+-----------+-----------+--------+-----------+--------+------------------+-------');
console.log(`\nmean Δeff = ${mean>=0?'+':''}${mean.toFixed(3)}  |  SD = ${sd.toFixed(3)}  |  positive in ${nPos}/${SEEDS} seeds`);

console.log('\n── VERDICT (against the pre-registered threshold) ──');
if (!canaryOK) {
  console.log('CANARY FAILED — construction did not fire cleanly (or fired in control). Comparison is');
  console.log('VACUOUS; fix the mechanism before believing any effNiches number.');
} else {
  const passSign = nPos >= 6;
  const passEffect = mean >= MIN_EFFECT && mean > 2 * sd;
  if (mean > 0 && passSign && passEffect)
    console.log(`SUPPORTED: niche construction sustains more coexisting specialists (+${mean.toFixed(2)} niches,\n  positive in ${nPos}/8, effect ${mean.toFixed(2)} >= min ${MIN_EFFECT} and > 2×noise ${sd.toFixed(2)}). Real.`);
  else if (mean <= -MIN_EFFECT && diffs.filter(d => d < 0).length >= 6)
    console.log(`FAILURE MODE CONFIRMED: construction COLLAPSED diversity (${mean.toFixed(2)} niches) — everyone\n  terraforms toward one type, the cross-feeding monoculture. A real negative, publish it.`);
  else
    console.log(`NOT SUPPORTED: mean Δ ${mean>=0?'+':''}${mean.toFixed(2)} (need >= ${MIN_EFFECT}), positive ${nPos}/8 (need 6),\n  vs 2×noise ${(2*sd).toFixed(2)}. No effect of a size worth claiming. Honest null — don't dress it up.`);
}
