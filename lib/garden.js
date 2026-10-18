// void garden — a tiny expression language over (x, y, r, θ) whose programs are
// pictures, plus the observer that looks at them. Runs unchanged in node and in
// the browser (the page re-renders every archived genome live from this file).
//
// Stands on: Picbreeder's CPPNs (Secretan, Stanley et al. 2008/2011) for the idea
// that compositions of sin/cos/gauss/abs over coordinates give beautiful forms;
// Koza's automatically-defined functions for the MACRO op (a genome inlines a
// sub-tree from another archive member — code written by evolution becomes a
// building block, the way an L-system rule is text that rewrites text); Lehman &
// Stanley's novelty search for the selection rule; ASAL (Kumar et al. 2024) for
// "an observer embeds the state and scores novelty" — here the observer is a
// hand-made six-number descriptor, not a foundation model.
//
// Sacred-geometry primitives live in the op table itself: FOLD (n-fold rotational
// symmetry, θ → θ mod 2π/n reflected), TWIST (φ-spiral: θ + r·φ·k, golden angle
// built in), and the Fibonacci share of the angular spectrum in the descriptor.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Garden = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PHI = (1 + Math.sqrt(5)) / 2, TAU = Math.PI * 2, GOLDEN_ANGLE = TAU / (PHI * PHI); // 137.5°

  // ── PRNG (mulberry32) — every run is replayable from its seed ───────────────
  function rng(seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = n => Math.floor(f() * n);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  }

  // ── GENOME ──────────────────────────────────────────────────────────────────
  // A node is an array: [op, ...children] or a leaf. Leaves: ['x'], ['y'], ['r'],
  // ['t'] (θ), ['k', value]. Unary: sin cos abs gauss sq. Binary: add mul mod.
  // FOLD: ['fold', n, child]  — evaluates child with θ folded into one of n wedges.
  // TWIST: ['twist', k, child] — evaluates child with θ += r * GOLDEN_ANGLE * k.
  // MACRO: ['M', srcId, subtree] — inlined copy of a sub-tree lifted from archive
  // member srcId. Semantically transparent (it IS the subtree); recorded so the
  // lineage of reuse is visible. The control arm never produces this node.
  const UNARY = ['sin', 'cos', 'abs', 'gauss', 'sq'], BINARY = ['add', 'mul', 'mod'];
  const LEAVES = ['x', 'y', 'r', 't'];

  function randomTree(R, depth, allowSacred) {
    if (depth <= 0 || (depth < 3 && R() < 0.3)) {
      if (R() < 0.2) return ['k', +(R() * 4 - 2).toFixed(2)];
      return [R.pick(LEAVES)];
    }
    const u = R();
    if (allowSacred && u < 0.14) return ['fold', 2 + R.int(11), randomTree(R, depth - 1, allowSacred)];
    if (allowSacred && u < 0.24) return ['twist', +(R() * 3 - 1.5).toFixed(2), randomTree(R, depth - 1, allowSacred)];
    if (u < 0.6) return [R.pick(UNARY), randomTree(R, depth - 1, allowSacred)];
    return [R.pick(BINARY), randomTree(R, depth - 1, allowSacred), randomTree(R, depth - 1, allowSacred)];
  }

  // Compile a tree to a closure (x, y, r, θ) → number. Compiling once per genome
  // and evaluating 2,304–9,216 times is what makes the browser render crisp at 20fps.
  function compile(node) {
    const op = node[0];
    switch (op) {
      case 'x': return (x) => x;
      case 'y': return (x, y) => y;
      case 'r': return (x, y, r) => r;
      case 't': return (x, y, r, t) => t;
      case 'k': { const k = node[1]; return () => k; }
      case 'sin': { const c = compile(node[1]); return (x, y, r, t) => Math.sin(c(x, y, r, t) * Math.PI); }
      case 'cos': { const c = compile(node[1]); return (x, y, r, t) => Math.cos(c(x, y, r, t) * Math.PI); }
      case 'abs': { const c = compile(node[1]); return (x, y, r, t) => Math.abs(c(x, y, r, t)); }
      case 'sq': { const c = compile(node[1]); return (x, y, r, t) => { const v = c(x, y, r, t); return v * v; }; }
      case 'gauss': { const c = compile(node[1]); return (x, y, r, t) => { const v = c(x, y, r, t); return Math.exp(-v * v * 2); }; }
      case 'add': { const a = compile(node[1]), b = compile(node[2]); return (x, y, r, t) => a(x, y, r, t) + b(x, y, r, t); }
      case 'mul': { const a = compile(node[1]), b = compile(node[2]); return (x, y, r, t) => a(x, y, r, t) * b(x, y, r, t); }
      case 'mod': { const a = compile(node[1]), b = compile(node[2]); return (x, y, r, t) => { const d = Math.abs(b(x, y, r, t)) + 0.1; const v = a(x, y, r, t); return v - d * Math.floor(v / d); }; }
      case 'fold': { const n = node[1], c = compile(node[2]); const w = TAU / n;
        return (x, y, r, t) => { let a = t - w * Math.floor(t / w); if (a > w / 2) a = w - a; const nx = r * Math.cos(a), ny = r * Math.sin(a); return c(nx, ny, r, a); }; }
      case 'twist': { const k = node[1], c = compile(node[2]);
        return (x, y, r, t) => { const a = t + r * GOLDEN_ANGLE * k; return c(r * Math.cos(a), r * Math.sin(a), r, a); }; }
      case 'M': return compile(node[2]);
      default: throw new Error('bad op ' + op);
    }
  }

  // Render to a Float32Array of values in [0,1], centred, radius 1 at the edge.
  // phase rotates θ (the gallery's slow spin); breathe scales r (the breathing).
  function render(tree, size, phase, breathe) {
    const f = typeof tree === 'function' ? tree : compile(tree);
    const out = new Float32Array(size * size);
    const ph = phase || 0, br = breathe || 1;
    for (let j = 0; j < size; j++) {
      const y = ((j + 0.5) / size * 2 - 1);
      for (let i = 0; i < size; i++) {
        const x = ((i + 0.5) / size * 2 - 1);
        const r = Math.sqrt(x * x + y * y) * br;
        let t = Math.atan2(y, x) + ph; t -= TAU * Math.floor(t / TAU);
        const v = f(x * br, y * br, r, t);
        out[j * size + i] = 0.5 + 0.5 * Math.cos(v * Math.PI); // wrap, not clip: keeps edges crisp
      }
    }
    return out;
  }

  // ── OBSERVER — six numbers that let novelty search "see" ───────────────────
  // 0 symmetry order  (dominant angular harmonic k, FFT over θ on four rings) / 16
  // 1 symmetry strength (share of angular spectral energy in that harmonic)
  // 2 radial frequency (dominant harmonic of the angle-averaged radial profile) / 12
  // 3 box-counting dimension of the edge map / 2
  // 4 edge density (fraction of pixels on an edge)
  // 5 fibonacci share (angular spectral energy at k ∈ {2,3,5,8,13,21} vs k ≥ 2)
  const NA = 64, RINGS = [0.22, 0.42, 0.62, 0.82], NR = 24, FIB = new Set([2, 3, 5, 8, 13, 21]);
  function sample(img, size, x, y) { // bilinear, x,y in [-1,1]
    const fx = (x + 1) / 2 * size - 0.5, fy = (y + 1) / 2 * size - 0.5;
    const i0 = Math.max(0, Math.min(size - 1, Math.floor(fx))), j0 = Math.max(0, Math.min(size - 1, Math.floor(fy)));
    const i1 = Math.min(size - 1, i0 + 1), j1 = Math.min(size - 1, j0 + 1), ax = fx - i0, ay = fy - j0;
    return (img[j0 * size + i0] * (1 - ax) + img[j0 * size + i1] * ax) * (1 - ay) + (img[j1 * size + i0] * (1 - ax) + img[j1 * size + i1] * ax) * ay;
  }
  function dftMag(sig) { const n = sig.length, m = new Float64Array(n >> 1); let mean = 0; for (const v of sig) mean += v; mean /= n;
    for (let k = 1; k < (n >> 1); k++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const a = TAU * k * i / n, v = sig[i] - mean; re += v * Math.cos(a); im -= v * Math.sin(a); } m[k] = re * re + im * im; }
    return m; }

  function describe(img, size) {
    let mean = 0, sq = 0; for (let i = 0; i < img.length; i++) { mean += img[i]; sq += img[i] * img[i]; }
    mean /= img.length; const sd = Math.sqrt(Math.max(0, sq / img.length - mean * mean));
    if (sd < 0.03) return { blank: true, desc: [0, 0, 0, 0, 0, 0], sd };
    // angular spectrum summed over rings
    const ang = new Float64Array(NA >> 1);
    for (const rho of RINGS) { const sig = new Float64Array(NA); for (let a = 0; a < NA; a++) { const th = TAU * a / NA; sig[a] = sample(img, size, rho * Math.cos(th), rho * Math.sin(th)); } const m = dftMag(sig); for (let k = 1; k < m.length; k++) ang[k] += m[k]; }
    let tot = 0, best = 1, fib = 0, tot2 = 0; for (let k = 1; k < ang.length; k++) { tot += ang[k]; if (ang[k] > ang[best]) best = k; if (k >= 2) { tot2 += ang[k]; if (FIB.has(k)) fib += ang[k]; } }
    const symStrength = tot > 0 ? ang[best] / tot : 0, fibShare = tot2 > 0 ? fib / tot2 : 0;
    // radial profile
    const rad = new Float64Array(NR); for (let q = 0; q < NR; q++) { const rho = (q + 0.5) / NR; let s = 0; for (let a = 0; a < 16; a++) { const th = TAU * a / 16; s += sample(img, size, rho * Math.cos(th), rho * Math.sin(th)); } rad[q] = s / 16; }
    const rm = dftMag(rad); let rbest = 1; for (let k = 1; k < rm.length; k++) if (rm[k] > rm[rbest]) rbest = k;
    // edge map + box counting
    const edge = new Uint8Array(size * size); let ne = 0;
    for (let j = 1; j < size - 1; j++) for (let i = 1; i < size - 1; i++) { const p = j * size + i; const gx = img[p + 1] - img[p - 1], gy = img[p + size] - img[p - size]; if (gx * gx + gy * gy > 0.09) { edge[p] = 1; ne++; } }
    const edgeDensity = ne / (size * size);
    const xs = [], ys = []; for (const b of [2, 4, 8, 16]) { let cnt = 0; for (let J = 0; J < size; J += b) for (let I = 0; I < size; I += b) { let hit = 0; for (let j = J; j < J + b && !hit; j++) for (let i = I; i < I + b; i++) if (edge[j * size + i]) { hit = 1; break; } cnt += hit; } if (cnt > 0) { xs.push(Math.log(1 / b)); ys.push(Math.log(cnt)); } }
    let dim = 0; if (xs.length >= 2) { const n = xs.length; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n; let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); } dim = den > 0 ? num / den : 0; }
    return { blank: false, sd, symOrder: best, radialFreq: rbest, fractalDim: dim, edgeDensity, fibShare, symStrength,
      desc: [Math.min(1, best / 16), symStrength, Math.min(1, rbest / 12), Math.max(0, Math.min(1, dim / 2)), Math.min(1, edgeDensity), fibShare] };
  }

  // ── NOVELTY — mean distance to the k nearest points of the archive ∪ population
  function dist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); }
  function novelty(desc, pool, k) {
    if (!pool.length) return 1;
    const ds = pool.map(p => dist(desc, p)); ds.sort((a, b) => a - b);
    const n = Math.min(k, ds.length); let s = 0; for (let i = 0; i < n; i++) s += ds[i]; return s / n;
  }

  // ── GENETIC OPERATORS ───────────────────────────────────────────────────────
  function clone(t) { return JSON.parse(JSON.stringify(t)); }
  function nodes(t, acc, path) { acc = acc || []; path = path || []; acc.push({ node: t, path }); const start = (t[0] === 'fold' || t[0] === 'twist') ? 2 : (t[0] === 'M' ? 2 : 1);
    for (let i = start; i < t.length; i++) if (Array.isArray(t[i])) nodes(t[i], acc, path.concat(i)); return acc; }
  function setAt(t, path, sub) { if (!path.length) return sub; let cur = t; for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]; cur[path[path.length - 1]] = sub; return t; }
  function size(t) { return nodes(t).length; }
  function depth(t) { const start = (t[0] === 'fold' || t[0] === 'twist' || t[0] === 'M') ? 2 : 1; let d = 0; for (let i = start; i < t.length; i++) if (Array.isArray(t[i])) d = Math.max(d, depth(t[i])); return 1 + d; }

  // Mutate. `donor(R)` returns a sub-tree lifted from an archive member as
  // {srcId, tree}, or null. Macro arm passes a real donor; the control arm passes
  // one that fabricates a FRESH random sub-tree of the same depth distribution, so
  // both arms spend the same mutation budget on "replace a node with a sub-tree"
  // and the only difference is whether that sub-tree was EVOLVED or RANDOM.
  function mutate(genome, R, donor, maxSize) {
    const g = { tree: clone(genome.tree), hue: genome.hue, macros: (genome.macros || []).slice() };
    const u = R();
    if (u < 0.1) g.hue = (g.hue + (R() - 0.5) * 0.2 + 1) % 1;
    const all = nodes(g.tree); const pick = R.pick(all);
    if (u < 0.35) { // point mutation on a constant / parameter
      const n = pick.node;
      if (n[0] === 'k') n[1] = +(n[1] + (R() - 0.5)).toFixed(2);
      else if (n[0] === 'fold') n[1] = Math.max(2, Math.min(13, n[1] + (R() < 0.5 ? -1 : 1)));
      else if (n[0] === 'twist') n[1] = +(n[1] + (R() - 0.5) * 0.6).toFixed(2);
      else if (UNARY.includes(n[0])) n[0] = R.pick(UNARY);
      else if (BINARY.includes(n[0])) n[0] = R.pick(BINARY);
      else if (LEAVES.includes(n[0])) n[0] = R.pick(LEAVES);
    } else if (u < 0.6) { // replace a node with a sub-tree: evolved (macro) or random (control)
      const d = donor ? donor(R) : null;
      const sub = d ? ['M', d.srcId, clone(d.tree)] : randomTree(R, 2 + R.int(3), true);
      if (d) g.macros.push(d.srcId);
      g.tree = setAt(g.tree, pick.path, sub);
    } else if (u < 0.8) { // wrap in a sacred op
      const sub = R() < 0.5 ? ['fold', 2 + R.int(11), pick.node] : ['twist', +(R() * 3 - 1.5).toFixed(2), pick.node];
      g.tree = setAt(g.tree, pick.path, sub);
    } else { // wrap in a unary / combine with a leaf
      const sub = R() < 0.5 ? [R.pick(UNARY), pick.node] : [R.pick(BINARY), pick.node, R() < 0.5 ? [R.pick(LEAVES)] : ['k', +(R() * 4 - 2).toFixed(2)]];
      g.tree = setAt(g.tree, pick.path, sub);
    }
    if (size(g.tree) > maxSize) { // bloat control: prune to a random sub-tree
      const c = R.pick(nodes(g.tree).filter(n => size(n.node) <= maxSize / 2)); if (c) g.tree = c.node;
    }
    return g;
  }

  // ── CODE VIEW — the genome as the expression it is ─────────────────────────
  function toCode(t, expandMacros) {
    const op = t[0];
    switch (op) {
      case 'x': case 'y': case 'r': return op; case 't': return 'θ'; case 'k': return String(t[1]);
      case 'sin': case 'cos': case 'abs': case 'gauss': case 'sq': return op + '(' + toCode(t[1], expandMacros) + ')';
      case 'add': return '(' + toCode(t[1], expandMacros) + ' + ' + toCode(t[2], expandMacros) + ')';
      case 'mul': return toCode(t[1], expandMacros) + '·' + toCode(t[2], expandMacros);
      case 'mod': return '(' + toCode(t[1], expandMacros) + ' mod ' + toCode(t[2], expandMacros) + ')';
      case 'fold': return 'fold' + t[1] + '{' + toCode(t[2], expandMacros) + '}';
      case 'twist': return 'φtwist' + t[1] + '{' + toCode(t[2], expandMacros) + '}';
      case 'M': return expandMacros ? toCode(t[2], true) : 'M' + t[1] + '⟨' + toCode(t[2], false) + '⟩';
    }
    return '?';
  }
  function macroRefs(t, acc) { acc = acc || []; if (t[0] === 'M') acc.push(t[1]); const start = (t[0] === 'fold' || t[0] === 'twist' || t[0] === 'M') ? 2 : 1; for (let i = start; i < t.length; i++) if (Array.isArray(t[i])) macroRefs(t[i], acc); return acc; }

  return { PHI, TAU, GOLDEN_ANGLE, rng, randomTree, compile, render, describe, novelty, dist, mutate, clone, nodes, size, depth, toCode, macroRefs, setAt };
});
