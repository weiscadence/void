// SELF-ORGANIZED CRITICALITY test (Grok's "close the last human hand", 2026-07-24) — the STRONG
// version. soc-exp.js is the weak one: it HAND-SET enrichment (calm vs enriched) and scored the tail
// with log-log R^2. Parking the system at the edge then "finding" the edge is near-circular, and R^2
// is a signal not a test.
//
// This version fixes both holes:
//   - Drive is NEVER touched. Every parameter is fixed at ONE local-rule setting.
//   - The claim is the DEFINING property of SOC (Bak): the critical state is an ATTRACTOR reached
//     from any initial condition. So start from three radically different densities and ask:
//       Q1  do sparse/medium/dense converge to the SAME steady state? (IC-independence)
//       Q2  are die-back avalanches power-law by Clauset (bootstrap p >= 0.1)?
//       Q3  does the power law BEAT an exponential (Vuong LR>0, significant)?
//   - Measured with lib/clauset.js (MLE + KS + bootstrap + Vuong), not R^2.
// SOC is claimed only if Q1 && Q2 && Q3 && consistent alpha. Else: name the leg that failed.
//
// No global crash count feeds any rule: building = LOCAL surplus, death = LOCAL starvation, stock =
// LOCAL. Only ceiling is maxNodes, set high and REPORTED if hit so a truncated tail can't fake a cutoff.
'use strict';
const { Graph } = require('./lib/graph.js');
const { fitPowerLaw, bootstrapP, vsExponential } = require('./lib/clauset.js');

const BURN = 2000, MEASURE = 9000, SEEDS = [1, 2, 3, 4, 5], NBOOT = 300;

// ONE fixed local-rule config — resource-consumer waves + surplus-funded local construction.
// Enrichment (basal/stock) fixed mid-range and never swept.
// STABILIZER (env STABILIZE=1): construction draws its cost from the same local stock agents feed on,
// so a boom depletes its own fuel (Grok's binary question — does this collapse the two basins into one?).
const STABILIZE = process.env.STABILIZE === '1';
const FIXED = { registers: 3, resourceMode: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, maxNodes: 3000, decayEmpty: 60,
  buildDrawsStock: STABILIZE, buildStockCost: 40 };

const INITS = {
  sparse: { roots: 2, seedPerRoot: 3 },
  medium: { roots: 4, seedPerRoot: 12 },
  dense:  { roots: 8, seedPerRoot: 40 },
};

// avalanche = peak-to-trough die-back in pop series (drop>=2 skips 1-tick noise)
function avalanches(series) {
  const out = []; let peak = series[0], falling = false;
  for (let i = 1; i < series.length; i++) {
    const p = series[i];
    if (p < series[i - 1]) falling = true;
    else if (p > series[i - 1] && falling) {
      const drop = peak - series[i - 1]; if (drop >= 2) out.push(drop);
      falling = false; peak = p;
    }
    if (!falling && p > peak) peak = p;
  }
  return out;
}

function run(initName, seed) {
  const g = new Graph({ ...FIXED, ...INITS[initName], seed });
  for (let t = 0; t < BURN; t++) g.step();
  const series = []; let hitCap = false;
  for (let t = 0; t < MEASURE; t++) { g.step(); const s = g.stats(); series.push(s.pop); if (s.hitMaxNodes) hitCap = true; }
  const av = avalanches(series);
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  return { av, meanPop: mean, hitCap };
}

function rng(s) { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

console.log(`SOC TEST (strong)${STABILIZE ? ' + STABILIZER (build draws local stock)' : ''} — fixed local rules, three initial densities, drive knob never touched.\n`);
const summary = {};
for (const initName of Object.keys(INITS)) {
  const allAv = []; let popSum = 0, capHits = 0; const perSeedPop = [];
  for (const seed of SEEDS) {
    const r = run(initName, seed);
    allAv.push(...r.av); popSum += r.meanPop; perSeedPop.push(Math.round(r.meanPop)); if (r.hitCap) capHits++;
  }
  const fit = fitPowerLaw(allAv);
  let p = null, exp = null;
  if (fit.ok) { p = bootstrapP(allAv, fit, NBOOT, rng(99)); exp = vsExponential(allAv, fit); }
  summary[initName] = { meanPop: popSum / SEEDS.length, perSeedPop, capHits, fit, p, exp };
  console.log(`${initName.padEnd(7)} | steadyPop ${(popSum/SEEDS.length).toFixed(0).padStart(4)} (seeds ${perSeedPop.join('/')}) | avalanches ${allAv.length.toString().padStart(5)} maxAv=${Math.max(0,...allAv)} cap ${capHits}/${SEEDS.length}`);
  console.log(fit.ok
    ? `        └ alpha=${fit.alpha.toFixed(2)} xmin=${fit.xmin} D=${fit.D.toFixed(3)} p=${p.toFixed(2)} | vs-exp: ${exp.favors} (LR=${exp.LR}, p=${exp.p})`
    : `        └ no fit (${fit.reason})`);
}

const pops = Object.values(summary).map(s => s.meanPop);
const spread = (Math.max(...pops) - Math.min(...pops)) / (pops.reduce((a, b) => a + b) / pops.length);
const alphas = Object.values(summary).filter(s => s.fit.ok).map(s => s.fit.alpha);
const alphaSpread = alphas.length === 3 ? Math.max(...alphas) - Math.min(...alphas) : 99;
const converged = spread < 0.25;
const allPL = Object.values(summary).every(s => s.fit.ok && s.p >= 0.1);
const beatsExp = Object.values(summary).every(s => s.exp && s.exp.favors === 'powerlaw' && s.exp.p < 0.1);
const soc = converged && allPL && beatsExp && alphaSpread < 0.4;

console.log('\n--- VERDICT ---');
console.log(`Q1 IC-independence: pop spread ${(spread*100).toFixed(0)}% → ${converged ? 'CONVERGED (same attractor)' : 'NOT converged (start-dependent = NOT SOC)'}; alpha spread ${alphaSpread.toFixed(2)}`);
console.log(`Q2 power-law (Clauset p>=0.1 all inits): ${allPL ? 'YES' : 'NO'}`);
console.log(`Q3 beats exponential (all inits): ${beatsExp ? 'YES' : 'NO'}`);
console.log(`\nSOC: ${soc ? '*** SUPPORTED ***' : 'NOT SUPPORTED — honest miss'}`);
if (Object.values(summary).some(s => s.capHits > 0)) console.log('⚠️ node cap hit — tail may be truncated; raise maxNodes and re-run before trusting big avalanches.');
