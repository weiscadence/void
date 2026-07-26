#!/usr/bin/env node
// Hunt for WAVES. Density-dependent construction (relief-valve WITH outflow: build when your node
// is overcrowded, and move into the niche you made). Sweep the crowding threshold that triggers
// building. For each: sample population finely, then autocorrelate to detect a bounded OSCILLATION
// (the healthy edge-of-chaos regime Jiggy is after) vs steady / runaway / collapse.
const { Graph } = require('/home/ubuntu/.openclaw/workspace/projects/void/lib/graph.js');

function analyze(series) {           // detrend + autocorrelation → dominant period if any
  const n = series.length, mean = series.reduce((a, b) => a + b, 0) / n;
  const c = series.map(v => v - mean);
  const denom = c.reduce((a, b) => a + b * b, 0) || 1;
  const sd = Math.sqrt(denom / n);
  let bestLag = -1, bestVal = -Infinity, firstNeg = -1;
  for (let lag = 1; lag < n / 2; lag++) {
    let s = 0; for (let i = 0; i + lag < n; i++) s += c[i] * c[i + lag];
    const ac = s / denom;
    if (firstNeg < 0 && ac < 0) firstNeg = lag;
    if (firstNeg > 0 && lag > firstNeg && ac > bestVal) { bestVal = ac; bestLag = lag; }
  }
  return { mean, cv: sd / (mean || 1), period: bestLag, peak: bestVal, firstNeg };
}

const THRESH = [0.5, 0.65, 0.8, 0.9];
console.log('regulated graph — relief-valve w/ outflow. sample pop every 10t over 8000t, seed 7.\n');
console.log('buildDensity | endPop | nodes | occ | maxDepth | pop CV | wave period | verdict');
for (const bd of THRESH) {
  const sim = new Graph({ seed: 7, linkMode: 'nested', regulate: true, buildDensity: bd, maxNodes: 8000, decayEmpty: 40, nodeCap: 20 });
  const series = [];
  for (let t = 1; t <= 8000; t++) { sim.step(); if (t % 10 === 0) series.push(sim.orgs.filter(o => !o.dead).length); }
  const s = sim.stats();
  const half = series.slice(series.length / 2);       // analyze the settled 2nd half
  const a = analyze(half);
  let verdict;
  if (s.hitMaxNodes) verdict = 'RUNAWAY (hit cap)';
  else if (s.pop < 120) verdict = 'collapsed to roots';
  else if (a.cv > 0.08 && a.peak > 0.25 && a.period > 1) verdict = `WAVES ~${a.period * 10}t period (ac ${a.peak.toFixed(2)})`;
  else if (a.cv > 0.08) verdict = `noisy/irregular (CV ${a.cv.toFixed(2)}, no clean period)`;
  else verdict = 'steady (bounded, no oscillation)';
  console.log(` ${bd.toFixed(2)}        |  ${String(s.pop).padStart(4)}  | ${String(s.nodes).padStart(5)} | ${String(s.occNodes).padStart(3)} |   ${String(s.maxDepth).padStart(3)}    | ${a.cv.toFixed(3)} | ${a.period > 0 ? (a.period * 10) + 't' : '—'}       | ${verdict}`);
}
