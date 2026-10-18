// DIMENSION PROBE — does the void's niche graph have a BULK, or is it all surface?
//
// WHY THIS EXISTS, AND WHY IT RUNS BEFORE THE HOLOGRAPHIC ARM
// ----------------------------------------------------------
// SYNTHESIS §16 pre-registers a holographic (boundary) bound: a region may hold complexity
// proportional to its BOUNDARY, not its volume. That bound is only meaningful if volume can
// actually outgrow boundary. Whether it can is a property of the graph, not of the rule:
//
//   |ball(r)| ~ r^d   (polynomial / finite-dimensional)  -> |sphere| / |ball| -> 0. BULK EXISTS.
//                                                            The bound BINDS and gets harder.
//   |ball(r)| ~ B^r   (exponential / tree-like)          -> |sphere| / |ball| -> const. NO BULK.
//                                                            The bound is VACUOUS at every scale.
//
// A tree is all surface. If void's niche graph is a tree — and lib/graph.js builds child niches
// linked to a single parent, which is exactly a tree — then imposing a holographic bound on it
// does nothing at all, and any "result" from that arm would be an artifact of a rule that never
// fired. So this probe is the gate, not a preliminary.
//
// This also CORRECTS a claim I made to Jiggy at 04:16 and wrote into §16.6: that wormholes and
// the holographic bound are complementary. On this analysis they are ANTAGONISTIC. Random
// long-range edges are what turn a finite-dimensional graph into an expander, and an expander
// has exponential ball growth — so shortcuts push d -> infinity and RE-VACUUM the bound. The
// two ideas fight. See DIMENSION-FINDING.md for the corrected statement.
//
// CANARY (standing rule: a number is only evidence if the instrument is proven on this run).
// The estimator must recover the dimension of graphs whose answer is known by construction:
//   2D lattice -> d ~ 2 | 3D lattice -> d ~ 3 | binary tree -> EXPONENTIAL, not polynomial
// A negative control is included: the tree must NOT be reported as finite-dimensional. If any
// canary case misses, the probe prints UNTRUSTED and refuses to report a verdict for void.
'use strict';
const { Graph } = require('./lib/graph.js');

// ---------- estimator ----------
// Ball growth from a source: |ball(r)| for r = 1..R by BFS. Fit both models on log-scale and
// compare residuals. Polynomial: log|ball| = d*log r + c. Exponential: log|ball| = r*log B + c.
function ball(adj, src, R) {
  const seen = new Set([src]); let frontier = [src]; const out = [];
  for (let r = 1; r <= R; r++) {
    const next = [];
    for (const u of frontier) for (const v of (adj.get(u) || [])) if (!seen.has(v)) { seen.add(v); next.push(v); }
    frontier = next; out.push(seen.size);
    if (next.length === 0) break;          // graph exhausted; shorter series is honest
  }
  return out;
}

function ols(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxx === 0 ? 0 : sxy / sxx, icpt = my - slope * mx;
  let ss = 0; for (let i = 0; i < n; i++) ss += (ys[i] - (slope * xs[i] + icpt)) ** 2;
  return { slope, rss: ss };
}

// Fit on the growth region only. Once the ball saturates the component it flattens, and that
// flat tail drags a polynomial fit downward and would fake finite dimension on a tree.
//
// SMALL-r EXCLUSION (added after the canary caught a real error): a 3D lattice read d=2.36
// because r=1,2,3 are dominated by lower-order terms — |ball(r)| is only asymptotically c*r^d —
// and including them biases the slope down. Standard practice for a growth/box dimension is to
// fit the scaling window, not the whole curve. We drop the first SKIP_FRAC of the usable range.
// The tree negative control must survive this change: excluding small r must NOT make an
// exponential graph look polynomial.
const SKIP_FRAC = 1 / 3;

function classify(series) {
  const all = [];
  for (let i = 0; i < series.length; i++) {
    if (i > 0 && series[i] === series[i - 1]) break;   // saturated
    all.push({ r: i + 1, n: series[i] });
  }
  const start = Math.floor(all.length * SKIP_FRAC);
  const cut = all.slice(start);
  if (cut.length < 4) return { verdict: 'TOO_SHORT', d: null, rPoly: null, rExp: null, pts: cut.length };
  const logr = cut.map(p => Math.log(p.r)), logn = cut.map(p => Math.log(p.n)), rr = cut.map(p => p.r);
  const poly = ols(logr, logn), exp = ols(rr, logn);
  return {
    verdict: poly.rss <= exp.rss ? 'POLYNOMIAL' : 'EXPONENTIAL',
    d: poly.slope, logB: exp.slope, rssPoly: poly.rss, rssExp: exp.rss, pts: cut.length,
  };
}

function probe(adj, sources, R) {
  const runs = sources.map(s => classify(ball(adj, s, R))).filter(x => x.verdict !== 'TOO_SHORT');
  if (!runs.length) return { verdict: 'TOO_SHORT', n: 0 };
  const poly = runs.filter(r => r.verdict === 'POLYNOMIAL').length;
  const ds = runs.map(r => r.d).sort((a, b) => a - b);
  return {
    verdict: poly > runs.length / 2 ? 'POLYNOMIAL' : 'EXPONENTIAL',
    polyFrac: poly / runs.length, dMedian: ds[Math.floor(ds.length / 2)], n: runs.length,
  };
}

// ---------- known graphs, for the canary ----------
function lattice(dim, side) {
  const adj = new Map(), idx = [];
  const rec = (pre) => { if (pre.length === dim) { idx.push(pre.slice()); return; } for (let i = 0; i < side; i++) rec([...pre, i]); };
  rec([]);
  const key = c => c.join(',');
  for (const c of idx) adj.set(key(c), []);
  for (const c of idx) for (let a = 0; a < dim; a++) for (const dlt of [-1, 1]) {
    const nb = c.slice(); nb[a] += dlt;
    if (nb[a] >= 0 && nb[a] < side) adj.get(key(c)).push(key(nb));
  }
  return { adj, center: key(idx[0].map(() => Math.floor(side / 2))) };
}

function btree(depth) {
  const adj = new Map(); adj.set(0, []);
  let next = 1; const q = [[0, 0]];
  while (q.length) {
    const [u, d] = q.shift(); if (d >= depth) continue;
    for (let k = 0; k < 2; k++) { const v = next++; adj.set(v, [u]); adj.get(u).push(v); q.push([v, d + 1]); }
  }
  return { adj, center: 0 };
}

function runCanary() {
  const cases = [];
  // Lattices sized so the fitted window never reaches the wall: R stays well under side/2.
  const l2 = lattice(2, 121); cases.push({ name: '2D lattice', want: 'POLYNOMIAL', wantD: 2, got: probe(l2.adj, [l2.center], 40) });
  const l3 = lattice(3, 41);  cases.push({ name: '3D lattice', want: 'POLYNOMIAL', wantD: 3, got: probe(l3.adj, [l3.center], 15) });
  const bt = btree(16);       cases.push({ name: 'binary tree (NEGATIVE CONTROL)', want: 'EXPONENTIAL', wantD: null, got: probe(bt.adj, [bt.center], 15) });
  let ok = true;
  for (const c of cases) {
    let pass = c.got.verdict === c.want;
    if (pass && c.wantD != null) pass = Math.abs(c.got.dMedian - c.wantD) <= 0.5;
    if (!pass) ok = false;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${c.name}: got ${c.got.verdict}` +
      (c.got.dMedian != null ? ` d=${c.got.dMedian.toFixed(2)}` : '') + (c.wantD != null ? ` (want d~${c.wantD})` : ''));
  }
  return ok;
}

// ---------- the void graph itself ----------
function voidAdj(g) {
  const adj = new Map();
  for (const [id, nd] of g.nodes) adj.set(id, [...nd.edges]);
  return adj;
}

function growVoid(ticks, seed) {
  // The §15/§16 operating point: conserved substrate, regulated construction, binding-ish cap.
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
  console.log('DIMENSION PROBE — does void have a bulk?\n');
  console.log('CANARY (instrument must recover known dimensions):');
  const ok = runCanary();
  if (!ok) { console.log('\nUNTRUSTED — estimator failed a known case. No verdict for void.'); process.exit(2); }
  console.log('  canary OK\n');

  const TICKS = Number(process.env.TICKS ?? 3000);
  const SEEDS = (process.env.SEEDS ?? '1,2,3').split(',').map(Number);
  console.log(`VOID (${TICKS} ticks, seeds ${SEEDS.join(',')}):`);
  const verdicts = [];
  for (const s of SEEDS) {
    const g = growVoid(TICKS, s);
    const adj = voidAdj(g);
    const occ = [...g.nodes.values()].filter(n => n.occ > 0).map(n => n.id);
    const srcs = occ.length ? occ.slice(0, 12) : [...g.nodes.keys()].slice(0, 12);
    const p = probe(adj, srcs, 24);
    verdicts.push(p.verdict);
    // Look at the raw curve before trusting any fit to it. Degree distribution too: a graph that
    // engulfs 3000 nodes in a handful of hops is telling us about branching, not about dimension.
    if (process.env.SHOW_SERIES) {
      const degs = [...g.nodes.values()].map(n => n.edges.size).sort((a, b) => a - b);
      const q = f => degs[Math.min(degs.length - 1, Math.floor(degs.length * f))];
      console.log(`    ball(r) from ${srcs[0]}: [${ball(adj, srcs[0], 24).join(', ')}]`);
      console.log(`    degree p50=${q(0.5)} p90=${q(0.9)} max=${degs[degs.length - 1]} | depth max=${Math.max(...[...g.nodes.values()].map(n => n.depth))}`);
    }
    console.log(`  seed ${s}: nodes=${g.nodes.size} occupied=${occ.length} -> ${p.verdict}` +
      (p.dMedian != null ? ` d=${p.dMedian.toFixed(2)}` : '') + ` (polyFrac=${(p.polyFrac ?? 0).toFixed(2)}, n=${p.n})`);
  }
  // BROKEN-ZERO GUARD (this fired on the first real run): every seed came back TOO_SHORT and the
  // old comparison `expo > n/2` was false, so control fell through to the POLYNOMIAL branch and
  // printed "a bulk exists" off zero usable measurements. An unmeasured graph is not a
  // finite-dimensional graph. Refuse to report rather than report comfortably.
  const usable = verdicts.filter(v => v === 'POLYNOMIAL' || v === 'EXPONENTIAL');
  if (usable.length <= verdicts.length / 2) {
    console.log('\nUNTRUSTED — too few usable ball series (most seeds TOO_SHORT).');
    console.log('The ball saturates the component before enough radii accumulate to fit. That is');
    console.log('itself informative (very shallow, high branching) but it is NOT a dimension.');
    process.exit(2);
  }
  const expo = usable.filter(v => v === 'EXPONENTIAL').length;
  console.log('');
  if (expo > usable.length / 2) {
    console.log('VERDICT: EXPONENTIAL ball growth — the niche graph is TREE-LIKE. It has NO BULK.');
    console.log('CONSEQUENCE: a holographic bound on this substrate is VACUOUS. It would never bind,');
    console.log('and §16 arm C cannot be run as written. The substrate must be made finite-dimensional');
    console.log('FIRST (local sibling/cousin edges), or the arm measures a rule that never fired.');
  } else {
    console.log('VERDICT: POLYNOMIAL ball growth — a bulk exists, §16 arm C can bind as written.');
  }
}

module.exports = { probe, classify, ball, lattice, btree };
