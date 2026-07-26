// grace-sweep.js — the dependency↔recoverability tradeoff, measured.
// orphanGrace = how much self-regen a severed branch keeps while orphaned. 0 = pure energetic
// (knockout bites 100%, but survivors die before rescue → no re-invention). 1 = self-feeding
// (recovers trivially, knockout meaningless). Sweep it: at what grace does spontaneous re-invention
// (a NEW niche re-adopting the orphaned branch, occupancy recovering) start to happen?
'use strict';
const { Graph } = require('./lib/graph.js');
const settle = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
function pickMid(g) {
  let best = null, bo = 0;
  for (const nd of g.nodes.values()) { if (nd.depth < 1) continue;
    const a = g.occIn(g.subtree(nd.id)) - g.occIn(new Set([nd.id])); if (a > bo) { best = nd; bo = a; } }
  return best;
}
function trial(seed, grace) {
  const g = new Graph({ seed, roots: 3, seedPerRoot: 12, construct: true, regulate: true, nodeCap: 16,
    maxNodes: 400, energetic: true, transfer: 0.35, basal: 50, stockMax: 120, regen: 8, orphanGrace: grace });
  settle(g, 1600);
  const mid = pickMid(g); if (!mid) return null;
  const above = new Set([...g.subtree(mid.id)].filter(id => id !== mid.id));
  const occBefore = g.occIn(above); if (occBefore < 1) return null;
  const rb = g.stats().reinventions;
  g.softKnockout(mid.id, { blockReq: true });
  let minOcc = occBefore, recovered = false;
  for (let t = 1; t <= 900; t++) { g.step();
    if (t % 20 === 0) { const o = g.occIn(above); minOcc = Math.min(minOcc, o);
      if (minOcc < occBefore * 0.4 && o > occBefore * 0.7) recovered = true; } }
  const occAfter = g.occIn(above);
  return { occBefore, minOcc, occAfter, readopts: g.stats().reinventions - rb,
    dip: +(100 * (1 - minOcc / occBefore)).toFixed(0), endPct: +(100 * occAfter / occBefore).toFixed(0) };
}
const seeds = [1, 2, 3, 4, 5, 6];
// "restored" = the branch got re-adopted (a new bridge built) AND its occupancy ended >=70% of
// pre-knockout — the honest re-invention signal (stress happened, and the system healed it).
for (const grace of [0, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 1.0]) {
  const rs = seeds.map(s => trial(s, grace)).filter(Boolean);
  const restored = rs.filter(r => r.readopts > 0 && r.endPct >= 70).length;
  const adopts = rs.reduce((s, r) => s + r.readopts, 0);
  const meanDip = rs.length ? +(rs.reduce((s, r) => s + r.dip, 0) / rs.length).toFixed(0) : '-';
  const meanEnd = rs.length ? +(rs.reduce((s, r) => s + r.endPct, 0) / rs.length).toFixed(0) : '-';
  console.log(`grace ${grace.toFixed(2)}: restored ${restored}/${rs.length} | re-adoptions ${adopts} | mean dip ${meanDip}% | mean end ${meanEnd}% of orig`);
}
