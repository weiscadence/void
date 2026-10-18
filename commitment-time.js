#!/usr/bin/env node
'use strict';
// commitment-time.js — WHEN does an open-vocabulary world commit to its fate?
//
// RESULT-openend-frontier.md found that worlds built on lib/open.js (open genotype→phenotype map +
// niche construction) have a BIMODAL fate: ~55% freeze early at a low stable-niche ceiling, ~45%
// catch a slow high climb. The follow-up found early EXPLORATION breadth is the causal lever. What
// nobody measured is the shape of the commitment itself: is fate fixed by the world's STATE early
// on (a founder effect / historical contingency — Blount, Borland & Lenski 2008 replayed E. coli
// from frozen fossils to ask exactly this), or is it a running lottery that any later roll of the
// dice can still overturn?
//
// THE REPLAY DESIGN (Lenski's freezer, in software). Run a parent world. At fork time tau, snapshot
// its ENTIRE state and spawn F replicas that continue from that state with FRESH randomness. Run
// everything to the horizon H and classify fate (stable niches at H >= THRESH → climber, else frozen).
// Agreement(tau) = fraction of forks that share the parent's fate.
//   • If agreement is already ~1.0 at the earliest tau → fate is in the state very early (commitment).
//   • If agreement rises with tau → a commitment TIME exists; report where it crosses.
//   • If agreement stays at the base rate even at late tau → fate is a lottery, not a state.
//
// CANARIES (scored before the verdict; a verdict without them is void):
//   C1 detector-can-fire: fresh seeds (tau = 0, nothing shared) must disagree with the parent at
//      roughly the base rate, AND both fates must appear among the parents. If every world has the
//      same fate the classifier cannot discriminate and the run is VOID.
//   C2 identical-twin decoy: a fork that restores the snapshot AND the parent's exact RNG state must
//      reproduce the parent's statistics at H to the integer. If it does not, the clone is leaky and
//      every agreement number is contaminated → VOID.
//   C3 classifier positive control: a menu-capped control world (menuSize 12, known to freeze at ~7
//      stable niches) must classify as frozen.
//
// Pure CPU, no deps. Everything the prereg fixed is a constant below; the prereg hashes this file.
const { Open } = require(__dirname + '/lib/open.js');

const PARENTS = Number(process.env.PARENTS || 8);     // parent seeds 1..PARENTS → seed*100+7 (same family as fate-distribution.js)
const FORKS = Number(process.env.FORKS || 3);         // replicas per (parent, tau)
const TAUS = (process.env.TAUS || '1000,3000,10000').split(',').map(Number);
const H = Number(process.env.H || 30000);             // horizon
const THRESH = Number(process.env.THRESH || 65);      // stable niches at H: >= THRESH climber, < THRESH frozen
const AMBIG = [58, 74];                               // the gap seen in fate-distribution.js; forks landing here are flagged
const CFG = { tol: 2, construct: true, stableAge: 400, menuSize: 0 };
const OUT = process.env.OUT || (__dirname + '/data/commitment-time.json');

// mulberry32 with EXPOSED state (same algorithm as lib/open.js rng) so a twin can inherit it exactly.
function makeRng(seed) {
  const st = { a: seed >>> 0 };
  const next = () => { st.a |= 0; st.a = (st.a + 0x6D2B79F5) | 0;
    let t = Math.imul(st.a ^ (st.a >>> 15), 1 | st.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { st, next };
}
function newSim(seed) {
  const sim = new Open({ seed, ...CFG });
  // the constructor consumed the closure rng for init; from here on use an inspectable stream.
  const r = makeRng(seed ^ 0x9E3779B9);
  sim.rand = r.next; sim._rngState = r.st;
  return sim;
}
function snapshot(sim) {
  return structuredClone({
    orgs: sim.orgs, lock: sim.lock, patchProg: sim.patchProg, builtBy: sim.builtBy, grid: sim.grid,
    keySince: sim.keySince, nextLineage: sim.nextLineage, tick: sim.tick, births: sim.births,
    deaths: sim.deaths, builds: sim.builds, pool: sim.pool, rng: sim._rngState.a,
  });
}
function restore(seed, snap, rngSeed /* undefined = identical twin */) {
  const sim = newSim(seed);
  const s = structuredClone(snap);
  Object.assign(sim, { orgs: s.orgs, lock: s.lock, patchProg: s.patchProg, builtBy: s.builtBy, grid: s.grid,
    keySince: s.keySince, nextLineage: s.nextLineage, tick: s.tick, births: s.births, deaths: s.deaths,
    builds: s.builds, pool: s.pool });
  const r = makeRng(rngSeed === undefined ? 0 : rngSeed);
  if (rngSeed === undefined) r.st.a = s.rng;
  sim.rand = r.next; sim._rngState = r.st;
  return sim;
}
function runTo(sim, T, onTick) {
  while (sim.tick < T) { sim.step(); if (onTick) onTick(sim); if (sim.orgs.every(o => o.dead)) break; }
  return sim.stats();
}
const fate = st => st.stableNiches >= THRESH ? 'climber' : 'frozen';
const ambiguous = st => st.stableNiches >= AMBIG[0] && st.stableNiches < AMBIG[1];
if (require.main !== module) module.exports = { makeRng, newSim, snapshot, restore, runTo, CFG };
else main();
function main() {
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

const result = { config: { PARENTS, FORKS, TAUS, H, THRESH, AMBIG, CFG }, parents: [], fresh: [], twins: [], menuControl: null, agreement: {}, canaries: {}, verdict: null };

// ── parents, with snapshots at each tau ─────────────────────────────────────────────────────
for (let p = 1; p <= PARENTS; p++) {
  const seed = p * 100 + 7, sim = newSim(seed), snaps = {};
  const taus = new Set(TAUS);
  runTo(sim, H, s => { if (taus.has(s.tick)) snaps[s.tick] = snapshot(s); });
  const st = sim.stats();
  result.parents.push({ seed, stable: st.stableNiches, prog: st.progComplexity, pop: st.pop, fate: fate(st), ambiguous: ambiguous(st), snaps, forks: {} });
  log(`parent ${seed}: stable=${st.stableNiches} prog=${st.progComplexity} → ${fate(st)}${ambiguous(st) ? ' (AMBIGUOUS band)' : ''}`);
}

// ── C2 identical twins: snapshot + exact rng must reproduce the parent to the integer ──────────
for (const par of result.parents.slice(0, 2)) {
  const tau = TAUS[0], sim = restore(par.seed, par.snaps[tau]);
  const st = runTo(sim, H);
  const exact = st.stableNiches === par.stable && st.pop === par.pop && st.progComplexity === par.prog;
  result.twins.push({ seed: par.seed, tau, stable: st.stableNiches, pop: st.pop, prog: st.progComplexity, parentStable: par.stable, exact });
  log(`twin of ${par.seed} @${tau}: stable=${st.stableNiches} vs parent ${par.stable} → ${exact ? 'EXACT' : 'DIVERGED'}`);
}

// ── forks: fresh randomness from the snapshot ─────────────────────────────────────────────────
for (const par of result.parents) {
  for (const tau of TAUS) {
    par.forks[tau] = [];
    for (let f = 0; f < FORKS; f++) {
      const rs = (par.seed * 1000003 + tau * 7919 + f * 104729) >>> 0;
      const st = runTo(restore(par.seed, par.snaps[tau], rs), H);
      par.forks[tau].push({ stable: st.stableNiches, prog: st.progComplexity, pop: st.pop, fate: fate(st), ambiguous: ambiguous(st), agree: fate(st) === par.fate });
    }
    log(`forks of ${par.seed} @${tau}: ${par.forks[tau].map(x => x.stable).join(',')} → agree ${par.forks[tau].filter(x => x.agree).length}/${FORKS}`);
  }
  delete par.snaps; // not serialisable size-wise
}

// ── C1 fresh seeds (tau = 0): no shared state → base-rate agreement ──────────────────────────
for (let q = 1; q <= PARENTS; q++) {
  const seed = 5000 + q * 100 + 7, st = runTo(newSim(seed), H);
  result.fresh.push({ seed, stable: st.stableNiches, prog: st.progComplexity, fate: fate(st), ambiguous: ambiguous(st) });
  log(`fresh ${seed}: stable=${st.stableNiches} → ${fate(st)}`);
}

// ── C3 classifier positive control ───────────────────────────────────────────────────────────
{
  const sim = new Open({ seed: 107, tol: 2, construct: true, stableAge: 400, menuSize: 12 });
  const st = runTo(sim, Math.min(H, 8000));
  result.menuControl = { stable: st.stableNiches, fate: fate(st) };
  log(`menu-12 control: stable=${st.stableNiches} → ${fate(st)}`);
}

// ── scoring ───────────────────────────────────────────────────────────────────────────────────
const nClimb = result.parents.filter(p => p.fate === 'climber').length, nFroz = PARENTS - nClimb;
const pClimb = nClimb / PARENTS;
const baseAgree = pClimb * pClimb + (1 - pClimb) * (1 - pClimb); // chance two independent worlds share fate
for (const tau of TAUS) {
  const all = result.parents.flatMap(p => p.forks[tau]);
  const agree = all.filter(x => x.agree).length / all.length;
  const perParentAll = result.parents.filter(p => p.forks[tau].every(x => x.agree)).length;
  const frozenEscape = result.parents.filter(p => p.fate === 'frozen').flatMap(p => p.forks[tau]).filter(x => x.fate === 'climber').length;
  const climberFall = result.parents.filter(p => p.fate === 'climber').flatMap(p => p.forks[tau]).filter(x => x.fate === 'frozen').length;
  result.agreement[tau] = { agree: +agree.toFixed(3), n: all.length, parentsUnanimous: perParentAll, frozenForksThatClimbed: frozenEscape, climberForksThatFroze: climberFall, ambiguousForks: all.filter(x => x.ambiguous).length };
}
// fresh-seed agreement with each parent (all pairs) — the empirical base rate
const freshPairs = result.parents.flatMap(p => result.fresh.map(f => f.fate === p.fate ? 1 : 0));
const freshAgree = freshPairs.reduce((a, b) => a + b, 0) / freshPairs.length;
result.canaries = {
  C1_bothFatesPresent: nClimb >= 2 && nFroz >= 2,
  C1_freshAgree: +freshAgree.toFixed(3), C1_baseAgreeExpected: +baseAgree.toFixed(3),
  C1_pass: nClimb >= 2 && nFroz >= 2 && freshAgree < 0.85,
  C2_twinsExact: result.twins.every(t => t.exact),
  C3_menuFrozen: result.menuControl.fate === 'frozen',
};
const canariesOK = result.canaries.C1_pass && result.canaries.C2_twinsExact && result.canaries.C3_menuFrozen;

let verdict, reason;
const a = TAUS.map(t => result.agreement[t].agree);
if (!canariesOK) { verdict = 'VOID'; reason = 'a canary failed: ' + JSON.stringify(result.canaries); }
else if (a[0] >= 0.9) { verdict = 'EARLY COMMITMENT'; reason = `agreement ${a[0]} at tau=${TAUS[0]} (fresh-seed base rate ${freshAgree.toFixed(2)}): fate is in the state by ${TAUS[0]} ticks`; }
else if (a[a.length - 1] >= 0.9) { const k = a.findIndex(x => x >= 0.9); verdict = 'LATE COMMITMENT'; reason = `agreement ${a.join(' → ')} across tau=${TAUS.join(',')}; crosses 0.9 at tau=${TAUS[k]}`; }
else if (a[a.length - 1] < 0.75) { verdict = 'LOTTERY'; reason = `agreement only ${a[a.length - 1]} at tau=${TAUS[TAUS.length - 1]} (base ${freshAgree.toFixed(2)}): fate is not fixed by state even late`; }
else { verdict = 'PARTIAL COMMITMENT'; reason = `agreement ${a.join(' → ')} never reaches 0.9 but ends above 0.75 at tau=${TAUS[TAUS.length - 1]}`; }
result.verdict = { verdict, reason, parentFates: { climber: nClimb, frozen: nFroz } };

require('fs').mkdirSync(require('path').dirname(OUT), { recursive: true });
require('fs').writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log('\n── CANARIES ──'); console.log(JSON.stringify(result.canaries));
console.log('── AGREEMENT BY FORK TIME ──');
for (const tau of TAUS) console.log(`tau=${String(tau).padStart(5)}  ${JSON.stringify(result.agreement[tau])}`);
console.log(`\nVERDICT: ${verdict} — ${reason}`);
console.log(`wrote ${OUT}`);
}
