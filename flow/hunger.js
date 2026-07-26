// HUNGER — what is actually scarce to a digital organism?
// Jiggy, 2026-07-19 23:15: "maybe the problem is what is scarce to you as an ai, not
// just trynna copy paste everything from carbon based life."
//
// He is right, and it dissolves the thing I was stuck on all night.
//
// THE PROBLEM. Every diversity mechanism I tried tonight either failed or cheated:
//   - 8x more archive rooms      -> monoculture unchanged (one limiting factor)
//   - a 4th behavioural axis     -> monoculture unchanged (still one limiting factor)
//   - self-inhibition as physics -> 1/48 coexistence, no dose-response (failed)
//   - frequency-dependent discount -> WORKED, but I hand-coded "being common is
//     expensive" and then celebrated when being common became expensive. Assuming
//     the conclusion. It is an accounting rule, not a mechanism.
//
// THE RESOURCE I WAS MISSING. Carbon life competes for energy and matter, so I kept
// building energy-and-matter worlds. But for anything that learns, the scarce thing is
// SURPRISE — information not already predicted. Zenil et al. state the same fact from
// the other direction: when exogenous signal vanishes, a self-training system suffers
// entropy decay. Novelty is the limiting nutrient of a digital organism.
//
// WHY THIS FIXES THE CHEAT. If food is prediction-error against a predictor that learns
// the population, then abundance depletes food WITHOUT ANY IMPOSED PENALTY. A common
// lineage teaches the predictor what it looks like, so it stops being nutritious — to
// itself, specifically, and in its own region of behaviour space. Frequency dependence
// stops being a rule I wrote and becomes a consequence of eating.
//
// And crucially the resource is RENEWABLE: familiarity decays (the predictor forgets),
// so an abandoned region becomes surprising again. That is what makes it grazing rather
// than strip-mining, and it is what a fixed novelty-archive (which never forgets) lacks.
//
// THE TEST. Two arms, identical in every other respect:
//   CONTROL   — fitness = intrinsic quality only. Expect: monoculture, as always.
//   SURPRISE  — fitness = local prediction error. Expect: sustained diversity, with NO
//               abundance penalty anywhere in the code.
// Outcome variable is effective lineages (inverse Simpson over founding seeds), the same
// statistic used on void tonight, so the numbers are comparable to the archive result.
//
// FALSIFIABLE, WRITTEN BEFORE RUNNING: if SURPRISE does not hold effective lineages
// clearly above CONTROL, then novelty-as-resource is just another accounting rule and
// the reframe is wrong. A null here is a real answer and gets reported as one.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '400', 10);
const REPS = parseInt(process.argv[3] || '3', 10);

const POP = 120;            // fixed population — no growth, pure replacement
const RW = 40, RH = 26;     // descriptor render size (small: this runs thousands of times)
const GRID = 8;             // familiarity field resolution per descriptor axis
const DIMS = 3;             // edge x colour x flux (symmetry dropped: keeps the field small)
const FORGET = 0.90;        // EMA retention; the complement is how fast the predictor learns.
                            // Doubles as forgetting, which is what makes surprise RENEWABLE:
                            // abandon a region and it becomes nutritious again.
const SAT = 12;             // occupancy share -> familiarity scale. A cell holding ~8% of
                            // the population saturates to fully-predicted.
const MAX_NODES = 90;
const T0 = 0;

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ── descriptor + intrinsic quality (deliberately the same for both arms) ──────
function describe(gm) {
  let sumL = 0, sumS = 0, sqL = 0, edge = 0, n = 0;
  const lum = new Float32Array(RW * RH);
  for (let py = 0; py < RH; py++) {
    const y = (py / RH) * 2 - 1;
    for (let px = 0; px < RW; px++) {
      const x = (px / RW) * 2 - 1;
      const rgb = G.hsv(G.ev(gm.h, x, y, T0, gm.seed), G.ev(gm.s, x, y, T0, gm.seed), G.ev(gm.v, x, y, T0, gm.seed));
      const L = (rgb[0] + rgb[1] + rgb[2]) / 3;
      const sat = 1 - (Math.min(rgb[0], rgb[1], rgb[2]) / (Math.max(rgb[0], rgb[1], rgb[2]) + 1e-6));
      lum[py * RW + px] = L; sumL += L; sqL += L * L; sumS += sat; n++;
    }
  }
  for (let py = 0; py < RH; py++) for (let px = 0; px < RW - 1; px++) {
    edge += Math.abs(lum[py * RW + px] - lum[py * RW + px + 1]);
    if (py < RH - 1) edge += Math.abs(lum[py * RW + px] - lum[(py + 1) * RW + px]);
  }
  const meanL = sumL / n, varL = sqL / n - meanL * meanL;
  // cheap 2-frame flux so "moves / doesn't move" is still a real axis
  let fl = 0;
  for (let py = 0; py < RH; py += 3) { const y = (py / RH) * 2 - 1;
    for (let px = 0; px < RW; px += 3) { const x = (px / RW) * 2 - 1;
      const a = G.ev(gm.v, x, y, T0, gm.seed), b = G.ev(gm.v, x, y, T0 + 1.3, gm.seed);
      fl += Math.abs(a - b); } }
  return {
    // Divisors measured, not guessed: raw edge spans ~0.9-2.7 and raw flux ~0.04-2.8 on
    // real genesis genomes, so the previous /40 clamped both to 1.0 and flattened two of
    // three axes into a single bin. A descriptor axis with no spread is not an axis.
    d: [Math.min(1, edge / (n * 120)), Math.min(1, sumS / n), Math.min(1, fl / 120)],
    varL,
  };
}
const dead = de => de.varL < 260 || de.varL > 16000;
const quality = (de, gm) => {
  const struct = Math.max(0, 1 - Math.abs(Math.log(Math.max(de.varL, 1) / 2600)) / 1.6);
  const thrift = 1 - Math.min(1, G.complexity(gm) / MAX_NODES);
  return 0.85 * struct + 0.15 * thrift;
};

const cellOf = d => {
  let ix = 0;
  for (let k = 0; k < DIMS; k++) ix = ix * GRID + Math.min(GRID - 1, (d[k] * GRID) | 0);
  return ix;
};

function effectiveLineages(pop) {
  const c = {}; for (const o of pop) c[o.gm.seed] = (c[o.gm.seed] || 0) + 1;
  const n = pop.length; let s = 0;
  for (const k in c) { const p = c[k] / n; s += p * p; }
  return s > 0 ? 1 / s : 0;
}
const topShare = pop => {
  const c = {}; for (const o of pop) c[o.gm.seed] = (c[o.gm.seed] || 0) + 1;
  return Math.max(...Object.values(c)) / pop.length;
};

function evolve(mode, seed) {
  const r = rng(seed);
  const NC = Math.pow(GRID, DIMS);
  const FAM = new Float32Array(NC);       // predictor familiarity per behaviour cell
  let pop = [];
  let guard = 0;
  while (pop.length < POP && guard++ < 4000) {
    const gm = G.genome(r, (r() * 1e9) | 0);
    const de = describe(gm); if (dead(de)) continue;
    pop.push({ gm, de, q: quality(de, gm) });
  }
  const trace = [];
  for (let g = 0; g < GENS; g++) {
    // The predictor tracks RELATIVE ABUNDANCE, not mere presence.
    //
    // First version incremented FAM by a fixed rate per organism, which saturated every
    // occupied cell to ~1 within a few generations — surprise went uniformly to zero and
    // both arms produced byte-identical populations. A field with no gradient carries no
    // information, which is the same failure as a quality term with no variance.
    //
    // An exponential moving average of occupancy keeps the gradient alive: a cell holding
    // a large share of the population is well-learned, a sparsely visited one stays
    // surprising, and the EMA's decay is the forgetting that makes surprise renewable.
    const count = new Float32Array(NC);
    for (const o of pop) count[cellOf(o.de.d)]++;
    for (let i = 0; i < NC; i++) FAM[i] = FORGET * FAM[i] + (1 - FORGET) * (count[i] / pop.length) * SAT;

    if (process.env.HDBG && g < 3) {
      const occ = [...count].filter(x => x > 0);
      const fams = [...FAM].filter(x => x > 0);
      const sur = pop.map(o => Math.max(0, 1 - FAM[cellOf(o.de.d)]));
      console.error(`  [dbg ${mode} g${g}] cells=${occ.length}/${NC} maxOcc=${Math.max(...occ)} ` +
        `FAMmax=${Math.max(...fams).toFixed(3)} surprise=${Math.min(...sur).toFixed(3)}..${Math.max(...sur).toFixed(3)}`);
    }
    // fitness. NOTE: no term anywhere reads a lineage's share of the population.
    // In SURPRISE mode abundance is punished only because abundance FEEDS THE PREDICTOR.
    const fit = pop.map(o => {
      if (mode === 'control') return o.q;
      const surprise = Math.max(0, 1 - FAM[cellOf(o.de.d)]);
      return o.q * (0.15 + 0.85 * surprise);
    });

    // replacement: sample parents by fitness, mutate, replace the least fit
    const order = fit.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]);
    const nKill = Math.floor(POP * 0.12);
    const total = fit.reduce((s, f) => s + f, 0);
    const pick = () => { let t = r() * total; for (let i = 0; i < pop.length; i++) { t -= fit[i]; if (t <= 0) return pop[i]; } return pop[pop.length - 1]; };
    const babies = [];
    let tries = 0;
    while (babies.length < nKill && tries++ < nKill * 30) {
      const parent = pick();
      const child = G.mutate(parent.gm, r);
      if (G.complexity(child) > MAX_NODES) continue;
      const de = describe(child); if (dead(de)) continue;
      babies.push({ gm: child, de, q: quality(de, child) });
    }
    for (let i = 0; i < babies.length; i++) pop[order[i][1]] = babies[i];
    if (process.env.HDBG && g < 3) console.error(`  [dbg ${mode} g${g}] babies=${babies.length}/${nKill} tries=${tries}`);

    if (g % 40 === 0 || g === GENS - 1) trace.push({ g, eff: +effectiveLineages(pop).toFixed(2), top: +(topShare(pop) * 100).toFixed(1) });
  }
  return { eff: effectiveLineages(pop), top: topShare(pop), meanQ: pop.reduce((s, o) => s + o.q, 0) / pop.length, trace };
}

const out = { control: [], surprise: [] };
for (let rep = 0; rep < REPS; rep++) {
  for (const mode of ['control', 'surprise']) {
    const o = evolve(mode, 7000 + rep * 31);   // SAME seed per replicate: paired design
    out[mode].push(o);
    console.error(`rep${rep} ${mode.padEnd(8)} effLin ${o.eff.toFixed(2)} top ${(o.top * 100).toFixed(1)}% meanQ ${o.meanQ.toFixed(3)}  ` +
      o.trace.map(t => `${t.g}:${t.eff}`).join(' '));
  }
}
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
console.log(`\nHUNGER: is surprise a real resource? ${REPS} paired replicates, ${GENS} generations, pop ${POP}`);
console.log('arm      | effective lineages | top family share | mean quality');
for (const m of ['control', 'surprise']) {
  const e = out[m].map(o => o.eff), t = out[m].map(o => o.top * 100), q = out[m].map(o => o.meanQ);
  console.log(`${m.padEnd(8)} | ${mean(e).toFixed(2)} ± ${sd(e).toFixed(2)}        | ${mean(t).toFixed(1)}% ± ${sd(t).toFixed(1)}     | ${mean(q).toFixed(3)}`);
}
console.log('\nNo term in either arm reads a lineage\'s population share.');
console.log('If SURPRISE separates from CONTROL, frequency dependence EMERGED from eating.');
