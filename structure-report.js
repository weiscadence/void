// STRUCTURE REPORT — what shape is the void niche graph actually in, at the §15 SOC operating point?
//
// The dimension probe came back UNTRUSTED with a very loud clue: degree p50=1, p90=1, max=527,
// max depth=2, and a ball from a root that engulfs 525 nodes in ONE hop then stops at 547 — while
// the graph holds ~3005 nodes. That is not a tree and it is not finite-dimensional. It looks like
// a set of disconnected STARS. This script measures that instead of assuming it.
//
// Why it matters beyond the holographic arm: SYNTHESIS §15's SOC negative ("habitat construction
// buys the world out of criticality") was measured on THIS substrate. If the world is a fan of
// stars with depth<=2, it is not building niches-on-niches at all, and the §12 nested-depth result
// (occupied depth ~12-53) came from a DIFFERENT configuration. Establishing which shape §15 ran on
// is a precondition for interpreting it.
//
// CANARY: the component/degree/depth counters are checked against three graphs whose answers are
// known by construction, including a negative control that must NOT read as a star.
'use strict';
const { Graph } = require('./lib/graph.js');

function analyze(adjOrGraph) {
  const adj = adjOrGraph instanceof Map ? adjOrGraph : (() => {
    const m = new Map(); for (const [id, nd] of adjOrGraph.nodes) m.set(id, [...nd.edges]); return m;
  })();
  const seen = new Set(), comps = [];
  for (const src of adj.keys()) {
    if (seen.has(src)) continue;
    const q = [src]; seen.add(src); const members = [];
    while (q.length) { const u = q.pop(); members.push(u); for (const v of (adj.get(u) || [])) if (!seen.has(v)) { seen.add(v); q.push(v); } }
    comps.push(members);
  }
  const degs = [...adj.values()].map(a => a.length).sort((a, b) => a - b);
  const q = f => degs.length ? degs[Math.min(degs.length - 1, Math.floor(degs.length * f))] : 0;
  // "Star-likeness" of a component: fraction of its nodes that are degree-1 leaves hanging off a
  // single hub. A perfect star of size n has one node of degree n-1 and n-1 of degree 1.
  const starScore = (members) => {
    if (members.length < 3) return null;
    const ds = members.map(m => (adj.get(m) || []).length);
    const hub = Math.max(...ds), leaves = ds.filter(d => d === 1).length;
    return { size: members.length, hub, leafFrac: leaves / members.length, isStar: hub >= members.length - 2 && leaves >= members.length - 2 };
  };
  const sizes = comps.map(c => c.length).sort((a, b) => b - a);
  const scored = comps.map(starScore).filter(Boolean);
  return {
    nodes: adj.size, components: comps.length, largest: sizes[0] ?? 0,
    singletons: sizes.filter(s => s === 1).length, sizeTop: sizes.slice(0, 6),
    degP50: q(0.5), degP90: q(0.9), degMax: degs[degs.length - 1] ?? 0,
    starComponents: scored.filter(s => s.isStar).length, scoredComponents: scored.length,
    meanLeafFrac: scored.length ? scored.reduce((a, s) => a + s.leafFrac, 0) / scored.length : null,
  };
}

function mkAdj(pairs, n) {
  const m = new Map(); for (let i = 0; i < n; i++) m.set(i, []);
  for (const [a, b] of pairs) { m.get(a).push(b); m.get(b).push(a); }
  return m;
}

function canary() {
  const cases = [];
  // 1. Two disjoint stars of 10. Expect 2 components, both stars, degMax 9.
  const s = []; for (let i = 1; i < 10; i++) s.push([0, i]); for (let i = 11; i < 20; i++) s.push([10, i]);
  cases.push({ name: 'two disjoint stars', got: analyze(mkAdj(s, 20)), want: g => g.components === 2 && g.starComponents === 2 && g.degMax === 9 });
  // 2. A path of 20 (NEGATIVE CONTROL). One component, NOT a star, degMax 2.
  const p = []; for (let i = 0; i < 19; i++) p.push([i, i + 1]);
  cases.push({ name: 'path-20 (NEGATIVE CONTROL: must not read as star)', got: analyze(mkAdj(p, 20)), want: g => g.components === 1 && g.starComponents === 0 && g.degMax === 2 });
  // 3. 12 singletons. Expect 12 components, 12 singletons, degMax 0.
  cases.push({ name: '12 singletons', got: analyze(mkAdj([], 12)), want: g => g.components === 12 && g.singletons === 12 && g.degMax === 0 });
  let ok = true;
  for (const c of cases) {
    const pass = c.want(c.got); if (!pass) ok = false;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${c.name}: comps=${c.got.components} stars=${c.got.starComponents} degMax=${c.got.degMax} singles=${c.got.singletons}`);
  }
  return ok;
}

function grow(ticks, seed) {
  const g = new Graph({
    registers: 3, conserve: true, regulate: true, construct: true,
    stockMax: 260, regen: 6, nodeCap: 20, buildDensity: 0.75, decayEmpty: 60,
    buildDrawsStock: true, buildStockCost: 20, leak: 0.02,
    driveIn: 60, maxNodes: 5000, roots: 8, seedPerRoot: 40, seed,
  });
  for (let t = 0; t < ticks; t++) g.step();
  return g;
}

if (require.main === module) {
  console.log('STRUCTURE REPORT — the shape of the void niche graph at the §15 SOC operating point\n');
  console.log('CANARY:');
  if (!canary()) { console.log('\nUNTRUSTED — structural counters failed a known graph. No verdict.'); process.exit(2); }
  console.log('  canary OK\n');

  const TICKS = Number(process.env.TICKS ?? 3000);
  for (const seed of (process.env.SEEDS ?? '1,2,3').split(',').map(Number)) {
    const g = grow(TICKS, seed);
    const a = analyze(g);
    const depths = [...g.nodes.values()].map(n => n.depth);
    const dh = {}; for (const d of depths) dh[d] = (dh[d] || 0) + 1;
    console.log(`seed ${seed}: nodes=${a.nodes} components=${a.components} largest=${a.largest} singletons=${a.singletons}`);
    console.log(`  component sizes (top): ${a.sizeTop.join(', ')}`);
    console.log(`  degree p50=${a.degP50} p90=${a.degP90} max=${a.degMax}`);
    console.log(`  star components: ${a.starComponents}/${a.scoredComponents} (mean leaf fraction ${a.meanLeafFrac?.toFixed(3)})`);
    console.log(`  depth histogram: ${Object.entries(dh).map(([d, c]) => `d${d}=${c}`).join(' ')}`);
    console.log(`  builds=${g.builds} deaths=${g.deaths} hitMaxNodes=${g.hitMaxNodes}\n`);
  }
}

module.exports = { analyze };
