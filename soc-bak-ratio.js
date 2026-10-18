// VALIDITY CHECK for soc-bak.js — was the negative real, or was the probe vacuous? (2026-08-02)
//
// soc-bak.js gated food inflow to ZERO while the system was relaxing (pure Bak protocol). The
// pre-registered verdict was SOC NOT SUPPORTED — but the slow-drive worlds ran at pop 0-5 and
// 91-100% quiescence. A world that is nearly extinct produces no avalanches for a trivial reason,
// so "no power law" there is not evidence about criticality. That is the vacuous-probe failure:
// a broken zero and an honest zero look identical unless you check.
//
// This sweeps the SEPARATION STRENGTH: during a cascade, inflow = f * DRIVE.
//   f = 1.00 → no separation at all (the fast-drive control)
//   f = 0.00 → full separation (what soc-bak.js ran)
// It is NOT a search for a significant f. The decision rule from PREREG-soc-bak.md is unchanged
// and is not re-scored here. The only question is: does ANY separation strength leave a LIVING
// world? That distinguishes "the substrate cannot support timescale separation" (a real finding
// about the substrate) from "my gate was too harsh" (a broken instrument).
'use strict';
const { Graph } = require('./lib/graph.js');
const { fitPowerLaw, vsExponential } = require('./lib/clauset.js');

const BURN = 2000, MEASURE = 9000, SEEDS = [1, 2, 3, 4], MIN_AV = 2;
const BASE = {
  registers: 3, resourceMode: true, regulate: true, construct: true,
  stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, maxNodes: 3000,
  decayEmpty: 60, buildDrawsStock: true, buildStockCost: 20, roots: 4, seedPerRoot: 12,
};
const DRIVE = BASE.regen;
const RATIOS = [0, 0.25, 0.5, 0.75, 1.0];

function run(f, seed) {
  const g = new Graph({ ...BASE, seed });
  let last = 0;
  const drive = () => { g.REGEN = last > 0 ? DRIVE * f : DRIVE; };
  for (let t = 0; t < BURN; t++) { drive(); const b = g.deaths; g.step(); last = g.deaths - b; }
  const av = []; let cur = 0, popSum = 0, popN = 0, quiet = 0, alive = 0;
  for (let t = 0; t < MEASURE; t++) {
    drive();
    const b = g.deaths; g.step(); const d = g.deaths - b; last = d;
    if (d > 0) cur += d; else { quiet++; if (cur >= MIN_AV) av.push(cur); cur = 0; }
    if (t % 25 === 0) { const s = g.stats(); popSum += s.pop; popN++; if (s.pop > 0) alive++; }
  }
  if (cur >= MIN_AV) av.push(cur);
  return { av, pop: popN ? popSum / popN : 0, quiet: quiet / MEASURE, aliveFrac: alive / (popN || 1), cap: g.hitMaxNodes };
}

console.log('SEPARATION-STRENGTH SWEEP — validity check on the soc-bak negative');
console.log('inflow during a cascade = f x DRIVE.  f=1 no separation (control), f=0 full Bak protocol.\n');
console.log('  f    | meanPop  aliveFrac quiescent | nAv   alpha  vs-exp LR   pLR    | live world?');
for (const f of RATIOS) {
  const all = []; let pop = 0, quiet = 0, alive = 0;
  for (const seed of SEEDS) {
    const r = run(f, seed);
    all.push(...r.av); pop += r.pop / SEEDS.length; quiet += r.quiet / SEEDS.length; alive += r.aliveFrac / SEEDS.length;
  }
  const fit = fitPowerLaw(all);
  let cells = 'too few avalanches to fit          ';
  if (fit.ok) {
    const e = vsExponential(all, fit);
    cells = `${String(all.length).padEnd(5)} ${fit.alpha.toFixed(2).padEnd(6)} ${e.LR.toFixed(2).padStart(8)}  ${e.p.toFixed(4)}`;
  }
  // "live world" = population sustained above the seeded starting mass for most of the measurement
  const live = pop >= 20 && alive > 0.95;
  console.log(`  ${f.toFixed(2)} | ${String(Math.round(pop)).padEnd(8)} ${(alive * 100).toFixed(0).padStart(3)}%     ${(quiet * 100).toFixed(1).padStart(5)}%     | ${cells} | ${live ? 'YES' : 'no — starved'}`);
}
console.log('\nRead: if the world is only alive near f=1, timescale separation and metabolism are');
console.log('incompatible in this substrate, and the soc-bak negative is about the SUBSTRATE, not');
console.log('a mis-set gate. If a live world exists at low f, the soc-bak run under-powered itself');
console.log('and the pre-registered test must be re-run at that f before its verdict means anything.');
