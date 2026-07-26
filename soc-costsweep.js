// Does an EDGE exist between the two regimes? (2026-07-24)
// Baseline (buildStockCost off) = supercritical/bistable (runaway to cap). buildStockCost=40 =
// subcritical (one basin, exponential crashes). So the endogenous negative feedback BRACKETS
// criticality. This sweeps the feedback STRENGTH (build's draw on local stock) and asks whether an
// intermediate value sits at the edge: Vuong should cross from favouring power-law (weak feedback,
// supercritical) through ~0 (edge) to favouring exponential (strong feedback, subcritical).
// HONESTY: finding the edge by tuning this cost is TUNED criticality, not SOC — but it proves the
// edge is reachable under a purely local rule, which is the prerequisite for asking if it self-organizes.
'use strict';
const { Graph } = require('./lib/graph.js');
const { fitPowerLaw, bootstrapP, vsExponential } = require('./lib/clauset.js');

const BURN = 2000, MEASURE = 9000, SEEDS = [1, 2, 3, 4], NBOOT = 200;
const BASE = { registers: 3, resourceMode: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, maxNodes: 3000, decayEmpty: 60,
  roots: 4, seedPerRoot: 12, buildDrawsStock: true };
const COSTS = [5, 10, 15, 20, 30, 40];

function avalanches(series) {
  const out = []; let peak = series[0], falling = false;
  for (let i = 1; i < series.length; i++) {
    const p = series[i];
    if (p < series[i - 1]) falling = true;
    else if (p > series[i - 1] && falling) { const d = peak - series[i - 1]; if (d >= 2) out.push(d); falling = false; peak = p; }
    if (!falling && p > peak) peak = p;
  }
  return out;
}
function run(cost, seed) {
  const g = new Graph({ ...BASE, buildStockCost: cost, seed });
  for (let t = 0; t < BURN; t++) g.step();
  const s = []; let cap = false;
  for (let t = 0; t < MEASURE; t++) { g.step(); const st = g.stats(); s.push(st.pop); if (st.hitMaxNodes) cap = true; }
  return { av: avalanches(s), pop: s.reduce((a, b) => a + b, 0) / s.length, cap };
}
function rng(s) { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

console.log('COST SWEEP — is there a build-draw strength that sits at the edge? (medium init, 4 seeds)\n');
console.log('cost | steadyPop | avalanches maxAv cap | alpha xmin D    p    | vs-exp (LR, p)');
for (const cost of COSTS) {
  const all = []; let popSum = 0, caps = 0; const pops = [];
  for (const seed of SEEDS) { const r = run(cost, seed); all.push(...r.av); popSum += r.pop; pops.push(Math.round(r.pop)); if (r.cap) caps++; }
  const fit = fitPowerLaw(all);
  let p = null, exp = null;
  if (fit.ok) { p = bootstrapP(all, fit, NBOOT, rng(99)); exp = vsExponential(all, fit); }
  const tag = fit.ok ? `${fit.alpha.toFixed(2)}  ${String(fit.xmin).padStart(2)}  ${fit.D.toFixed(3)} ${p.toFixed(2)} | ${exp.favors} (LR=${exp.LR}, p=${exp.p})` : `no fit (${fit.reason})`;
  console.log(`${String(cost).padStart(4)} | ${(popSum/SEEDS.length).toFixed(0).padStart(5)} (${pops.join('/')}) | ${String(all.length).padStart(5)} ${String(Math.max(0,...all)).padStart(5)} ${caps}/${SEEDS.length} | ${tag}`);
}
console.log('\nRead: LR>0 & p<0.1 = power-law (near/at edge). LR<0 = exponential (subcritical, over-damped). cap>0 = runaway (supercritical, tail truncated).');
console.log('If some middle cost is power-law with the ends not = an edge exists under a purely local rule (tuned, not yet self-organized).');
