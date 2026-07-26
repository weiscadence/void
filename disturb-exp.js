// disturb-exp.js — Jiggy's eyes-on hypothesis (2026-07-24): repeatedly soft-knocking niches
// SUSTAINS the deepest level longer than leaving the world undisturbed. If true, that's the
// Intermediate Disturbance Hypothesis showing up in void — disturbance, not calm, maintains the
// top of the hierarchy. Test: same seeds, measure how many ticks the deepest levels stay occupied
// under NO disturbance vs PERIODIC soft-knockouts. One variable (the disturbance), pre-registered.
'use strict';
const { Graph } = require('./lib/graph.js');
const settle = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
const opts = seed => ({ seed, roots: 2, seedPerRoot: 8, construct: true, regulate: true, nodeCap: 10,
  maxNodes: 24, energetic: true, transfer: 0.4, basal: 42, stockMax: 90, regen: 8, orphanGrace: 0.22 });

function pickMid(g) {
  let best = null, bo = 0;
  for (const nd of g.nodes.values()) { if (nd.depth < 1) continue;
    const a = g.occIn(g.subtree(nd.id)) - g.occIn(new Set([nd.id])); if (a > bo) { best = nd; bo = a; } }
  return best;
}
// fraction of ticks the world held depth >= D among occupied niches, over a window
function run(seed, disturb) {
  const g = new Graph(opts(seed));
  settle(g, 800);
  let deep3 = 0, deep4 = 0, depthSum = 0, maxSeen = 0, n = 0;
  const WIN = 2000, EVERY = 40;  // disturbance cadence ~ "spamming it for a sec"
  for (let t = 1; t <= WIN; t++) {
    if (disturb && t % EVERY === 0) { const m = pickMid(g); if (m) g.softKnockout(m.id, { blockReq: false }); }
    g.step();
    const s = g.stats();
    if (s.maxDepth >= 3) deep3++;
    if (s.maxDepth >= 4) deep4++;
    depthSum += s.maxDepth; if (s.maxDepth > maxSeen) maxSeen = s.maxDepth; n++;
  }
  return { seed, pctDepth3: +(100 * deep3 / n).toFixed(0), pctDepth4: +(100 * deep4 / n).toFixed(0),
    meanMaxDepth: +(depthSum / n).toFixed(2), peakDepth: maxSeen, reinv: g.stats().reinventions };
}
const seeds = [1, 2, 3, 4, 5, 6];
console.log('Does periodic soft-knockout SUSTAIN the deep levels? (% of 2000 ticks at that depth)\n');
let ctlD3 = 0, disD3 = 0, ctlD4 = 0, disD4 = 0;
for (const s of seeds) {
  const c = run(s, false), d = run(s, true);
  ctlD3 += c.pctDepth3; disD3 += d.pctDepth3; ctlD4 += c.pctDepth4; disD4 += d.pctDepth4;
  console.log(`seed ${s}:  CALM  depth3 ${c.pctDepth3}% depth4 ${c.pctDepth4}% meanMax ${c.meanMaxDepth} peak ${c.peakDepth}`);
  console.log(`         DISTURB depth3 ${d.pctDepth3}% depth4 ${d.pctDepth4}% meanMax ${d.meanMaxDepth} peak ${d.peakDepth} (re-adopts ${d.reinv})`);
}
const N = seeds.length;
console.log(`\n--- MEAN over ${N} seeds ---`);
console.log(`time at depth>=3:  CALM ${(ctlD3/N).toFixed(0)}%  vs  DISTURB ${(disD3/N).toFixed(0)}%`);
console.log(`time at depth>=4:  CALM ${(ctlD4/N).toFixed(0)}%  vs  DISTURB ${(disD4/N).toFixed(0)}%`);
console.log(`\nJiggy's claim = DISTURB sustains deep levels MORE than CALM. Confirmed if disturb > calm.`);
