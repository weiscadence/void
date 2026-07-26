// soc-exp.js — working BACKWARDS from phi (Jiggy's maze move, 2026-07-24). Phi/golden scaling is the
// fingerprint of SELF-ORGANIZED CRITICALITY (Bak): a slowly-driven threshold system that tunes itself
// to the edge of chaos. Its hard signature is NOT a number we set — it's that events (crashes/avalanches)
// come in ALL SIZES following a POWER LAW (scale-free), not a typical size. If void's crashes are
// power-law, criticality/phi is ALREADY present and emergent — no injected winter, no knob. If they're
// exponential (a typical size), the world is NOT critical and that's why nothing self-tunes.
// Uses only what we built. No new mechanism. Measures avalanche = per-tick death count over a long run.
'use strict';
const { Graph } = require('./lib/graph.js');

function crashSizes(seed, enriched) {
  const g = new Graph({ seed, roots: 2, seedPerRoot: 8, construct: true, regulate: true, nodeCap: 10,
    maxNodes: 24, energetic: true, transfer: 0.4,
    basal: enriched ? 14 : 42, stockMax: enriched ? 500 : 90, regen: 8, orphanGrace: 0 });
  for (let i = 0; i < 800; i++) g.step();
  const events = [];
  let prevDeaths = g.deaths;
  for (let t = 0; t < 12000; t++) {
    g.step();
    const d = g.deaths - prevDeaths; prevDeaths = g.deaths;
    if (d > 0) events.push(d);
  }
  return events;
}

// log-log slope of the complementary CDF (P(X>=s)); a straight line = power law, its slope = -(alpha-1).
// Also fit an exponential and compare which describes the tail better (R^2), so we don't cry "power law"
// at a curve. This is the honesty control.
function analyze(events) {
  if (events.length < 50) return { n: events.length, verdict: 'too few events' };
  const max = Math.max(...events);
  // build CCDF over integer sizes
  const sorted = [...events].sort((a, b) => a - b);
  const n = sorted.length;
  const xs = [], ys = [];
  for (let s = 1; s <= max; s++) {
    const ge = sorted.filter(v => v >= s).length;
    if (ge > 0) { xs.push(s); ys.push(ge / n); }
  }
  // power-law fit: log(y) vs log(x) linear regression + R^2
  const lx = xs.map(Math.log), ly = ys.map(Math.log);
  const plFit = linfit(lx, ly);
  // exponential fit: log(y) vs x linear regression + R^2
  const exFit = linfit(xs, ly);
  return { n, maxSize: max, meanSize: +(events.reduce((a, b) => a + b) / n).toFixed(1),
    powerlaw: { slope: +plFit.slope.toFixed(2), r2: +plFit.r2.toFixed(3) },
    exponential: { r2: +exFit.r2.toFixed(3) },
    verdict: plFit.r2 > exFit.r2 + 0.02 ? 'POWER-LAW (scale-free → critical)'
           : exFit.r2 > plFit.r2 + 0.02 ? 'exponential (typical size → NOT critical)'
           : 'ambiguous' };
}
function linfit(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const slope = sxy / sxx, r2 = (sxy * sxy) / (sxx * syy);
  return { slope, r2 };
}

for (const enriched of [false, true]) {
  console.log(`\n=== ${enriched ? 'ENRICHED (self-oscillating)' : 'CALM (flat fixed point)'} world ===`);
  for (const seed of [1, 2, 3]) {
    const ev = crashSizes(seed, enriched);
    const a = analyze(ev);
    console.log(`seed ${seed}: ${a.n} crashes, max ${a.maxSize}, mean ${a.meanSize} | ` +
      `powerlaw R2 ${a.powerlaw?.r2} (slope ${a.powerlaw?.slope}) vs exp R2 ${a.exponential?.r2} → ${a.verdict}`);
  }
}
console.log('\nBackwards-from-phi test: POWER-LAW crashes = void already sits at the edge of chaos (phi is emergent, present).');
console.log('Exponential crashes = the world has a typical crash size, is NOT critical, and that is WHY nothing self-tunes.');
