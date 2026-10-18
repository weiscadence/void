// Characterize the FATE distribution: run many seeds to 40k, print each world's final stable-niche
// count sorted. Two clusters => bimodal (two basins). A smooth ramp => continuum. Decides whether
// "catches fire vs freezes" is a real dichotomy or a spectrum.
const { Open } = require(__dirname + '/lib/open.js');
const N = Number(process.env.N || 16), TICKS = Number(process.env.TICKS || 40000);
const out = [];
for (let seed = 1; seed <= N; seed++) {
  const sim = new Open({ seed: seed * 100 + 7, tol: 2, construct: true, stableAge: 400, menuSize: 0 });
  for (let t = 1; t <= TICKS; t++) { sim.step(); if (sim.orgs.filter(o => !o.dead).length === 0) break; }
  const s = sim.stats();
  out.push({ seed, stable: s.stableNiches, prog: +s.progComplexity.toFixed(2), pop: s.pop });
}
out.sort((a, b) => a.stable - b.stable);
console.log('sorted stable-niche counts @' + TICKS + ' (' + N + ' seeds):');
console.log(out.map(o => o.stable).join(', '));
const st = out.map(o => o.stable);
const lo = st.filter(x => x < 65).length, hi = st.filter(x => x >= 65).length;
console.log('below 65 (frozen-ish):', lo, '| 65+ (climbing):', hi);
console.log('prog by fate — frozen:', out.filter(o => o.stable < 65).map(o => o.prog).join(','), '| climbing:', out.filter(o => o.stable >= 65).map(o => o.prog).join(','));
console.log('DONE');
