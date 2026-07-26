// PAIRED-SEED mutual invasibility. The fix for yesterday's non-replication: the effect
// (~0.002) was smaller than run-to-run variance driven by random blob placement. So here
// every condition sees the SAME sequence of placements — a seeded PRNG reset identically
// per replicate — and only the self-inhibition strength changes. This turns "is 0.15
// special" from a noisy single-shot into a paired comparison where the placement noise
// cancels. Same trick as a paired t-test: remove the nuisance variable by holding it fixed.
//
// argv: [replicates]
'use strict';
const REPS = parseInt(process.argv[2] || '8', 10);
const W = 72, H = 72, N = W * H;
const R = 9, dt = 0.15, sigG = 0.017, dd = 0.35, flowCap = 0.9;
const MU_A = 0.13, MU_B = 0.18;

// seeded PRNG (mulberry32) — reproducible placements, no Math.random (also banned in some ctx)
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function kernel(INHIB) {
  const K = []; let pos = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const r = Math.hypot(dx, dy) / R; if (r > 1 || r === 0) continue;
    const exc = Math.exp(-((r - 0.5) ** 2) / (2 * 0.15 * 0.15));
    const inh = INHIB > 0 ? INHIB * Math.exp(-((r - 0.85) ** 2) / (2 * 0.10 * 0.10)) : 0;
    K.push(dx, dy, exc - inh); if (exc > 0) pos += exc;
  }
  for (let i = 2; i < K.length; i += 3) K[i] /= pos;
  return { K: new Float32Array(K), KN: K.length / 3 };
}

// one invasion assay with an EXPLICIT placement script so it can be replayed identically
function invasion(resident, invader, INHIB, placements, propagule) {
  const { K, KN } = kernel(INHIB);
  let A = new Float32Array(N), MU = new Float32Array(N).fill(resident);
  let An = new Float32Array(N), MUn = new Float32Array(N);
  const P = new Float32Array(N), U = new Float32Array(N), best = new Float32Array(N);
  const idx = (x, y) => (((y % H) + H) % H) * W + (((x % W) + W) % W);
  const blob = (cx, cy, mu, rad, amp) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const i = idx(cx + dx, cy + dy); A[i] = amp; MU[i] = mu;
    }
  };
  const step = (defMu) => {
    P.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0; for (let q = 0; q < KN; q++) s += K[q * 3 + 2] * A[idx(x + K[q * 3], y + K[q * 3 + 1])];
      P[y * W + x] = s;
    }
    for (let i = 0; i < N; i++) { const d = P[i] - MU[i]; U[i] = 2 * Math.exp(-(d * d) / (2 * sigG * sigG)) - 1; }
    An.fill(0); MUn.fill(0); best.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = A[i]; if (a <= 1e-7) continue;
      const gUx = (U[idx(x + 1, y)] - U[idx(x - 1, y)]) * 0.5, gUy = (U[idx(x, y + 1)] - U[idx(x, y - 1)]) * 0.5;
      const gAx = (A[idx(x + 1, y)] - A[idx(x - 1, y)]) * 0.5, gAy = (A[idx(x, y + 1)] - A[idx(x, y - 1)]) * 0.5;
      let fx = gUx - dd * gAx, fy = gUy - dd * gAy;
      const mag = Math.hypot(fx, fy); if (mag > flowCap) { fx *= flowCap / mag; fy *= flowCap / mag; }
      const tx = x + dt * fx * R, ty = y + dt * fy * R;
      const x0 = Math.floor(tx), y0 = Math.floor(ty), rx = tx - x0, ry = ty - y0, mu = MU[i];
      const put = (gx, gy, w) => { if (w <= 0) return; const j = idx(gx, gy), c = a * w; An[j] += c; if (c > best[j]) { best[j] = c; MUn[j] = mu; } };
      put(x0, y0, (1 - rx) * (1 - ry)); put(x0 + 1, y0, rx * (1 - ry)); put(x0, y0 + 1, (1 - rx) * ry); put(x0 + 1, y0 + 1, rx * ry);
    }
    for (let i = 0; i < N; i++) if (An[i] <= 1e-9) MUn[i] = defMu;
    A.set(An); MU.set(MUn);
  };
  const shareB = () => { const mid = (resident + invader) / 2; let b = 0; for (let i = 0; i < N; i++) { if (A[i] <= 0.02) continue; if (invader > resident ? MU[i] > mid : MU[i] < mid) b += A[i]; } return b; };

  // resident to equilibrium, using the SAME placement script for every condition
  for (const [cx, cy, amp] of placements) blob(cx, cy, resident, 8, amp);
  for (let s = 0; s < 180; s++) step(resident);
  // introduce invader as one small propagule at a fixed spot
  blob(propagule[0], propagule[1], invader, 3, 0.9);
  const s0 = shareB(); if (s0 <= 0) return NaN;
  const T = 120; for (let s = 0; s < T; s++) step(resident);
  return Math.log(Math.max(shareB(), 1e-6) / s0) / T;
}

const strengths = (process.argv[3]||'0,0.15').split(',').map(Number);
const agg = {}; strengths.forEach(s => agg[s] = { both: 0, ab: [], ba: [] });

for (let rep = 0; rep < REPS; rep++) {
  // build ONE placement script per replicate; every strength replays it exactly
  const r = rng(1000 + (rep + (parseInt(process.argv[4]||'0',10))) * 7);
  const placements = [];
  for (let n = 0; n < 6; n++) placements.push([(r() * W) | 0, (r() * H) | 0, 0.6 + r() * 0.25]);
  const propagule = [(r() * W) | 0, (r() * H) | 0];

  for (const S of strengths) {
    const ab = invasion(MU_A, MU_B, S, placements, propagule);   // B invades A
    const ba = invasion(MU_B, MU_A, S, placements, propagule);   // A invades B
    agg[S].ab.push(ab); agg[S].ba.push(ba);
    if (ab > 0 && ba > 0) agg[S].both++;
    console.error(`rep${rep} inhib=${S} B->A ${Number(ab).toFixed(4)} A->B ${Number(ba).toFixed(4)}${(ab>0&&ba>0)?'  COEXIST':''}`);
  }
}

const mean = a => { const v = a.filter(x => !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
const sd = a => { const v = a.filter(x => !isNaN(x)); if (v.length < 2) return NaN; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
console.log(`paired-seed invasion, ${REPS} replicates, same placements across strengths`);
console.log('inhib | B_inv_A mean±sd     | A_inv_B mean±sd     | coexist runs');
for (const S of strengths) {
  const a = agg[S];
  console.log(
    `${S.toFixed(2).padStart(5)} | ${mean(a.ab).toFixed(4)} ± ${(sd(a.ab)||0).toFixed(4)} | ${mean(a.ba).toFixed(4)} ± ${(sd(a.ba)||0).toFixed(4)} | ${a.both}/${REPS}`
  );
}
