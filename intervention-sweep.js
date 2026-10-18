// WORMHOLE STEP 2 — causal test. leading-indicator.js found EXPLORATION breadth (distinct keys
// discovered early), NOT complexity, is what separates worlds that reach the high basin from those
// that freeze. If that's causal, a knob that raises early exploration should raise the FRACTION of
// worlds that land in the high basin. Mutation (MUT_PT/MUT_INDEL) is the direct exploration knob.
//
// Sweep a mutation multiplier; per level, over many seeds, measure:
//   - explored@2000 (did the knob actually raise early exploration? — the mediator)
//   - high-basin fraction (stable>=65 @40k) and mean final stable (did fate shift? — the outcome)
// Causal chain confirmed if mutation ↑ moves BOTH together. Watch for an inverted-U: too much
// mutation should destroy stability (niches need STABLE_AGE=400 to count), so more isn't always better.
const { Open } = require(__dirname + '/lib/open.js');
const N = Number(process.env.N || 16), FINAL = 40000;
const BASE_PT = 0.08, BASE_INDEL = 0.10;
const MULT = (process.env.MULT || '0.5,1,1.5,2,3').split(',').map(Number);
const median = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
console.log(`mutation-multiplier sweep — ${N} seeds/level to ${FINAL}. baseline MUT_PT=${BASE_PT} MUT_INDEL=${BASE_INDEL}\n`);
console.log('mult | explored@2k (med) | high-basin frac | mean final stable | final spread (sorted)');
const results = [];
for (const mult of MULT) {
  const finals = [], explored2k = [];
  for (let seed = 1; seed <= N; seed++) {
    const sim = new Open({ seed: seed * 100 + 7, tol: 2, construct: true, stableAge: 400, menuSize: 0, mutPt: BASE_PT * mult, mutIndel: BASE_INDEL * mult });
    const everKeys = new Set();
    for (let t = 1; t <= FINAL; t++) {
      sim.step();
      if (sim.orgs.filter(o => !o.dead).length === 0) break;
      for (const o of sim.orgs) if (!o.dead && o.keyStr != null) everKeys.add(o.keyStr);
      if (t === 2000) explored2k.push(everKeys.size);
    }
    finals.push(sim.stats().stableNiches);
  }
  const high = finals.filter(x => x >= 65).length;
  const sorted = [...finals].sort((a, b) => a - b);
  const r = { mult, explored2k: median(explored2k), highFrac: +(high / N).toFixed(2), meanFinal: +(finals.reduce((a, b) => a + b, 0) / N).toFixed(1), sorted };
  results.push(r);
  console.log(`${String(mult).padStart(4)} | ${String(r.explored2k).padStart(16)} | ${String(r.highFrac).padStart(15)} | ${String(r.meanFinal).padStart(17)} | ${sorted.join(',')}`);
}
console.log('\n── CAUSAL READ ──');
const base = results.find(r => r.mult === 1) || results[0];
const best = results.reduce((a, b) => b.highFrac > a.highFrac ? b : a);
console.log(`baseline (mult 1): explored@2k ${base.explored2k}, high-basin ${(base.highFrac*100).toFixed(0)}%`);
console.log(`best level (mult ${best.mult}): explored@2k ${best.explored2k}, high-basin ${(best.highFrac*100).toFixed(0)}%`);
const monotoneExpl = results.every((r, i) => i === 0 || r.explored2k >= results[i-1].explored2k - 3);
console.log(monotoneExpl ? 'mutation ↑ raises early exploration as expected (mediator moves).' : 'exploration NOT monotone in mutation — knob is noisier than assumed.');
console.log(best.highFrac > base.highFrac + 0.1
  ? `STEERABLE: raising exploration raised the high-basin fraction ${(base.highFrac*100).toFixed(0)}%→${(best.highFrac*100).toFixed(0)}% — early exploration looks CAUSAL, not just correlated.`
  : (best.mult !== 1 && best.highFrac <= base.highFrac + 0.1
      ? 'NOT STEERABLE this way: more exploration did NOT raise the high-basin fraction — exploration may be a marker, not the lever (or mutation destroys the stability it needs).'
      : 'baseline already best — the knob does not help.'));
if (results.some(r => r.mult > 1 && r.highFrac < base.highFrac)) console.log('INVERTED-U: too much mutation HURTS — there is an optimal exploration rate, not "more is better".');
console.log('DONE');
