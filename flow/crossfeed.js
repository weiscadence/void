// CROSS-FEEDING — Jiggy's question, 2026-07-19 23:00: "how mushrooms eat decay?"
//
// He was right and the earlier experiment was the weak version of the question.
//
// invasion_paired.js pitted two types against each other for THE SAME resource and used
// self-inhibition to stop either winning. It failed: 1 coexistence event in 48 conditions,
// no dose-response. The theory says it had to fail. Competitive exclusion (Tilman's R*):
// **the number of coexisting types is bounded by the number of limiting factors.** That
// world had exactly one — kernel potential. One factor, one winner, and no inhibition
// strength can rescue that. Self-inhibition was an attempt to FAKE a second factor.
//
// Decay-eating is a REAL second factor. Producers grow on the kernel potential and leak
// detritus where they sit. Decomposers cannot read the potential at all — they grow only
// on detritus, which exists only because producers made it. Two limiting factors, so the
// theorem now permits two types. This tests whether that permission is actually taken.
//
// WHY THE TEST IS ASYMMETRIC, and why that is not a fudge. Mutual invasibility is the
// right criterion for two COMPETITORS. This relationship is obligate: a decomposer in a
// world with no producers starves by construction, so "can the producer invade a
// decomposer-only world" is not a meaningful question — the decomposer-only world does
// not exist. The honest criteria here are:
//   (1) INVASION  — introduced rare into a producer-only equilibrium, does the decomposer grow?
//   (2) PERSISTENCE — after a long run, do BOTH still hold non-trivial mass?
// Reporting (1) alone would be the same error as reporting win rate without expectancy:
// a thing can grow while rare and still crash the system it depends on.
//
// argv: [replicates] [leak] — leak is detritus produced per unit producer mass per step.
'use strict';
const REPS = parseInt(process.argv[2] || '6', 10);
const LEAKS = (process.argv[3] || '0,0.004,0.012').split(',').map(Number);

const W = 72, H = 72, N = W * H;
const R = 9, dt = 0.15, sigG = 0.017, dd = 0.35, flowCap = 0.9;
const MU_P = 0.15;          // producer growth centre, read against kernel potential
const MU_D = 0.15;          // decomposer growth centre, read against DETRITUS
const D_DECAY = 0.02;       // detritus rots if nobody eats it
const D_EAT = 0.6;          // fraction of local detritus consumed by decomposer growth

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const Koff = []; let Ksum = 0;
for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
  const r = Math.hypot(dx, dy) / R; if (r > 1 || r === 0) continue;
  const b = Math.exp(-((r - 0.5) ** 2) / (2 * 0.15 * 0.15));
  Koff.push(dx, dy, b); Ksum += b;
}
for (let i = 2; i < Koff.length; i += 3) Koff[i] /= Ksum;
const K = new Float32Array(Koff), KN = Koff.length / 3;

function run(leak, placements, propagule, STEPS_EQ, STEPS_RUN) {
  const A = new Float32Array(N);      // mass
  const MU = new Float32Array(N).fill(MU_P);
  const ROLE = new Float32Array(N);  // 0 = producer, 1 = decomposer. Rides with the mass.
  const D = new Float32Array(N);     // detritus
  const An = new Float32Array(N), MUn = new Float32Array(N), ROn = new Float32Array(N);
  const P = new Float32Array(N), U = new Float32Array(N), best = new Float32Array(N);
  const idx = (x, y) => (((y % H) + H) % H) * W + (((x % W) + W) % W);

  const blob = (cx, cy, role, rad, amp) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const i = idx(cx + dx, cy + dy); A[i] = amp; ROLE[i] = role; MU[i] = role ? MU_D : MU_P;
    }
  };

  function step() {
    // kernel potential — the producers' resource
    P.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0; for (let q = 0; q < KN; q++) s += K[q * 3 + 2] * A[idx(x + K[q * 3], y + K[q * 3 + 1])];
      P[y * W + x] = s;
    }
    // growth: producers read P, decomposers read DETRITUS. That is the whole idea —
    // they are not looking at the same thing, so they are not competing for the same thing.
    for (let i = 0; i < N; i++) {
      const src = ROLE[i] > 0.5 ? D[i] : P[i];
      const d = src - MU[i];
      U[i] = 2 * Math.exp(-(d * d) / (2 * sigG * sigG)) - 1;
    }
    // detritus: produced under producer mass, eaten under decomposer mass, rots otherwise
    for (let i = 0; i < N; i++) {
      if (A[i] > 1e-7 && ROLE[i] <= 0.5) D[i] += leak * A[i];
      if (A[i] > 1e-7 && ROLE[i] > 0.5) D[i] *= (1 - D_EAT * dt);
      D[i] *= (1 - D_DECAY);
    }
    // advection with winner-takes-all inheritance of BOTH carried fields
    An.fill(0); MUn.fill(0); ROn.fill(0); best.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = A[i]; if (a <= 1e-7) continue;
      const gUx = (U[idx(x + 1, y)] - U[idx(x - 1, y)]) * 0.5, gUy = (U[idx(x, y + 1)] - U[idx(x, y - 1)]) * 0.5;
      const gAx = (A[idx(x + 1, y)] - A[idx(x - 1, y)]) * 0.5, gAy = (A[idx(x, y + 1)] - A[idx(x, y - 1)]) * 0.5;
      let fx = gUx - dd * gAx, fy = gUy - dd * gAy;
      const mag = Math.hypot(fx, fy); if (mag > flowCap) { fx *= flowCap / mag; fy *= flowCap / mag; }
      const tx = x + dt * fx * R, ty = y + dt * fy * R;
      const x0 = Math.floor(tx), y0 = Math.floor(ty), rx = tx - x0, ry = ty - y0;
      const mu = MU[i], ro = ROLE[i];
      const put = (gx, gy, w) => {
        if (w <= 0) return; const j = idx(gx, gy), c = a * w;
        An[j] += c; if (c > best[j]) { best[j] = c; MUn[j] = mu; ROn[j] = ro; }
      };
      put(x0, y0, (1 - rx) * (1 - ry)); put(x0 + 1, y0, rx * (1 - ry));
      put(x0, y0 + 1, (1 - rx) * ry); put(x0 + 1, y0 + 1, rx * ry);
    }
    A.set(An); MU.set(MUn); ROLE.set(ROn);
  }

  const massOf = role => { let m = 0; for (let i = 0; i < N; i++) if (A[i] > 0.02 && (ROLE[i] > 0.5) === role) m += A[i]; return m; };

  for (const [cx, cy, amp] of placements) blob(cx, cy, 0, 8, amp);
  for (let s = 0; s < STEPS_EQ; s++) step();
  const prodBefore = massOf(false);

  blob(propagule[0], propagule[1], 1, 3, 0.9);      // decomposer introduced rare
  const d0 = massOf(true);
  if (d0 <= 0) return { grow: NaN, dEnd: 0, pEnd: prodBefore, both: false };
  for (let s = 0; s < STEPS_RUN; s++) step();
  const dEnd = massOf(true), pEnd = massOf(false);
  return {
    grow: Math.log(Math.max(dEnd, 1e-6) / d0) / STEPS_RUN,   // growth while rare
    dEnd, pEnd, prodBefore,
    both: dEnd > 0.05 * (dEnd + pEnd) && pEnd > 0.05 * (dEnd + pEnd),   // persistence
  };
}

const agg = {}; LEAKS.forEach(l => agg[l] = { grow: [], both: 0, ratios: [] });
for (let rep = 0; rep < REPS; rep++) {
  const r = rng(2000 + rep * 13);
  const placements = []; for (let n = 0; n < 6; n++) placements.push([(r() * W) | 0, (r() * H) | 0, 0.6 + r() * 0.25]);
  const propagule = [(r() * W) | 0, (r() * H) | 0];
  for (const L of LEAKS) {
    const o = run(L, placements, propagule, 180, 200);
    agg[L].grow.push(o.grow); if (o.both) agg[L].both++;
    const tot = o.dEnd + o.pEnd;
    agg[L].ratios.push(tot > 0 ? o.dEnd / tot : 0);
    console.error(`rep${rep} leak=${L} grow=${Number(o.grow).toFixed(4)} decomp=${o.dEnd.toFixed(1)} prod=${o.pEnd.toFixed(1)}${o.both ? '  BOTH PERSIST' : ''}`);
  }
}
const mean = a => { const v = a.filter(x => !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
const sd = a => { const v = a.filter(x => !isNaN(x)); if (v.length < 2) return NaN; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
console.log(`\ncross-feeding, ${REPS} replicates, paired placements across leak rates`);
console.log('leak  | decomposer growth-while-rare | final decomposer share | both persist');
for (const L of LEAKS) {
  const a = agg[L];
  console.log(`${String(L).padStart(5)} | ${mean(a.grow).toFixed(4)} ± ${(sd(a.grow) || 0).toFixed(4)}        | ${(mean(a.ratios) * 100).toFixed(1)}%                  | ${a.both}/${REPS}`);
}
console.log('\nleak=0 is the CONTROL: no detritus is produced, so the decomposer must fail.');
console.log('If it "succeeds" at leak=0, the test is measuring something other than cross-feeding.');
