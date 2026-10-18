// void soup — do self-maintaining organizations arise spontaneously from random
// drawable programs, and does the soup keep producing new form-types after they do?
// (PREREG-soup.md). Fontana & Buss 1994 reactor + lib/garden.js molecules + the
// garden's observer; BFF (Agüera y Arcas et al. 2024) is the comparison for WHEN.
//
//   node soup-exp.js            full pre-registered run (writes data/soup.json)
//   node soup-exp.js --smoke    2 seeds × 150 steps, no file written
//
// Serial, nice 19. Budget ≤ 15 CPU-min; the script checks the clock.
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./lib/garden.js'), S = require('./lib/soup.js');

const SMOKE = process.argv.includes('--smoke');
const N = 300, MAX_SIZE = 24, MU = 0.02, CLEAVE = 0.3, DEPTH = 3, RENDER = 32;
const STEPS = SMOKE ? 150 : 1500, EVERY = 50;                 // checkpoint every 50 steps (one step = N collisions)
const CUTOFFS = SMOKE ? [50, 100, 150] : [500, 1000, 1500];
const SEEDS = SMOKE ? [11, 22] : [11, 22, 33, 44, 55];
const ARMS = ['react', 'nocopy', 'control'];
const MIN_LIFE = 5;                                           // checkpoints (250 steps) for an organization to count as persisting
const BUDGET_MS = 15 * 60 * 1000, T0 = Date.now();

function runWorld(seed, arm) {
  const Rx = S.Reactor(seed * 7919 + ARMS.indexOf(arm) + 1, { N, maxSize: MAX_SIZE, mu: MU, cleave: CLEAVE, depth: DEPTH, arm, logSize: N * EVERY });
  const seenCells = new Set(); const series = []; let firstCopier = null, firstReplicator = null, firstOrg = null, firstRealized = null;
  const tracks = [];                                          // organization lifetimes: {members, first, last, alive}
  for (let t = 1; t <= STEPS; t++) {
    Rx.step(N);
    if (firstCopier === null && Rx.pop.some(p => S.VARS.has(p.tree[0]))) firstCopier = t;
    if (t % EVERY) continue;
    const sp = Rx.species();
    // observer: describe every present species (cached), count new descriptor cells
    let newCells = 0, blank = 0; const cells = new Set();
    for (const s of sp.values()) { const d = S.describe(s.tree, s.key, RENDER); if (d.blank) { blank++; continue; } const c = S.cellOf(d.desc); cells.add(c); if (!seenCells.has(c)) { seenCells.add(c); newCells++; } }
    // organizations: potential (closed + self-maintaining under the rule) and realized (being produced)
    const det = S.organizations(sp, { maxSize: MAX_SIZE, noCopy: arm === 'nocopy' });
    const orgs = det.level1.map(o => Object.assign(o, S.realized(o, Rx.recent)));
    const reps = det.replicators.map(o => Object.assign(o, S.realized(o, Rx.recent)));
    const real = orgs.filter(o => o.realized), realReps = reps.filter(o => o.realized);
    if (firstReplicator === null && realReps.length) firstReplicator = t;
    if (firstOrg === null && orgs.length) firstOrg = t;
    if (firstRealized === null && real.length) firstRealized = t;
    // lifetimes: match realized orgs to live tracks by Jaccard ≥ 0.5
    for (const tr of tracks) tr.matched = false;
    for (const o of real) { let best = null, bj = 0; for (const tr of tracks) if (tr.alive && !tr.matched) { const j = S.jaccard(tr.members, o.members); if (j > bj) { bj = j; best = tr; } }
      if (best && bj >= 0.5) { best.matched = true; best.last = t; best.members = o.members; best.checkpoints++; } else tracks.push({ members: o.members, first: t, last: t, alive: true, matched: true, checkpoints: 1, copyShare: o.copyShare }); }
    for (const tr of tracks) if (tr.alive && !tr.matched) tr.alive = false;
    const copiers = Rx.pop.filter(p => S.VARS.has(p.tree[0])).length;
    const H = (() => { let h = 0; for (const s of sp.values()) { const p = s.n / Rx.pop.length; h -= p * Math.log(p); } return +h.toFixed(3); })();
    series.push({ t, pop: Rx.pop.length, mass: Rx.mass(), species: sp.size, entropy: H, copiers, meanSize: +(Rx.mass() / Rx.pop.length).toFixed(2), cellsNow: cells.size, cellsSeen: seenCells.size, newCells, blank,
      potentialOrgs: orgs.length, realizedOrgs: real.length, largestRealized: real.length ? real[0].size : 0, realizedCopyShare: real.length ? +(real.reduce((a, o) => a + o.copyShare, 0) / real.length).toFixed(3) : null,
      replicators: reps.length, realizedReplicators: realReps.length, produced: Rx.produced, discarded: Rx.discarded, cleaved: Rx.cleaved, copies: Rx.copies, injected: Rx.injected,
      sample: real.slice(0, 3).map(o => ({ size: o.size, abundance: o.abundance, copyShare: o.copyShare, maintained: o.maintained, members: o.members.map(k => G.toCode(JSON.parse(k))) })) });
    if (Date.now() - T0 > BUDGET_MS) { series.push({ t, aborted: true }); break; }
  }
  const windows = CUTOFFS.map((c, i) => { const lo = i ? CUTOFFS[i - 1] : 0; const w = series.filter(s => s.t > lo && s.t <= c && !s.aborted); return { cutoff: c, newCells: w.reduce((a, s) => a + s.newCells, 0), meanSpecies: w.length ? +(w.reduce((a, s) => a + s.species, 0) / w.length).toFixed(1) : 0, meanRealized: w.length ? +(w.reduce((a, s) => a + s.realizedOrgs, 0) / w.length).toFixed(2) : 0 }; });
  const lives = tracks.map(tr => tr.checkpoints).sort((a, b) => a - b);
  const last = series.filter(s => !s.aborted).slice(-1)[0];
  return { seed, arm, series, windows, firstCopier, firstReplicator, firstOrg, firstRealized, tracks: tracks.length, medianLife: lives.length ? lives[lives.length >> 1] : 0, maxLife: lives.length ? lives[lives.length - 1] : 0, persisting: tracks.filter(tr => tr.checkpoints >= MIN_LIFE).length, final: last,
    finalRealizedCopyShare: last ? last.realizedCopyShare : null, snapshot: [...Rx.species().values()].sort((a, b) => b.n - a.n).slice(0, 40).map(s => ({ tree: s.tree, n: s.n })) };
}

// ── CANARY + DECOY (detector-level, run before the worlds) ───────────────────
// (a) planted autocatalytic pair {abs(x), abs(y)} — abs(x)∘abs(y) = abs(abs(y)) → abs(y),
//     abs(y)∘abs(x) → abs(x), each also copies itself — inside a random population must be
//     detected as a Level-1 organization, and a reactor holding only that pair (cleave 0)
//     must show it REALIZED (both members produced by in-set reactions) after 3 steps of 40
//     collisions. ({x, abs(x)} was tried first: closed and self-maintaining on paper, but x
//     is made only by x∘x and is gone within ~100 collisions — a copier loses to an idempotent.)
// (b) planted inert decoy fold7{gauss(θ·2.37)} — nothing in the population makes it —
//     must not be a member of any organization or replicator.
function canary() {
  const R = G.rng(5); const pop = []; while (pop.length < 80) { const m = S.mol(G.randomTree(R, 3, true)); if (m.tree[0] !== 'k') pop.push(m); }
  const pair = [['abs', ['x']], ['abs', ['y']]], decoy = ['fold', 7, ['gauss', ['mul', ['t'], ['k', 2.37]]]];
  for (let i = 0; i < 6; i++) for (const p of pair) pop.push(S.mol(p)); pop.push(S.mol(decoy));
  const sp = new Map(); for (const p of pop) { const e = sp.get(p.key); if (e) e.n++; else sp.set(p.key, { key: p.key, tree: p.tree, n: 1, size: p.size }); }
  const det = S.organizations(sp, { maxSize: MAX_SIZE });
  const pk = pair.map(S.key), dk = S.key(decoy);
  const found = det.level1.find(o => pk.every(k => o.members.includes(k)));
  const decoyIn = det.orgs.some(o => o.members.includes(dk));
  // realized half
  const Rx = S.Reactor(1, { N: 2, cleave: 0, mu: 0 }); Rx.pop.length = 0; for (let i = 0; i < 20; i++) for (const p of pair) Rx.pop.push(S.mol(p));
  for (let t = 0; t < 3; t++) Rx.step(40);
  const det2 = S.organizations(Rx.species(), { maxSize: MAX_SIZE }); const o2 = det2.level1.find(o => pk.every(k => o.members.includes(k)));
  const r2 = o2 ? S.realized(o2, Rx.recent) : { maintained: 0, realized: false };
  return { plantedDetected: !!found, plantedOrg: found ? { size: found.size, leak: found.leak, copyShare: found.copyShare } : null, decoyInOrg: decoyIn, realizedMaintained: r2.maintained, realizedPass: r2.maintained === 1, pass: !!found && !decoyIn && r2.maintained === 1 };
}

// ── RUN ──────────────────────────────────────────────────────────────────────
const can = canary(); console.log('canary', JSON.stringify(can));
const worlds = [];
for (const seed of SEEDS) for (const arm of ARMS) {
  const t = Date.now(); const w = runWorld(seed, arm); w.cpuSec = +((Date.now() - t) / 1000).toFixed(1);
  const f = w.final || {};
  console.log(`[${arm} ${seed}] pop ${f.pop} species ${f.species} copiers ${f.copiers} potential ${f.potentialOrgs} realized ${f.realizedOrgs} (largest ${f.largestRealized}, copyShare ${f.realizedCopyShare}) reps ${f.realizedReplicators}/${f.replicators} cells ${f.cellsSeen} windows ${w.windows.map(x => x.newCells).join('/')} firstCopier ${w.firstCopier} firstRealized ${w.firstRealized} tracks ${w.tracks} persisting ${w.persisting} medianLife ${w.medianLife} ${w.cpuSec}s`);
  worlds.push(w);
  if (Date.now() - T0 > BUDGET_MS) { console.log('BUDGET HIT — stopping after this world'); break; }
}

// ── VERDICT by the pre-registered rule ───────────────────────────────────────
const by = arm => worlds.filter(w => w.arm === arm && w.final && !w.series.some(s => s.aborted));
const react = by('react'), nocopy = by('nocopy'), control = by('control');
const lastIdx = CUTOFFS.length - 1;
const arise = react.filter(w => w.final.realizedOrgs > 0 && w.persisting > 0).length;         // realized org at the end AND one that persisted ≥ MIN_LIFE checkpoints
const copierWorld = react.filter(w => w.final.realizedOrgs > 0 && w.final.realizedCopyShare >= 0.9).length;
const novel = react.filter(w => w.windows[lastIdx].newCells >= w.windows[0].newCells / 3).length; // last window ≥ 1/3 of the first: not saturated
const nocopyAlive = nocopy.filter(w => w.final.realizedOrgs > 0).length;
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
let verdict;
if (!can.pass) verdict = 'VOID';
else if (react.length < 4) verdict = 'INCOMPLETE';
else if (arise < Math.ceil(react.length * 0.8)) verdict = 'DEAD';
else if (copierWorld >= Math.ceil(react.length * 0.8)) verdict = novel >= Math.ceil(react.length * 0.8) ? 'COPIER-WORLD-OPEN' : 'COPIER-WORLD-SATURATED';
else verdict = novel >= Math.ceil(react.length * 0.8) ? 'ALIVE-AND-OPEN' : 'ALIVE-SATURATED';
const summary = { verdict, canary: can, worlds: worlds.length, react: react.length, arise, copierWorld, novel, nocopyRealized: nocopyAlive, nocopyWorlds: nocopy.length,
  mean: Object.fromEntries(ARMS.map(a => [a, { species: +mean(by(a).map(w => w.final.species)).toFixed(1), cellsSeen: +mean(by(a).map(w => w.final.cellsSeen)).toFixed(1), potentialOrgs: +mean(by(a).map(w => w.final.potentialOrgs)).toFixed(1), realizedOrgs: +mean(by(a).map(w => w.final.realizedOrgs)).toFixed(1), windows: CUTOFFS.map((c, i) => +mean(by(a).map(w => w.windows[i].newCells)).toFixed(1)), firstCopier: +mean(by(a).map(w => w.firstCopier || 0)).toFixed(1), firstRealized: by(a).map(w => w.firstRealized), medianLife: by(a).map(w => w.medianLife), persisting: by(a).map(w => w.persisting) }])),
  cpuSec: +((Date.now() - T0) / 1000).toFixed(1) };
console.log(JSON.stringify(summary, null, 1));

if (!SMOKE) {
  const out = { written: new Date().toISOString(), config: { N, MAX_SIZE, MU, CLEAVE, DEPTH, RENDER, STEPS, EVERY, CUTOFFS, SEEDS, ARMS, MIN_LIFE }, summary,
    worlds: worlds.map(w => ({ seed: w.seed, arm: w.arm, cpuSec: w.cpuSec, windows: w.windows, firstCopier: w.firstCopier, firstReplicator: w.firstReplicator, firstOrg: w.firstOrg, firstRealized: w.firstRealized, tracks: w.tracks, medianLife: w.medianLife, maxLife: w.maxLife, persisting: w.persisting, final: w.final, series: w.series, snapshot: w.snapshot })) };
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', 'soup.json'), JSON.stringify(out));
  console.log('wrote data/soup.json');
}
