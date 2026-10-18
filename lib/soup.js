// void soup — an artificial chemistry whose molecules are drawable programs.
//
// The mash (each piece is someone's; the combination is ours):
//   Fontana & Buss 1994 "the arrival of the fittest" (AlChemy): molecules are
//     programs, a collision APPLIES one to the other, the product enters a
//     constant-population reactor with random dilution; no fitness, no target.
//     Self-maintaining organizations appear anyway.
//   lib/garden.js (our Picbreeder-style expression language over x, y, r, θ with
//     fold-n and φ-twist): the molecules, so every molecule is also a picture.
//   Fontana's "no copy" filter: a second arm discards products identical to a
//     reactant, the move he used to get past Level-0 copier soups.
//   Agüera y Arcas et al. 2024 (BFF, arXiv:2406.19108): random programs in a
//     soup with no fitness landscape give rise to self-replicators spontaneously;
//     the comparison we draw is WHEN that happens and whether complexity keeps rising.
//
// Reaction rule (kept deliberately small):
//   A ∘ B = simplify( A with its FIRST variable leaf (x|y|r|θ) replaced by B )
//   simplify = constant folding + idempotents (abs∘abs, abs∘sq, abs∘gauss, sq∘abs,
//     gauss∘abs) + identities (+0, ·1, ·0, X mod X) + θ-free bodies under fold/twist.
//   Products larger than MAX_SIZE nodes are discarded (an elastic collision).
//   A molecule with no variable leaf (a pure constant) is inert on the left.
// A bare leaf is a copier: x ∘ B = B. That is Fontana's identity function λx.x,
// and it is NOT planted — random molecules here are never bare leaves; copiers
// must be MADE by a reaction (fold3{r} → r, (x + 0) → x, ...).
//
// Runs unchanged in node and the browser. Needs Garden (lib/garden.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./garden.js'));
  else root.Soup = factory(root.Garden);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  const VARS = new Set(['x', 'y', 'r', 't']);
  const key = t => JSON.stringify(t);
  const clone = t => JSON.parse(JSON.stringify(t));
  const childStart = t => (t[0] === 'fold' || t[0] === 'twist' || t[0] === 'M') ? 2 : 1;

  function size(t) { let n = 1; for (let i = childStart(t); i < t.length; i++) if (Array.isArray(t[i])) n += size(t[i]); return n; }
  function vars(t, acc) { acc = acc || new Set(); if (VARS.has(t[0])) acc.add(t[0]); for (let i = childStart(t); i < t.length; i++) if (Array.isArray(t[i])) vars(t[i], acc); return acc; }
  function hasAngle(t) { const v = vars(t); return v.has('x') || v.has('y') || v.has('t'); }

  // ── SIMPLIFY — the "reduction" half of the chemistry. Bottom-up, one pass. ──
  function simplify(t) {
    const op = t[0];
    if (op === 'k') return ['k', fix(t[1])];
    if (VARS.has(op)) return [op];
    const s = childStart(t);
    const out = t.slice(0, s); for (let i = s; i < t.length; i++) out.push(simplify(t[i]));
    if (vars(out).size === 0) { // constant folding
      let v; try { v = G.compile(out)(0, 0, 0, 0); } catch (e) { v = 0; }
      if (!isFinite(v)) v = 0; return ['k', fix(v)];
    }
    const a = out[s], b = out[s + 1];
    switch (op) {
      case 'abs': if (a[0] === 'abs' || a[0] === 'sq' || a[0] === 'gauss') return a; break;
      case 'sq': if (a[0] === 'abs') return ['sq', a[1]]; break;
      case 'gauss': if (a[0] === 'abs') return ['gauss', a[1]]; break;
      case 'add': if (a[0] === 'k' && a[1] === 0) return b; if (b[0] === 'k' && b[1] === 0) return a; break;
      case 'mul': if (a[0] === 'k' && a[1] === 1) return b; if (b[0] === 'k' && b[1] === 1) return a;
        if ((a[0] === 'k' && a[1] === 0) || (b[0] === 'k' && b[1] === 0)) return ['k', 0]; break;
      case 'mod': if (key(a) === key(b)) return ['k', 0]; break;
      case 'fold': case 'twist': if (!hasAngle(a)) return a; break;
    }
    return out;
  }
  function fix(v) { const r = Math.round(v * 100) / 100; return r === 0 ? 0 : r; }

  // ── APPLICATION — A ∘ B ────────────────────────────────────────────────────
  // Replace A's first variable leaf (pre-order) with B. null if A has none (inert).
  function apply(A, B) {
    let done = false;
    function sub(t) {
      if (done) return t;
      if (VARS.has(t[0])) { done = true; return clone(B); }
      const s = childStart(t); const out = t.slice(0, s);
      for (let i = s; i < t.length; i++) out.push(Array.isArray(t[i]) ? sub(t[i]) : t[i]);
      return out;
    }
    const raw = sub(A);
    return done ? simplify(raw) : null;
  }

  // ── REACT — the rule with caps and the optional no-copy filter ─────────────
  // Returns {tree, key} or null (discarded: inert / too big / copy under noCopy).
  function react(A, B, opts) {
    const C = apply(A.tree, B.tree);
    if (!C) return null;
    if (C[0] === 'k') return null; // folded to a pure constant: inert both ways, precipitates out (Fontana discards non-normalising terms the same way)
    if (size(C) > opts.maxSize) return null;
    const k = key(C);
    if (opts.noCopy && (k === A.key || k === B.key)) return null;
    return { tree: C, key: k };
  }

  // Point mutation on a product (background mutation, as in BFF's optional noise).
  function mutate(t, R) {
    const g = clone(t); const all = G.nodes(g); const n = R.pick(all).node;
    if (n[0] === 'k') n[1] = fix(n[1] + (R() - 0.5));
    else if (n[0] === 'fold') n[1] = Math.max(2, Math.min(13, n[1] + (R() < 0.5 ? -1 : 1)));
    else if (n[0] === 'twist') n[1] = fix(n[1] + (R() - 0.5) * 0.6);
    else if (['sin', 'cos', 'abs', 'gauss', 'sq'].includes(n[0])) n[0] = R.pick(['sin', 'cos', 'abs', 'gauss', 'sq']);
    else if (['add', 'mul', 'mod'].includes(n[0])) n[0] = R.pick(['add', 'mul', 'mod']);
    else if (VARS.has(n[0])) n[0] = R.pick(['x', 'y', 'r', 't']);
    return simplify(g);
  }

  function randomMolecule(R, depth) { return simplify(G.randomTree(R, depth || 3, true)); }
  function mol(tree, parents, born) { const t = simplify(tree); return { tree: t, key: key(t), parents: parents || null, born: born || 0, size: size(t) }; }

  // ── REACTOR — Fontana's flow reactor, made MASS-CONSERVING ─────────────────
  // Fontana held the molecule COUNT fixed (one in, one random out). Our application is
  // additive in size (A∘B ≈ |A|+|B|), and his λ-reduction, which shrank products, has
  // no strong analogue here — so a count-fixed reactor ratchets to the size cap and goes
  // inert (smoke: mean size 20.8/24, 97% of collisions elastic, at every outflow bias
  // tried). What is held fixed here is NODE MASS: inserting a product of s nodes removes
  // random molecules until ≥ s nodes have left. Big molecules are expensive to keep, small
  // ones cheap, and the population count floats. (A conserved quantity — finding 6 named
  // its absence as the reason our substrates never went critical.)
  // arm: 'react' (apply, copies allowed) | 'nocopy' (apply, products identical to a reactant
  //      are discarded — Fontana's filter) | 'control' (no reactions: a fresh random molecule
  //      enters under the same mass flow; nothing is made from anything).
  function Reactor(seed, cfg) {
    const R = G.rng(seed);
    const o = Object.assign({ N: 200, maxSize: 24, mu: 0.02, arm: 'react', depth: 3, cleave: 0.3, logSize: 20000 }, cfg || {});
    const pop = []; while (pop.length < o.N) { const m = mol(G.randomTree(R, o.depth, true), null, 0); if (m.tree[0] !== 'k') pop.push(m); } // no pure constants: they are not molecules here
    const M = pop.reduce((a, p) => a + p.size, 0);
    const self = { R, o, pop, M, t: 0, produced: 0, discarded: 0, injected: 0, copies: 0, mutated: 0, cleaved: 0, recent: [],
      mass() { return pop.reduce((a, p) => a + p.size, 0); },
      // outflow: remove random molecules (never the two reactants) until `need` nodes left
      // A ledger keeps mass exact: removing a 9-node molecule to pay for a 5-node product
      // leaves 4 nodes of credit against the next payment (without it the overshoot leaked
      // and the soup drained to four molecules in the smoke run).
      credit: 0,
      outflow(need, keepA, keepB) { const gone = []; let owed = need - self.credit;
        while (owed > 0 && pop.length > 3) { const j = R.int(pop.length); const m = pop[j]; if (m === keepA || m === keepB) continue; owed -= m.size; gone.push(m); pop[j] = pop[pop.length - 1]; pop.pop(); }
        self.credit = Math.max(0, -owed);
        return gone; },
      // CLEAVAGE — hydrolysis to application's condensation. Application only ever makes
      // bigger molecules (|A∘B| ≈ |A|+|B|-1), so without a bond-breaking reaction every
      // reactor tried — count-fixed, size-biased outflow, mass-conserving — ended as a few
      // giant inert molecules at the cap. Here, with probability `cleave` per collision,
      // molecule A splits at a random edge: the cut sub-tree T leaves, and the hole it
      // left becomes a dangling variable leaf (a free bond). Mass +1, paid by outflow.
      cleave(ia) { const A = pop[ia]; if (A.size < 2) return { kind: 'elastic', A, B: A };
        const all = G.nodes(A.tree).slice(1); const cut = R.pick(all);
        const T = clone(cut.node); const rest = G.setAt(clone(A.tree), cut.path, [R.pick(['x', 'y', 'r', 't'])]);
        const f1 = mol(T, [A.key], self.t), f2 = mol(rest, [A.key], self.t);
        pop[ia] = pop[pop.length - 1]; pop.pop();
        const out = []; for (const f of [f1, f2]) if (f.tree[0] !== 'k') out.push(f);
        const gone = self.outflow(out.reduce((a, f) => a + f.size, 0) - A.size, null, null);
        for (const f of out) pop.push(f); self.cleaved++;
        return { kind: 'cleave', A, frags: out, gone }; },
      collide(ia, ib) { // one collision; returns the event
        if (R() < o.cleave) return self.cleave(ia);
        const A = pop[ia], B = pop[ib];
        if (o.arm === 'control') { let m = mol(G.randomTree(R, o.depth, true), null, self.t); while (m.tree[0] === 'k') m = mol(G.randomTree(R, o.depth, true), null, self.t); const gone = self.outflow(m.size, null, null); pop.push(m); self.injected++; return { kind: 'inject', m, gone }; }
        const C = react(A, B, { maxSize: o.maxSize, noCopy: o.arm === 'nocopy' });
        if (!C) { self.discarded++; return { kind: 'elastic', A, B }; }
        let tree = C.tree; let mut = false;
        if (o.mu > 0 && R() < o.mu) { tree = mutate(tree, R); mut = true; self.mutated++; }
        const m = mol(tree, [A.key, B.key], self.t);
        if (m.key === A.key || m.key === B.key) self.copies++;
        const gone = self.outflow(m.size, A, B); pop.push(m); self.produced++;
        self.recent.push([A.key, B.key, m.key]); // the production log the realized-organization test reads
        return { kind: 'react', A, B, m, mut, gone };
      },
      step(n) { // n collisions (default N = one "generation")
        n = n || o.N; const ev = [];
        for (let i = 0; i < n; i++) { const L = pop.length; if (L < 2) break; const ia = R.int(L); let ib = R.int(L); while (ib === ia) ib = R.int(L); ev.push(self.collide(ia, ib)); }
        self.t++; if (self.recent.length > o.logSize) self.recent.splice(0, self.recent.length - o.logSize); return ev;
      },
      species() { const m = new Map(); for (const p of pop) { const e = m.get(p.key); if (e) e.n++; else m.set(p.key, { key: p.key, tree: p.tree, n: 1, size: p.size }); } return m; },
    };
    return self;
  }

  // ── ORGANIZATION DETECTOR (Fontana & Buss: closed + self-maintaining) ──────
  // Over the DISTINCT species present, with the reaction table S×S under the same
  // rule (inert / over-cap / copy-under-noCopy products are void). For each seed —
  // every single species, plus every pair among the `pairTop` most abundant — take
  // the CLOSURE inside the present species (add products until nothing new; products
  // that are real molecules but not present are LEAKS), then prune to the
  // self-maintaining fixed point (keep only species some pair in the set produces).
  // The result is an ORGANIZATION if it is non-empty, still closed, and its leak
  // share ≤ maxLeak. Size 1 = a self-replicator (x∘x = x, abs(x)∘abs(x) = abs(x));
  // size ≥ 2 = Fontana's Level 1. Copiers (bare leaves) are counted, and copyShare
  // = fraction of in-set production that is a copy reaction (product = a reactant).
  function organizations(speciesMap, opts) {
    const o = Object.assign({ maxSize: 24, noCopy: false, maxLeak: 0.1, pairTop: 30 }, opts || {});
    const sp = [...speciesMap.values()].sort((a, b) => b.n - a.n); const n = sp.length; const idx = new Map(sp.map((s, i) => [s.key, i]));
    const prod = new Array(n), leak = new Array(n); // prod: index | -1 void | -2 leak (real product, absent)
    for (let i = 0; i < n; i++) { prod[i] = new Int32Array(n);
      for (let j = 0; j < n; j++) { const C = react(sp[i], sp[j], { maxSize: o.maxSize, noCopy: o.noCopy }); if (!C) { prod[i][j] = -1; continue; } const k = idx.get(C.key); prod[i][j] = k === undefined ? -2 : k; } }
    function closure(seed) { const inS = new Uint8Array(n); const list = []; for (const i of seed) if (!inS[i]) { inS[i] = 1; list.push(i); }
      for (let q = 0; q < list.length; q++) { const i = list[q]; for (let p = 0; p <= q; p++) { const j = list[p]; for (const k of [prod[i][j], prod[j][i]]) if (k >= 0 && !inS[k]) { inS[k] = 1; list.push(k); } } }
      return list; }
    function selfMaintain(list) { let alive = new Set(list), changed = true;
      while (changed) { changed = false; const made = new Set(); for (const i of alive) for (const j of alive) { const k = prod[i][j]; if (k >= 0 && alive.has(k)) made.add(k); }
        for (const i of [...alive]) if (!made.has(i)) { alive.delete(i); changed = true; } }
      return [...alive]; }
    const seen = new Set(), orgs = [];
    const seeds = []; for (let i = 0; i < n; i++) seeds.push([i]); const top = Math.min(n, o.pairTop); for (let i = 0; i < top; i++) for (let j = i + 1; j < top; j++) seeds.push([i, j]);
    for (const seed of seeds) {
      const cl = closure(seed); if (cl.length > 64) continue; // runaway closure: not an organization at this scale
      const sm = selfMaintain(cl); if (!sm.length) continue;
      const cl2 = closure(sm); if (cl2.length !== sm.length) continue; // must remain closed after pruning
      const sig = sm.slice().sort((a, b) => a - b).join(','); if (seen.has(sig)) continue; seen.add(sig);
      let inside = 0, leaks = 0, copyRx = 0, abundance = 0; const set = new Set(sm);
      for (const i of sm) { abundance += sp[i].n; for (const j of sm) { const k = prod[i][j]; if (k === -2) leaks++; else if (k >= 0 && set.has(k)) { inside++; if (k === i || k === j) copyRx++; } } }
      const leakShare = (inside + leaks) ? leaks / (inside + leaks) : 0;
      if (leakShare > o.maxLeak) continue;
      orgs.push({ members: sm.map(i => sp[i].key), size: sm.length, abundance, leak: +leakShare.toFixed(3), copiers: sm.filter(i => VARS.has(sp[i].tree[0])).length, copyShare: inside ? +(copyRx / inside).toFixed(3) : 0 });
    }
    // drop organizations strictly contained in a larger one (report maximal sets + the replicators)
    orgs.sort((a, b) => b.size - a.size || b.abundance - a.abundance);
    const maximal = orgs.filter(a => a.size === 1 || !orgs.some(b => b.size > a.size && a.members.every(m => b.members.includes(m))));
    return { orgs: maximal, replicators: maximal.filter(a => a.size === 1), level1: maximal.filter(a => a.size >= 2), speciesCount: n };
  }

  // REALIZED — a closed, self-maintaining set is a property of the species present, and
  // the control arm (no reactions at all) shows plenty of them: the detector cannot tell
  // a set that IS maintaining itself from one that merely COULD. So an organization also
  // has to be happening: `recent` is the reactor's log of (A, B, product) keys; a member
  // is maintained if some logged reaction with BOTH reactants in the set produced it.
  // Returns the fraction of members maintained; `realized` = fraction ≥ minFrac.
  function realized(org, recent, minFrac) {
    const set = new Set(org.members); const made = new Set();
    for (const [a, b, c] of recent) if (set.has(c) && set.has(a) && set.has(b)) made.add(c);
    const frac = org.members.filter(m => made.has(m)).length / org.members.length;
    return { maintained: +frac.toFixed(3), realized: frac >= (minFrac == null ? 2 / 3 : minFrac) };
  }

  // Jaccard identity between organizations across checkpoints (for lifetimes).
  function jaccard(a, b) { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }

  // ── OBSERVER — the garden's six numbers, cached per species ───────────────
  const descCache = new Map();
  function describe(tree, k, sz) { k = k || key(tree); let d = descCache.get(k); if (!d) { d = G.describe(G.render(tree, sz || 32), sz || 32); descCache.set(k, d); } return d; }
  const cellOf = d => d.map(v => Math.min(3, Math.floor(v * 4))).join(',');

  return { VARS, key, clone, size, vars, simplify, apply, react, mutate, randomMolecule, mol, Reactor, organizations, realized, jaccard, describe, cellOf, toCode: G.toCode };
});
