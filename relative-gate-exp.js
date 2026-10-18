// RELATIVE GATE EXPERIMENT — runs PREREG-relative-gate.md exactly as written.
//
// Arms:  A (control)   trigger when occ / NODE_CAP >= BUILD_DENSITY   [current behaviour]
//        R (treatment) trigger when occ / capEff   >= BUILD_DENSITY   [capEff = stock-sustainable]
// N = 6 seeds per arm, 3000 ticks. Primary outcome: fraction of niches at depth >= 2.
// Verdict thresholds and canaries are transcribed from the pre-registration and are NOT
// recomputed here from the data.
'use strict';
const { Graph } = require('./lib/graph.js');

const TICKS = Number(process.env.TICKS ?? 3000);
const SEEDS = (process.env.SEEDS ?? '1,2,3,4,5,6').split(',').map(Number);
const BASE = {
  registers: 3, conserve: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, decayEmpty: 60,
  buildDrawsStock: true, buildStockCost: 20, leak: 0.02,
  driveIn: 60, maxNodes: 5000, roots: 8, seedPerRoot: 40,
};
// Pre-registered, transcribed. Do not recompute from the run.
const PASS_FRAC = 0.10, PARTIAL_FRAC = 0.02, PASS_DEPTH = 4, ALIVE_POP = 100;

function run(relativeGate, seed) {
  const g = new Graph({ ...BASE, relativeGate, seed });
  for (let t = 0; t < TICKS; t++) g.step();
  const nodes = [...g.nodes.values()];
  const deep = nodes.filter(n => n.depth >= 2).length;
  const st = g.stats();
  const dh = {}; for (const n of nodes) dh[n.depth] = (dh[n.depth] || 0) + 1;
  return {
    seed, nodes: nodes.length, deepFrac: deep / nodes.length, maxDepth: Math.max(...nodes.map(n => n.depth)),
    pop: st.pop, hitMax: g.hitMaxNodes, builds: g.builds, trigDeep: g.trigDeep, trigShallow: g.trigShallow,
    depthHist: dh,
  };
}

// REGRESSION GATE. _gateCap() was inserted into the hot path of the control arm. If it perturbed
// the control at all, every §17 number is invalidated and nothing below can be compared to it.
// These three values are quoted from SYNTHESIS §17 / data/horizon-run.json, recorded BEFORE the edit.
const SEVENTEEN = { 1: { nodes: 3005, d1: 2975, d2: 22 }, 2: { nodes: 3006, d1: 2986, d2: 12 }, 3: { nodes: 3007, d1: 2989, d2: 10 } };
function regression() {
  let ok = true;
  for (const s of [1, 2, 3]) {
    const r = run(false, s), want = SEVENTEEN[s];
    const got = { nodes: r.nodes, d1: r.depthHist[1] || 0, d2: r.depthHist[2] || 0 };
    const pass = got.nodes === want.nodes && got.d1 === want.d1 && got.d2 === want.d2;
    if (!pass) ok = false;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] seed ${s} control reproduces §17: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  return ok;
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

if (require.main === module) {
  console.log('RELATIVE GATE — PREREG-relative-gate.md\n');
  console.log('REGRESSION (control must be byte-identical to the §17 baseline):');
  if (!regression()) {
    console.log('\nVOID — the edit perturbed the control arm. The §17 baseline is not comparable.');
    process.exit(2);
  }
  console.log('  control unchanged\n');

  const A = SEEDS.map(s => run(false, s));
  const R = SEEDS.map(s => run(true, s));

  for (const [name, arm] of [['A (absolute)', A], ['R (relative)', R]]) {
    console.log(`arm ${name}:`);
    for (const r of arm) {
      console.log(`  seed ${r.seed}: nodes=${r.nodes} pop=${r.pop} depth>=2 ${(100 * r.deepFrac).toFixed(2)}% ` +
        `maxDepth=${r.maxDepth} builds=${r.builds} trigDeep=${r.trigDeep} hitMax=${r.hitMax}`);
    }
    console.log(`  MEAN depth>=2 ${(100 * mean(arm.map(r => r.deepFrac))).toFixed(2)}% | ` +
      `maxDepth ${Math.max(...arm.map(r => r.maxDepth))} | trigDeep ${Math.round(mean(arm.map(r => r.trigDeep)))} | ` +
      `alive ${arm.filter(r => r.pop > ALIVE_POP).length}/${arm.length} | capSlam ${arm.filter(r => r.hitMax).length}/${arm.length}\n`);
  }

  // CANARY 1 — actuation. Scored before the verdict; failure means VOID, not negative.
  const tdA = mean(A.map(r => r.trigDeep)), tdR = mean(R.map(r => r.trigDeep));
  console.log(`CANARY 1 (actuation): deep triggers A=${Math.round(tdA)} R=${Math.round(tdR)}`);
  if (!(tdR > tdA)) {
    console.log('  FAIL — the treatment did not fire more deep triggers than the control.');
    console.log('\nVOID — unactuated manipulation. No verdict is reported.');
    process.exit(2);
  }
  console.log('  PASS — treatment actuated\n');

  const deepR = mean(R.map(r => r.deepFrac));
  const maxDepthOK = R.filter(r => r.maxDepth >= PASS_DEPTH).length > R.length / 2;
  const aliveOK = R.filter(r => r.pop > ALIVE_POP).length > R.length / 2;
  const noSlam = R.filter(r => !r.hitMax).length > R.length / 2;
  const deadly = R.filter(r => r.pop <= ALIVE_POP).length > R.length / 2;

  let verdict;
  if (deadly) verdict = 'DEAD';
  else if (deepR > PASS_FRAC && maxDepthOK && aliveOK && noSlam) verdict = 'PASS';
  else if (deepR > PARTIAL_FRAC) verdict = 'PARTIAL';
  else verdict = 'FAIL';

  console.log(`PRIMARY OUTCOME: depth>=2 fraction, arm R = ${(100 * deepR).toFixed(2)}%  (baseline 0.49%)`);
  console.log(`  thresholds: PASS >${100 * PASS_FRAC}% + maxDepth>=${PASS_DEPTH} + alive + no cap slam | PARTIAL >${100 * PARTIAL_FRAC}%`);
  console.log(`  clauses: maxDepth>=${PASS_DEPTH} ${maxDepthOK} | alive ${aliveOK} | noCapSlam ${noSlam}`);
  console.log(`\nVERDICT: ${verdict}`);
}

module.exports = { run };
