// DOES FINITE CONSERVED ENERGY MAKE VARIATION NON-NEUTRAL? (2026-07-24, Jiggy's idea)
// The 50k open-vocab run climbs in complexity but only LINEARLY (+0.1/10k), because energy is an
// infinite source — being a better harvester doesn't deprive anyone, so most variation is neutral.
// Hypothesis: make energy CONSERVED (finite pool, every sink returns to it) → capturing more starves
// competitors → variation is selected → complexity should climb FASTER than the infinite-source baseline.
//
// Arms: infinite-source baseline vs conserved at a few total-energy budgets.
// CANARY (my own rule — an unmeasured conservation law isn't one): every tick, total = pool + Σ org.energy
// must stay constant to within epsilon. If it drifts, the whole run is marked UNTRUSTED and no verdict is
// read — a "faster climb" from a leaky conservation law would be an artifact, not a result.
'use strict';
const { Open } = require('./lib/open.js');

const TICKS = 30000, EPOCH = 6000, SEEDS = [1, 2];
const BASE = { tol: 2, construct: true, stableAge: 400 };

function totalEnergy(sim) { let s = sim.pool; for (const o of sim.orgs) if (!o.dead) s += o.energy; return s; }

function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts });
  // seed the conserved pool AFTER founders exist, so total = pool + seeded org energy is the fixed budget.
  if (opts.conserveEnergy) sim.pool = opts.energyPool;
  const t0 = totalEnergy(sim);
  const epochs = Math.ceil(TICKS / EPOCH);
  const C = new Array(epochs).fill(0), prog = new Array(epochs).fill(0), pop = new Array(epochs).fill(0), poolFrac = new Array(epochs).fill(0);
  const ever = new Set();
  let maxDrift = 0;
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (opts.conserveEnergy) { const d = Math.abs(totalEnergy(sim) - t0); if (d > maxDrift) maxDrift = d; }
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    for (const [k, rec] of sim.keySince) if (sim.tick - rec.since >= sim.STABLE_AGE) ever.add(k);
    if (t % EPOCH === 0) {
      const ei = t / EPOCH - 1; const s = sim.stats();
      C[ei] = ever.size; prog[ei] = s.progComplexity; pop[ei] = s.pop;
      poolFrac[ei] = opts.conserveEnergy ? +(sim.pool / t0).toFixed(2) : null;
    }
  }
  return { C, prog, pop, poolFrac, t0, maxDrift, trusted: !opts.conserveEnergy || maxDrift < 1e-6 };
}
function avg(runs, f) { const n = runs[0][f].length; return Array.from({ length: n }, (_, i) => +(runs.reduce((s, r) => s + (r[f][i] || 0), 0) / runs.length).toFixed(2)); }
function arm(opts) {
  const runs = SEEDS.map(s => runOne(opts, s));
  return { C: avg(runs, 'C'), prog: avg(runs, 'prog'), pop: avg(runs, 'pop'),
           trusted: runs.every(r => r.trusted), maxDrift: Math.max(...runs.map(r => r.maxDrift)) };
}

const ARMS = {
  'infinite source':   { ...BASE, conserveEnergy: false },
  'conserved E=8000':  { ...BASE, conserveEnergy: true, energyPool: 8000 },
  'conserved E=20000': { ...BASE, conserveEnergy: true, energyPool: 20000 },
};

console.log('CONSERVED ENERGY — does finite energy make complexity climb FASTER than the infinite-source baseline?\n');
const epochs = Math.ceil(TICKS / EPOCH);
const ends = Array.from({ length: epochs }, (_, i) => (i + 1) * EPOCH);
const out = {};
for (const [label, opts] of Object.entries(ARMS)) {
  const a = arm(opts); out[label] = a;
  console.log(`== ${label} ==  ${a.trusted ? 'conservation OK (drift ' + a.maxDrift.toExponential(1) + ')' : '*** UNTRUSTED: energy drifted ' + a.maxDrift.toFixed(2) + ' ***'}`);
  console.log('  tick  | pop  | progComplexity | C');
  for (let i = 0; i < epochs; i++) console.log(`  ${String(ends[i]).padStart(5)} | ${String(a.pop[i]).padStart(4)} |     ${String(a.prog[i]).padStart(5)}      | ${a.C[i]}`);
  console.log('');
}

const half = Math.floor(epochs / 2);
const cslope = a => (a.prog[epochs - 1] - a.prog[half]) / (epochs - 1 - half);
console.log('--- VERDICT ---');
const base = out['infinite source'];
console.log(`infinite source : progComplexity ${base.prog[0]}→${base.prog[epochs-1]}, back-half slope ${cslope(base).toFixed(3)}/epoch`);
for (const [label, a] of Object.entries(out)) {
  if (label === 'infinite source') continue;
  if (!a.trusted) { console.log(`${label}: UNTRUSTED — conservation leaked, verdict withheld`); continue; }
  const faster = cslope(a) > cslope(base) * 1.3;
  console.log(`${label}: progComplexity ${a.prog[0]}→${a.prog[epochs-1]}, slope ${cslope(a).toFixed(3)} — ${faster ? 'FASTER climb than infinite source ✓' : cslope(a) < cslope(base)*0.7 ? 'SLOWER (conservation hurt)' : 'about the same (no acceleration)'}`);
}
