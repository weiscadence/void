#!/usr/bin/env node
'use strict';
// dial-sweep.js — what sets the ecological level? One dial at a time on the 1× grid under the continuous law.
//
// RESULT-grid-scaling.md: the ~95–100 stable-niche level at 40k (and ~1,150–1,220 organisms) ignores a 3× increase in
// room. So the level is the law's. Ecology offers three candidate controllers of niche NUMBER (not individuals):
//   (E) energy / "more-individuals" (Wright 1983; Storch et al. 2018): richness tracks the total number of individuals
//       the energy supply can hold → niches should move WITH population when total energy input moves;
//   (A) balance arithmetic: a full key holds CROWD·(YIELD/UPKEEP − 1) organisms, so if population ∝ energy and crowd-per-key
//       ∝ energy, the niche COUNT is invariant to energy — population moves, niches do not;
//   (T) turnover (Hubbell's θ = 2Jν: richness ∝ community size × origination rate): mutation load moves niches
//       without moving population.
// The STABLE_AGE threshold is a LENS, not a world dial (it is read only in stats()); it is reported as a curve at zero
// cost. Lifespan has no dial in this engine (death is energy ≤ 0 only) — stated, not swept.
//
// ARMS (50×50, {tol 2, construct, stableAge 400, menuSize 0}, CROWD 6.1, H 40k, sampled every 1k; engine lib/open.js untouched)
//   yield    Y3 / Y5 / Y6 (balance crowd 12.2 / 24.4 / 30.5 — none integer, the continuous law is preserved); Y4 = the stored
//            finding-11 baseline (data/ceiling-100k.json A1_irrational, truncated to 40k; harness-checked below)
//   mutation M025 / M05 / M2 = (MUT_PT, MUT_INDEL) × 0.25 / 0.5 / 2 of (0.08, 0.10); M1 = the same baseline
//   seeds    1013, 1113, 1213, 1313 (all in the baseline's 12); arm means are compared with the baseline's matched 4-seed mean
// CONTROLS
//   CANARY   original integer law (CROWD 6) on known-frozen 207, 307 to 20k: must halt with ≥ 90% exposed keys at 18. Miss → VOID.
//   DECOY    influx = 100 on seeds 1013, 1113 at yield 4. `influx` LOOKS like an energy dial but the engine only reads it when
//            conserveEnergy is on (lib/open.js line 238), so it is inert here: both series must match the stored baseline sample for
//            sample (this is also the harness check that the baseline may be reused). Any mismatch → VOID.
// MEASURED every 1k: stable niches, distinct, pop, prog complexity, max key reach, keys-ever, births, deaths, energy harvested in
// the window (the actual throughput), and at each cutoff the stable count at ages 100…3200 (the lens curve).
// RULES: see PREREG-dial-sweep.md §4 (copied into score() below). Budget ≤ 20 CPU-min, nice 19, serial, checkpoint per world.
const fs = require('fs'), path = require('path');
const { Open } = require(__dirname + '/lib/open.js');
const ceiling = require(__dirname + '/ceiling-100k.js');

const CFG = { tol: 2, construct: true, stableAge: 400, menuSize: 0 };
const CROWD = 6.1;
const H = Number(process.env.H || 40000), SAMPLE = 1000, CUTOFFS = [H / 2, 3 * H / 4, H];
const SEEDS = (process.env.SEEDS || '1013,1113,1213,1313').split(',').map(Number);
const DECOY_SEEDS = [1013, 1113], CANARY_SEEDS = [207, 307];
const AGES = [100, 200, 400, 800, 1600, 3200];
const ARMS = {
  Y3: { dial: 'yield', yield: 3, x: 3 - 1, opts: { yield: 3 } },
  Y5: { dial: 'yield', yield: 5, x: 5 - 1, opts: { yield: 5 } },
  Y6: { dial: 'yield', yield: 6, x: 6 - 1, opts: { yield: 6 } },
  M025: { dial: 'mutation', load: 0.25, opts: { mutPt: 0.02, mutIndel: 0.025 } },
  M05: { dial: 'mutation', load: 0.5, opts: { mutPt: 0.04, mutIndel: 0.05 } },
  M2: { dial: 'mutation', load: 2, opts: { mutPt: 0.16, mutIndel: 0.20 } },
  DECOY: { dial: 'decoy', opts: { influx: 100 } },
};
const ORDER = (process.env.ORDER || 'canary,DECOY,Y3,M05,M2,M025,Y5,Y6').split(',');
const BASELINE = process.env.BASELINE || (__dirname + '/data/ceiling-100k.json');
const OUT = process.env.OUT || (__dirname + '/data/dial-sweep.json');

function maxReach(sim) { let m = 0; for (const o of sim.orgs) if (!o.dead) { let d = 0; for (const x of o.key) d += Math.abs(x); if (d > m) m = d; } return m; }
function lens(sim) { const out = {}; for (const a of AGES) { let n = 0; for (const [, rec] of sim.keySince) if (sim.tick - rec.since >= a) n++; out[a] = n; } return out; }

function runWorld(seed, armId, horizon) {
  const arm = ARMS[armId];
  const sim = new Open({ seed, ...CFG, crowd: CROWD, ...arm.opts });
  const row = { seed, arm: armId, H: horizon, t: [], stable: [], distinct: [], pop: [], prog: [], reach: [], vocab: [], births: [], deaths: [], energyIn: [], lens: {} };
  const ever = new Set(); const c0 = process.cpuUsage(); let eAcc = 0;
  // throughput is measured from the engine's own census each tick: Σ over living matched organisms of YIELD/(1+crowd/CROWD).
  // Done by a cheap replica of the harvest formula on the pre-step state (exact for the open, non-conserved mode).
  const Y = sim.YIELD, C = sim.CROWD;
  while (sim.tick < horizon) {
    if (sim.tick % 50 === 0) {   // sample throughput every 50 ticks (×50 → per-window estimate); exact formula, sampled in time
      const share = new Map(); for (const o of sim.orgs) if (!o.dead) share.set(o.keyStr, (share.get(o.keyStr) || 0) + 1);
      let e = 0; for (const o of sim.orgs) if (!o.dead && sim._match(o.key, sim.lock[o.cell])) e += Y / (1 + share.get(o.keyStr) / C);
      eAcc += e * 50;
    }
    sim.step();
    if (sim.tick % SAMPLE === 0) {
      const st = sim.stats();
      for (const o of sim.orgs) if (!o.dead) ever.add(o.keyStr);
      row.t.push(sim.tick); row.stable.push(st.stableNiches); row.distinct.push(st.distinctNiches); row.pop.push(st.pop);
      row.prog.push(st.progComplexity); row.reach.push(maxReach(sim)); row.vocab.push(ever.size); row.births.push(st.births); row.deaths.push(st.deaths);
      row.energyIn.push(Math.round(eAcc)); eAcc = 0;
      if (CUTOFFS.includes(sim.tick)) row.lens[sim.tick] = lens(sim);
    }
    if (sim.orgs.every(o => o.dead)) { row.extinct = sim.tick; break; }
  }
  const cu = process.cpuUsage(c0); row.cpuSec = +((cu.user + cu.system) / 1e6).toFixed(1);
  finish(row); return row;
}
function finish(row) {
  const at = (arr, k) => arr[row.t.indexOf(k)];
  row.at = Object.fromEntries(CUTOFFS.map(k => [k, at(row.stable, k)]));
  row.popAt = Object.fromEntries(CUTOFFS.map(k => [k, at(row.pop, k)]));
  row.reachAt = Object.fromEntries(CUTOFFS.map(k => [k, at(row.reach, k)]));
  // mean energy harvested per tick over the 10k before each cutoff
  row.energyAt = Object.fromEntries(CUTOFFS.map(k => { const idx = row.t.map((t, i) => i).filter(i => row.t[i] > k - 10000 && row.t[i] <= k); const e = row.energyIn ? idx.map(i => row.energyIn[i]) : []; return [k, e.length ? +(e.reduce((a, b) => a + b, 0) / (e.length * SAMPLE)).toFixed(1) : null]; }));
  row.vocabAt = Object.fromEntries(CUTOFFS.map(k => [k, at(row.vocab, k)]));
  let m = -1; for (const s of row.stable) if (s > m) m = s; row.maxStable = m;
}
function baselineRows() {
  const d = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), out = [];
  for (const r of d.arms.A1_irrational) {
    const n = r.t.filter(t => t <= H).length;
    const row = { seed: r.seed, arm: 'BASE', H, reused: true, t: r.t.slice(0, n), stable: r.stable.slice(0, n), distinct: r.distinct.slice(0, n), pop: r.pop.slice(0, n), prog: r.prog.slice(0, n), reach: r.reach.slice(0, n), vocab: r.vocab.slice(0, n), births: r.births.slice(0, n), deaths: r.deaths.slice(0, n), energyIn: null, lens: {} };
    finish(row); out.push(row);
  }
  return out;
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function lsq(x, y) { const n = x.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx ? sxy / sxx : 0; }

if (require.main !== module) module.exports = { runWorld, baselineRows, ARMS };
else if (process.argv[2] === '--score') { const r = JSON.parse(fs.readFileSync(process.argv[3] || OUT, 'utf8')); r.base = baselineRows(); score(r); fs.writeFileSync(OUT, JSON.stringify(r)); console.log(`wrote ${OUT}`); }
else main();

function main() {
  const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
  const result = { config: { CFG, CROWD, H, SAMPLE, CUTOFFS, SEEDS, DECOY_SEEDS, CANARY_SEEDS, AGES, ARMS, ORDER, BASELINE: path.basename(BASELINE) }, arms: {}, canary: null, decoy: null, verdicts: {} };
  const save = () => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(result)); };
  const base = baselineRows();
  for (const step of ORDER) {
    if (step === 'canary') {
      const rows = CANARY_SEEDS.map(s => ceiling.runWorld(s, ceiling.ARMS.A0_original, 20000));
      const atBal = r => r.census.exposedKeys > 0 && r.census.atBalance / r.census.exposedKeys >= 0.9;
      result.canary = { rows: rows.map(r => ({ seed: r.seed, halted: r.halted, lastEvent: r.lastEvent, exposed: r.census.exposedKeys, at18: r.census.atBalance, stable: r.final.stable })), haltedAt18: rows.filter(r => r.halted && atBal(r)).length, of: rows.length, pass: rows.every(r => r.halted && atBal(r)) };
      for (const r of result.canary.rows) log(`canary ${r.seed}: ${r.halted ? 'HALTED @' + r.lastEvent : 'breathing'} exposed ${r.exposed} at18 ${r.at18}`);
      save(); continue;
    }
    if (step === 'DECOY') {
      result.arms.DECOY = []; const checks = [];
      for (const s of DECOY_SEEDS) {
        const r = runWorld(s, 'DECOY', H), b = base.find(x => x.seed === s);
        const mism = b.stable.filter((v, i) => v !== r.stable[i]).length + b.pop.filter((v, i) => v !== r.pop[i]).length + (b.stable.length !== r.stable.length ? 1 : 0);
        checks.push({ seed: s, samples: b.stable.length, mismatches: mism, cpuSec: r.cpuSec }); result.arms.DECOY.push(r);
        log(`decoy influx=100 ${s}: ${mism === 0 ? 'IDENTICAL to baseline' : mism + ' MISMATCHES'} over ${b.stable.length} samples (stable@40k ${r.at[H]} pop ${r.popAt[H]}, ${r.cpuSec} CPU-s)`);
      }
      result.decoy = { checks, pass: checks.every(c => c.mismatches === 0) }; save(); continue;
    }
    result.arms[step] = [];
    for (const s of SEEDS) {
      const r = runWorld(s, step, H); result.arms[step].push(r);
      log(`${step} ${s}: stable 20k/30k/40k = ${CUTOFFS.map(k => r.at[k]).join('/')} pop ${r.popAt[H]} energy/tick ${r.energyAt[H]} reach ${r.reachAt[H]} vocab ${r.vocabAt[H]} lens ${AGES.map(a => r.lens[H] && r.lens[H][a]).join('/')} (${r.cpuSec} CPU-s)`);
      save();
    }
  }
  result.base = base; score(result); save(); console.log(`wrote ${OUT}`);
}

// ── scoring (PREREG-dial-sweep.md §4) ─────────────────────────────────────────────────────────────────────────────
function score(result) {
  const base = result.base, baseMatched = base.filter(r => SEEDS.includes(r.seed));
  const summ = (rows, k) => rows && rows.length ? { n: rows.length, stable: +mean(rows.map(r => r.at[k])).toFixed(1), pop: Math.round(mean(rows.map(r => r.popAt[k]))), reach: +mean(rows.map(r => r.reachAt[k])).toFixed(2), maxReach: Math.max(...rows.map(r => r.reachAt[k])), energy: rows[0].energyAt && rows[0].energyAt[k] != null ? +mean(rows.map(r => r.energyAt[k])).toFixed(1) : null, vocab: Math.round(mean(rows.map(r => r.vocabAt[k]))), perSeed: rows.map(r => r.at[k]), lens: rows[0].lens && rows[0].lens[k] ? Object.fromEntries(AGES.map(a => [a, +mean(rows.map(r => r.lens[k][a])).toFixed(1)])) : null } : null;
  const byCut = {};
  for (const k of CUTOFFS) {
    const per = { BASE12: summ(base, k), BASE4: summ(baseMatched, k) };
    for (const a of Object.keys(ARMS)) if (result.arms[a]) per[a] = summ(result.arms[a], k);
    // yield elasticities on ln(Y−1): points Y3, Y4(BASE4), Y5, Y6 as available
    const ypts = [['Y3', 2], ['BASE4', 3], ['Y5', 4], ['Y6', 5]].filter(([a]) => per[a]);
    const lx = ypts.map(([, x]) => Math.log(x));
    const e = f => ypts.length >= 2 ? +lsq(lx, ypts.map(([a]) => Math.log(per[a][f]))).toFixed(2) : null;
    const eN = e('stable'), ePop = e('pop');
    const nicheSeq = ypts.map(([a]) => per[a].stable), ups = nicheSeq.slice(1).filter((v, i) => v > nicheSeq[i]).length;
    // mutation deltas vs matched baseline
    const mut = {}; for (const a of ['M025', 'M05', 'M2']) if (per[a]) mut[a] = { dStable: +((per[a].stable / per.BASE4.stable) - 1).toFixed(3), dPop: +((per[a].pop / per.BASE4.pop) - 1).toFixed(3) };
    byCut[k] = { per, yield: { points: ypts.map(([a, x]) => ({ arm: a, yMinus1: x, stable: per[a].stable, pop: per[a].pop, energy: per[a].energy })), eNiches: eN, ePop, ratio: eN !== null && ePop ? +(eN / ePop).toFixed(2) : null, upSteps: ups, steps: ypts.length - 1 }, mutation: mut };
  }
  const c = byCut[H]; let verdict, reason;
  const yv = c.yield, nY = yv.points.length - 1;
  if (result.canary && !result.canary.pass) { verdict = 'VOID'; reason = 'canary failed — the original law did not re-halt at 18'; }
  else if (result.decoy && !result.decoy.pass) { verdict = 'VOID'; reason = `decoy/harness failed — influx=100 (inert by code) diverged from the stored baseline (${result.decoy.checks.map(x => x.seed + ':' + x.mismatches).join(', ')} mismatches); either the harness or the baseline is wrong`; }
  else if (yv.eNiches === null || nY < 2) { verdict = 'INCOMPLETE'; reason = 'fewer than three yield levels scored'; }
  else if (yv.eNiches >= 0.5 && yv.ratio >= 0.5 && yv.upSteps >= nY - 1) { verdict = 'ENERGY-LIMITED'; reason = `niches rise with energy: elasticity ${yv.eNiches} on (Y−1) vs population ${yv.ePop} (ratio ${yv.ratio} ≥ 0.5), monotone in ${yv.upSteps}/${nY} steps — the more-individuals reading`; }
  else if (Math.abs(yv.eNiches) <= 0.2 && yv.ePop >= 0.5) { verdict = 'ARITHMETIC-INVARIANT'; reason = `population scales with energy (elasticity ${yv.ePop}) but the niche count does not (|${yv.eNiches}| ≤ 0.2) — more energy makes fuller keys, not more keys`; }
  else if (yv.eNiches <= -0.3) { verdict = 'INVERSE'; reason = `more energy → FEWER niches (elasticity ${yv.eNiches}; population ${yv.ePop}) — the crowd-per-key effect dominates`; }
  else { verdict = `MIXED (yield elasticity ${yv.eNiches}, population ${yv.ePop})`; reason = `niches move with energy but outside every pre-registered band: elasticity ${yv.eNiches} (ENERGY-LIMITED needed ≥ 0.5 with ratio ≥ 0.5 and monotone ${nY - 1}/${nY}; got ratio ${yv.ratio}, ${yv.upSteps}/${nY} up-steps; INVARIANT needed |e| ≤ 0.2)`; }
  // mutation dial
  const ms = Object.entries(c.mutation); let mutV, mutR;
  if (!ms.length) { mutV = 'INCOMPLETE'; mutR = 'no mutation arm scored'; }
  else {
    const turnover = ms.filter(([, d]) => Math.abs(d.dStable) >= 0.15 && Math.abs(d.dPop) < 0.10), both = ms.filter(([, d]) => Math.abs(d.dStable) >= 0.15 && Math.abs(d.dPop) >= 0.10), inert = ms.every(([, d]) => Math.abs(d.dStable) < 0.10);
    const dir = ([a, d]) => `${a} ${d.dStable > 0 ? '+' : ''}${Math.round(d.dStable * 100)}% niches, ${d.dPop > 0 ? '+' : ''}${Math.round(d.dPop * 100)}% pop`;
    if (inert) { mutV = 'MUTATION-INERT'; mutR = `every mutation level moves niches < 10% (${ms.map(dir).join('; ')})`; }
    else if (turnover.length && !both.length) { mutV = 'TURNOVER-LIMITED'; mutR = `mutation load moves niches ≥ 15% while population moves < 10%: ${turnover.map(dir).join('; ')}`; }
    else { mutV = 'MIXED (mutation)'; mutR = `niches and population both move, or only some levels: ${ms.map(dir).join('; ')}`; }
  }
  // reach
  const baseReach = c.per.BASE12.reach, armReach = Object.entries(c.per).filter(([a]) => ARMS[a] && a !== 'DECOY').map(([a, p]) => ({ arm: a, reach: p.reach, maxReach: p.maxReach }));
  const unp = armReach.filter(x => x.reach >= baseReach + 2);
  const reach = { verdict: unp.length ? 'REACH UNPINNED' : 'REACH PINNED', baseMean: baseReach, arms: armReach, reason: unp.length ? `${unp.map(x => x.arm + ' ' + x.reach).join(', ')} ≥ baseline ${baseReach} + 2` : `no arm's mean max reach at ${H / 1000}k reaches baseline ${baseReach} + 2 (arm means ${armReach.map(x => x.arm + ' ' + x.reach).join(', ')})` };
  const cpu = Object.values(result.arms).flat().reduce((a, r) => a + (r.cpuSec || 0), 0);
  result.verdicts = { main: { verdict, reason }, mutation: { verdict: mutV, reason: mutR }, reach, byCutoff: byCut, cpuSecTreatment: +cpu.toFixed(0) };
  console.log('\n── CANARY ──', JSON.stringify(result.canary && { haltedAt18: result.canary.haltedAt18, of: result.canary.of, pass: result.canary.pass }));
  console.log('── DECOY/HARNESS ──', JSON.stringify(result.decoy && { checks: result.decoy.checks.map(x => x.seed + ':' + x.mismatches), pass: result.decoy.pass }));
  for (const k of CUTOFFS) { console.log(`── @${k} ──`); for (const [a, p] of Object.entries(byCut[k].per)) if (p) console.log(`  ${a.padEnd(6)} n${p.n} stable ${p.stable} pop ${p.pop} energy/tick ${p.energy} reach ${p.reach}/${p.maxReach} vocab ${p.vocab}${p.lens ? ' lens ' + AGES.map(a => p.lens[a]).join('/') : ''}`); console.log('  yield e_niches', byCut[k].yield.eNiches, 'e_pop', byCut[k].yield.ePop, 'ratio', byCut[k].yield.ratio, 'up', byCut[k].yield.upSteps + '/' + byCut[k].yield.steps, '| mutation', JSON.stringify(byCut[k].mutation)); }
  console.log('── VERDICT ──'); console.log(`${verdict} — ${reason}`); console.log(`${mutV} — ${mutR}`); console.log(`${reach.verdict} — ${reach.reason}`); console.log(`treatment CPU ${cpu.toFixed(0)} s`);
}
