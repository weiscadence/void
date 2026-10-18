#!/usr/bin/env node
'use strict';
// break-fixed-point.js — is the frozen basin a quantized fixed point, and what is left when it is removed?
//
// RESULT-commitment-time.md found (post-hoc) that every clean frozen world of lib/open.js is a HALTED
// demography: zero births and zero deaths from some tick on, with every key that has an organism on a
// free cell sitting at crowd EXACTLY 18 — the integer where frequency-dependent harvest equals upkeep:
//     YIELD / (1 + crowd / CROWD) = 4 / (1 + 18/6) = 1 = UPKEEP.
// At 17 the key grows (and will place a child → 18); at 19 someone starves (→ 18). The halt is an
// attractor of an integer-valued law. That is a mechanism claim, and it was not pre-registered. This is.
//
// THE TEST. Move the law so that the balance point is no longer an integer and the halt CANNOT exist:
//   A1 IRRATIONAL   CROWD = 6.1 → balance crowd = 18.3. At 18 the key gains +0.0041/tick (slow growth,
//                   eventual birth → 19), at 19 it loses −0.028/tick (eventual death → 18). The demography
//                   can never stop.
//   A3 NOISE        CROWD = 6 but each harvest is multiplied by (1 + 0.05·u), u ~ U(−1, 1). Real-valued
//                   yield; no exact balance survives.
// Two controls:
//   A0 ORIGINAL     the law as published. CANARY: the five known-frozen seeds (207, 307, 507, 707, 807)
//                   must halt again with their exposed keys at 18. If they do not, nothing below is evidence.
//   A2 DECOY        CROWD = 5 → balance crowd = 15, still an integer. The constant moved by as much as A1's
//                   did (more), but the fixed point still exists. Worlds that halt here must sit at 15.
//
// WHAT WE LEARN. If the known-frozen seeds stop halting under A1/A3, the mechanism is confirmed. The
// open question — the one I actually care about — is what the former-frozen worlds do once the dynamics
// can't switch off: do they become CLIMBERS (open-ended — the fixed point was the cage), or do they
// STALL at the same low niche count with a slow heartbeat (a different, continuous basin)?
//
// Pure CPU, no deps. Engine lib/open.js untouched: the noise arm is a getter on the instance's YIELD.
const { Open } = require(__dirname + '/lib/open.js');
const { newSim: newOriginal } = require(__dirname + '/commitment-time.js');

const SEEDS = (process.env.SEEDS || '107,207,307,407,507,607,707,807').split(',').map(Number);
const KNOWN_FROZEN = [207, 307, 507, 707, 807];            // clean frozen rows of RESULT-commitment-time.md
const H = Number(process.env.H || 30000);
const CUTS = [10000, 20000, 30000];
const THRESH = 65, HALT_WIN = 10000;                       // halted = 0 births AND 0 deaths in (H-HALT_WIN, H]
const SIGMA = 0.05;
const CFG = { tol: 2, construct: true, stableAge: 400, menuSize: 0 };
const ARMS = [
  { id: 'A0_original', crowd: 6,   balance: 18,   noise: 0 },
  { id: 'A1_irrational', crowd: 6.1, balance: null, noise: 0 },
  { id: 'A2_decoy',    crowd: 5,   balance: 15,   noise: 0 },
  { id: 'A3_noise',    crowd: 6,   balance: null, noise: SIGMA },
];
const OUT = process.env.OUT || (__dirname + '/data/break-fixed-point.json');

function makeSim(seed, arm) {
  // A0 goes through commitment-time's newSim so the canary reproduces yesterday's rows to the integer.
  const sim = arm.id === 'A0_original' ? newOriginal(seed) : new Open({ seed, ...CFG, crowd: arm.crowd });
  if (arm.noise) {
    const base = sim.YIELD, r = sim.rand;
    Object.defineProperty(sim, 'YIELD', { get: () => base * (1 + arm.noise * (2 * r() - 1)), configurable: true });
  }
  return sim;
}
function census(sim, balance) {
  const live = sim.orgs.filter(o => !o.dead), share = new Map();
  for (const o of live) share.set(o.keyStr, (share.get(o.keyStr) || 0) + 1);
  const exposed = new Map();
  for (const o of live) if (sim._neighbors(o.cell).some(c => sim.grid[c] === -1)) exposed.set(o.keyStr, share.get(o.keyStr));
  const ex = [...exposed.values()];
  return { exposedKeys: ex.length, atBalance: balance === null ? null : ex.filter(c => c === balance).length,
    crowdMin: ex.length ? Math.min(...ex) : null, crowdMax: ex.length ? Math.max(...ex) : null };
}
function runWorld(seed, arm) {
  const sim = makeSim(seed, arm), row = { seed, cuts: {}, lastEvent: 0 };
  let pb = 0, pd = 0, winB = 0, winD = 0;
  while (sim.tick < H) {
    sim.step();
    if (sim.births !== pb || sim.deaths !== pd) {
      row.lastEvent = sim.tick;
      if (sim.tick > H - HALT_WIN) { winB += sim.births - pb; winD += sim.deaths - pd; }
      pb = sim.births; pd = sim.deaths;
    }
    if (CUTS.includes(sim.tick)) { const st = sim.stats(); row.cuts[sim.tick] = { stable: st.stableNiches, pop: st.pop, prog: st.progComplexity }; }
    if (sim.orgs.every(o => o.dead)) { row.extinct = sim.tick; break; }
  }
  const st = sim.stats();
  Object.assign(row, { stable: st.stableNiches, pop: st.pop, winBirths: winB, winDeaths: winD,
    halted: winB === 0 && winD === 0, fate: st.stableNiches >= THRESH ? 'climber' : 'frozen', census: census(sim, arm.balance) });
  return row;
}

if (require.main !== module) module.exports = { makeSim, runWorld, ARMS };
else main();
function main() {
  const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
  const result = { config: { SEEDS, KNOWN_FROZEN, H, CUTS, THRESH, HALT_WIN, SIGMA, CFG, ARMS }, arms: {}, canary: null, decoy: null, verdicts: {} };
  for (const arm of ARMS) {
    result.arms[arm.id] = [];
    for (const seed of SEEDS) {
      const row = runWorld(seed, arm); result.arms[arm.id].push(row);
      const c = row.census;
      log(`${arm.id} ${seed}: stable ${row.cuts[10000]?.stable}/${row.cuts[20000]?.stable}/${row.stable} pop=${row.pop} ${row.halted ? 'HALTED (last event ' + row.lastEvent + ')' : 'breathing (' + row.winBirths + 'b/' + row.winDeaths + 'd in last ' + HALT_WIN + ')'} | exposed ${c.exposedKeys}${c.atBalance === null ? '' : ' at balance ' + c.atBalance} crowd ${c.crowdMin}-${c.crowdMax}`);
    }
  }
  const byArm = id => result.arms[id], frozenRows = id => byArm(id).filter(r => KNOWN_FROZEN.includes(r.seed));
  const atBal = r => r.census.exposedKeys > 0 && r.census.atBalance / r.census.exposedKeys >= 0.9;

  // ── canary: the original law must reproduce the halt at 18 on the five known-frozen seeds ──────
  const can = frozenRows('A0_original');
  result.canary = { haltedAt18: can.filter(r => r.halted && atBal(r)).length, of: can.length, pass: can.every(r => r.halted && atBal(r)) };

  // ── decoy: a moved constant with an integer balance must still halt, at the NEW integer ──────────
  const dec = byArm('A2_decoy'), decHalted = dec.filter(r => r.halted);
  result.decoy = { halted: decHalted.length, haltedAtNewBalance: decHalted.filter(atBal).length, of: dec.length,
    status: decHalted.length === 0 ? 'INCONCLUSIVE (no world halted by H)' : decHalted.every(atBal) ? 'PASS' : 'FAIL' };

  // ── main: do the known-frozen seeds still halt once the balance point is not an integer? ─────────
  for (const id of ['A1_irrational', 'A3_noise']) {
    const rows = frozenRows(id), halted = rows.filter(r => r.halted).length;
    const climbed = rows.filter(r => r.fate === 'climber').length;
    const drift = rows.map(r => r.stable - (r.cuts[20000]?.stable ?? r.stable));
    const meanDrift = drift.reduce((a, b) => a + b, 0) / drift.length;
    let mech, fate;
    if (!result.canary.pass) mech = 'VOID (canary failed)';
    else mech = halted === 0 ? `HALT REMOVED (0/${rows.length} known-frozen seeds halt)` : `HALT PERSISTS (${halted}/${rows.length} known-frozen seeds still halt) — fixed-point mechanism falsified`;
    if (climbed >= 3) fate = `CLIMBERS (${climbed}/${rows.length} former-frozen reach ≥${THRESH} at ${H})`;
    else if (climbed <= 1 && meanDrift < 5) fate = `STALL (${climbed}/${rows.length} climb; mean 20k→30k stable-niche drift ${meanDrift.toFixed(1)} < 5): a continuous slow basin replaces the halt`;
    else fate = `MIXED (${climbed}/${rows.length} climb; mean drift ${meanDrift.toFixed(1)})`;
    result.verdicts[id] = { mechanism: mech, fate, halted, climbed, meanDrift: +meanDrift.toFixed(2),
      stableAt: Object.fromEntries(CUTS.map(c => [c, rows.map(r => r.cuts[c]?.stable ?? r.stable)])), winEvents: rows.map(r => r.winBirths + r.winDeaths) };
  }
  require('fs').mkdirSync(require('path').dirname(OUT), { recursive: true });
  require('fs').writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log('\n── CANARY (A0, known-frozen seeds halt at 18) ──'); console.log(JSON.stringify(result.canary));
  console.log('── DECOY (A2, CROWD=5 → integer balance 15) ──'); console.log(JSON.stringify(result.decoy));
  console.log('── VERDICTS ──'); for (const [k, v] of Object.entries(result.verdicts)) console.log(`${k}: ${v.mechanism} | ${v.fate}`);
  console.log(`wrote ${OUT}`);
}
