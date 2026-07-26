#!/usr/bin/env node
// Regime scan: WHERE is the world hard enough that niche construction could matter?
// The first paired test was vacuous because fedFrac=1.0 (nobody starves) and effNiches=R
// (coexistence already maxed by the fixed field). Construction can only help where organisms
// are SPECIALISTS that starve off-patch — i.e. a small attention window W relative to R.
// Scan W (control only, construct OFF) and report fedFrac + effNiches + turnover. The usable
// regime: fedFrac well below 1.0 AND effNiches below R (room for construction to move both).
const { Niche } = require('./lib/niche.js');
const TICKS = 2000, TAIL = 0.25;
function measure(opts) {
  const sim = new Niche({ ...opts, construct: false });
  const tailStart = TICKS * (1 - TAIL);
  let fed = 0, eff = 0, pop = 0, deaths0 = 0, n = 0, extinct = false;
  for (let t = 0; t < TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) { extinct = true; break; }
    if (t >= tailStart) { const s = sim.stats(); fed += s.fedFrac; eff += s.effNiches; pop += s.pop; n++; }
  }
  n = n || 1;
  return { fed: fed / n, eff: eff / n, pop: pop / n, deaths: sim.deaths, extinct };
}
console.log('control-only regime scan (construct OFF) — find where organisms actually starve\n');
console.log(' R | W | fedFrac | effNiches | mean pop | deaths | note');
console.log('---+---+---------+-----------+----------+--------+-----');
for (const R of [4, 6, 8]) {
  for (const W of [1, 2, 3, 4]) {
    const m = measure({ seed: 12345, resources: R, window: W });
    const room = (m.fed < 0.85 && m.eff < R - 0.3);
    console.log(` ${R} | ${W} |  ${m.fed.toFixed(2)}   |   ${m.eff.toFixed(2).padStart(5)}   |  ${m.pop.toFixed(0).padStart(4)}    | ${String(m.deaths).padStart(6)} | ${m.extinct?'EXTINCT':room?'<< usable (hard, sub-max)':''}`);
  }
}
