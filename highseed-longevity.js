// Do the "lucky" (open-ended-looking) worlds stay open-ended to 200k, or eventually freeze too?
// Seeds 1 and 4 were the high-climbers at 40k (stable ~105). Track them 5x further.
const { Open } = require(__dirname + '/lib/open.js');
const marks = [40000, 80000, 120000, 160000, 200000];
for (const seed of [1, 4]) {
  const sim = new Open({ seed: seed * 100 + 7, tol: 2, construct: true, stableAge: 400, menuSize: 0 });
  const ever = new Set(); let mi = 0;
  for (let t = 1; t <= 200000; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) { console.log('seed', seed, 'EXTINCT', t); break; }
    for (const [k, r] of sim.keySince) if (sim.tick - r.since >= sim.STABLE_AGE) ever.add(k);
    if (t === marks[mi]) { const s = sim.stats(); console.log('seed', seed, 't', t, 'stable', s.stableNiches, 'C', ever.size, 'prog', s.progComplexity.toFixed(2), 'pop', s.pop); mi++; }
  }
}
console.log('DONE');
