// edge-sweep.js — working backwards from the goal (Jiggy, 2026-07-24). Goal = structure that keeps
// building itself (open-ended). Tonight's chain says that lives at the CRITICAL EDGE, whose fingerprint
// is power-law crashes. So the decisive question: is there a DRIVE setting where (a) crashes go reliably
// power-law AND (b) the tower self-sustains — the two peaking TOGETHER, across seeds, not one lucky run?
// Drive = enrichment (basal inflow vs stock ceiling): the paradox-of-enrichment knob that sets how hard
// the world oscillates. Sweep it, 8 seeds each, measure both signatures, look for coincident peak.
// Honesty upgrades over the quick soc test:
//   - power-law scored by log-log CCDF R^2 minus exponential R^2 (Δ>0 = more power-law than exponential)
//   - depth-sustain = fraction of ticks holding depth>=3
//   - report per-drive means + how many seeds cross a power-law bar, so "flicker vs robust" is visible.
'use strict';
const { Graph } = require('./lib/graph.js');

function linfit(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i]-mx)*(y[i]-my); sxx += (x[i]-mx)**2; syy += (y[i]-my)**2; }
  return { slope: sxy/sxx, r2: syy > 0 ? (sxy*sxy)/(sxx*syy) : 0 };
}
function plScore(events) {
  if (events.length < 80) return null;
  const max = Math.max(...events), n = events.length, sorted = [...events].sort((a,b)=>a-b);
  const xs = [], ys = [];
  for (let s = 1; s <= max; s++) { const ge = sorted.filter(v=>v>=s).length; if (ge>0){ xs.push(s); ys.push(ge/n);} }
  if (xs.length < 4) return null;
  const lx = xs.map(Math.log), ly = ys.map(Math.log);
  const pl = linfit(lx, ly), ex = linfit(xs, ly);
  return { delta: +(pl.r2 - ex.r2).toFixed(3), plR2: +pl.r2.toFixed(3), slope: +pl.slope.toFixed(2), maxSize: max };
}
function run(seed, basal, stockMax) {
  const g = new Graph({ seed, roots: 2, seedPerRoot: 8, construct: true, regulate: true, nodeCap: 10,
    maxNodes: 24, energetic: true, transfer: 0.4, basal, stockMax, regen: 8, orphanGrace: 0 });
  for (let i = 0; i < 800; i++) g.step();
  let deep3 = 0, n = 0, prev = g.deaths; const events = [], pops = [];
  for (let t = 0; t < 9000; t++) {
    g.step(); const s = g.stats();
    const d = g.deaths - prev; prev = g.deaths; if (d > 0) events.push(d);
    if (s.maxDepth >= 3) deep3++; n++; if (t % 5 === 0) pops.push(s.pop);
  }
  const mean = pops.reduce((a,b)=>a+b,0)/pops.length;
  const sd = Math.sqrt(pops.reduce((a,b)=>a+(b-mean)**2,0)/pops.length);
  return { pl: plScore(events), depth3: 100*deep3/n, cv: sd/mean };
}
const seeds = [1,2,3,4,5,6,7,8];
// enrichment ladder: calm → strongly enriched. (basal down, stockMax up = more overshoot = stronger wave)
const drives = [[42,90],[28,160],[20,260],[16,380],[13,520],[10,700]];
console.log('EDGE SWEEP — do power-law crashes and depth-sustain peak at the SAME drive? (8 seeds each)\n');
console.log('drive          | wave CV | depth>=3 | powerlaw Δ(pl-exp) | seeds Δ>0.03 | mean slope');
console.log('---------------|---------|----------|--------------------|--------------|----------');
let best = null;
for (const [b, s] of drives) {
  const rs = seeds.map(sd => run(sd, b, s));
  const withPl = rs.filter(r => r.pl);
  const cv = rs.reduce((a,r)=>a+r.cv,0)/rs.length;
  const d3 = rs.reduce((a,r)=>a+r.depth3,0)/rs.length;
  const delta = withPl.length ? withPl.reduce((a,r)=>a+r.pl.delta,0)/withPl.length : 0;
  const nCrit = withPl.filter(r => r.pl.delta > 0.03).length;
  const slope = withPl.length ? withPl.reduce((a,r)=>a+r.pl.slope,0)/withPl.length : 0;
  const row = { drive:`b${b}/s${s}`, cv, d3, delta, nCrit, slope };
  if (!best || (nCrit > best.nCrit) || (nCrit===best.nCrit && d3>best.d3)) best = row;
  console.log(`${`b${b}/s${s}`.padEnd(14)} |  ${cv.toFixed(3)}  |  ${d3.toFixed(1).padStart(5)}%  |  ${(delta>=0?'+':'')}${delta.toFixed(3).padStart(6)}          |  ${String(nCrit).padStart(2)}/8        |  ${slope.toFixed(2)}`);
}
console.log(`\nBEST coincident drive: ${best.drive} — ${best.nCrit}/8 seeds power-law, depth>=3 ${best.d3.toFixed(1)}%, CV ${best.cv.toFixed(3)}`);
console.log('If power-law-seed-count AND depth3 rise together toward one drive = criticality and self-sustain are the SAME regime (the conclusion). If they peak at different drives, they are NOT the same thing — honest miss.');
