// energetic-exp.js — the fork test for energetic nesting (Jiggy 2026-07-24).
// Build: food flows parent -> child at TRANSFER (~10%, Lindeman); basal is fixed+capped.
// Test 1 KNOCKOUT: at steady state remove a mid-chain niche vs a leaf control; does the subtree
//   ABOVE it collapse? (energetic dependency = necessary, not sufficient)
// Test 2 RE-INVENTION: after knockout+block, does the branch spontaneously regrow via a DIFFERENT
//   path and does occupancy recover? (generative nested ontology = the real claim)
// Pre-registered: steady state = pop slope ~flat over 400 ticks; collapse = subtree occ drops >60%
//   within 300 ticks post-knockout AND drops much more than the leaf control.
'use strict';
const { Graph } = require('./lib/graph.js');

function settle(g, ticks) { for (let i = 0; i < ticks; i++) g.step(); }
function popSlope(g, win) { // crude slope over last `win` snapshots taken every 10 ticks
  const xs = []; for (let i = 0; i < win; i++) { settle(g, 10); xs.push(g.stats().pop); }
  const n = xs.length, mx = (n - 1) / 2; let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (xs[i] - xs.reduce((a, b) => a + b) / n); den += (i - mx) ** 2; }
  return { slope: +(num / den).toFixed(3), mean: +(xs.reduce((a, b) => a + b) / n).toFixed(1) };
}

// pick the deepest node that has a non-trivial subtree above it (a real mid-chain niche)
function pickMidChain(g) {
  let best = null, bestSize = 0;
  for (const nd of g.nodes.values()) {
    if (nd.depth < 1) continue;
    const sub = g.subtree(nd.id);
    const occAbove = g.occIn(sub) - g.occIn(new Set([nd.id]));
    if (sub.size > bestSize && occAbove > 0) { best = nd; bestSize = sub.size; }
  }
  return best;
}
function pickLeaf(g) { // a control: an occupied node with NO deeper children
  for (const nd of g.nodes.values()) {
    if (nd.depth < 1) continue;
    const kids = [...nd.edges].map(e => g.nodes.get(e)).filter(c => c && c.depth === nd.depth + 1);
    if (!kids.length && nd.occ > 0) return nd;
  }
  return null;
}

// Knock out a mid-chain niche in ONE world and watch whether the DESCENDANTS (which we did NOT
// remove) collapse. `energetic` toggles the only variable that should matter: whether children are
// fed THROUGH the parent (energetic) or feed themselves (topological/self-regen).
function knockoutTrial(seed, energetic) {
  const opts = {
    seed, roots: 4, seedPerRoot: 14, construct: true, regulate: true,
    transfer: 0.35, basal: 50, stockMax: 120, nodeCap: 16, maxNodes: 400,
    energetic, resourceMode: !energetic, regen: 50,  // control: each niche self-regens like a root

  };
  const g = new Graph(opts);
  settle(g, 1500);
  const s0 = popSlope(g, 40);
  const st = g.stats();
  const mid = pickMidChain(g);
  if (!mid) return { ok: false, why: 'no mid-chain niche', stats: st, slope: s0 };

  const aboveIds = new Set([...g.subtree(mid.id)].filter(id => id !== mid.id)); // descendants only
  const occBefore = g.occIn(aboveIds);
  if (occBefore === 0) return { ok: false, why: 'no occupied descendants', stats: st, slope: s0 };

  g.knockout(mid.id, { blockReq: true });
  let minOcc = occBefore, reinventTick = -1;
  for (let t = 1; t <= 600; t++) {
    g.step();
    if (t % 20 === 0) {
      const occNow = g.occIn(aboveIds);
      minOcc = Math.min(minOcc, occNow);
      if (minOcc < occBefore * 0.4 && occNow > occBefore * 0.7 && reinventTick < 0) reinventTick = t;
    }
  }
  const occAfter = g.occIn(aboveIds);
  return {
    ok: true, steady: s0, stats: st,
    midDepth: mid.depth, subtreeSize: g.subtree ? aboveIds.size + 1 : 0,
    occBefore, minOcc, occAfter,
    collapsePct: +(100 * (1 - minOcc / occBefore)).toFixed(0),
    reinvented: reinventTick > 0, reinventTick,
  };
}

function run(seed) {
  return { seed, energetic: knockoutTrial(seed, true), topological: knockoutTrial(seed, false) };
}

const seeds = [1, 2, 3];
const out = seeds.map(run);
function line(tag, r) {
  if (!r.ok) return `  ${tag}: SKIP — ${r.why} (pop ${r.stats.pop}, maxDepth ${r.stats.maxDepth})`;
  return `  ${tag}: steady pop ${r.steady.mean} slope ${r.steady.slope}, maxDepth ${r.stats.maxDepth} | ` +
    `descendants ${r.occBefore}→min ${r.minOcc}→end ${r.occAfter} = ${r.collapsePct}% collapse | ` +
    `re-invent ${r.reinvented ? `YES@${r.reinventTick}` : 'no'}`;
}
for (const r of out) {
  console.log(`\n=== seed ${r.seed} ===`);
  console.log(line('ENERGETIC (fed through parent)', r.energetic));
  console.log(line('TOPOLOGICAL control (self-regen)', r.topological));
}
// summary contrast
const en = out.map(r => r.energetic).filter(r => r.ok);
const to = out.map(r => r.topological).filter(r => r.ok);
const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) : null;
console.log(`\n--- CONTRAST (${en.length} energetic / ${to.length} topological valid runs) ---`);
console.log(`mean descendant collapse: ENERGETIC ${avg(en.map(r => r.collapsePct))}%  vs  TOPOLOGICAL ${avg(to.map(r => r.collapsePct))}%`);
console.log(`re-invention observed: ENERGETIC ${en.filter(r => r.reinvented).length}/${en.length}`);
