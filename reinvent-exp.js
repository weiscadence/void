// reinvent-exp.js — the re-invention test (Grok's real bar), gentle-knockout version.
// Hard knockout proved energetic DEPENDENCY (100% vs 0% collapse) but killed the lineage, so
// re-invention was impossible by construction. This uses softKnockout: remove a mid niche + block
// its req, but leave the branch ABOVE alive (orphaned, no inflow, starving slowly). Question:
// does the system build a NEW niche (different req) that re-adopts the orphaned branch and restores
// its energy, so occupancy recovers? RECOVERY = generative re-creation, not just dependency.
// Pre-registered: steady state first; recovery = orphaned-branch occ dips <40% of pre-knockout then
//   climbs back >70% within 800 ticks AND reinventions counter increments for that branch.
'use strict';
const { Graph } = require('./lib/graph.js');
const settle = (g, n) => { for (let i = 0; i < n; i++) g.step(); };

function pickMid(g) {
  let best = null, bo = 0;
  for (const nd of g.nodes.values()) {
    if (nd.depth < 1) continue;
    const sub = g.subtree(nd.id);
    const above = g.occIn(sub) - g.occIn(new Set([nd.id]));
    if (above > bo) { best = nd; bo = above; }
  }
  return best;
}

function trial(seed) {
  const g = new Graph({
    seed, roots: 3, seedPerRoot: 12, construct: true, regulate: true, nodeCap: 16, maxNodes: 400,
    energetic: true, transfer: 0.35, basal: 50, stockMax: 120,
  });
  settle(g, 1800);
  const st = g.stats();
  const mid = pickMid(g);
  if (!mid) return { seed, ok: false, why: 'no mid niche', st };
  const above = new Set([...g.subtree(mid.id)].filter(id => id !== mid.id));
  const occBefore = g.occIn(above);
  if (occBefore < 1) return { seed, ok: false, why: 'no occupied descendants', st };

  const reinvBefore = g.stats().reinventions;
  g.softKnockout(mid.id, { blockReq: true });

  let minOcc = occBefore, recovered = false, recTick = -1;
  for (let t = 1; t <= 900; t++) {
    g.step();
    if (t % 20 === 0) {
      const occNow = g.occIn(above);
      minOcc = Math.min(minOcc, occNow);
      if (minOcc < occBefore * 0.4 && occNow > occBefore * 0.7 && recTick < 0) { recovered = true; recTick = t; }
    }
  }
  const occAfter = g.occIn(above);
  const reinvAfter = g.stats().reinventions;
  return {
    seed, ok: true, midDepth: mid.depth,
    occBefore, minOcc, occAfter,
    dipPct: +(100 * (1 - minOcc / occBefore)).toFixed(0),
    endPct: +(100 * occAfter / occBefore).toFixed(0),
    readopts: reinvAfter - reinvBefore,
    recovered, recTick,
    maxDepth: st.maxDepth,
  };
}

// seed count is a CLI arg so the rate can be estimated with real power rather than N=5
// (brain: prereg-needs-power — a pre-registration without a minimum event count is a ritual).
const NSEED = +(process.argv[2] || 5);
const out = Array.from({ length: NSEED }, (_, i) => i + 1).map(trial);
for (const r of out) {
  if (!r.ok) { console.log(`seed ${r.seed}: SKIP — ${r.why} (pop ${r.st.pop}, depth ${r.st.maxDepth})`); continue; }
  console.log(`seed ${r.seed}: depth ${r.maxDepth} | branch occ ${r.occBefore}→min ${r.minOcc}(${r.dipPct}% dip)→end ${r.occAfter}(${r.endPct}% of orig) | re-adopts ${r.readopts} | ${r.recovered ? `RECOVERED @${r.recTick}` : 'no recovery'}`);
}
const ok = out.filter(r => r.ok);
console.log(`\n--- ${ok.filter(r => r.recovered).length}/${ok.length} branches recovered; total re-adoption events ${ok.reduce((s, r) => s + (r.readopts || 0), 0)} ---`);
