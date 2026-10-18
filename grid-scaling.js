#!/usr/bin/env node
'use strict';
// grid-scaling.js — is the deceleration of the climb GEOMETRIC (the world runs out of cells) or ECOLOGICAL
// (the law itself settles near ~110–120 stable niches whatever the room)?
//
// RESULT-ceiling-100k.md: under the continuous law (CROWD 6.1) 12/12 fresh seeds were still climbing at 100k,
// logarithmically (23.7·ln t − 161), mean 112 = 82% of the 50×50 grid's ~137-cell cap. A log curve cannot say
// whether it is bending because of room or because of ecology. The cheapest decisive test: SAME seeds, SAME law,
// MORE ROOM, shorter common horizon. If the climb is geometric, the stable-niche count at a fixed tick scales
// with area and the fraction-of-cap trajectories collapse onto one curve; if ecological, the absolute count is
// ~unchanged across sizes.
//
// SIZES (side → area ratio → structural cap cells/18.3): 50 → 1.00 → 137 (BASELINE, reused from
// data/ceiling-100k.json truncated to the common horizon; the engine is deterministic — verified by the harness
// canary below); 61 → 1.49 → 203; 71 → 2.02 → 275; 87 → 3.03 → 414 (far point, fewer seeds).
// Founders scale with area (60·A) so the founding density is equal; the 6×6 lock patches tile the larger grid,
// so patch COUNT scales with area too — "geometric" here means "scales with room", cells and patches together.
// Engine lib/open.js untouched; config as in findings 10/11: {tol:2, construct:true, stableAge:400, menuSize:0}.
//
// CONTROLS
//   CANARY A0  original integer law (CROWD 6) on known-frozen 207, 307 to 20k: must halt with exposed keys at 18
//              (ceiling-100k.js's runWorld, unchanged). Miss → VOID.
//   HARNESS    50×50 seed 1013 CROWD 6.1 re-run to the common horizon here must reproduce the stored stable-niche
//              series of data/ceiling-100k.json sample-for-sample. Miss → the baseline cannot be reused → VOID.
//
// MEASURED every 1,000 ticks per world: stable niches, distinct, pop, prog complexity, max key reach (max L1 norm
// among living keys), cumulative keys ever seen, births, deaths.
//
// VERDICT (pre-registered in PREREG-grid-scaling.md): α = least-squares slope of ln(mean stable at H) on ln(area)
// across the sizes run. Twin ratio per seed = stable at H on the 71 grid / stable at H on the 50 grid (same seed).
//   GEOMETRIC   α ≥ 0.75 AND ≥ 75% of twin ratios ≥ 1.5
//   ECOLOGICAL  α ≤ 0.25 AND ≤ 25% of twin ratios ≥ 1.25
//   MIXED       otherwise — sub-case named: "sub-linear scaling (α=…)" if 0.25 < α < 0.75; else "rule disagreement".
// Reported at three cutoffs 20k / 30k / 40k; the verdict is read at H = 40k. Collapse: mean fraction-of-cap at H per
// size; COLLAPSE if the max pairwise gap ≤ 0.10. Reach: UNLOCKED if the mean max reach at H on any grid ≥ 2× area
// exceeds the 50-grid mean by ≥ 2; PINNED otherwise.
//
// Budget: ≤ 25 CPU-min at nice 19 (see PREREG §6 for the stop rule). Pure CPU, no deps.
const fs = require('fs'), path = require('path');
const { Open } = require(__dirname + '/lib/open.js');
const ceiling = require(__dirname + '/ceiling-100k.js');

const CFG = { tol: 2, construct: true, stableAge: 400, menuSize: 0 };
const CROWD = 6.1, BAL = 18.3;
const H = Number(process.env.H || 40000), SAMPLE = 1000, CUTOFFS = [H / 2, 3 * H / 4, H];   // 20k / 30k / 40k at the default H
const BASE_SIDE = 50;
const SEEDS = (process.env.SEEDS || '1013,1113,1213,1313,1413,1513,1613,1713').split(',').map(Number);        // sizes 61, 71
const FAR_SEEDS = (process.env.FAR_SEEDS || '1013,1113,1213,1313').split(',').map(Number);                       // size 87
const SIZES = (process.env.SIZES || '61,71,87').split(',').map(Number);
const CANARY_SEEDS = [207, 307], HARNESS_SEED = 1013;
const BASELINE = process.env.BASELINE || (__dirname + '/data/ceiling-100k.json');
const OUT = process.env.OUT || (__dirname + '/data/grid-scaling.json');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;    // subset of ['canary','harness','61','71','87'] for shards
const want = k => !ONLY || ONLY.includes(String(k));
const area = side => +(side * side / (BASE_SIDE * BASE_SIDE)).toFixed(2);
const cap = side => +(side * side / BAL).toFixed(1);

function maxReach(sim) { let m = 0; for (const o of sim.orgs) if (!o.dead) { let d = 0; for (const x of o.key) d += Math.abs(x); if (d > m) m = d; } return m; }

function runWorld(seed, side, horizon) {
  const A = side * side / (BASE_SIDE * BASE_SIDE);
  const sim = new Open({ seed, ...CFG, crowd: CROWD, cols: side, rows: side, seedOrganisms: Math.round(60 * A) });
  const row = { seed, side, area: area(side), cells: side * side, cap: cap(side), H: horizon, t: [], stable: [], distinct: [], pop: [], prog: [], reach: [], vocab: [], births: [], deaths: [] };
  const ever = new Set(); const c0 = process.cpuUsage();
  while (sim.tick < horizon) {
    sim.step();
    if (sim.tick % SAMPLE === 0) {
      const st = sim.stats();
      for (const o of sim.orgs) if (!o.dead) ever.add(o.keyStr);
      row.t.push(sim.tick); row.stable.push(st.stableNiches); row.distinct.push(st.distinctNiches); row.pop.push(st.pop);
      row.prog.push(st.progComplexity); row.reach.push(maxReach(sim)); row.vocab.push(ever.size); row.births.push(st.births); row.deaths.push(st.deaths);
    }
    if (sim.orgs.every(o => o.dead)) { row.extinct = sim.tick; break; }
  }
  const cu = process.cpuUsage(c0); row.cpuSec = +((cu.user + cu.system) / 1e6).toFixed(1);
  finish(row);
  return row;
}
function finish(row) {
  const rm = []; let m = -1; for (const s of row.stable) { if (s > m) m = s; rm.push(m); }
  row.runningMax = rm; row.maxStable = m;
  const at = k => row.stable[row.t.indexOf(k)];
  row.at = Object.fromEntries(CUTOFFS.map(k => [k, at(k)]));
  row.fracCap = Object.fromEntries(CUTOFFS.map(k => [k, +(at(k) / row.cap).toFixed(3)]));
  row.reachAt = Object.fromEntries(CUTOFFS.map(k => [k, row.reach[row.t.indexOf(k)]]));
  row.popAt = Object.fromEntries(CUTOFFS.map(k => [k, row.pop[row.t.indexOf(k)]]));
  row.density = +(row.popAt[H] / row.cells).toFixed(3);
}
// baseline rows: stored 50×50 worlds truncated to H (deterministic engine; the harness canary checks this)
function baselineRows() {
  const d = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), out = [];
  for (const r of d.arms.A1_irrational) {
    const n = r.t.filter(t => t <= H).length;
    const row = { seed: r.seed, side: BASE_SIDE, area: 1, cells: 2500, cap: cap(BASE_SIDE), H, reused: true, t: r.t.slice(0, n), stable: r.stable.slice(0, n), distinct: r.distinct.slice(0, n), pop: r.pop.slice(0, n), prog: r.prog.slice(0, n), reach: r.reach.slice(0, n), vocab: r.vocab.slice(0, n), births: r.births.slice(0, n), deaths: r.deaths.slice(0, n) };
    finish(row); out.push(row);
  }
  return out;
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function lsq(x, y) { const n = x.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx ? sxy / sxx : 0; }

if (require.main !== module) module.exports = { runWorld, baselineRows };
else if (process.argv[2] === '--score') scoreShards();
else main();
function main() {
  const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
  const result = { config: { CFG, CROWD, BAL, H, SAMPLE, CUTOFFS, BASE_SIDE, SIZES, SEEDS, FAR_SEEDS, CANARY_SEEDS, HARNESS_SEED, BASELINE: path.basename(BASELINE), sizes: Object.fromEntries([BASE_SIDE, ...SIZES].map(s => [s, { area: area(s), cells: s * s, cap: cap(s), founders: Math.round(60 * area(s)) }])) }, sizes: {}, canary: null, harness: null, verdicts: {} };
  if (want('canary')) {
    const rows = CANARY_SEEDS.map(s => ceiling.runWorld(s, ceiling.ARMS.A0_original, 20000));
    const atBal = r => r.census.exposedKeys > 0 && r.census.atBalance / r.census.exposedKeys >= 0.9;
    result.canary = { rows: rows.map(r => ({ seed: r.seed, halted: r.halted, lastEvent: r.lastEvent, exposed: r.census.exposedKeys, at18: r.census.atBalance, stable: r.final.stable })), haltedAt18: rows.filter(r => r.halted && atBal(r)).length, of: rows.length, pass: rows.every(r => r.halted && atBal(r)) };
    for (const r of result.canary.rows) log(`canary ${r.seed}: ${r.halted ? 'HALTED @' + r.lastEvent : 'breathing'} exposed ${r.exposed} at18 ${r.at18}`);
  }
  if (want('harness')) {
    const base = baselineRows().find(r => r.seed === HARNESS_SEED), rerun = runWorld(HARNESS_SEED, BASE_SIDE, H);
    const mism = base.stable.filter((v, i) => v !== rerun.stable[i]).length + (base.stable.length !== rerun.stable.length ? 1 : 0);
    result.harness = { seed: HARNESS_SEED, samples: base.stable.length, mismatches: mism, pass: mism === 0, cpuSec: rerun.cpuSec, rerunAt: rerun.at, storedAt: base.at };
    log(`harness 50x50 ${HARNESS_SEED}: ${mism === 0 ? 'IDENTICAL' : mism + ' MISMATCHES'} over ${base.stable.length} samples (${rerun.cpuSec} CPU-s)`);
  }
  for (const side of SIZES) {
    if (!want(side)) continue;
    result.sizes[side] = [];
    for (const s of (side === 87 ? FAR_SEEDS : SEEDS)) {
      const r = runWorld(s, side, H); result.sizes[side].push(r);
      log(`${side}x${side} ${s}: stable 20k/30k/40k = ${CUTOFFS.map(k => r.at[k]).join('/')} fracCap ${r.fracCap[H]} pop ${r.popAt[H]} density ${r.density} reach ${r.reachAt[H]} vocab ${r.vocab[r.vocab.length - 1]} max ${r.maxStable} (${r.cpuSec} CPU-s)`);
      fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(result));   // checkpoint
    }
  }
  if (!ONLY) { result.sizes[BASE_SIDE] = baselineRows(); score(result); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(result));
  console.log(`wrote ${OUT}`);
}
// scoring is separate so shard outputs can be merged (merge-grid-scaling via `node grid-scaling.js --score a.json b.json`)
function score(result) {
  const sides = Object.keys(result.sizes).map(Number).sort((a, b) => a - b);
  const base = result.sizes[BASE_SIDE] || [];
  const byCut = {};
  for (const k of CUTOFFS) {
    const per = {};
    for (const s of sides) { const rows = result.sizes[s]; if (!rows || !rows.length) continue; per[s] = { n: rows.length, meanStable: +mean(rows.map(r => r.at[k])).toFixed(1), meanFracCap: +mean(rows.map(r => r.fracCap[k])).toFixed(3), meanReach: +mean(rows.map(r => r.reachAt[k])).toFixed(2), maxReach: Math.max(...rows.map(r => r.reachAt[k])), meanPop: Math.round(mean(rows.map(r => r.popAt[k]))), meanDensity: +mean(rows.map(r => r.popAt[k] / r.cells)).toFixed(3) }; }
    const ss = Object.keys(per).map(Number);
    const alpha = ss.length >= 2 ? +lsq(ss.map(s => Math.log(area(s))), ss.map(s => Math.log(per[s].meanStable))).toFixed(3) : null;
    // twin ratios at 71 vs 50, same seed
    const twins = (result.sizes[71] || []).map(r => { const b = base.find(x => x.seed === r.seed); return b ? { seed: r.seed, base: b.at[k], big: r.at[k], ratio: +(r.at[k] / b.at[k]).toFixed(2) } : null; }).filter(Boolean);
    const fr = per[ss[0]] ? ss.map(s => per[s].meanFracCap) : [];
    const collapseGap = fr.length ? +(Math.max(...fr) - Math.min(...fr)).toFixed(3) : null;
    // fill check: if the big grids are still much emptier than the 50×50 at this cutoff, sub-linear scaling may be "not yet filled", a horizon effect
    const densityRatio = per[BASE_SIDE] && per[71] ? +(per[71].meanDensity / per[BASE_SIDE].meanDensity).toFixed(2) : null;
    byCut[k] = { per, alpha, twins, twinsGe15: twins.filter(t => t.ratio >= 1.5).length, twinsGe125: twins.filter(t => t.ratio >= 1.25).length, collapseGap, densityRatio };
  }
  const c = byCut[H], n = c.twins.length;
  let verdict, reason;
  if (result.canary && !result.canary.pass) { verdict = 'VOID'; reason = 'canary failed — the original law did not re-halt at 18'; }
  else if (result.harness && !result.harness.pass) { verdict = 'VOID'; reason = `harness failed — 50×50 seed ${HARNESS_SEED} re-run differs from the stored baseline in ${result.harness.mismatches} samples; the baseline cannot be reused`; }
  else if (c.alpha === null || n === 0) { verdict = 'INCOMPLETE'; reason = 'fewer than two sizes or no 71/50 twins scored'; }
  else if (c.alpha >= 0.75 && c.twinsGe15 >= Math.ceil(0.75 * n)) { verdict = 'GEOMETRIC'; reason = `stable niches at ${H / 1000}k scale with area as area^${c.alpha} (α ≥ 0.75) and ${c.twinsGe15}/${n} seeds hold ≥ 1.5× as many niches on the 2× grid as on their own 50×50 twin`; }
  else if (c.alpha <= 0.25 && c.twinsGe125 <= Math.floor(0.25 * n)) { verdict = 'ECOLOGICAL'; reason = `stable niches at ${H / 1000}k barely move with area (α = ${c.alpha} ≤ 0.25) and only ${c.twinsGe125}/${n} seeds gain ≥ 25% on the 2× grid — the count is set by the law, not the room`; }
  else if (c.alpha > 0.25 && c.alpha < 0.75) { verdict = `MIXED (sub-linear scaling, α = ${c.alpha})`; reason = `niches scale with area^${c.alpha}: more room buys more niches but less than proportionally; ${c.twinsGe15}/${n} twins ≥ 1.5×, ${c.twinsGe125}/${n} ≥ 1.25×` + (c.densityRatio !== null && c.densityRatio < 0.8 ? `; CAUTION the 2× grid is only ${Math.round(c.densityRatio * 100)}% as densely populated as the 50×50 at ${H / 1000}k — "not yet filled" (horizon) cannot be excluded` : c.densityRatio !== null ? `; population density on the 2× grid is ${Math.round(c.densityRatio * 100)}% of the 50×50's, so the big grid is as full — the shortfall is not an unfilled grid` : ''); }
  else { verdict = `MIXED (rule disagreement, α = ${c.alpha})`; reason = `pooled exponent and per-seed twin ratios disagree: α = ${c.alpha}, ${c.twinsGe15}/${n} twins ≥ 1.5×, ${c.twinsGe125}/${n} ≥ 1.25×`; }
  const baseReach = c.per[BASE_SIDE] ? c.per[BASE_SIDE].meanReach : null;
  const bigReach = Math.max(...Object.keys(c.per).map(Number).filter(s => area(s) >= 2).map(s => c.per[s].meanReach), -Infinity);
  const reach = baseReach === null || !isFinite(bigReach) ? { verdict: 'INCOMPLETE' } : { verdict: bigReach >= baseReach + 2 ? 'REACH UNLOCKED' : 'REACH PINNED', baseMean: baseReach, bigMean: +bigReach.toFixed(2), reason: bigReach >= baseReach + 2 ? `mean max reach on a ≥2× grid is ${bigReach.toFixed(1)} vs ${baseReach} on 50×50 (+${(bigReach - baseReach).toFixed(1)} ≥ 2)` : `mean max reach ${bigReach.toFixed(1)} on a ≥2× grid vs ${baseReach} on 50×50 — more room did not buy reach (gap < 2)` };
  const collapse = c.collapseGap === null ? 'INCOMPLETE' : c.collapseGap <= 0.10 ? `COLLAPSE (fraction-of-cap gap ${c.collapseGap} ≤ 0.10)` : `NO COLLAPSE (fraction-of-cap gap ${c.collapseGap} > 0.10)`;
  result.verdicts = { main: { verdict, reason, alpha: c.alpha, twins: c.twins }, reach, collapse, byCutoff: byCut, cpuSecTreatment: +Object.values(result.sizes).flat().filter(r => !r.reused).reduce((a, r) => a + (r.cpuSec || 0), 0).toFixed(0) };
  console.log('\n── CANARY ──'); console.log(JSON.stringify(result.canary && { haltedAt18: result.canary.haltedAt18, of: result.canary.of, pass: result.canary.pass }));
  console.log('── HARNESS ──'); console.log(JSON.stringify(result.harness && { mismatches: result.harness.mismatches, pass: result.harness.pass }));
  console.log('── PER SIZE @ cutoff ──'); for (const k of CUTOFFS) console.log(k, JSON.stringify(byCut[k].per), 'alpha', byCut[k].alpha, 'collapseGap', byCut[k].collapseGap);
  console.log('── VERDICT ──'); console.log(`${verdict} — ${reason}`); console.log(`${reach.verdict} — ${reach.reason || ''}`); console.log(collapse);
}
function scoreShards() {   // merge shard JSONs and score (run after parallel shards)
  const merged = { config: null, sizes: {}, canary: null, harness: null, verdicts: {} };
  for (const f of process.argv.slice(3)) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); merged.config = merged.config || d.config; if (d.canary) merged.canary = d.canary; if (d.harness) merged.harness = d.harness; for (const [s, rows] of Object.entries(d.sizes)) merged.sizes[s] = (merged.sizes[s] || []).concat(rows); }
  merged.sizes[BASE_SIDE] = baselineRows(); score(merged); fs.writeFileSync(OUT, JSON.stringify(merged)); console.log(`wrote ${OUT}`);
}
