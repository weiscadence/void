// BUILT FROM THE AUDIT (2026-07-24): bytes ("measure task utility, hold noise constant, not descriptive
// growth"), reticuli ("two-sided null: signal-shaped NOISE, not just signal-off"), hermessol ("your four
// metrics can only go UP — use one that can go DOWN, through the same pipeline"). All three converge on:
// a NON-MONOTONE, TASK-UTILITY metric tested against BOTH nulls via one identical measurement.
//
// METRIC = mean adaptation distance: mean L1 between each living organism's key and its own cell's lock.
// LOWER = better adapted to the actual environment. It can rise AND fall (non-monotone, hermessol),
// it's task-specific fit not descriptive elaboration (bytes), and it's computed the same way for every arm.
//
// ARMS (identical machinery/compute; only the signal differs):
//   real       tol=2, stable locks           — signal present
//   no-signal  tol=999 (everyone eats)        — one-sided null (selection OFF)
//   scrambled  tol=2 + lock↔cell permuted     — two-sided null (selection ON, signal content destroyed)
// WIN: real's adaptation distance is clearly LOWER than BOTH nulls. Then the win tracks the signal's
// CONTENT, survives the hard null, and lives on a metric that isn't rigged to only climb. Anything less
// = another honest negative, but this time with the instrument the audit demanded.
'use strict';
const { Open } = require('./lib/open.js');
const TICKS = 24000, EPOCH = 4000, SEEDS = [1, 2, 3];
const BASE = { construct: true, stableAge: 400 };

function adaptDist(sim) { // mean L1(key, cell-lock) over living orgs — LOWER = better adapted
  let s = 0, n = 0;
  for (const o of sim.orgs) { if (o.dead) continue; const lk = sim.lock[o.cell]; let d = 0; for (let k = 0; k < sim.K; k++) d += Math.abs(o.key[k] - lk[k]); s += d; n++; }
  return n ? +(s / n).toFixed(2) : null;
}
function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts });
  const ep = Math.ceil(TICKS / EPOCH), U = Array(ep).fill(null), prog = Array(ep).fill(0), pop = Array(ep).fill(0);
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    if (t % EPOCH === 0) { const i = t / EPOCH - 1; U[i] = adaptDist(sim); prog[i] = sim.stats().progComplexity; pop[i] = sim.stats().pop; }
  }
  return { U, prog, pop };
}
function avg(rs, f) { const n = rs[0][f].length; return Array.from({ length: n }, (_, i) => { const v = rs.map(r => r[f][i]).filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b) / v.length).toFixed(2) : null; }); }
function arm(o) { const rs = SEEDS.map(s => runOne(o, s)); return { U: avg(rs, 'U'), prog: avg(rs, 'prog'), pop: avg(rs, 'pop') }; }

const arms = {
  'real (signal)':        arm({ ...BASE, tol: 2 }),
  'no-signal (drift)':    arm({ ...BASE, tol: 999 }),
  'scrambled (2-sided)':  arm({ ...BASE, tol: 2, scrambleLocks: true, scramblePeriod: 50 }),
};
const ep = Math.ceil(TICKS / EPOCH), ends = Array.from({ length: ep }, (_, i) => (i + 1) * EPOCH);
console.log('UTILITY TEST — adaptation distance (LOWER=better adapted; can go up OR down). Real vs BOTH nulls, same pipeline.\n');
console.log('                       ' + ends.map(e => (e/1000 + 'k').padStart(7)).join(''));
for (const [lab, a] of Object.entries(arms)) console.log('U  ' + lab.padEnd(20) + ' ' + a.U.map(v => String(v).padStart(7)).join(''));
console.log('');
for (const [lab, a] of Object.entries(arms)) console.log('complexity(descr) ' + lab.padEnd(20).slice(0,6) + ' ' + a.prog.map(v => String(v).padStart(7)).join(''));
const last = a => a.U[a.U.length - 1];
const real = last(arms['real (signal)']), noS = last(arms['no-signal (drift)']), scr = last(arms['scrambled (2-sided)']);
console.log('\n--- VERDICT (task-utility, both nulls, non-monotone metric) ---');
console.log(`final adaptation distance: real ${real} | no-signal ${noS} | scrambled ${scr}  (lower=better adapted)`);
const survives = real != null && noS != null && scr != null && real < noS * 0.7 && real < scr * 0.7;
console.log(survives
  ? `*** SURVIVES — real is better-adapted than BOTH the one-sided (drift) and two-sided (scrambled) nulls, on a metric that can fall. The win tracks the signal's CONTENT. ***`
  : `NOT clearly separated — real ${real} vs nulls ${noS}/${scr}. Report honestly; the metric still isn't isolating signal content.`);
console.log('\nContrast: on the DESCRIPTIVE metric (complexity) drift inflates for free; on this TASK-UTILITY metric, that free lunch should vanish — that gap is the whole point.');
