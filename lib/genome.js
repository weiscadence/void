/* genome.js — the shared genetics of the void.
 *
 * An organism is a GENOME: three expression trees (h,s,v) over spatial/temporal
 * terminals, evaluated per pixel → HSV → RGB. Enriched per Karl Sims (1991):
 * coordinate WARP nodes, value-noise leaf terminals, polar terminals, HSV output.
 * This module is required by BOTH the server daemon (evolution) and mirrored in
 * the client (rendering) so the same genome draws identically everywhere.
 *
 * Pure/deterministic given (genome, x, y, t). No globals. CommonJS + browser-safe.
 */
(function (root) {
  'use strict';

  // ── deterministic value noise (cheap, seedable, smooth) ──
  function hash2(ix, iy, seed) {
    let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise2(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
    const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
    const u = smooth(fx), v = smooth(fy);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  const TERM = ['x', 'y', 't', 'X', 'Y', 'R', 'A', 'n', 'c'];
  const FUN = ['sin', 'cos', 'abs', 'tri', 'mul', 'add', 'sub', 'mod', 'warp', 'wav', 'min', 'max'];
  const ARITY = { sin: 1, cos: 1, abs: 1, tri: 1, mul: 2, add: 2, sub: 2, mod: 2, warp: 2, wav: 2, min: 2, max: 2 };
  const clamp = v => v < -1 ? -1 : v > 1 ? 1 : v;

  // evaluate a node → value in ~[-1,1]. warp offsets the coordinate field.
  function ev(n, x, y, t, seed, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    switch (n.t) {
      case 'x': return clamp(x + ox);
      case 'y': return clamp(y + oy);
      case 't': return Math.sin(t);
      case 'X': return Math.sin((x + ox) * 6.2831);
      case 'Y': return Math.sin((y + oy) * 6.2831);
      case 'R': { const dx = x + ox, dy = y + oy; return clamp(Math.sqrt(dx * dx + dy * dy) * 2 - 1); }
      case 'A': return Math.atan2(y + oy, x + ox) / Math.PI;
      case 'n': return noise2((x + ox) * 3 + t * 0.2, (y + oy) * 3, seed);
      case 'c': return n.v;
      case 'f': {
        const k = n.kids;
        switch (n.f) {
          case 'sin': return Math.sin(ev(k[0], x, y, t, seed, ox, oy) * Math.PI);
          case 'cos': return Math.cos(ev(k[0], x, y, t, seed, ox, oy) * Math.PI);
          case 'abs': return Math.abs(ev(k[0], x, y, t, seed, ox, oy)) * 2 - 1;
          case 'tri': { const a = (ev(k[0], x, y, t, seed, ox, oy) + 1) % 2; return (a < 1 ? a : 2 - a) * 2 - 1; }
          case 'mul': return ev(k[0], x, y, t, seed, ox, oy) * ev(k[1], x, y, t, seed, ox, oy);
          case 'add': return clamp(ev(k[0], x, y, t, seed, ox, oy) + ev(k[1], x, y, t, seed, ox, oy));
          case 'sub': return clamp(ev(k[0], x, y, t, seed, ox, oy) - ev(k[1], x, y, t, seed, ox, oy));
          case 'mod': { const b = ev(k[1], x, y, t, seed, ox, oy); return b === 0 ? 0 : ev(k[0], x, y, t, seed, ox, oy) % b; }
          case 'warp': { const w = ev(k[1], x, y, t, seed, ox, oy) * 0.5; return ev(k[0], x, y, t, seed, ox + w, oy + w * 0.7); }
          case 'wav': return Math.sin((ev(k[0], x, y, t, seed, ox, oy) + ev(k[1], x, y, t, seed, ox, oy)) * Math.PI * 2);
          case 'min': return Math.min(ev(k[0], x, y, t, seed, ox, oy), ev(k[1], x, y, t, seed, ox, oy));
          case 'max': return Math.max(ev(k[0], x, y, t, seed, ox, oy), ev(k[1], x, y, t, seed, ox, oy));
        }
      }
    }
    return 0;
  }

  // HSV→RGB; genome h,s,v come in ~[-1,1]
  function hsv(h, s, v) {
    h = ((h + 1) * 0.5) % 1; s = (s + 1) * 0.5; v = (v + 1) * 0.5;
    s = s < 0 ? 0 : s > 1 ? 1 : s; v = v < 0 ? 0 : v > 1 ? 1 : v;
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), u = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = u; b = p; break; case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = u; break; case 3: r = p; g = q; b = v; break;
      case 4: r = u; g = p; b = v; break; default: r = v; g = p; b = q;
    }
    return [r * 255, g * 255, b * 255];
  }

  // ── construction / mutation ──
  function mk(rng, depth) {
    if (depth <= 0 || (depth < 3 && rng() < 0.32)) {
      const t = TERM[(rng() * TERM.length) | 0];
      return t === 'c' ? { t: 'c', v: +(rng() * 2 - 1).toFixed(3) } : { t };
    }
    const f = FUN[(rng() * FUN.length) | 0], kids = [];
    for (let i = 0; i < ARITY[f]; i++) kids.push(mk(rng, depth - 1));
    return { t: 'f', f, kids };
  }
  function genome(rng, seed) {
    return { h: mk(rng, 4), s: mk(rng, 3), v: mk(rng, 4), gen: 0, id: (rng() * 1e9) | 0, parent: null, seed: seed | 0, born: 0 };
  }
  function clone(n) { return n.t === 'f' ? { t: 'f', f: n.f, kids: n.kids.map(clone) } : (n.t === 'c' ? { t: 'c', v: n.v } : { t: n.t }); }
  function mutNode(n, rng, rate) {
    if (rng() < rate) {
      if (n.t === 'c') return { t: 'c', v: +Math.max(-1, Math.min(1, n.v + (rng() * 0.8 - 0.4))).toFixed(3) };
      if (n.t === 'f') { const c = FUN.filter(f => ARITY[f] === ARITY[n.f]); return { t: 'f', f: c[(rng() * c.length) | 0], kids: n.kids.map(k => mutNode(k, rng, rate)) }; }
      return mk(rng, 2);
    }
    return n.t === 'f' ? { t: 'f', f: n.f, kids: n.kids.map(k => mutNode(k, rng, rate)) } : clone(n);
  }
  function mutate(gm, rng) {
    const rate = 0.15 + rng() * 0.15;
    return { h: mutNode(gm.h, rng, rate), s: mutNode(gm.s, rng, rate), v: mutNode(gm.v, rng, rate),
      gen: gm.gen + 1, id: (rng() * 1e9) | 0, parent: gm.id, born: 0,
      // the noise seed is heritable but NOT frozen. Inherited unchanged it collapses:
      // by gen ~2000 all 144 archive elites shared one seed (7 of 8 founders wiped out),
      // making the 'n' terminal a constant for the whole species. Rare drift restores it.
      seed: rng() < 0.03 ? (rng() * 1e9) | 0 : gm.seed };
  }
  // node count ~ structural complexity (feeds assembly index)
  function size(n) { return n.t === 'f' ? 1 + n.kids.reduce((a, k) => a + size(k), 0) : 1; }
  function complexity(gm) { return size(gm.h) + size(gm.s) + size(gm.v); }

  // pretty source for the "code" panel
  function fmt(n) {
    if (n.t === 'c') return String(n.v);
    if (n.t !== 'f') return n.t;
    return n.f + '(' + n.kids.map(fmt).join(',') + ')';
  }

  const api = { TERM, FUN, ARITY, ev, hsv, mk, genome, clone, mutate, complexity, size, fmt, noise2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VoidGenome = api;
})(typeof self !== 'undefined' ? self : this);
