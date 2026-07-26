// THE REAL TEST (2026-07-24) — run the direct open-endedness instrument on the OPEN-VOCABULARY substrate
// (lib/open.js), where the fixed-vocabulary ceiling was previously shown to lift. Same question as
// openend-activity.js, no criticality: does the world keep building persistent, more-complex structure
// over a long run, ABOVE both a capped-vocabulary control and a neutral-drift shadow?
//
// Structure axis here is functional, not nesting: progComplexity (mean key-affecting instructions) is the
// "is it getting richer" signal; C = cumulative distinct keys that ever became STABLE (held >= STABLE_AGE)
// is the "does new lasting structure keep appearing" signal. Silica's failure = distinctNiches inflates
// while stable/complexity stay flat (neutral novelty). Open-ended = C and progComplexity keep rising.
//
// Arms:
//   open            menuSize 0            — treatment (open genotype->phenotype map)
//   menu-12         menuSize 12           — capped-vocabulary control (the ceiling)
//   neutral shadow  tol huge (all match)  — selection off, pure drift baseline
'use strict';
const { Open } = require('./lib/open.js');

const TICKS = 15000, EPOCH = 3000, SEEDS = [1, 2, 3];
const BASE = { tol: 2, construct: true, stableAge: 400 };
const ARMS = {
  'open':           { ...BASE, menuSize: 0 },
  'menu-12 (cap)':  { ...BASE, menuSize: 12 },
  'shadow (no sel)':{ ...BASE, menuSize: 0, tol: 999 },
};

function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts });
  const everStable = new Set();
  const epochs = Math.ceil(TICKS / EPOCH);
  const C = new Array(epochs).fill(0), prog = new Array(epochs).fill(0),
        dist = new Array(epochs).fill(0), pop = new Array(epochs).fill(0), stab = new Array(epochs).fill(0);
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    // accumulate: any key currently stable joins the cumulative set
    for (const [k, rec] of sim.keySince) if (sim.tick - rec.since >= sim.STABLE_AGE) everStable.add(k);
    if (t % EPOCH === 0) {
      const ei = t / EPOCH - 1; const s = sim.stats();
      C[ei] = everStable.size; prog[ei] = s.progComplexity; dist[ei] = s.distinctNiches;
      pop[ei] = s.pop; stab[ei] = s.stableNiches;
    }
  }
  return { C, prog, dist, pop, stab };
}
function avg(runs, f) { const n = runs[0][f].length; return Array.from({ length: n }, (_, i) => +(runs.reduce((s, r) => s + (r[f][i] || 0), 0) / runs.length).toFixed(1)); }
function arm(opts) { const runs = SEEDS.map(s => runOne(opts, s)); return { C: avg(runs, 'C'), prog: avg(runs, 'prog'), dist: avg(runs, 'dist'), pop: avg(runs, 'pop'), stab: avg(runs, 'stab') }; }

console.log('OPEN-ENDEDNESS on the OPEN-VOCABULARY substrate — does it keep building, vs capped control and drift shadow?\n');
const out = {};
const epochs = Math.ceil(TICKS / EPOCH);
const ends = Array.from({ length: epochs }, (_, i) => (i + 1) * EPOCH);
for (const [label, opts] of Object.entries(ARMS)) {
  const a = arm(opts); out[label] = a;
  console.log(`== ${label} ==`);
  console.log('  tick  | pop  | distinct | stable | progComplexity | C (cumulative ever-stable)');
  for (let i = 0; i < epochs; i++)
    console.log(`  ${String(ends[i]).padStart(5)} | ${String(a.pop[i]).padStart(4)} |   ${String(a.dist[i]).padStart(4)}   |  ${String(a.stab[i]).padStart(4)}  |     ${String(a.prog[i]).padStart(5)}      |   ${a.C[i]}`);
  console.log('');
}

const half = Math.floor(epochs / 2);
const slope = (a, f) => (a[f][epochs - 1] - a[f][half]) / (epochs - 1 - half);
console.log('--- VERDICT ---');
for (const [label, a] of Object.entries(out)) {
  console.log(`${label.padEnd(16)}: C back-half slope ${slope(a,'C').toFixed(1)}/epoch  progComplexity ${a.prog[0]}→${a.prog[epochs-1]} (slope ${slope(a,'prog').toFixed(2)})  finalC ${a.C[epochs-1]}`);
}
const o = out['open'], m = out['menu-12 (cap)'], sh = out['shadow (no sel)'];
const buildsForever = slope(o,'C') > 0.5 && slope(o,'prog') > 0.02 && o.C[epochs-1] > m.C[epochs-1] * 1.3 && o.C[epochs-1] > sh.C[epochs-1] * 1.3;
const plateau = slope(o,'C') <= 0.5 && slope(o,'prog') <= 0.02;
console.log(`\nverdict(open): ${buildsForever ? 'BUILDING — C and complexity keep rising above cap AND drift (the genuine article)' : plateau ? 'PLATEAU — settles like the others; ceiling moved but did not lift' : 'PARTIAL — beats controls on volume but complexity slope weak; report honestly which legs held'}`);
