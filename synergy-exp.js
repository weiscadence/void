// void synergy v2 — does behavioural diversity keep growing when parts modify each other
// (Binding-of-Isaac item synergies) versus parts that act independently? (PREREG-synergy2.md)
// v2 reruns PREREG-synergy.md with the two flaws RESULT-synergy.md named fixed in lib/synergy.js:
// a counterfactual (simulated-null) synergy detector and a qualitative far-food lock. The v1 run
// is kept at data/synergy-v1.json; the v1 linear detector is reported alongside, not used.
//
//   node synergy-exp.js            full pre-registered run (writes data/synergy.json)
//   node synergy-exp.js --smoke    2 seeds × 1,500 ticks, no file written
//
// Serial, nice 19. Budget ≤ 15 CPU-min; the script checks the clock and marks an aborted world.
'use strict';
const fs = require('fs'), path = require('path');
const S = require('./lib/synergy.js');

const SMOKE = process.argv.includes('--smoke');
const TICKS = SMOKE ? 1500 : 9000, EVERY = 300;
const CUTOFFS = SMOKE ? [500, 1000, 1500] : [3000, 6000, 9000];
const SEEDS = SMOKE ? [11, 22] : [11, 22, 33, 44, 55];
const ARMS = ['compose', 'additive'];
const N0 = 40, FOOD0 = 60;
const BUDGET_MS = 15 * 60 * 1000, T0 = Date.now();
const cache = new Map();                                        // descriptor cache shared across worlds (arm-keyed)

function runWorld(seed, arm) {
  const W = S.World(seed * 104729 + ARMS.indexOf(arm) + 1, { arm });
  for (let i = 0; i < N0; i++) { const n = 1 + W.R.int(2); const ps = []; for (let k = 0; k < n; k++) ps.push(W.R.pick(S.IDS)); const a = W.R() * Math.PI * 2, r = W.R() * 0.3; W.spawn(ps, r * Math.cos(a), r * Math.sin(a), 2); }
  for (let k = 0; k < FOOD0; k++) { const a = W.R() * Math.PI * 2, r = W.R() * 0.3; W.addFood(0, r * Math.cos(a), r * Math.sin(a)); }
  const seenCells = new Set(), seenSyn = new Map(), seenGenomes = new Set(), seenLin = new Set(); const series = []; let aborted = false;
  let eatenPrev = [0, 0, 0];
  for (let t = 1; t <= TICKS; t++) {
    W.step();
    if (t % EVERY) continue;
    const freq = new Map(); for (const c of W.creatures) freq.set(c.key, (freq.get(c.key) || 0) + 1);
    const cells = new Set(); let newCells = 0, newSyn = 0, synNow = 0, synPop = 0, newLin = 0;
    for (const [key, n] of freq) {
      const parts = key.split('+');
      const r = S.synergy(parts, arm, cache);                   // describe() is cached inside
      cells.add(r.cell); if (!seenCells.has(r.cell)) { seenCells.add(r.cell); newCells++; }
      seenGenomes.add(key);
      if (r.isSynergy) { synNow++; synPop += n; const sk = parts.slice().sort().join('+'); if (!seenSyn.has(sk)) { seenSyn.set(sk, { parts, score: r.score, axis: r.axisName, t, words: S.words({ norm: r.actual }), nullWords: r.nullWords, n }); newSyn++; } }
      const L = S.synergyLinear(parts, arm, cache);             // v1 detector, for the record only
      if (L.isSynergy) { const sk = parts.slice().sort().join('+'); if (!seenLin.has(sk)) { seenLin.add(sk); newLin++; } }
    }
    const eaten = W.eaten.slice(); const dEat = eaten.map((v, i) => v - eatenPrev[i]); eatenPrev = eaten;
    const np = W.creatures.map(c => c.parts.length);
    series.push({ t, pop: W.creatures.length, genomes: freq.size, genomesSeen: seenGenomes.size, cellsNow: cells.size, cellsSeen: seenCells.size, newCells, synNow, synSeen: seenSyn.size, newSyn, synShare: W.creatures.length ? +(synPop / W.creatures.length).toFixed(3) : 0, linSeen: seenLin.size, newLin,
      eatenWindow: dEat, meanParts: np.length ? +(np.reduce((a, b) => a + b, 0) / np.length).toFixed(2) : 0, maxParts: np.length ? Math.max(...np) : 0, births: W.births, deaths: W.deaths, food: W.food.length, proj: W.proj.length,
      top: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ parts: k, n })) });
    if (Date.now() - T0 > BUDGET_MS) { aborted = true; series.push({ t, aborted: true }); break; }
  }
  const ok = series.filter(s => !s.aborted);
  const windows = CUTOFFS.map((c, i) => { const lo = i ? CUTOFFS[i - 1] : 0; const w = ok.filter(s => s.t > lo && s.t <= c); return { cutoff: c, newCells: w.reduce((a, s) => a + s.newCells, 0), newSyn: w.reduce((a, s) => a + s.newSyn, 0), farEaten: w.reduce((a, s) => a + s.eatenWindow[2], 0), midEaten: w.reduce((a, s) => a + s.eatenWindow[1], 0), meanPop: w.length ? +(w.reduce((a, s) => a + s.pop, 0) / w.length).toFixed(1) : 0 }; });
  const last = ok[ok.length - 1];
  const syn = [...seenSyn.values()].sort((a, b) => b.score - a.score);
  return { seed, arm, series, windows, aborted, final: last, cellsSeen: seenCells.size, synSeen: seenSyn.size, linSeen: seenLin.size, synShareEnd: last ? last.synShare : 0, farTotal: W.eaten[2], genomesSeen: seenGenomes.size, topSynergies: syn.slice(0, 12), extinct: W.creatures.length === 0,
    snapshot: W.creatures.slice(0, 60).map(c => ({ parts: c.parts, x: +c.x.toFixed(3), y: +c.y.toFixed(3), e: +c.e.toFixed(2) })) };
}

// ── CANARIES (observer-level, run before the worlds) ─────────────────────────
// (a) the hand-built {emit, boost, split, homing, tether} must register as a synergy in the compose
//     arm AND eat far food in the test arena, while no single part eats far food (v2 lock);
// (b) {thrust, emit} — legs and a gun, independent channels — must score < theta in the compose arm;
// (c) {thrust, orbit} — orbit rewrites what thrust produced — must register (coupling the detector must see);
// (d) THE ADDITIVE NULL: 60 random additive-arm genomes (2–6 parts) must all score exactly 0 — the
//     detector's null model and the control arm are the same program, so the physics cannot leak in.
function canary() {
  const known = ['emit', 'boost', 'split', 'homing', 'tether'], pair = ['thrust', 'emit'], couple = ['thrust', 'orbit'];
  const k = S.synergy(known, 'compose', cache);
  const singlesFar = S.IDS.map(p => S.describe([p], 'compose').raw[8]);
  const pc = S.synergy(pair, 'compose', cache), pa = S.synergy(pair, 'additive', cache), cp = S.synergy(couple, 'compose', cache);
  const R = S.rng(2026); let addMax = 0, addN = 0;
  for (let i = 0; i < 60; i++) { const n = 2 + R.int(5); const ps = []; for (let j = 0; j < n; j++) ps.push(R.pick(S.IDS)); const r = S.synergy(ps, 'additive', cache); addMax = Math.max(addMax, r.score); addN++; }
  const out = { known: { parts: known, score: k.score, axis: k.axisName, isSynergy: k.isSynergy, farEaten: k.raw[8], words: S.words({ norm: k.actual }), nullWords: k.nullWords }, singlesMaxFar: Math.max(...singlesFar),
    pairCompose: { parts: pair, score: pc.score, isSynergy: pc.isSynergy }, pairAdditive: { parts: pair, score: pa.score, isSynergy: pa.isSynergy },
    couple: { parts: couple, score: cp.score, axis: cp.axisName, isSynergy: cp.isSynergy }, additiveNull: { n: addN, maxScore: addMax } };
  out.pass = k.isSynergy && k.raw[8] > 0 && out.singlesMaxFar === 0 && !pc.isSynergy && !pa.isSynergy && cp.isSynergy && addMax === 0;
  return out;
}

function main() {
  const can = canary();
  console.log('canary', JSON.stringify(can));
  const worlds = [];
  for (const seed of SEEDS) for (const arm of ARMS) {
    const t0 = Date.now(); const w = runWorld(seed, arm); w.ms = Date.now() - t0; worlds.push(w);
    console.log(`${arm} seed ${seed}: pop ${w.final ? w.final.pop : 0} cellsSeen ${w.cellsSeen} synSeen ${w.synSeen} (v1 linear ${w.linSeen}) synShare ${w.synShareEnd} genomes ${w.genomesSeen} windows ${w.windows.map(x => x.newCells).join('/')} far ${w.windows.map(x => x.farEaten).join('/')} maxParts ${w.final ? w.final.maxParts : 0} ${w.aborted ? 'ABORTED' : ''} ${(w.ms / 1000).toFixed(1)}s`);
    if (w.topSynergies[0]) console.log('   top synergy', w.topSynergies[0].parts.join('+'), w.topSynergies[0].score, w.topSynergies[0].axis, '—', w.topSynergies[0].words);
    if (Date.now() - T0 > BUDGET_MS) { console.log('BUDGET EXCEEDED — stopping after this world'); break; }
  }
  // ── verdict by the pre-registered rule (PREREG-synergy2.md §4) ──────────────
  const comp = worlds.filter(w => w.arm === 'compose'), add = worlds.filter(w => w.arm === 'additive');
  const growing = comp.filter(w => !w.aborted && w.windows[2].newCells >= w.windows[0].newCells / 3).length;
  let cellsWin = 0, synFound = 0, synUsed = 0, farWin = 0, paired = 0;
  for (const c of comp) { const a = add.find(x => x.seed === c.seed); if (!a) continue; paired++; if (c.cellsSeen > a.cellsSeen) cellsWin++; if (c.synSeen >= 20) synFound++; if (c.synShareEnd >= 0.25) synUsed++; if (c.farTotal > a.farTotal) farWin++; }
  const need = Math.ceil(paired * 0.8);
  const lockHolds = add.every(a => a.farTotal === 0);          // the additive arm cannot open the far food, by construction
  const addSynZero = add.every(a => a.synSeen === 0);          // the simulated null scores the control at 0, in the worlds too
  let verdict = !can.pass ? 'VOID' : (growing >= Math.ceil(comp.length * 0.8) ? 'GROWING' : 'SATURATED') + '-' + (cellsWin >= need && synFound >= need && synUsed >= need ? 'SYNERGIC' : 'FLAT');
  const synWin = synFound;
  const result = { version: 2, generated: new Date().toISOString(), smoke: SMOKE, lockHolds, addSynZero, synUsed, ticks: TICKS, every: EVERY, cutoffs: CUTOFFS, seeds: SEEDS, arms: ARMS, theta: S.SYN_THETA, canary: can, verdict, growingWorlds: growing, cellsWin, synWin, farWin, paired,
    worlds, cpuMin: +((Date.now() - T0) / 60000).toFixed(2), palette: S.PALETTE.map(p => p.id) };
  console.log('VERDICT', verdict, { growing, cellsWin, synFound, synUsed, farWin, paired, lockHolds, addSynZero, cpuMin: result.cpuMin });
  if (!SMOKE) { const out = path.join(__dirname, 'data', 'synergy.json'); fs.writeFileSync(out + '.tmp', JSON.stringify(result)); fs.renameSync(out + '.tmp', out); console.log('wrote', out); }
}
main();
