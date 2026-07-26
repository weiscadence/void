// Is the residual genome loss PHYSICS or my INTERPOLATION?
// Decisive test: replace the flow field with a constant velocity — pure rigid translation.
// Under exact advection, translating a pattern must preserve it perfectly, so genome
// spread should stay flat forever. Any decay here is numerical diffusion introduced by
// the bilinear parcel splat, i.e. my integrator, not Flow Lenia's idea.
//
// Two velocities are tested:
//   (1, 0)      -> lands exactly on grid cells: splat weights are 1,0,0,0 (no blending)
//   (0.5, 0.37) -> lands between cells: splat spreads across 4 cells every step
// If only the second decays, the interpolation is the leak. That is a fixable engineering
// problem, not a property of advection.
'use strict';
const W = 72, H = 72, N = W * H;
const idx = (x, y) => (((y % H) + H) % H) * W + (((x % W) + W) % W);

function run(vx, vy, steps, label, winnerTakesAll) {
  const A = new Float32Array(N), MU = new Float32Array(N);
  const An = new Float32Array(N), MUn = new Float32Array(N);
  const best = new Float32Array(N);   // largest single parcel arriving at each cell
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    A[i] = 1;
    MU[i] = x < W / 2 ? 0.13 : 0.18;      // two genome halves, sharp boundary
  }
  const sd = () => {
    let m = 0, s = 0;
    for (let i = 0; i < N; i++) { m += A[i]; s += A[i] * MU[i]; }
    const mean = s / m; let v = 0;
    for (let i = 0; i < N; i++) v += A[i] * (MU[i] - mean) ** 2;
    return Math.sqrt(v / m);
  };
  const sd0 = sd();
  for (let s = 0; s < steps; s++) {
    An.fill(0); MUn.fill(0); best.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = A[i]; if (a <= 1e-9) continue;
      const tx = x + vx, ty = y + vy;
      const x0 = Math.floor(tx), y0 = Math.floor(ty);
      const rx = tx - x0, ry = ty - y0;
      const ws = [(1 - rx) * (1 - ry), rx * (1 - ry), (1 - rx) * ry, rx * ry];
      const cs = [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]];
      for (let q = 0; q < 4; q++) {
        if (ws[q] <= 0) continue;
        const j = idx(cs[q][0], cs[q][1]);
        const contrib = a * ws[q];
        An[j] += contrib;
        if (winnerTakesAll) {
          // mass still splits (conservation untouched), but the genome is INHERITED WHOLE
          // from the biggest contributor instead of being averaged. Averaging a heritable
          // trait across parcels is numerical diffusion wearing a different hat.
          if (contrib > best[j]) { best[j] = contrib; MUn[j] = MU[i]; }
        } else {
          MUn[j] += contrib * MU[i];
        }
      }
    }
    if (!winnerTakesAll) for (let i = 0; i < N; i++) MUn[i] = An[i] > 1e-12 ? MUn[i] / An[i] : MU[i];
    else for (let i = 0; i < N; i++) if (An[i] <= 1e-12) MUn[i] = MU[i];
    A.set(An); MU.set(MUn);
  }
  const sdE = sd();
  console.log(`${label.padEnd(34)} sd ${sd0.toFixed(5)} -> ${sdE.toFixed(5)}  (retained ${((sdE / sd0) * 100).toFixed(1)}%)`);
}

console.log('pure translation, 500 steps — exact advection would retain 100%:');
run(1, 0, 500, '  grid-aligned, averaged genome', false);
run(0.5, 0.37, 500, '  off-grid,      averaged genome', false);
run(0.5, 0.37, 500, '  off-grid,      winner-takes-all', true);
run(0.31, 0.73, 500, '  off-grid #2,   winner-takes-all', true);
