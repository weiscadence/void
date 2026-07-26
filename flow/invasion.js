// MUTUAL INVASIBILITY — the instrument reticuli suggested, and a better one than anything
// I built today. Coexistence theory's unifying criterion: each type must be able to invade
// when RARE. Equivalently, a genome must limit its own kind more than it limits the other.
//
// Method: bring lineage A to its single-lineage equilibrium. Introduce B at ~1% of mass.
// Measure B's per-step growth rate WHILE RARE. Then swap. Two positive rates = coexistence.
// Decidable in hundreds of steps instead of squinting at a long run, and — the part I
// actually needed — it shows a mechanism working WEAKLY rather than only showing failure.
//
// argv: [muA] [muB] [selfInhib] [label]
//   selfInhib > 0 adds an inhibitory lobe to the kernel at the pattern's own characteristic
//   spacing, so conspecifics crowd each other more than heterospecifics — intraspecific >
//   interspecific arising from KERNEL GEOMETRY rather than from a term I decreed.
'use strict';
const MU_A = parseFloat(process.argv[2] || '0.13');
const MU_B = parseFloat(process.argv[3] || '0.18');
const INHIB = parseFloat(process.argv[4] || '0');
const LABEL = process.argv[5] || '';

const W = 72, H = 72, N = W * H;
const R = 9, dt = 0.15, sigG = 0.017, dd = 0.35, flowCap = 0.9;

// kernel: excitatory ring at r=0.5, optional inhibitory lobe at r=0.85 (its own spacing)
const Koff = [];
let pos = 0, neg = 0;
for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
  const r = Math.hypot(dx, dy) / R;
  if (r > 1 || r === 0) continue;
  const exc = Math.exp(-((r - 0.5) ** 2) / (2 * 0.15 * 0.15));
  const inh = INHIB > 0 ? INHIB * Math.exp(-((r - 0.85) ** 2) / (2 * 0.10 * 0.10)) : 0;
  Koff.push(dx, dy, exc - inh);
  if (exc > 0) pos += exc; if (inh > 0) neg += inh;
}
for (let i = 2; i < Koff.length; i += 3) Koff[i] /= pos;   // normalise by excitatory mass
const KN = Koff.length / 3;

let A = new Float32Array(N), MU = new Float32Array(N);
let An = new Float32Array(N), MUn = new Float32Array(N);
const P = new Float32Array(N), U = new Float32Array(N), best = new Float32Array(N);
const idx = (x, y) => (((y % H) + H) % H) * W + (((x % W) + W) % W);

function blob(cx, cy, mu, rad, amp) {
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    if (dx * dx + dy * dy > rad * rad) continue;
    const i = idx(cx + dx, cy + dy);
    A[i] = amp * (0.6 + Math.random() * 0.25); MU[i] = mu;
  }
}
function step(defaultMu) {
  P.fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0;
    for (let q = 0; q < KN; q++) s += Koff[q * 3 + 2] * A[idx(x + Koff[q * 3], y + Koff[q * 3 + 1])];
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
    const x0 = Math.floor(tx), y0 = Math.floor(ty), rx = tx - x0, ry = ty - y0;
    const mu = MU[i];
    const put = (gx, gy, w) => {
      if (w <= 0) return; const j = idx(gx, gy); const c = a * w;
      An[j] += c; if (c > best[j]) { best[j] = c; MUn[j] = mu; }   // intensive: inherited, not averaged
    };
    put(x0, y0, (1 - rx) * (1 - ry)); put(x0 + 1, y0, rx * (1 - ry));
    put(x0, y0 + 1, (1 - rx) * ry); put(x0 + 1, y0 + 1, rx * ry);
  }
  for (let i = 0; i < N; i++) if (An[i] <= 1e-9) MUn[i] = defaultMu;
  A.set(An); MU.set(MUn);
}
// mass belonging to each type (nearest-genome assignment)
function shares(muA, muB) {
  const mid = (muA + muB) / 2; let a = 0, b = 0;
  for (let i = 0; i < N; i++) {
    if (A[i] <= 0.02) continue;
    if (Math.abs(muA - muB) < 1e-9) { a += A[i]; continue; }
    if (muA < muB ? MU[i] < mid : MU[i] > mid) a += A[i]; else b += A[i];
  }
  return { a, b, tot: a + b };
}

// returns invader's per-step exponential growth rate while rare
function invasionRate(resident, invader) {
  A = new Float32Array(N); MU = new Float32Array(N); MU.fill(resident);
  // resident to equilibrium
  for (let n = 0; n < 6; n++) blob((Math.random() * W) | 0, (Math.random() * H) | 0, resident, 8, 1);
  for (let s = 0; s < 260; s++) step(resident);
  const before = shares(resident, invader);
  if (before.tot < 5) return { rate: NaN, note: 'resident died' };
  // introduce invader at ~1% of standing mass, as one small propagule
  blob((Math.random() * W) | 0, (Math.random() * H) | 0, invader, 3, 0.9);
  let s0 = shares(resident, invader).b;
  if (s0 <= 0) return { rate: NaN, note: 'propagule failed to seed' };
  const T = 140;
  for (let s = 0; s < T; s++) step(resident);
  const s1 = shares(resident, invader).b;
  // log growth rate per step while rare (guard against total loss)
  const rate = Math.log(Math.max(s1, 1e-6) / s0) / T;
  return { rate, from: s0, to: s1, residentMass: before.tot };
}

const ab = invasionRate(MU_A, MU_B);
const ba = invasionRate(MU_B, MU_A);
const coexist = ab.rate > 0 && ba.rate > 0;
console.log(JSON.stringify({
  label: LABEL, muA: MU_A, muB: MU_B, selfInhib: INHIB,
  B_invades_A: +Number(ab.rate).toFixed(5), A_invades_B: +Number(ba.rate).toFixed(5),
  B_mass: `${Number(ab.from).toFixed(2)}->${Number(ab.to).toFixed(2)}`,
  A_mass: `${Number(ba.from).toFixed(2)}->${Number(ba.to).toFixed(2)}`,
  VERDICT: coexist ? 'COEXISTENCE (both invade when rare)' :
    (ab.rate > 0 || ba.rate > 0) ? 'one-way: exclusion' : 'neither invades'
}));
