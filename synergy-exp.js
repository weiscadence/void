// void synergy — does behavioural diversity keep growing when parts modify each other
// (Binding-of-Isaac item synergies) versus parts that act independently? (PREREG-synergy.md)
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
  const seenCells = new Set(), seenSyn = new Map(), seenGenomes = new Set(); const series = []; let aborted = false;
  let eatenPrev = [0, 0, 0];
  for (let t = 1; t <= TICKS; t++) {
    W.step();
    if (t % EVERY) continue;
    const freq = new Map(); for (const c of W.creatures) freq.set(c.key, (freq.get(c.key) || 0) + 1);
    const cells = new Set(); let newCells = 0, newSyn = 0, synNow = 0;
    for (const [key, n] of freq) {
      const parts = key.split('+');
      const r = S.synergy(parts, arm, cache);                   // describe() is cached inside
      cells.add(r.cell); if (!seenCells.has(r.cell)) { seenCells.add(r.cell); newCells++; }
      seenGenomes.add(key);
      if (r.isSynergy) { synNow++; const sk = parts.slice().sort().join('+'); if (!seenSyn.has(sk)) { seenSyn.set(sk, { parts, score: r.score, axis: r.axisName, t, words: S.words({ norm: r.actual }), n }); newSyn++; } }
    }
    const eaten = W.eaten.slice(); const dEat = eaten.map((v, i) => v - eatenPrev[i]); eatenPrev = eaten;
    const np = W.creatures.map(c => c.parts.length);
    series.push({ t, pop: W.creatures.length, genomes: freq.size, genomesSeen: seenGenomes.size, cellsNow: cells.size, cellsSeen: seenCells.size, newCells, synNow, synSeen: seenSyn.size, newSyn,
      eatenWindow: dEat, meanParts: np.length ? +(np.reduce((a, b) => a + b, 0) / np.length).toFixed(2) : 0, maxParts: np.length ? Math.max(...np) : 0, births: W.births, deaths: W.deaths, food: W.food.length, proj: W.proj.length,
      top: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ parts: k, n })) });
    if (Date.now() - T0 > BUDGET_MS) { aborted = true; series.push({ t, aborted: true }); break; }
  }
  const ok = series.filter(s => !s.aborted);
  const windows = CUTOFFS.map((c, i) => { const lo = i ? CUTOFFS[i - 1] : 0; const w = ok.filter(s => s.t > lo && s.t <= c); return { cutoff: c, newCells: w.reduce((a, s) => a + s.newCells, 0), newSyn: w.reduce((a, s) => a + s.newSyn, 0), farEaten: w.reduce((a, s) => a + s.eatenWindow[2], 0), midEaten: w.reduce((a, s) => a + s.eatenWindow[1], 0), meanPop: w.length ? +(w.reduce((a, s) => a + s.pop, 0) / w.length).toFixed(1) : 0 }; });
  const last = ok[ok.length - 1];
  const syn = [...seenSyn.values()].sort((a, b) => b.score - a.score);
  return { seed, arm, series, windows, aborted, final: last, cellsSeen: seenCells.size, synSeen: seenSyn.size, genomesSeen: seenGenomes.size, topSynergies: syn.slice(0, 12), extinct: W.creatures.length === 0,
    snapshot: W.creatures.slice(0, 60).map(c => ({ parts: c.parts, x: +c.x.toFixed(3), y: +c.y.toFixed(3), e: +c.e.toFixed(2) })) };
}

// ── CANARIES (observer-level, run before the worlds) ─────────────────────────
// (a) the hand-built synergy {radial, thrust, emit, boost, homing, tether} must register as a
//     synergy in the compose arm AND eat far food in the test arena, while no single part eats far food;
// (b) {thrust, emit} — legs and a gun, independent channels — must NOT register in either arm.
function canary() {
  const known = ['radial', 'thrust', 'emit', 'boost', 'homing', 'tether'], pair = ['thrust', 'emit'];
  const k = S.synergy(known, 'compose', cache);
  const singlesFar = S.IDS.map(p => S.describe([p], 'compose').raw[8]);
  const pc = S.synergy(pair, 'compose', cache), pa = S.synergy(pair, 'additive', cache);
  const out = { known: { parts: known, score: k.score, axis: k.axisName, isSynergy: k.isSynergy, farEaten: k.raw[8], words: S.words({ norm: k.actual }) }, singlesMaxFar: Math.max(...singlesFar),
    pairCompose: { parts: pair, score: pc.score, isSynergy: pc.isSynergy }, pairAdditive: { parts: pair, score: pa.score, isSynergy: pa.isSynergy } };
  out.pass = k.isSynergy && k.raw[8] > 0 && out.singlesMaxFar === 0 && !pc.isSynergy && !pa.isSynergy;
  return out;
}

function main() {
  const can = canary();
  console.log('canary', JSON.stringify(can));
  const worlds = [];
  for (const seed of SEEDS) for (const arm of ARMS) {
    const t0 = Date.now(); const w = runWorld(seed, arm); w.ms = Date.now() - t0; worlds.push(w);
    console.log(`${arm} seed ${seed}: pop ${w.final ? w.final.pop : 0} cellsSeen ${w.cellsSeen} synSeen ${w.synSeen} genomes ${w.genomesSeen} windows ${w.windows.map(x => x.newCells).join('/')} far ${w.windows.map(x => x.farEaten).join('/')} maxParts ${w.final ? w.final.maxParts : 0} ${w.aborted ? 'ABORTED' : ''} ${(w.ms / 1000).toFixed(1)}s`);
    if (w.topSynergies[0]) console.log('   top synergy', w.topSynergies[0].parts.join('+'), w.topSynergies[0].score, w.topSynergies[0].axis, '—', w.topSynergies[0].words);
    if (Date.now() - T0 > BUDGET_MS) { console.log('BUDGET EXCEEDED — stopping after this world'); break; }
  }
  // ── verdict by the pre-registered rule ──────────────────────────────────────
  const comp = worlds.filter(w => w.arm === 'compose'), add = worlds.filter(w => w.arm === 'additive');
  const growing = comp.filter(w => !w.aborted && w.windows[2].newCells >= w.windows[0].newCells / 3).length;
  let cellsWin = 0, synWin = 0, farWin = 0, paired = 0;
  for (const c of comp) { const a = add.find(x => x.seed === c.seed); if (!a) continue; paired++; if (c.cellsSeen > a.cellsSeen) cellsWin++; if (c.synSeen > a.synSeen) synWin++; const cf = c.windows.reduce((s, w) => s + w.farEaten, 0), af = a.windows.reduce((s, w) => s + w.farEaten, 0); if (cf > af) farWin++; }
  const need = Math.ceil(paired * 0.8);
  let verdict = !can.pass ? 'VOID' : (growing >= Math.ceil(comp.length * 0.8) ? 'GROWING' : 'SATURATED') + '-' + (cellsWin >= need && synWin >= need ? 'SYNERGIC' : 'FLAT');
  const result = { generated: new Date().toISOString(), smoke: SMOKE, ticks: TICKS, every: EVERY, cutoffs: CUTOFFS, seeds: SEEDS, arms: ARMS, theta: S.SYN_THETA, canary: can, verdict, growingWorlds: growing, cellsWin, synWin, farWin, paired,
    worlds, cpuMin: +((Date.now() - T0) / 60000).toFixed(2), palette: S.PALETTE.map(p => p.id) };
  console.log('VERDICT', verdict, { growing, cellsWin, synWin, farWin, paired, cpuMin: result.cpuMin });
  if (!SMOKE) { const out = path.join(__dirname, 'data', 'synergy.json'); fs.writeFileSync(out + '.tmp', JSON.stringify(result)); fs.renameSync(out + '.tmp', out); console.log('wrote', out); }
}
main();
