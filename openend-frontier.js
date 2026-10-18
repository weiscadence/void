// OPEN-ENDEDNESS FRONTIER (2026-08-13) — where does the open-vocabulary complexity climb actually END?
//
// Prior result (2026-07-24, open-vocabulary-breaks-plateau): open genotype->phenotype map + niche
// construction lifts stableNiches + progComplexity 20-40x past the fixed-vocab plateau, still
// climbing (decelerating) at 40k ticks. Jiggy's question: does it stay unbounded, and what caps it?
//
// TODAY'S DISCIPLINE, applied (the tower lesson):
//   1. progComplexity is HARD-CAPPED at LEN_MAX (genome length). A climb that "decelerates" near
//      40k may just be approaching that wall — a cap-artifact plateau, not real convergence. So we
//      track progComplexity's HEADROOM to LEN_MAX, and run a probe arm with LEN_MAX doubled: if the
//      climb resumes, the deceleration was the cap (the transfer-knob move again).
//   2. C = cumulative distinct keys that EVER became stable has NO length cap — the cleaner
//      unbounded-novelty signal. The honest open-endedness question is whether C keeps rising even
//      as progComplexity saturates against its genome ceiling.
//   3. MEDIAN over seeds, not mean (a runaway seed must not own the verdict).
//   4. Instrument canary: extinction is a real zero, not a silent one — reported, not hidden.
//   5. loglog growth verdict (decelerating / linear / accelerating) on C and progComplexity.
'use strict';
const { Open } = require('./lib/open.js');

const TICKS = process.env.TICKS ? Number(process.env.TICKS) : 200000;
const SEEDS = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number) : [1, 2, 3];
const BASE = { tol: 2, construct: true, stableAge: 400 };
// log-spaced checkpoints so we can fit the growth law, out well past the 40k where it was last seen
const MARKS = [];
for (let i = 1; i <= 24; i++) { const t = Math.round(Math.exp(Math.log(TICKS) * (i / 24))); if (MARKS[MARKS.length - 1] !== t) MARKS.push(t); }

const ARMS = {
  'open+build':        { ...BASE, menuSize: 0 },                 // treatment
  'menu-12+build':     { ...BASE, menuSize: 12 },                // capped-vocabulary control (the ceiling)
  'open+build LEN48':  { ...BASE, menuSize: 0, lenMax: 48 },     // probe: is the genome-length cap what bounds progComplexity?
};

function runOne(opts, seed) {
  const sim = new Open({ seed: seed * 100 + 7, ...opts });
  const lenMax = opts.lenMax ?? 24;
  const everStable = new Set();
  const rows = []; let mi = 0, extinctAt = 0;
  for (let t = 1; t <= TICKS; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) { extinctAt = t; break; }
    for (const [k, rec] of sim.keySince) if (sim.tick - rec.since >= sim.STABLE_AGE) everStable.add(k);
    if (mi < MARKS.length && t === MARKS[mi]) {
      const s = sim.stats();
      rows.push({ t, pop: s.pop, dist: s.distinctNiches, stab: s.stableNiches, prog: s.progComplexity, C: everStable.size, headroom: +(s.progComplexity / lenMax).toFixed(3) });
      mi++;
    }
  }
  return { rows, extinctAt, lenMax };
}

// loglog slope over the BACK HALF of checkpoints — is the signal still climbing there, and how?
function backHalfVerdict(rows, key) {
  const pts = rows.filter(r => r[key] > 0).map(r => [Math.log(r.t), Math.log(r[key])]);
  if (pts.length < 6) return { alpha: NaN, verdict: 'n<6' };
  const back = pts.slice(Math.floor(pts.length / 2));
  const n = back.length, mx = back.reduce((a, [x]) => a + x, 0) / n, my = back.reduce((a, [, y]) => a + y, 0) / n;
  let sxx = 0, sxy = 0; for (const [x, y] of back) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  const alpha = sxy / sxx;
  const v = alpha < 0.02 ? 'PLATEAU (flat in back half)' : alpha < 0.15 ? 'slow climb' : 'strong climb';
  return { alpha: +alpha.toFixed(3), verdict: v };
}

const median = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

const summary = {};
for (const [label, opts] of Object.entries(ARMS)) {
  console.log(`\n== ${label} ==  (${SEEDS.length} seeds, ${TICKS} ticks, LEN_MAX=${opts.lenMax ?? 24})`);
  console.log('  tick  |  pop  | distinct | stable |  prog  | headroom |   C (cum ever-stable)');
  const seedRuns = SEEDS.map(s => runOne(opts, s));
  const extinct = seedRuns.filter(r => r.extinctAt).map(r => r.extinctAt);
  if (extinct.length) console.log(`  !! extinction in ${extinct.length}/${SEEDS.length} seeds at ticks ${extinct.join(',')} — those seeds truncated`);
  // median across seeds at each mark (only seeds that reached the mark)
  const medRows = MARKS.map((t) => {
    const at = seedRuns.map(r => r.rows.find(x => x.t === t)).filter(Boolean);
    if (!at.length) return null;
    return { t, pop: median(at.map(x => x.pop)), dist: median(at.map(x => x.dist)), stab: median(at.map(x => x.stab)),
             prog: median(at.map(x => x.prog)), headroom: median(at.map(x => x.headroom)), C: median(at.map(x => x.C)), n: at.length };
  }).filter(Boolean);
  for (const x of medRows) console.log(`  ${String(x.t).padStart(6)} | ${x.pop.toFixed(0).padStart(5)} |  ${x.dist.toFixed(0).padStart(6)}  | ${x.stab.toFixed(0).padStart(6)} | ${x.prog.toFixed(2).padStart(5)} | ${(x.headroom*100).toFixed(0).padStart(6)}% |  ${x.C}`);
  const cV = backHalfVerdict(medRows, 'C'), pV = backHalfVerdict(medRows, 'prog');
  const lastRow = medRows[medRows.length - 1];
  console.log(`  → C back-half: alpha=${cV.alpha} ${cV.verdict}  |  progComplexity back-half: alpha=${pV.alpha} ${pV.verdict}  |  final prog headroom=${(lastRow.headroom*100).toFixed(0)}% of LEN_MAX`);
  summary[label] = { medRows, cV, pV, lastRow, extinct };
}

console.log('\n──────── FRONTIER VERDICT ────────');
const open = summary['open+build'], menu = summary['menu-12+build'], len48 = summary['open+build LEN48'];
const oL = open.lastRow, mL = menu.lastRow, l48 = len48.lastRow;
console.log(`final C (cumulative ever-stable structure): open ${oL.C} vs menu-12 ${mL.C} vs open-LEN48 ${l48.C}`);
console.log(`final progComplexity: open ${oL.prog.toFixed(2)} (${(oL.headroom*100).toFixed(0)}% of cap 24) vs open-LEN48 ${l48.prog.toFixed(2)} (${(l48.headroom*100).toFixed(0)}% of cap 48)`);
console.log(`C still climbing at ${TICKS}? open ${open.cV.verdict} (alpha ${open.cV.alpha})`);
console.log(`progComplexity: was its slowdown the genome-length CAP? — LEN48 arm ${l48.prog > oL.prog * 1.15 ? 'CLIMBS HIGHER with more headroom → yes, cap-bound (boring ceiling, not dynamics)' : 'does NOT climb higher → the plateau is dynamical, not the length cap'}`);
if (process.env.JSON_OUT) { require('fs').writeFileSync(process.env.JSON_OUT, JSON.stringify({ ticks: TICKS, seeds: SEEDS, summary }, null, 2)); console.log(`\nwrote ${process.env.JSON_OUT}`); }
