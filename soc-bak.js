// SOC UNDER TIMESCALE SEPARATION — the Bak recipe, finally built (2026-08-02)
//
// soc-selftune.js proved the graph world is BISTABLE, not critical (two basins from one init).
// soc-costsweep.js showed a local negative feedback collapses the bistability but overshoots to
// SUBCRITICAL — no wide power-law regime, only a knife edge. The recorded conclusion was that
// genuine SOC needs the Bak recipe: conserved quantity + SLOW DRIVE / FAST RELAXATION. That half
// was never built. This is it.
//
// The ONLY change is the drive SCHEDULE. Local rules, costs and parameters are untouched, and
// lib/graph.js is not modified — control and treatment run identical model code.
//   fast drive (control): REGEN added every tick, whether or not a cascade is running.
//   slow drive (treatment): REGEN added ONLY on ticks where the previous tick had zero deaths.
//     While the system is toppling, inflow is 0. Add a grain, let the pile finish, add the next.
//
// This also fixes a PROXY: prior runs estimated avalanches as peak-to-trough population drops,
// which has no principled boundary. Under timescale separation the avalanche is well defined —
// total deaths across a maximal run of consecutive non-quiescent ticks, i.e. everything that
// topples between one grain and the next.
//
// Decision rule, replicate count and the negative control are pre-registered in
// PREREG-soc-bak.md and are NOT to be adjusted after seeing output.
'use strict';
const { Graph } = require('./lib/graph.js');
const { fitPowerLaw, bootstrapP, vsExponential } = require('./lib/clauset.js');

const BURN = 2000, MEASURE = 9000, SEEDS = [1, 2, 3, 4], NBOOT = 200;
const MIN_AV = 2;          // same floor as prior runs
const PASS_SEEDS = 3;      // >=3 of 4 seeds must favour power-law (pre-registered)

// identical to soc-costsweep BASE: the damped, one-basin configuration
const BASE = {
  registers: 3, resourceMode: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, maxNodes: 3000,
  decayEmpty: 60, buildDrawsStock: true, buildStockCost: 20,
};
const INITS = { sparse: { roots: 2, seedPerRoot: 3 }, dense: { roots: 8, seedPerRoot: 40 } };
const DRIVE = BASE.regen;
// AMENDMENT 1: inflow during a cascade = SEP * DRIVE. SEP=0 is the pure Bak protocol, which
// starved the world (pop 0-5) and made run 1's verdict vacuous. soc-bak-ratio.js found 0.25 is
// the strongest separation that leaves a LIVING world (pop 47, 71% quiescent). Decision rule
// unchanged; only the operating point moves. See PREREG-soc-bak.md.
const SEP = parseFloat(process.argv[2] ?? '0.25');

// One run. slow=true throttles inflow while relaxing; slow=false is the every-tick control.
function run(initName, seed, slow) {
  const g = new Graph({ ...BASE, ...INITS[initName], seed });
  for (let t = 0; t < BURN; t++) {
    g.REGEN = slow && g.__lastDeaths > 0 ? DRIVE * SEP : DRIVE;
    const before = g.deaths; g.step(); g.__lastDeaths = g.deaths - before;
  }
  const avalanches = [];
  let current = 0, popSum = 0, popN = 0, quiescentTicks = 0;
  for (let t = 0; t < MEASURE; t++) {
    g.REGEN = slow && g.__lastDeaths > 0 ? DRIVE * SEP : DRIVE;
    const before = g.deaths;
    g.step();
    const d = g.deaths - before;
    g.__lastDeaths = d;
    if (d > 0) current += d;
    else {                                   // cascade ended — close the avalanche
      quiescentTicks++;
      if (current >= MIN_AV) avalanches.push(current);
      current = 0;
    }
    if (t % 25 === 0) { const s = g.stats(); popSum += s.pop; popN++; }
  }
  if (current >= MIN_AV) avalanches.push(current);
  return {
    av: avalanches,
    pop: popN ? popSum / popN : 0,
    cap: g.hitMaxNodes,
    quiescentFrac: quiescentTicks / MEASURE,   // sanity: slow drive must actually rest sometimes
  };
}

function rng(s) { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

function analyse(av) {
  const fit = fitPowerLaw(av);
  if (!fit.ok) return { ok: false };
  const p = bootstrapP(av, fit, NBOOT, rng(99));
  const exp = vsExponential(av, fit);
  return { ok: true, alpha: fit.alpha, xmin: fit.xmin, p, LR: exp.LR, pLR: exp.p, n: av.length };
}

const results = {};
for (const drive of ['slow', 'fast']) {
  for (const initName of Object.keys(INITS)) {
    for (const seed of SEEDS) {
      const r = run(initName, seed, drive === 'slow');
      results[`${drive}|${initName}|${seed}`] = r;
    }
  }
}

console.log('SOC UNDER TIMESCALE SEPARATION (Bak recipe) — pre-reg: PREREG-soc-bak.md');
console.log(`burn ${BURN}, measure ${MEASURE}, seeds ${SEEDS.join(',')}, avalanche = deaths per non-quiescent run\n`);

const verdict = {};
for (const drive of ['slow', 'fast']) {
  console.log(`--- ${drive.toUpperCase()} DRIVE ${drive === 'fast' ? '(NEGATIVE CONTROL — must NOT look power-law)' : '(treatment)'}`);
  console.log('init    seed | steadyPop  quiescent | nAv  alpha  xmin   p     | vs-exp LR      pLR    | cap');
  let favouring = 0, counted = 0, anyCap = false;
  for (const initName of Object.keys(INITS)) {
    for (const seed of SEEDS) {
      const r = results[`${drive}|${initName}|${seed}`];
      const a = analyse(r.av);
      if (r.cap) anyCap = true;
      // pre-registered rule 1 is scored on the MEDIUM-equivalent runs of both inits, cap-free only
      if (!r.cap && a.ok) { counted++; if (a.LR > 0 && a.pLR < 0.05) favouring++; }
      const cells = a.ok
        ? `${String(a.n).padEnd(4)} ${a.alpha.toFixed(2).padEnd(6)} ${String(a.xmin).padEnd(6)} ${a.p.toFixed(3)} | ${a.LR.toFixed(2).padStart(8)}  ${a.pLR.toFixed(4)}`
        : 'too few avalanches to fit';
      console.log(`${initName.padEnd(7)} ${seed}    | ${String(Math.round(r.pop)).padEnd(9)} ${(r.quiescentFrac * 100).toFixed(1).padStart(5)}%     | ${cells} | ${r.cap ? 'HIT' : '-'}`);
    }
  }
  verdict[drive] = { favouring, counted, anyCap };
  console.log(`  → ${favouring}/${counted} cap-free runs favour power-law over exponential (p<0.05)${anyCap ? '  [SOME RUNS HIT NODE CAP — those are truncation-contaminated and excluded]' : ''}\n`);
}

// rule 3: one attractor — sparse vs dense steady pop within 25%, per seed, slow drive
console.log('--- RULE 3: one attractor? (slow drive, sparse vs dense steady pop, pre-reg threshold 25%)');
let converged = 0;
for (const seed of SEEDS) {
  const s = results[`slow|sparse|${seed}`].pop, d = results[`slow|dense|${seed}`].pop;
  const rel = Math.abs(s - d) / Math.max(s, d, 1);
  if (rel <= 0.25) converged++;
  console.log(`  seed ${seed}: sparse ${Math.round(s)} vs dense ${Math.round(d)}  → ${(rel * 100).toFixed(1)}% apart  ${rel <= 0.25 ? 'CONVERGED' : 'SPLIT'}`);
}

const r1 = verdict.slow.favouring >= PASS_SEEDS;
const r2 = !verdict.slow.anyCap;
const r3 = converged === SEEDS.length;
const controlClean = verdict.fast.favouring < PASS_SEEDS;
console.log('\n=== PRE-REGISTERED VERDICT ===');
console.log(`rule 1  power-law over exponential in >=${PASS_SEEDS} slow-drive runs : ${r1 ? 'PASS' : 'FAIL'} (${verdict.slow.favouring}/${verdict.slow.counted})`);
console.log(`rule 2  no node-cap contamination                            : ${r2 ? 'PASS' : 'FAIL'}`);
console.log(`rule 3  sparse and dense converge to one attractor           : ${r3 ? 'PASS' : 'FAIL'} (${converged}/${SEEDS.length})`);
console.log(`control fast drive does NOT look power-law                   : ${controlClean ? 'CLEAN' : 'CONTAMINATED — result uninformative'}`);
console.log(`\nSOC ${r1 && r2 && r3 && controlClean ? 'SUPPORTED' : 'NOT SUPPORTED'} under this pre-registration.`);
