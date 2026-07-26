// MEASURING THE THING WE ACTUALLY WANT (Grok's catch, 2026-07-24): we got rigorous about criticality
// (a PROXY for a hypothesis we never tested) and never defined "keeps building meaningful new structure
// forever" on its own terms. This is that instrument — Bedau-Packard evolutionary activity, adapted to
// the graph substrate, against a NEUTRAL-DRIFT shadow control (selection off via tol=huge). No criticality
// anywhere in it.
//
// Component = a niche REQUIREMENT signature. A niche is "meaningful structure that stuck" once it has been
// continuously inhabitable long enough to cross an activity threshold (THETA inhabited-ticks). We track:
//   C(t)      cumulative DISTINCT persistent reqs that ever crossed THETA — how much structure got built AND held.
//   Anew      new persistent reqs per epoch — does new structure KEEP appearing (open-ended) or plateau (bounded)?
//   depth     mean/max depth of INHABITED niches — functional complexity (a deep niche is a real tower),
//             not lateral novelty (silica's endless neutral drift makes distinct reqs for free).
// Verdict vs the shadow:
//   BUILDING  C and depth keep rising to the end AND exceed the drift shadow (real structure, not churn).
//   SPINNING  real ≈ shadow: distinct reqs accrue but depth flat = neutral novelty, the silica failure.
//   DYING     population/diversity collapses.
'use strict';
const { Graph } = require('./lib/graph.js');

const TICKS = 15000, THETA = 200, EPOCH = 3000, SEEDS = [1, 2, 3];
// the STABILIZED single-basin world (buildDrawsStock on) — the regime that actually persists.
const BASE = { registers: 3, resourceMode: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, maxNodes: 3000, decayEmpty: 60,
  roots: 4, seedPerRoot: 12, buildDrawsStock: true, buildStockCost: 15 };

function runOne(opts, seed) {
  const g = new Graph({ ...opts, seed });
  const act = new Map();               // req -> inhabited-ticks
  const crossedAt = new Map();         // req -> tick it first crossed THETA
  const epochs = Math.ceil(TICKS / EPOCH);
  const Cmarks = new Array(epochs).fill(0);
  const depthMarks = new Array(epochs).fill(0);
  const distinctMarks = new Array(epochs).fill(0);
  const popMarks = new Array(epochs).fill(0);
  for (let t = 1; t <= TICKS; t++) {
    g.step();
    // reqs inhabited this tick
    const inhabited = new Map();        // req -> max depth seen
    for (const o of g.orgs) {
      if (o.dead) continue;
      const nd = g.nodes.get(o.node); if (!nd) continue;
      const r = nd.req.join(',');
      const d = nd.depth;
      if (!inhabited.has(r) || d > inhabited.get(r)) inhabited.set(r, d);
    }
    for (const r of inhabited.keys()) {
      const a = (act.get(r) || 0) + 1; act.set(r, a);
      if (a >= THETA && !crossedAt.has(r)) crossedAt.set(r, t);
    }
    if (t % EPOCH === 0) {
      const ei = t / EPOCH - 1;
      Cmarks[ei] = crossedAt.size;
      let dSum = 0, dN = 0, dMax = 0;
      for (const [r, d] of inhabited) { dSum += d; dN++; if (d > dMax) dMax = d; }
      depthMarks[ei] = dN ? +(dSum / dN).toFixed(2) : 0;
      distinctMarks[ei] = inhabited.size;
      popMarks[ei] = g.orgs.filter(o => !o.dead).length;
    }
  }
  return { Cmarks, depthMarks, distinctMarks, popMarks };
}

function avg(runs, field) {
  const n = runs[0][field].length;
  return Array.from({ length: n }, (_, i) => +(runs.reduce((s, r) => s + r[field][i], 0) / runs.length).toFixed(1));
}

function arm(label, opts) {
  const runs = SEEDS.map(s => runOne(opts, s));
  return { label, C: avg(runs, 'Cmarks'), depth: avg(runs, 'depthMarks'), distinct: avg(runs, 'distinctMarks'), pop: avg(runs, 'popMarks') };
}

console.log('OPEN-ENDEDNESS ACTIVITY — does the stabilized world keep building persistent, deeper structure? (vs neutral-drift shadow)\n');
const real = arm('void (selection on)', BASE);
const shadow = arm('neutral shadow (selection OFF, tol=999)', { ...BASE, tol: 999 });

const epochs = real.C.length;
const ends = Array.from({ length: epochs }, (_, i) => (i + 1) * EPOCH);
for (const a of [real, shadow]) {
  console.log(`== ${a.label} ==`);
  console.log('  tick  | pop  | inhabited reqs | mean depth | C (cumulative persistent reqs)');
  for (let i = 0; i < epochs; i++)
    console.log(`  ${String(ends[i]).padStart(5)} | ${String(a.pop[i]).padStart(4)} |     ${String(a.distinct[i]).padStart(5)}      |    ${String(a.depth[i]).padStart(5)}   |   ${a.C[i]}`);
  console.log('');
}

// verdicts — back-half slope of C (new structure still appearing?) and depth vs shadow
const half = Math.floor(epochs / 2);
const slope = a => (a.C[epochs - 1] - a.C[half]) / (epochs - 1 - half);
const sReal = slope(real), sShadow = slope(shadow);
const depthReal = real.depth[epochs - 1], depthShadow = shadow.depth[epochs - 1];
const Cadvantage = real.C[epochs - 1] / Math.max(1, shadow.C[epochs - 1]);
console.log('--- VERDICT ---');
console.log(`C back-half slope (new persistent structure/epoch): void ${sReal.toFixed(1)} vs shadow ${sShadow.toFixed(1)}`);
console.log(`final mean inhabited depth: void ${depthReal} vs shadow ${depthShadow}  (functional complexity, not lateral novelty)`);
console.log(`cumulative persistent structure: void ${real.C[epochs-1]} vs shadow ${shadow.C[epochs-1]} (${Cadvantage.toFixed(2)}x)`);
const dying = real.pop[epochs - 1] < 5;
const building = sReal > sShadow * 1.3 && sReal > 0.5 && depthReal > depthShadow + 0.3;
const spinning = !building && Cadvantage < 1.3;
console.log(`\nverdict: ${dying ? 'DYING (pop collapsed)' : building ? 'BUILDING (new persistent + deeper structure above drift)' : spinning ? 'SPINNING (novelty ≈ drift, depth flat — neutral churn)' : 'AMBIGUOUS — real exceeds drift on volume but not clearly on depth; report honestly'}`);
