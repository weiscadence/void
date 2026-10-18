// void garden — novelty search over sacred-geometry expression programs.
// Question (PREREG-garden.md): does a MACRO op — inlining an EVOLVED sub-tree lifted
// from the archive (code that makes code) — sustain novelty longer than the same
// mutation spending its budget on a RANDOM sub-tree?
//
//   node garden-exp.js                 full pre-registered run (writes data/garden.json)
//   node garden-exp.js --smoke         2 seeds × 12 gens, no file written
//
// Serial, nice 19 recommended. Budget ≤ 15 CPU-min; the script checks the clock.
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./lib/garden.js');

const SMOKE = process.argv.includes('--smoke');
const SIZE = 48;                 // render size for the observer
const POP = 64, GENS = SMOKE ? 12 : 300, KNN = 5, MAX_SIZE = 40;
const ADD_THRESH = 0.20;         // novelty needed to enter the archive (random-init leave-one-out median is 0.168)
const SEEDS = SMOKE ? [11, 22] : [11, 22, 33, 44, 55, 66];
const ARMS = ['macro', 'control'];
const CUTOFFS = SMOKE ? [4, 8, 12] : [100, 200, 300];
const BUDGET_MS = 15 * 60 * 1000, T0 = Date.now();

function evalGenome(g) {
  const img = G.render(g.tree, SIZE);
  const d = G.describe(img, SIZE);
  return d;
}

function runWorld(seed, arm) {
  const R = G.rng(seed * 7919 + (arm === 'macro' ? 1 : 2));
  let nextId = 1;
  const archive = [];                                   // {id, gen, tree, hue, desc, novelty, parent, macros}
  const seenCells = new Set();                          // coverage: 4 bins per descriptor dim
  const cellOf = d => d.map(v => Math.min(3, Math.floor(v * 4))).join(',');
  const series = [];                                    // per-generation log
  // donor: macro arm lifts a real evolved sub-tree (depth ≥ 2) from a random archive member
  const donor = arm === 'macro' ? (R) => {
    if (archive.length < 2) return null;
    const src = R.pick(archive);
    const cands = G.nodes(src.tree).filter(n => G.depth(n.node) >= 2 && G.size(n.node) <= 14 && n.node[0] !== 'M');
    if (!cands.length) return null;
    return { srcId: src.id, tree: R.pick(cands).node };
  } : null;

  let pop = [];
  for (let i = 0; i < POP; i++) pop.push({ tree: G.randomTree(R, 4, true), hue: R(), macros: [], parent: null });
  for (let gen = 1; gen <= GENS; gen++) {
    // evaluate
    const descs = [];
    for (const g of pop) { const d = evalGenome(g); g.d = d; g.blank = d.blank; descs.push(d.desc); }
    const pool = archive.map(a => a.desc).concat(descs);
    let added = 0, newCells = 0, nsum = 0, nn = 0;
    for (const g of pop) {
      g.nov = g.blank ? 0 : G.novelty(g.d.desc, pool.filter(p => p !== g.d.desc), KNN);
      if (!g.blank) { nsum += g.nov; nn++; }
      if (!g.blank && g.nov > ADD_THRESH) {
        const id = nextId++;
        archive.push({ id, gen, seed, arm, tree: g.tree, hue: g.hue, desc: g.d.desc, novelty: +g.nov.toFixed(4), parent: g.parent, macros: g.macros.slice(),
          symOrder: g.d.symOrder, radialFreq: g.d.radialFreq, fractalDim: +g.d.fractalDim.toFixed(3), edgeDensity: +g.d.edgeDensity.toFixed(3), fibShare: +g.d.fibShare.toFixed(3) });
        g.archId = id; added++;
        const c = cellOf(g.d.desc); if (!seenCells.has(c)) { seenCells.add(c); newCells++; }
      }
    }
    const macroBearing = archive.filter(a => G.macroRefs(a.tree).length).length;
    series.push({ gen, archive: archive.length, added, cells: seenCells.size, newCells, meanNovelty: nn ? +(nsum / nn).toFixed(4) : 0, blank: pop.filter(g => g.blank).length, macroBearing });
    // select: tournament on novelty, reproduce by mutation
    const next = [];
    for (let i = 0; i < POP; i++) {
      const a = R.pick(pop), b = R.pick(pop); const p = a.nov >= b.nov ? a : b;
      const child = G.mutate({ tree: p.tree, hue: p.hue, macros: [] }, R, donor, MAX_SIZE);
      child.parent = p.archId || p.parent || null; // nearest archived ancestor
      next.push(child);
    }
    pop = next;
    if (Date.now() - T0 > BUDGET_MS) { series.push({ gen, aborted: true }); break; }
  }
  // sustained-novelty summary at cutoffs: additions in the window ending at each cutoff
  const windows = CUTOFFS.map((c, i) => { const lo = i ? CUTOFFS[i - 1] : 0; const w = series.filter(s => s.gen > lo && s.gen <= c && !s.aborted); return { cutoff: c, added: w.reduce((a, s) => a + s.added, 0), newCells: w.reduce((a, s) => a + s.newCells, 0), archive: w.length ? w[w.length - 1].archive : 0, cells: w.length ? w[w.length - 1].cells : 0 }; });
  return { seed, arm, series, windows, archive, finalArchive: archive.length, finalCells: seenCells.size, macroBearing: archive.filter(a => G.macroRefs(a.tree).length).length };
}

// ── CANARY: can the observer see? ────────────────────────────────────────────
// (a) A planted known-novel form — eleven gaussian petals, a shape checked (before
//     the prereg) to sit outside 400 random inits — must score novelty against the
//     finished archive at or above the 90th percentile of the archive members' own
//     leave-one-out novelty. (b) An exact duplicate of an archive member must score
//     < 1e-6 against the archive. Miss either → VOID.
function canary(world) {
  const pool = world.archive.map(a => a.desc);
  const planted = ['fold', 11, ['gauss', ['mul', ['k', 3], ['add', ['t'], ['k', -0.28]]]]];
  const pd = G.describe(G.render(planted, SIZE), SIZE);
  const plantedNov = pd.blank ? 0 : G.novelty(pd.desc, pool, KNN);
  const loo = pool.map((d, i) => G.novelty(d, pool.filter((_, j) => j !== i), KNN)).sort((a, b) => a - b);
  const p90 = loo.length ? loo[Math.floor(loo.length * 0.9)] : 0;
  const dup = world.archive[world.archive.length >> 1];
  const dd = G.describe(G.render(dup.tree, SIZE), SIZE);
  const dupNov = G.novelty(dd.desc, pool, 1);
  return { plantedDesc: pd.desc.map(x => +x.toFixed(3)), plantedNov: +plantedNov.toFixed(4), archiveLooP90: +p90.toFixed(4), plantedPass: plantedNov >= p90, dupNov: +dupNov.toFixed(8), dupPass: dupNov < 1e-6, pass: plantedNov >= p90 && dupNov < 1e-6 };
}

// ── RUN ──────────────────────────────────────────────────────────────────────
const worlds = [];
for (const seed of SEEDS) for (const arm of ARMS) {
  const t = Date.now(); const w = runWorld(seed, arm); w.cpuSec = +((Date.now() - t) / 1000).toFixed(1);
  console.log(`[${arm} ${seed}] archive ${w.finalArchive} cells ${w.finalCells} macro-bearing ${w.macroBearing} windows ${w.windows.map(x => x.added).join('/')} ${w.cpuSec}s`);
  worlds.push(w);
  if (Date.now() - T0 > BUDGET_MS) { console.log('BUDGET HIT — stopping after this world'); break; }
}
const can = canary(worlds.find(w => w.arm === 'macro'));
console.log('canary', JSON.stringify(can));

// verdict by the pre-registered rule
const by = arm => worlds.filter(w => w.arm === arm);
const pairs = SEEDS.map(s => ({ seed: s, m: by('macro').find(w => w.seed === s), c: by('control').find(w => w.seed === s) })).filter(p => p.m && p.c);
const lastIdx = CUTOFFS.length - 1;
const lateWins = pairs.filter(p => p.m.windows[lastIdx].added > p.c.windows[lastIdx].added).length;
const lateLoss = pairs.filter(p => p.m.windows[lastIdx].added < p.c.windows[lastIdx].added).length;
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const mArch = mean(pairs.map(p => p.m.finalArchive)), cArch = mean(pairs.map(p => p.c.finalArchive));
const mCells = mean(pairs.map(p => p.m.finalCells)), cCells = mean(pairs.map(p => p.c.finalCells));
const mLate = mean(pairs.map(p => p.m.windows[lastIdx].added)), cLate = mean(pairs.map(p => p.c.windows[lastIdx].added));
let verdict;
if (!can.pass) verdict = 'VOID';
else if (lateWins >= Math.ceil(pairs.length * 0.75) && mArch >= 1.15 * cArch) verdict = 'MACRO-SUSTAINS';
else if (lateLoss >= Math.ceil(pairs.length * 0.75) && cArch >= 1.15 * mArch) verdict = 'MACRO-HURTS';
else verdict = 'NULL';
// saturation reading: is the last window's addition rate < 1/3 of the first's in both arms?
const satur = arm => mean(by(arm).map(w => w.windows[lastIdx].added)) < mean(by(arm).map(w => w.windows[0].added)) / 3;
const summary = { verdict, pairs: pairs.length, lateWins, lateLoss, mean: { macro: { archive: +mArch.toFixed(1), cells: +mCells.toFixed(1), lateAdded: +mLate.toFixed(1) }, control: { archive: +cArch.toFixed(1), cells: +cCells.toFixed(1), lateAdded: +cLate.toFixed(1) } }, saturated: { macro: satur('macro'), control: satur('control') }, canary: can, cpuSec: +((Date.now() - T0) / 1000).toFixed(1) };
console.log(JSON.stringify(summary, null, 1));

if (!SMOKE) {
  const out = { written: new Date().toISOString(), config: { SIZE, POP, GENS, KNN, MAX_SIZE, ADD_THRESH, SEEDS, CUTOFFS }, summary,
    worlds: worlds.map(w => ({ seed: w.seed, arm: w.arm, cpuSec: w.cpuSec, finalArchive: w.finalArchive, finalCells: w.finalCells, macroBearing: w.macroBearing, windows: w.windows, series: w.series })) };
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', 'garden.json'), JSON.stringify(out));
  // the gallery: every archived genome from every world (the page renders them live)
  const gallery = [];
  for (const w of worlds) for (const a of w.archive) gallery.push({ id: `${w.arm[0]}${w.seed}-${a.id}`, world: `${w.arm}/${w.seed}`, gen: a.gen, tree: a.tree, hue: +a.hue.toFixed(3), novelty: a.novelty, parent: a.parent ? `${w.arm[0]}${w.seed}-${a.parent}` : null, macros: a.macros.map(m => `${w.arm[0]}${w.seed}-${m}`), symOrder: a.symOrder, radialFreq: a.radialFreq, fractalDim: a.fractalDim, edgeDensity: a.edgeDensity, fibShare: a.fibShare });
  fs.writeFileSync(path.join(__dirname, 'data', 'garden-archive.json'), JSON.stringify({ written: out.written, count: gallery.length, gallery }));
  console.log('wrote data/garden.json and data/garden-archive.json', gallery.length, 'genomes');
}
