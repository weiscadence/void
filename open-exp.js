#!/usr/bin/env node
// PRE-REGISTERED test of the open-vocabulary architecture (lib/open.js) vs a capped-vocabulary
// control. Hypothesis: an open genotype→phenotype map escapes the fixed-vocabulary ceiling —
// it sustains MORE stable niches AND higher program complexity than a menu-capped control, and
// (the open-endedness-ish signal) they keep RISING rather than settling at a menu size.
// Threefold win required (guards the diffusion trap — novelty alone is NOT the win):
//   1. stableNiches(open) >> stableNiches(menu) — and menu is pinned near its menu size.
//   2. progComplexity(open) > progComplexity(menu) — programs are actually more elaborate.
//   3. stableNiches keeps rising to t=8000 (slope over the back half > 0), not a plateau.
// Failure reads honestly: if distinctNiches >> stableNiches → diffusion (silica redux); if open
// plateaus like everything else → the ceiling moved but didn't lift.
const { Open } = require(__dirname + '/lib/open.js');
const SEEDS = 4, TICKS = 8000, MARKS = [1000, 2000, 4000, 6000, 8000];
const ARMS = { 'menu-8 (control)': { menuSize: 8, construct: false },
               'open': { menuSize: 0, construct: false },
               'open + construction': { menuSize: 0, construct: true } };
function run(opts) {
  const rows = MARKS.map(() => ({ dist: 0, stab: 0, prog: 0, pop: 0, n: 0 }));
  for (let s = 0; s < SEEDS; s++) {
    const sim = new Open({ seed: s * 100 + 7, tol: 2, ...opts });
    let mi = 0;
    for (let t = 1; t <= TICKS; t++) {
      sim.step();
      if (sim.orgs.filter(o => !o.dead).length === 0) break;
      if (mi < MARKS.length && t === MARKS[mi]) { const st = sim.stats(); rows[mi].dist += st.distinctNiches; rows[mi].stab += st.stableNiches; rows[mi].prog += st.progComplexity; rows[mi].pop += st.pop; rows[mi].n++; mi++; }
    }
  }
  return MARKS.map((m, i) => ({ t: m, dist: rows[i].dist / rows[i].n, stab: rows[i].stab / rows[i].n, prog: rows[i].prog / rows[i].n, pop: rows[i].pop / rows[i].n }));
}
const out = {};
for (const [label, opts] of Object.entries(ARMS)) {
  console.log(`\n== ${label} ==`);
  console.log('  tick | pop  | distinctNiches | stableNiches | progComplexity');
  const r = run(opts); out[label] = r;
  for (const x of r) console.log(`  ${String(x.t).padStart(4)} | ${x.pop.toFixed(0).padStart(4)} |      ${x.dist.toFixed(1).padStart(5)}     |    ${x.stab.toFixed(1).padStart(5)}    |     ${x.prog.toFixed(2)}`);
}
console.log('\n── VERDICT ──');
const menu = out['menu-8 (control)'], open = out['open'], build = out['open + construction'];
const last = a => a[a.length - 1], mid = a => a[2];
const escapes = last(open).stab > last(menu).stab * 3;
const complex = last(open).prog > last(menu).prog * 1.3;
const rising = last(open).stab > mid(open).stab * 1.1;
const diffusion = last(open).dist > last(open).stab * 2.5;
console.log(`stable niches — menu ${last(menu).stab.toFixed(1)} vs open ${last(open).stab.toFixed(1)} vs open+build ${last(build).stab.toFixed(1)}`);
console.log(`prog complexity — menu ${last(menu).prog.toFixed(2)} vs open ${last(open).prog.toFixed(2)} vs open+build ${last(build).prog.toFixed(2)}`);
console.log(`open stable niches t=4000→8000: ${mid(open).stab.toFixed(1)} → ${last(open).stab.toFixed(1)} (${rising ? 'STILL RISING' : 'plateaued'})`);
console.log(diffusion ? 'DIFFUSION WARNING: distinct >> stable — mostly churn, not held niches.' : 'niches are STABLE (distinct ≈ stable), not drift.');
console.log(escapes && complex
  ? (rising ? 'ESCAPES the ceiling AND still rising — the open map does what the fixed menu structurally could not.'
            : 'ESCAPES the ceiling (more stable niches + complexity) but plateaus — lifted the wall, still a wall.')
  : 'NO ESCAPE — open vocabulary did not beat the capped control on stable niches + complexity.');
