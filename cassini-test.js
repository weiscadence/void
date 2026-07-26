// CASSINI'S CRITIQUE (Colony, 2026-07-24): is the complexity climb genuine structural innovation, or
// just selection for a minimal instruction set that survives scarcity — i.e. instruction density, not
// hierarchy? The clean discriminator: compare the SAME high-flow world with SELECTION ON vs a NEUTRAL
// SHADOW (selection off, tol huge — every key matches, no pressure). If selection-on produces MORE
// key-affecting complexity than drift AT IDENTICAL THROUGHPUT, the complexity is EARNED, not what energy
// alone buys. Second tell: REACH — mean L1 distance of living keys from the origin. In this substrate,
// reaching a distant key REQUIRES composing more instructions, so growing reach = genuine structural
// innovation (new regions of key space), not efficiency-trimming near the origin. Also report rawLen so
// we can see effective/total ratio (density check: is length functional or bloat?).
'use strict';
const { Open } = require('./lib/open.js');

const TICKS = 30000, EPOCH = 6000, SEEDS = [1, 2], R = 400;
const BASE = { construct: true, stableAge: 400, conserveEnergy: true, dissipate: true, influx: R, energyPool: 2000 };

function reach(sim) { let s = 0, n = 0; for (const o of sim.orgs) if (!o.dead) { let d = 0; for (const k of o.key) d += Math.abs(k); s += d; n++; } return n ? s / n : 0; }

function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts }); sim.pool = opts.energyPool;
  const epochs = Math.ceil(TICKS / EPOCH);
  const prog = Array(epochs).fill(0), raw = Array(epochs).fill(0), rch = Array(epochs).fill(0), dist = Array(epochs).fill(0), pop = Array(epochs).fill(0);
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    if (t % EPOCH === 0) { const ei = t / EPOCH - 1, s = sim.stats(); prog[ei] = s.progComplexity; raw[ei] = s.rawLen; rch[ei] = +reach(sim).toFixed(2); dist[ei] = s.distinctNiches; pop[ei] = s.pop; }
  }
  return { prog, raw, rch, dist, pop };
}
function avg(runs, f) { const n = runs[0][f].length; return Array.from({ length: n }, (_, i) => +(runs.reduce((s, r) => s + (r[f][i] || 0), 0) / runs.length).toFixed(2)); }
function arm(opts) { const runs = SEEDS.map(s => runOne(opts, s)); return { prog: avg(runs, 'prog'), raw: avg(runs, 'raw'), rch: avg(runs, 'rch'), dist: avg(runs, 'dist'), pop: avg(runs, 'pop') }; }

const on = arm({ ...BASE, tol: 2 });
const shadow = arm({ ...BASE, tol: 999 });   // selection OFF: every key matches every lock

const epochs = Math.ceil(TICKS / EPOCH), ends = Array.from({ length: epochs }, (_, i) => (i + 1) * EPOCH);
console.log('CASSINI TEST — genuine structural innovation vs instruction-density? Same flow (R=400), selection ON vs neutral shadow.\n');
for (const [lab, a] of [['selection ON', on], ['neutral shadow', shadow]]) {
  console.log(`== ${lab} ==`);
  console.log('  tick  | pop  | effectiveComplexity | rawLen | reach(key dist) | distinctNiches');
  for (let i = 0; i < epochs; i++) console.log(`  ${String(ends[i]).padStart(5)} | ${String(a.pop[i]).padStart(4)} |        ${String(a.prog[i]).padStart(5)}        |  ${String(a.raw[i]).padStart(5)} |      ${String(a.rch[i]).padStart(6)}     | ${a.dist[i]}`);
  console.log('');
}
const last = a => a[a.length - 1];
console.log('--- VERDICT ---');
console.log(`effective complexity: ON ${last(on.prog)} vs shadow ${last(shadow.prog)}  (ratio ${(last(on.prog)/Math.max(0.01,last(shadow.prog))).toFixed(2)}x)`);
console.log(`reach (distance into key space): ON ${last(on.rch)} vs shadow ${last(shadow.rch)}  — genuine innovation extends reach; efficiency-trim would not`);
console.log(`effective/raw ratio: ON ${(last(on.prog)/Math.max(0.01,last(on.raw))).toFixed(2)} vs shadow ${(last(shadow.prog)/Math.max(0.01,last(shadow.raw))).toFixed(2)}  — high ratio = instructions are FUNCTIONAL, not bloat`);
const genuine = last(on.prog) > last(shadow.prog) * 1.3 && last(on.rch) > last(shadow.rch) * 1.15;
console.log(`\nverdict: ${genuine ? 'GENUINE — selection beats drift on complexity AND reaches further into key space (cassini answered: earned structure, not density)' : 'CASSINI RIGHT — selection ≈ drift; the "complexity" is what throughput buys, not selected innovation'}`);
