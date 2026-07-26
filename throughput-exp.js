// IS IT FLOW, OR JUST "ENOUGH ENERGY"? (2026-07-24 — Jiggy's framing challenge)
// The conservation test compared two EXTREMES (infinite source vs closed pool) which differ in TWO ways:
// recycling AND how much energy is available. So "conservation froze it" might just mean "starving things
// can't build" — trivially true, and a PROXY next to the real claim. This isolates flow: an OPEN system
// where energy pours in at rate `influx` and dissipates out (bounded STANDING pool). If the complexity
// climb scales with FLOW RATE while the standing pool stays ~empty (same standing energy across arms),
// the driver is throughput, not amount. If flow doesn't matter, my interpretation was wrong.
//
// Anchors: closed (no flow, should die/freeze) and infinite source (unbounded). Flow arms in between.
// CANARY: if an arm's pool balloons (influx outruns demand) it's really infinite-source in disguise —
// flagged as SUPPLY-SATURATED so a runaway pool can't masquerade as a clean bounded-flow result.
'use strict';
const { Open } = require('./lib/open.js');

const TICKS = 30000, EPOCH = 6000, SEEDS = [1, 2];
const BASE = { tol: 2, construct: true, stableAge: 400 };

function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts });
  if (opts.conserveEnergy) sim.pool = opts.energyPool ?? 2000;
  const epochs = Math.ceil(TICKS / EPOCH);
  const prog = new Array(epochs).fill(0), C = new Array(epochs).fill(0), pop = new Array(epochs).fill(0), poolMark = new Array(epochs).fill(0);
  const ever = new Set();
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    for (const [k, rec] of sim.keySince) if (sim.tick - rec.since >= sim.STABLE_AGE) ever.add(k);
    if (t % EPOCH === 0) { const ei = t / EPOCH - 1, s = sim.stats(); prog[ei] = s.progComplexity; C[ei] = ever.size; pop[ei] = s.pop; poolMark[ei] = Math.round(sim.pool); }
  }
  return { prog, C, pop, poolMark };
}
function avg(runs, f) { const n = runs[0][f].length; return Array.from({ length: n }, (_, i) => +(runs.reduce((s, r) => s + (r[f][i] || 0), 0) / runs.length).toFixed(2)); }
function arm(opts) { const runs = SEEDS.map(s => runOne(opts, s)); return { prog: avg(runs, 'prog'), C: avg(runs, 'C'), pop: avg(runs, 'pop'), pool: avg(runs, 'poolMark') }; }

const ARMS = {
  'closed (no flow)':  { ...BASE, conserveEnergy: true, dissipate: true, influx: 0,   energyPool: 4000 },
  'flow=50':           { ...BASE, conserveEnergy: true, dissipate: true, influx: 50,  energyPool: 2000 },
  'flow=150':          { ...BASE, conserveEnergy: true, dissipate: true, influx: 150, energyPool: 2000 },
  'flow=400':          { ...BASE, conserveEnergy: true, dissipate: true, influx: 400, energyPool: 2000 },
  'infinite source':   { ...BASE, conserveEnergy: false },
};

console.log('THROUGHPUT — does the complexity climb scale with FLOW RATE at bounded standing energy?\n');
const epochs = Math.ceil(TICKS / EPOCH);
const ends = Array.from({ length: epochs }, (_, i) => (i + 1) * EPOCH);
const out = {};
for (const [label, opts] of Object.entries(ARMS)) {
  const a = arm(opts); out[label] = a;
  const saturated = label.startsWith('flow') && a.pool[epochs - 1] > 5000;   // pool ran away → ≈ infinite source
  console.log(`== ${label} ==${saturated ? '  ⚠️ SUPPLY-SATURATED (pool ballooned → effectively infinite source, not bounded flow)' : ''}`);
  console.log('  tick  | pop  | pool  | progComplexity | C');
  for (let i = 0; i < epochs; i++) console.log(`  ${String(ends[i]).padStart(5)} | ${String(a.pop[i]).padStart(4)} | ${String(a.pool[i]).padStart(5)} |     ${String(a.prog[i]).padStart(5)}      | ${a.C[i]}`);
  console.log('');
}

const half = Math.floor(epochs / 2);
const slope = a => (a.prog[epochs - 1] - a.prog[half]) / (epochs - 1 - half);
console.log('--- VERDICT (flow arms with a bounded standing pool) ---');
const flows = [['flow=50', 50], ['flow=150', 150], ['flow=400', 400]];
for (const [label, R] of flows) {
  const a = out[label]; const bounded = a.pool[epochs - 1] <= 5000;
  console.log(`${label.padEnd(9)} standingPool≈${a.pool[epochs-1]} ${bounded ? '(bounded)' : '(SATURATED)'}  finalComplexity ${a.prog[epochs-1]}  climb-slope ${slope(a).toFixed(3)}`);
}
console.log('\nRead: if finalComplexity RISES with flow rate while the standing pool stays small across arms → the driver is THROUGHPUT (flow), not standing amount (real claim). If complexity is flat across flow rates → it was just "enough energy" (framing error, my interpretation was wrong).');
