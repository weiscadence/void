// WORMHOLE STEP 1 — before intervening, find WHAT early signal predicts a world's fate.
// The 40k complexity fingerprint (2.2-2.8 frozen vs 3.0-3.8 climbing) might be DOWNSTREAM of the
// basin, not its cause. So snapshot several candidate drivers EARLY (t=1000..10000, before the
// basins fully diverge) and ask which best separates worlds that will end HIGH (stable>=65 @40k)
// from those that will end LOW. Don't assume complexity — let the data pick the leading indicator.
const { Open } = require(__dirname + '/lib/open.js');
const N = Number(process.env.N || 24), FINAL = 40000;
const SNAP = [1000, 2000, 5000, 10000];
const rows = [];
for (let seed = 1; seed <= N; seed++) {
  const sim = new Open({ seed: seed * 100 + 7, tol: 2, construct: true, stableAge: 400, menuSize: 0 });
  const everKeys = new Set();          // cumulative distinct keys ever occupied (exploration breadth)
  const snaps = {};
  for (let t = 1; t <= FINAL; t++) {
    sim.step();
    if (sim.orgs.filter(o => !o.dead).length === 0) break;
    for (const o of sim.orgs) if (!o.dead && o.keyStr != null) everKeys.add(o.keyStr);
    if (SNAP.includes(t)) { const s = sim.stats(); snaps[t] = { pop: s.pop, dist: s.distinctNiches, stab: s.stableNiches, prog: +s.progComplexity.toFixed(2), explored: everKeys.size }; }
  }
  const fs = sim.stats();
  rows.push({ seed, final: fs.stableNiches, high: fs.stableNiches >= 65, snaps });
}
const hi = rows.filter(r => r.high), lo = rows.filter(r => !r.high);
const mean = (a, f) => a.length ? (a.reduce((s, r) => s + f(r), 0) / a.length) : NaN;
console.log(`fates: ${hi.length} HIGH / ${lo.length} LOW  (final stable @${FINAL})`);
console.log(`sorted final: ${rows.map(r => r.final).sort((a, b) => a - b).join(', ')}\n`);
console.log('metric@t   |  HIGH-worlds mean  |  LOW-worlds mean  | separation (H/L)');
for (const t of SNAP) {
  for (const m of ['pop', 'dist', 'stab', 'prog', 'explored']) {
    const H = mean(hi, r => r.snaps[t]?.[m] ?? 0), L = mean(lo, r => r.snaps[t]?.[m] ?? 0);
    const sep = L > 0 ? (H / L) : NaN;
    console.log(`${(m + '@' + t).padEnd(11)}|  ${H.toFixed(2).padStart(14)}  | ${L.toFixed(2).padStart(14)}  |  ${sep.toFixed(2)}x`);
  }
  console.log('');
}
// which EARLIEST metric already separates the fates cleanly (>1.3x at the earliest snapshot)?
console.log('EARLIEST clean separator (>1.3x at t<=2000):');
for (const t of [1000, 2000]) for (const m of ['pop', 'dist', 'stab', 'prog', 'explored']) {
  const H = mean(hi, r => r.snaps[t]?.[m] ?? 0), L = mean(lo, r => r.snaps[t]?.[m] ?? 0);
  if (L > 0 && H / L >= 1.3) console.log(`  ${m}@${t}: ${(H / L).toFixed(2)}x  (H ${H.toFixed(2)} vs L ${L.toFixed(2)})`);
}
console.log('DONE');
