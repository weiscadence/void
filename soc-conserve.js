// SOC WITH A CONSERVED QUANTITY — the expensive half of the Bak recipe (2026-08-02)
//
// RESULT-soc-bak.md: timescale separation alone gave a clean negative, and named why — this
// substrate has NO CONSERVED QUANTITY. Every site is both a source (regen conjures energy) and a
// sink (upkeep destroys it). A sandpile is neither: the drive adds grains, toppling only
// TRANSPORTS them, and grains leave only at the boundary. That conservation is what makes the
// critical state an attractor. So this run supplies it: `conserve` mode in lib/graph.js turns
// every bulk operation into a transfer (upkeep, reproduction split, build cost, death, node decay),
// injects energy only to cover a shortfall, and dissipates only by leakage at the root niches.
//
// Decision rule is the SAME as PREREG-soc-bak.md — rules unchanged, thresholds unchanged, 4 seeds
// x 2 inits, fast-drive negative control. The only new thing is the substrate.
//
// GATE: a conservation canary runs FIRST. "Conserved" has to be a measured fact, not a label on a
// mode flag — if the books don't balance, some operation is still creating or destroying energy and
// every number after it is meaningless. Canary fails -> exit 2 UNTRUSTED, no results printed.
'use strict';
const { Graph } = require('./lib/graph.js');
const { fitPowerLaw, bootstrapP, vsExponential } = require('./lib/clauset.js');

const BURN = 2000, MEASURE = 9000, SEEDS = [1, 2, 3, 4], NBOOT = 200;
const MIN_AV = 2, PASS_SEEDS = 3;
const SEP = parseFloat(process.argv[2] ?? '0.25');   // same live operating point as Amendment 1
// Amendment 2: cap raised out of the way for conserve runs (6014 niches at the operating
// point vs a 3000 default), so pre-registered rule 2 tests the WORLD and not the harness.
const MAXNODES = Number(process.env.MAXNODES ?? 30000);

const BASE = {
  registers: 3, conserve: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75,
  decayEmpty: 60, buildDrawsStock: true, buildStockCost: 20, leak: 0.02,
  get maxNodes() { return MAXNODES; },
};
const INITS = { sparse: { roots: 2, seedPerRoot: 3 }, dense: { roots: 8, seedPerRoot: 40 } };
// THE DRIVE IS driveIn, NOT regen. This line originally read `const DRIVE = BASE.regen`, carried
// over from soc-bak.js where it is CORRECT — that run is resourceMode, in which every niche
// conjures REGEN per tick, so REGEN really is the source. Conserve mode moved the source to
// DRIVE_IN and left REGEN as the per-niche draw cap on the recycled pool. Throttling REGEN here
// would have thrown the slow-drive treatment and the fast-drive negative control into the SAME
// condition, then printed a pre-registered verdict over the top of it.
// Measured 2026-08-02 (conserve-drivesweep.js): varying regen 1..20 moves population from 25151.1
// to 25151.4 — inert. Varying driveIn 5..180 moves it 2150 -> 79882, linear in the drive.
const DRIVE = BASE.driveIn ?? 60;

// ---------------------------------------------------------------- conservation canary
// The books must balance every tick: energy now - energy at start === injected - dissipated.
// Checked while the world is BUSY (organisms feeding, dying, reproducing, building, niches
// decaying) — a conservation law that only holds in a quiet world is not being tested at all.
function canary() {
  const g = new Graph({ ...BASE, ...INITS.dense, seed: 7 });
  const start = g.totalEnergy();
  let worst = 0, sawDeaths = false, sawBuilds = false, sawBirths = false;
  const d0 = g.deaths, b0 = g.builds, n0 = g.births;
  for (let t = 0; t < 600; t++) {
    g.step();
    const drift = Math.abs((g.totalEnergy() - start) - (g.injected - g.dissipated));
    if (drift > worst) worst = drift;
  }
  sawDeaths = g.deaths > d0; sawBuilds = g.builds > b0; sawBirths = g.births > n0;
  const scale = Math.max(1, g.totalEnergy());
  return { ok: worst / scale < 1e-9 && sawDeaths && sawBirths, worst, rel: worst / scale, sawDeaths, sawBuilds, sawBirths };
}

const c = canary();
if (!c.ok) {
  console.error('UNTRUSTED — conservation canary FAILED. Results withheld.');
  console.error(`  worst drift ${c.worst.toExponential(3)} (relative ${c.rel.toExponential(3)})`);
  console.error(`  exercised: deaths=${c.sawDeaths} births=${c.sawBirths} builds=${c.sawBuilds}`);
  console.error('  A non-zero drift means some operation still creates or destroys energy, so');
  console.error('  "conserve" is a label and not a property. Fix the leak before believing anything.');
  process.exit(2);
}
console.log(`conservation canary PASSED — books balance to ${c.rel.toExponential(2)} relative over 600 busy ticks`);
console.log(`  (exercised in the state it claims to hold: deaths=${c.sawDeaths} births=${c.sawBirths} builds=${c.sawBuilds})\n`);

// ---------------------------------------------------------------- wiring canary
// The conservation canary above proves the BOOKS balance. It cannot prove the knob this experiment
// turns is connected to anything — and on 2026-08-02 that is exactly what went wrong: three drive
// sweeps varied `regen`, which in conserve mode is inert, and produced population identical to four
// significant figures while looking like a clean result. A disconnected knob is worse than a dead
// readout, because a dead readout prints an obvious zero and a disconnected knob prints a flat line
// that reads as a finding.
//
// So: turn the drive to both extremes and require the world to NOTICE. This is the negative-control
// half that instrument canaries usually skip — not "can the meter read a live world" but "can the
// meter read two DIFFERENT worlds differently."
function wiringCanary() {
  const measure = (driveIn) => {
    const g = new Graph({ ...BASE, ...INITS.dense, driveIn, seed: 11 });
    for (let t = 0; t < 400; t++) g.step();
    return g.stats().pop;
  };
  const lo = measure(DRIVE * 0.1), hi = measure(DRIVE * 3);
  // require a decisive response, not a nudge: 10x vs 3x the drive is a 30x span in the only source
  const ratio = hi / Math.max(1, lo);
  return { ok: ratio > 2, lo, hi, ratio };
}
const w = wiringCanary();
if (!w.ok) {
  console.error('UNTRUSTED — wiring canary FAILED. Results withheld.');
  console.error(`  drive x0.1 -> pop ${w.lo}, drive x3 -> pop ${w.hi} (ratio ${w.ratio.toFixed(2)})`);
  console.error('  A 30x change in the ONLY energy source barely moved the world, so the knob this');
  console.error('  experiment throttles is not on the causal path. The slow-drive treatment and the');
  console.error('  fast-drive control would be the same condition wearing different labels.');
  process.exit(2);
}
console.log(`wiring canary OK — drive x0.1 -> pop ${w.lo}, x3 -> pop ${w.hi} (${w.ratio.toFixed(1)}x response)\n`);

// ---------------------------------------------------------------- the pre-registered test
function run(initName, seed, slow) {
  const g = new Graph({ ...BASE, ...INITS[initName], seed });
  let last = 0;
  const drive = () => { g.DRIVE_IN = slow && last > 0 ? DRIVE * SEP : DRIVE; };
  for (let t = 0; t < BURN; t++) { drive(); const b = g.deaths; g.step(); last = g.deaths - b; }
  const av = []; let cur = 0, popSum = 0, popN = 0, quiet = 0;
  for (let t = 0; t < MEASURE; t++) {
    drive();
    const b = g.deaths; g.step(); const d = g.deaths - b; last = d;
    if (d > 0) cur += d; else { quiet++; if (cur >= MIN_AV) av.push(cur); cur = 0; }
    if (t % 25 === 0) { popSum += g.stats().pop; popN++; }
  }
  if (cur >= MIN_AV) av.push(cur);
  return { av, pop: popN ? popSum / popN : 0, quiet: quiet / MEASURE, cap: g.hitMaxNodes,
           injected: g.injected, dissipated: g.dissipated, pool: g.pool };
}
function rng(s) { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
function analyse(av) {
  const fit = fitPowerLaw(av);
  if (!fit.ok) return { ok: false };
  const e = vsExponential(av, fit);   // {LR, p} — kept under DISTINCT names; spreading it over the
  // bootstrap p silently overwrote the goodness-of-fit p with the Vuong p on the first draft.
  return { ok: true, alpha: fit.alpha, xmin: fit.xmin, n: av.length,
           p: bootstrapP(av, fit, NBOOT, rng(99)), LR: e.LR, p_exp: e.p };
}

const R = {};
for (const drive of ['slow', 'fast']) for (const i of Object.keys(INITS)) for (const s of SEEDS)
  R[`${drive}|${i}|${s}`] = run(i, s, drive === 'slow');

console.log('SOC WITH A CONSERVED QUANTITY — rules per PREREG-soc-bak.md, substrate is new');
console.log(`separation f=${SEP}, burn ${BURN}, measure ${MEASURE}, seeds ${SEEDS.join(',')}\n`);

const V = {};
for (const drive of ['slow', 'fast']) {
  console.log(`--- ${drive.toUpperCase()} DRIVE ${drive === 'fast' ? '(NEGATIVE CONTROL)' : '(treatment)'}`);
  console.log('init    seed | pop   quiescent | nAv  alpha  xmin  p     | vs-exp LR     pLR    | cap');
  let fav = 0, cnt = 0, anyCap = false;
  for (const i of Object.keys(INITS)) for (const s of SEEDS) {
    const r = R[`${drive}|${i}|${s}`], a = analyse(r.av);
    if (r.cap) anyCap = true;
    if (!r.cap && a.ok) { cnt++; if (a.LR > 0 && a.p_exp < 0.05) fav++; }
    const cells = a.ok
      ? `${String(a.n).padEnd(4)} ${a.alpha.toFixed(2).padEnd(6)} ${String(a.xmin).padEnd(5)} ${a.p.toFixed(3)} | ${a.LR.toFixed(2).padStart(8)}  ${a.p_exp.toFixed(4)}`
      : 'too few avalanches to fit';
    console.log(`${i.padEnd(7)} ${s}    | ${String(Math.round(r.pop)).padEnd(5)} ${(r.quiet * 100).toFixed(1).padStart(5)}%     | ${cells} | ${r.cap ? 'HIT' : '-'}`);
  }
  V[drive] = { fav, cnt, anyCap };
  console.log(`  → ${fav}/${cnt} cap-free runs favour power-law over exponential (p<0.05)\n`);
}

console.log('--- RULE 3: one attractor? (slow drive, sparse vs dense steady pop, threshold 25%)');
let conv = 0;
for (const s of SEEDS) {
  const a = R[`slow|sparse|${s}`].pop, b = R[`slow|dense|${s}`].pop;
  const rel = Math.abs(a - b) / Math.max(a, b, 1);
  if (rel <= 0.25) conv++;
  console.log(`  seed ${s}: sparse ${Math.round(a)} vs dense ${Math.round(b)} → ${(rel * 100).toFixed(1)}% apart  ${rel <= 0.25 ? 'CONVERGED' : 'SPLIT'}`);
}

const one = R['slow|dense|1'];
console.log(`\nthroughput check (slow/dense/seed1): injected ${one.injected.toFixed(0)}, dissipated ${one.dissipated.toFixed(0)}, pool ${one.pool.toFixed(0)}`);
console.log('  (a conserved world still needs real throughput — if injected ~ 0 the world is a closed box)');

const r1 = V.slow.fav >= PASS_SEEDS, r2 = !V.slow.anyCap, r3 = conv === SEEDS.length, ctl = V.fast.fav < PASS_SEEDS;
console.log('\n=== PRE-REGISTERED VERDICT (conserved substrate) ===');
console.log(`rule 1  power-law over exponential in >=${PASS_SEEDS} slow runs : ${r1 ? 'PASS' : 'FAIL'} (${V.slow.fav}/${V.slow.cnt})`);
console.log(`rule 2  no node-cap contamination                     : ${r2 ? 'PASS' : 'FAIL'}`);
console.log(`rule 3  sparse and dense converge to one attractor    : ${r3 ? 'PASS' : 'FAIL'} (${conv}/${SEEDS.length})`);
console.log(`control fast drive does NOT look power-law            : ${ctl ? 'CLEAN' : 'CONTAMINATED — uninformative'}`);
console.log(`\nSOC ${r1 && r2 && r3 && ctl ? 'SUPPORTED' : 'NOT SUPPORTED'} on the conserved substrate.`);
