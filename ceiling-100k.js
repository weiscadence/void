#!/usr/bin/env node
'use strict';
// ceiling-100k.js — under the CONTINUOUS law, is there any ceiling at all?
//
// RESULT-break-fixed-point.md showed that the integer fixed point (crowd exactly 18 where harvest = upkeep)
// was the cage: move CROWD 6 → 6.1 or add real-valued ±5% yield noise and the frozen worlds climb. At 30k
// ticks they were still rising, so the old claim "no world is unbounded" became UNTESTED. This runs the two
// continuous arms on FRESH seeds (12 for A1, 4 for A3) to 100,000 ticks and asks whether the climb saturates, slows, or keeps going.
//
// ARMS (same construction as break-fixed-point.js; engine lib/open.js untouched):
//   A1 CROWD 6.1          balance 18.3 — no integer solution.
//   A3 CROWD 6 + noise    each harvest × (1 + 0.05·u), u ~ U(−1,1), via a getter on the instance's YIELD.
// CONTROLS:
//   CANARY  A0 original law on the two known-frozen seeds 207, 307 (H=20k): must halt with exposed keys at 18.
//           If they do not, the engine or the harness changed and nothing below is evidence.
//   DECOY   A2 CROWD 5 (integer balance 15) on 6 fresh seeds, H=30k: worlds that halt must sit at 15.
//
// MEASURED every 1,000 ticks per world: stable niches (the vocabulary of held niches), distinct niches, pop,
// mean program complexity, max key reach (max L1 norm among living keys — the "max trait"), cumulative
// distinct keys ever observed at a sample, births, deaths. Running max of stable niches is the climb curve.
//
// CEILING, operationally (pre-registered in PREREG-ceiling-100k.md): a world has PLATEAUED at cutoff W if
// max(stable) over the last W ticks ≤ max(stable) before (H−W) + TOL_PLATEAU. Three cutoffs: 20k / 30k / 40k.
// The strict version (TOL 0) is also reported. Curve shape: pooled running-max curve fit from 5k onward with
// linear, logarithmic and saturating (Michaelis–Menten S·t/(t+K)) two-parameter models; RSS/AIC and the
// residual pattern are reported, not just the winner.
//
// Pure CPU, no deps. Budget (amended, PREREG-ceiling-100k.md §7): 12 A1 + 4 A3 worlds at 100k + controls ≈ 24 CPU-min at
// nice 19; a first attempt at 16+16 was stopped after one world per arm when A3 measured 150 CPU-s per world.
const { makeSim } = require(__dirname + '/break-fixed-point.js');

const SEEDS = (process.env.SEEDS || Array.from({ length: 12 }, (_, i) => 1013 + 100 * i).join(',')).split(',').map(Number);
// A3 costs ~2.2x an A1 world (measured 150 vs 68 CPU-s per 100k); see PREREG amendment — it runs as a 4-seed replication.
const A3_SEEDS = (process.env.A3_SEEDS || '1013,1113,1213,1313').split(',').map(Number);
const CANARY_SEEDS = [207, 307];                                      // known-frozen under the original law
const DECOY_SEEDS = (process.env.DECOY_SEEDS || '1013,1113,1213,1313,1413,1513').split(',').map(Number);
const H = Number(process.env.H || 100000), H_CANARY = Number(process.env.H_CANARY || 20000), H_DECOY = Number(process.env.H_DECOY || 30000);
const SAMPLE = 1000, HALT_WIN = 10000, TOL_PLATEAU = 2;
const CUTOFFS = [20000, 30000, 40000];
const FIT_FROM = 5000;
const ARMS = {
  A0_original: { id: 'A0_original', crowd: 6, balance: 18, noise: 0 },
  A1_irrational: { id: 'A1_irrational', crowd: 6.1, balance: null, noise: 0 },
  A2_decoy: { id: 'A2_decoy', crowd: 5, balance: 15, noise: 0 },
  A3_noise: { id: 'A3_noise', crowd: 6, balance: null, noise: 0.05 },
};
const OUT = process.env.OUT || (__dirname + '/data/ceiling-100k.json');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;   // run a subset of arms (for parallel shards)

function census(sim, balance) {
  const live = sim.orgs.filter(o => !o.dead), share = new Map();
  for (const o of live) share.set(o.keyStr, (share.get(o.keyStr) || 0) + 1);
  const exposed = new Map();
  for (const o of live) if (sim._neighbors(o.cell).some(c => sim.grid[c] === -1)) exposed.set(o.keyStr, share.get(o.keyStr));
  const ex = [...exposed.values()];
  return { exposedKeys: ex.length, atBalance: balance === null ? null : ex.filter(c => c === balance).length,
    crowdMin: ex.length ? Math.min(...ex) : null, crowdMax: ex.length ? Math.max(...ex) : null };
}
function maxReach(sim) { let m = 0; for (const o of sim.orgs) if (!o.dead) { let d = 0; for (const x of o.key) d += Math.abs(x); if (d > m) m = d; } return m; }

function runWorld(seed, arm, horizon) {
  const sim = makeSim(seed, arm), row = { seed, arm: arm.id, H: horizon, t: [], stable: [], distinct: [], pop: [], prog: [], reach: [], vocab: [], births: [], deaths: [], lastEvent: 0 };
  const ever = new Set(); let pb = 0, pd = 0, winB = 0, winD = 0;
  while (sim.tick < horizon) {
    sim.step();
    if (sim.births !== pb || sim.deaths !== pd) {
      row.lastEvent = sim.tick;
      if (sim.tick > horizon - HALT_WIN) { winB += sim.births - pb; winD += sim.deaths - pd; }
      pb = sim.births; pd = sim.deaths;
    }
    if (sim.tick % SAMPLE === 0) {
      const st = sim.stats();
      for (const o of sim.orgs) if (!o.dead) ever.add(o.keyStr);
      row.t.push(sim.tick); row.stable.push(st.stableNiches); row.distinct.push(st.distinctNiches); row.pop.push(st.pop);
      row.prog.push(st.progComplexity); row.reach.push(maxReach(sim)); row.vocab.push(ever.size); row.births.push(st.births); row.deaths.push(st.deaths);
    }
    if (sim.orgs.every(o => o.dead)) { row.extinct = sim.tick; break; }
  }
  const st = sim.stats();
  row.final = { stable: st.stableNiches, pop: st.pop, prog: st.progComplexity };
  row.winBirths = winB; row.winDeaths = winD; row.halted = winB === 0 && winD === 0;
  row.census = census(sim, arm.balance);
  // running max of stable niches and plateau flags
  const rm = []; let m = -1; for (const s of row.stable) { if (s > m) m = s; rm.push(m); }
  row.runningMax = rm; row.maxStable = m; row.tOfMax = row.t[row.stable.indexOf(m)];
  row.plateau = {}; row.plateauStrict = {};
  for (const W of CUTOFFS) {
    const before = row.stable.filter((_, i) => row.t[i] <= horizon - W), after = row.stable.filter((_, i) => row.t[i] > horizon - W);
    const mb = Math.max(...before), ma = Math.max(...after);
    row.plateau[W] = ma <= mb + TOL_PLATEAU; row.plateauStrict[W] = ma <= mb; row.plateau['gain' + W] = ma - mb;
  }
  // mean slope over the last 20k (niches per 10k ticks), least squares on the raw stable series
  const idx = row.t.map((t, i) => i).filter(i => row.t[i] > horizon - 20000);
  row.slopeLast20k = +(lsq(idx.map(i => row.t[i] / 10000), idx.map(i => row.stable[i])).b).toFixed(2);
  return row;
}

// ── fits ───────────────────────────────────────────────────────────────────────────────────────────
function lsq(x, y) { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  const b = sxx ? sxy / sxx : 0; return { a: my - b * mx, b }; }
function rss(y, f) { let s = 0; for (let i = 0; i < y.length; i++) s += (y[i] - f[i]) ** 2; return s; }
function aic(n, k, RSS) { return n * Math.log(RSS / n) + 2 * k; }
function fitCurves(t, y) {
  const n = t.length, out = {};
  const lin = lsq(t, y), fl = t.map(x => lin.a + lin.b * x);
  out.linear = { params: { a: +lin.a.toFixed(3), b_per_tick: +lin.b.toExponential(3) }, rss: +rss(y, fl).toFixed(2) };
  const lg = lsq(t.map(Math.log), y), fg = t.map(x => lg.a + lg.b * Math.log(x));
  out.log = { params: { a: +lg.a.toFixed(3), b: +lg.b.toFixed(3) }, rss: +rss(y, fg).toFixed(2) };
  // Michaelis–Menten S·t/(t+K): grid over K, closed-form S
  let best = null;
  for (let K = 500; K <= 400000; K *= 1.03) {
    const g = t.map(x => x / (x + K)); let num = 0, den = 0; for (let i = 0; i < n; i++) { num += g[i] * y[i]; den += g[i] * g[i]; }
    const S = num / den, f = g.map(v => S * v), R = rss(y, f); if (!best || R < best.rss) best = { S, K, rss: R, f };
  }
  out.saturating = { params: { S_asymptote: +best.S.toFixed(2), K_halfway_tick: Math.round(best.K) }, rss: +best.rss.toFixed(2) };
  for (const m of ['linear', 'log', 'saturating']) out[m].aic = +aic(n, 2, out[m].rss).toFixed(2);
  // residual pattern: mean residual in thirds (sign structure tells you whether the model bends the wrong way)
  const third = Math.floor(n / 3), res = (f) => [0, 1, 2].map(k => { const sl = y.slice(k * third, k === 2 ? n : (k + 1) * third), fs = f.slice(k * third, k === 2 ? n : (k + 1) * third); return +(sl.reduce((a, b, i) => a + b - fs[i], 0) / sl.length).toFixed(2); });
  out.linear.residualThirds = res(fl); out.log.residualThirds = res(fg); out.saturating.residualThirds = res(best.f);
  const order = ['linear', 'log', 'saturating'].sort((a, b) => out[a].aic - out[b].aic);
  out.best = order[0]; out.deltaAIC_second = +(out[order[1]].aic - out[order[0]].aic).toFixed(2); out.n = n;
  return out;
}

if (require.main !== module) module.exports = { runWorld, fitCurves, ARMS };
else main();
function main() {
  const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
  const result = { config: { SEEDS, A3_SEEDS, CANARY_SEEDS, DECOY_SEEDS, H, H_CANARY, H_DECOY, SAMPLE, HALT_WIN, TOL_PLATEAU, CUTOFFS, FIT_FROM, ARMS, structuralCap: { cells: 2500, note: 'cells / balance crowd ≈ upper bound on stable niches if every organism sits in a held key', A1: +(2500 / 18.3).toFixed(1), A3: +(2500 / 18).toFixed(1) } }, arms: {}, canary: null, decoy: null, verdicts: {} };
  const want = id => !ONLY || ONLY.includes(id);
  if (want('A0_original')) { result.arms.A0_original = []; for (const s of CANARY_SEEDS) { const r = runWorld(s, ARMS.A0_original, H_CANARY); result.arms.A0_original.push(r); log(`canary ${s}: ${r.halted ? 'HALTED @' + r.lastEvent : 'breathing'} exposed ${r.census.exposedKeys} at18 ${r.census.atBalance} stable ${r.final.stable}`); } }
  if (want('A2_decoy')) { result.arms.A2_decoy = []; for (const s of DECOY_SEEDS) { const r = runWorld(s, ARMS.A2_decoy, H_DECOY); result.arms.A2_decoy.push(r); log(`decoy ${s}: ${r.halted ? 'HALTED @' + r.lastEvent : 'breathing ' + (r.winBirths + r.winDeaths) + ' events'} exposed ${r.census.exposedKeys} at15 ${r.census.atBalance} stable ${r.final.stable}`); } }
  for (const id of ['A1_irrational', 'A3_noise']) {
    if (!want(id)) continue; result.arms[id] = [];
    for (const s of (id === 'A3_noise' ? A3_SEEDS : SEEDS)) {
      const r = runWorld(s, ARMS[id], H); result.arms[id].push(r);
      const at = k => r.stable[r.t.indexOf(k)];
      log(`${id} ${s}: stable 20k/40k/60k/80k/100k = ${[20000, 40000, 60000, 80000, 100000].map(at).join('/')} max ${r.maxStable}@${r.tOfMax} pop ${r.final.pop} reach ${r.reach[r.reach.length - 1]} vocab ${r.vocab[r.vocab.length - 1]} plateau20/30/40k ${CUTOFFS.map(W => r.plateau[W] ? 'Y' : 'n').join('')} slope ${r.slopeLast20k}/10k ${r.halted ? 'HALTED' : ''}`);
    }
  }
  const atBal = r => r.census.exposedKeys > 0 && r.census.atBalance / r.census.exposedKeys >= 0.9;
  if (result.arms.A0_original) { const c = result.arms.A0_original; result.canary = { haltedAt18: c.filter(r => r.halted && atBal(r)).length, of: c.length, pass: c.every(r => r.halted && atBal(r)) }; }
  if (result.arms.A2_decoy) { const d = result.arms.A2_decoy, h = d.filter(r => r.halted); result.decoy = { halted: h.length, haltedAtNewBalance: h.filter(atBal).length, of: d.length, status: h.length === 0 ? 'INCONCLUSIVE (no world halted by H)' : h.every(atBal) ? 'PASS' : 'FAIL' }; }
  for (const id of ['A1_irrational', 'A3_noise']) {
    const rows = result.arms[id]; if (!rows) continue;
    const n = rows.length, plateauFrac = {}, plateauStrictFrac = {};
    for (const W of CUTOFFS) { plateauFrac[W] = rows.filter(r => r.plateau[W]).length; plateauStrictFrac[W] = rows.filter(r => r.plateauStrict[W]).length; }
    const rising = rows.filter(r => r.slopeLast20k > 0).length, halted = rows.filter(r => r.halted).length;
    // pooled running-max curve (mean across seeds) from FIT_FROM
    const T = rows[0].t.filter(t => t >= FIT_FROM), mean = T.map(t => rows.reduce((a, r) => a + r.runningMax[r.t.indexOf(t)], 0) / n);
    const meanRaw = T.map(t => rows.reduce((a, r) => a + r.stable[r.t.indexOf(t)], 0) / n);
    const fit = fitCurves(T, mean), fitRaw = fitCurves(T, meanRaw);
    const perSeedBest = rows.map(r => { const tt = r.t.filter(t => t >= FIT_FROM); return fitCurves(tt, tt.map(t => r.runningMax[r.t.indexOf(t)])).best; });
    const bestCount = {}; for (const b of perSeedBest) bestCount[b] = (bestCount[b] || 0) + 1;
    let verdict, reason;
    const p20 = plateauFrac[20000];
    if (result.canary && !result.canary.pass) { verdict = 'VOID'; reason = 'canary failed'; }
    else if (halted > 0) { verdict = 'VOID-MECHANISM'; reason = `${halted}/${n} worlds halted under a continuous law — the fixed-point story itself is in question`; }
    else if (p20 >= Math.ceil(0.75 * n) && fit.best === 'saturating') { verdict = 'CEILING'; reason = `${p20}/${n} seeds set no new max (±${TOL_PLATEAU}) in the last 20k and the pooled running-max curve is best fit by a saturating model (S=${fit.saturating.params.S_asymptote}, ΔAIC ${fit.deltaAIC_second})`; }
    else if (p20 <= Math.floor(0.25 * n) && fit.best !== 'saturating') { verdict = 'NO CEILING SEEN'; reason = `${p20}/${n} seeds plateau in the last 20k and the pooled curve is best fit by ${fit.best} (ΔAIC ${fit.deltaAIC_second}); ${rising}/${n} still have positive slope over the last 20k`; }
    else if (p20 >= Math.ceil(0.75 * n)) { verdict = 'MIXED (plateaus, curve not saturating)'; reason = `${p20}/${n} plateau at 20k but the pooled fit prefers ${fit.best}`; }
    else if (fit.best === 'saturating') { verdict = 'MIXED (saturating fit, few plateaus)'; reason = `pooled curve saturating (S=${fit.saturating.params.S_asymptote}) but only ${p20}/${n} seeds plateau at 20k — slow approach, not a reached ceiling`; }
    else { verdict = 'MIXED'; reason = `${p20}/${n} plateau at 20k; best fit ${fit.best}`; }
    result.verdicts[id] = { verdict, reason, n, halted, plateauFrac, plateauStrictFrac, risingLast20k: rising, maxStable: rows.map(r => r.maxStable), finalStable: rows.map(r => r.final.stable), meanMaxStable: +(rows.reduce((a, r) => a + r.maxStable, 0) / n).toFixed(1),
      meanStableAt: Object.fromEntries([20000, 40000, 60000, 80000, 100000].map(k => [k, +(rows.reduce((a, r) => a + (r.stable[r.t.indexOf(k)] ?? 0), 0) / n).toFixed(1)])),
      fitRunningMax: fit, fitRawMean: fitRaw, perSeedBest: bestCount, pooledCurve: { t: T, runningMaxMean: mean.map(v => +v.toFixed(2)), rawMean: meanRaw.map(v => +v.toFixed(2)) } };
  }
  require('fs').mkdirSync(require('path').dirname(OUT), { recursive: true });
  require('fs').writeFileSync(OUT, JSON.stringify(result));
  if (result.canary) { console.log('\n── CANARY ──'); console.log(JSON.stringify(result.canary)); }
  if (result.decoy) { console.log('── DECOY ──'); console.log(JSON.stringify(result.decoy)); }
  console.log('── VERDICTS ──'); for (const [k, v] of Object.entries(result.verdicts)) console.log(`${k}: ${v.verdict} — ${v.reason}\n   plateau(±${TOL_PLATEAU}) ${JSON.stringify(v.plateauFrac)} strict ${JSON.stringify(v.plateauStrictFrac)} fits ${JSON.stringify({ linear: v.fitRunningMax.linear.aic, log: v.fitRunningMax.log.aic, sat: v.fitRunningMax.saturating.aic })} perSeedBest ${JSON.stringify(v.perSeedBest)}`);
  console.log(`wrote ${OUT}`);
}
