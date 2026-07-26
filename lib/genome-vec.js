/* genome-vec.js — WHOLE-IMAGE evaluation of the same CPPN genomes.
 *
 * WHY. lib/genome.js walks the expression tree once PER PIXEL: for a 5,700-node genome
 * over a 20x14 grid that is ~1.6M node visits per creature, ~33 billion per 300-generation
 * run. The cost is not arithmetic, it is dispatch — a string-tag switch, a recursive call
 * and a pointer chase for every single node at every single pixel.
 *
 * The structure of the tree is IDENTICAL at every pixel. So walk it once and evaluate each
 * node across all pixels at once, into Float64Array lanes. Same arithmetic, same order,
 * ~280x fewer dispatches, and contiguous memory instead of pointer chasing.
 *
 * BIT-IDENTICAL BY CONSTRUCTION, and that is the whole point. A faster evaluator that
 * silently changes what gets measured would invalidate every comparison against every
 * number already in the lab. So:
 *   - Float64Array, not Float32Array. JS numbers are float64; narrowing would change results.
 *   - The same operations in the same order per lane, so IEEE754 gives identical bits.
 *   - scripts/verify-vec.js asserts EXACT equality against lib/genome.js and is expected to
 *     be run before this is trusted. It compares raw bits, not a tolerance.
 *
 * The one genuinely subtle part: `warp` computes its offset FROM a child expression, so the
 * offset varies per pixel. ox/oy are therefore ARRAYS here, where the scalar version passes
 * two numbers. Getting that wrong would produce plausible images and wrong descriptors —
 * exactly the kind of silent, self-consistent error this project keeps getting caught by.
 */
(function (root) {
  'use strict';

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
  const clamp = v => v < -1 ? -1 : v > 1 ? 1 : v;

  // Scratch-buffer pool. Recursion needs temporaries; allocating a Float64Array per node
  // would hand back in GC pressure most of what vectorising wins.
  function Pool(n) {
    this.n = n; this.free = []; this.made = 0;
  }
  Pool.prototype.take = function () {
    if (this.free.length) return this.free.pop();
    this.made++; return new Float64Array(this.n);
  };
  Pool.prototype.give = function (a) { this.free.push(a); };

  /* Evaluate node `nd` across all lanes.
   * xs, ys, oxs, oys, out are all Float64Array(N). Writes results into `out`. */
  function evVec(nd, xs, ys, t, seed, oxs, oys, out, pool) {
    const N = out.length;
    switch (nd.t) {
      case 'x': for (let i = 0; i < N; i++) out[i] = clamp(xs[i] + oxs[i]); return out;
      case 'y': for (let i = 0; i < N; i++) out[i] = clamp(ys[i] + oys[i]); return out;
      case 't': { const s = Math.sin(t); for (let i = 0; i < N; i++) out[i] = s; return out; }
      case 'X': for (let i = 0; i < N; i++) out[i] = Math.sin((xs[i] + oxs[i]) * 6.2831); return out;
      case 'Y': for (let i = 0; i < N; i++) out[i] = Math.sin((ys[i] + oys[i]) * 6.2831); return out;
      case 'R': for (let i = 0; i < N; i++) {
          const dx = xs[i] + oxs[i], dy = ys[i] + oys[i];
          out[i] = clamp(Math.sqrt(dx * dx + dy * dy) * 2 - 1);
        } return out;
      case 'A': for (let i = 0; i < N; i++) out[i] = Math.atan2(ys[i] + oys[i], xs[i] + oxs[i]) / Math.PI; return out;
      case 'n': for (let i = 0; i < N; i++) out[i] = noise2((xs[i] + oxs[i]) * 3 + t * 0.2, (ys[i] + oys[i]) * 3, seed); return out;
      case 'c': { const v = nd.v; for (let i = 0; i < N; i++) out[i] = v; return out; }
      case 'f': {
        const k = nd.kids, f = nd.f;
        // unary: evaluate child into `out`, then map in place
        if (f === 'sin' || f === 'cos' || f === 'abs' || f === 'tri') {
          evVec(k[0], xs, ys, t, seed, oxs, oys, out, pool);
          if (f === 'sin') { for (let i = 0; i < N; i++) out[i] = Math.sin(out[i] * Math.PI); }
          else if (f === 'cos') { for (let i = 0; i < N; i++) out[i] = Math.cos(out[i] * Math.PI); }
          else if (f === 'abs') { for (let i = 0; i < N; i++) out[i] = Math.abs(out[i]) * 2 - 1; }
          else { for (let i = 0; i < N; i++) { const a = (out[i] + 1) % 2; out[i] = (a < 1 ? a : 2 - a) * 2 - 1; } }
          return out;
        }
        // WARP: offset is itself an expression, so it differs per pixel — ox/oy must be
        // per-lane arrays. This is the case a scalar-minded port gets wrong silently.
        if (f === 'warp') {
          const w = pool.take();
          evVec(k[1], xs, ys, t, seed, oxs, oys, w, pool);
          const nox = pool.take(), noy = pool.take();
          for (let i = 0; i < N; i++) { const ww = w[i] * 0.5; nox[i] = oxs[i] + ww; noy[i] = oys[i] + ww * 0.7; }
          evVec(k[0], xs, ys, t, seed, nox, noy, out, pool);
          pool.give(w); pool.give(nox); pool.give(noy);
          return out;
        }
        // binary: left into `out`, right into a scratch lane
        const b = pool.take();
        evVec(k[0], xs, ys, t, seed, oxs, oys, out, pool);
        evVec(k[1], xs, ys, t, seed, oxs, oys, b, pool);
        switch (f) {
          case 'mul': for (let i = 0; i < N; i++) out[i] = out[i] * b[i]; break;
          case 'add': for (let i = 0; i < N; i++) out[i] = clamp(out[i] + b[i]); break;
          case 'sub': for (let i = 0; i < N; i++) out[i] = clamp(out[i] - b[i]); break;
          // note: scalar version returns 0 when the divisor is 0, and evaluates the
          // divisor FIRST. Same result per lane either way since both are pure.
          case 'mod': for (let i = 0; i < N; i++) out[i] = b[i] === 0 ? 0 : out[i] % b[i]; break;
          case 'wav': for (let i = 0; i < N; i++) out[i] = Math.sin((out[i] + b[i]) * Math.PI * 2); break;
          case 'min': for (let i = 0; i < N; i++) out[i] = Math.min(out[i], b[i]); break;
          case 'max': for (let i = 0; i < N; i++) out[i] = Math.max(out[i], b[i]); break;
          default: for (let i = 0; i < N; i++) out[i] = 0; break;
        }
        pool.give(b);
        return out;
      }
    }
    for (let i = 0; i < N; i++) out[i] = 0;
    return out;
  }

  /* Build the reusable lane context for a fixed grid. */
  function grid(RW, RH) {
    const N = RW * RH;
    const xs = new Float64Array(N), ys = new Float64Array(N);
    const zx = new Float64Array(N), zy = new Float64Array(N);   // zero offsets
    for (let py = 0; py < RH; py++) {
      const y = (py / RH) * 2 - 1;
      for (let px = 0; px < RW; px++) { const i = py * RW + px; xs[i] = (px / RW) * 2 - 1; ys[i] = y; }
    }
    return { N, RW, RH, xs, ys, zx, zy, pool: new Pool(N),
             h: new Float64Array(N), s: new Float64Array(N), v: new Float64Array(N) };
  }

  /* Evaluate all three channels of a genome over the grid. */
  function channels(g, gm, t) {
    evVec(gm.h, g.xs, g.ys, t, gm.seed, g.zx, g.zy, g.h, g.pool);
    evVec(gm.s, g.xs, g.ys, t, gm.seed, g.zx, g.zy, g.s, g.pool);
    evVec(gm.v, g.xs, g.ys, t, gm.seed, g.zx, g.zy, g.v, g.pool);
    return g;
  }

  const api = { evVec, grid, channels, noise2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GenomeVec = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
