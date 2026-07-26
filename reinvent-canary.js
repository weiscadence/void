// reinvent-canary.js — Does the RE-INVENTION detector have a reachable RED?
//
// RESULT-energetic-nesting.md reports "re-invention: 0 of N" across grace 0.00->1.00 and depth
// 2->198, and concludes "re-invention simply does not occur in this substrate." That conclusion is
// only worth anything if `graph.reinventions` COULD have incremented. A counter that cannot fire
// reports 0 for a trivial reason and looks exactly like a real negative.
// (SYNTHESIS instrument #1: "could this instrument ever have reported otherwise?" — a vacuous pass.)
//
// So: PLANT the exact state the adoption branch claims to detect and check the counter moves.
// Adoption in graph.js fires when a freshly BUILT node at depth d has an orphan at depth d+1.
// Build happens at the builder's node depth+1, so we need: orphan.depth == builder.depth + 2.
//
// Chain: root(d0) -> A(d1) -> B(d2).  softKnockout(A) orphans B at d2.
// A well-fed organism sitting at the root (d0) builds at d1 => adoption of B should fire.
'use strict';
const { Graph } = require('./lib/graph.js');

function plant(seed, { starveOrphan = false } = {}) {
  const g = new Graph({
    seed, roots: 1, seedPerRoot: 6, energetic: true, regulate: true,
    maxNodes: 500, decayEmpty: 100000,      // orphan must not decay during the probe
  });
  const rootId = [...g.nodes.keys()][0];
  const root = g.nodes.get(rootId);

  // Build the chain by hand so the topology is exactly what the detector needs.
  const reqA = root.req.slice(); reqA[0] = g._clamp(reqA[0] + 1);
  const A = g._addNode(reqA, 1, rootId);
  const reqB = reqA.slice(); reqB[1] = g._clamp(reqB[1] + 1);
  const B = g._addNode(reqB, 2, A);

  // Occupants for B so the orphaned branch is genuinely inhabited (unless we want it to starve).
  const gb = g._programFor(reqB);
  for (let i = 0; i < 4; i++) g._place(B, gb.map(x => ({ ...x })), starveOrphan ? 2 : 40);
  // Occupants for A (they die with the knockout, as in the real protocol).
  const ga = g._programFor(reqA);
  for (let i = 0; i < 3; i++) g._place(A, ga.map(x => ({ ...x })), 20);

  // Give the root dwellers plenty of energy so they will actually build.
  for (const o of g.orgs) if (!o.dead && o.node === rootId) o.energy = 60;

  const res = g.softKnockout(A, { blockReq: true });
  return { g, rootId, A, B, orphansAfter: g.orphans.size, removed: res.removed };
}

function run(seed, ticks, opts) {
  const { g, B, orphansAfter } = plant(seed, opts);
  const before = g.reinventions | 0;
  for (let t = 0; t < ticks; t++) {
    // keep root dwellers funded: we are testing REACHABILITY of adoption, not energy economics
    for (const o of g.orgs) if (!o.dead && g.nodes.get(o.node) && g.nodes.get(o.node).depth === 0) {
      if (o.energy < 40) o.energy = 60;
    }
    g.step();
    if ((g.reinventions | 0) > before) return { fired: true, tick: t, orphansAfter, builds: g.builds };
  }
  return { fired: false, tick: ticks, orphansAfter, builds: g.builds, orphansLeft: g.orphans.size };
}

console.log('=== CANARY: can graph.reinventions EVER increment? ===');
console.log('planted: root(d0) -> A(d1) -> B(d2), softKnockout(A) => B orphaned at d2\n');
let fired = 0; const N = 12;
for (let s = 1; s <= N; s++) {
  const r = run(s, 400);
  if (r.fired) fired++;
  console.log(`  seed ${String(s).padStart(2)}: orphans=${r.orphansAfter} builds=${String(r.builds).padStart(4)} ` +
    (r.fired ? `REINVENTION FIRED at tick ${r.tick}` : `no fire (orphansLeft=${r.orphansLeft})`));
}
console.log(`\nRESULT: fired in ${fired}/${N} planted runs.`);
console.log(fired > 0
  ? 'DETECTOR IS LIVE — its RED is reachable, so "0 of N" in the real runs is a genuine negative.'
  : 'DETECTOR IS VACUOUS — it cannot fire even when the exact state is planted. Every "0 of N"\n' +
    'result resting on this counter is UNSUPPORTED and must be retracted, not believed.');
