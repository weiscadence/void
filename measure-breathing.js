#!/usr/bin/env node
// v2: the first pass found a period-2 peak — a mechanical alternation, NOT the slow visual
// "breathing" across ~1000 ticks. Two fixes: (1) analyze POPULATION (smoother than births)
// and a 2-tick-smoothed birth series to kill the alternation; (2) only hunt for SLOW periods
// (lag >= 20). Also measure the SPATIAL side: local density variance over time — real
// breathing = the grid's occupancy sloshing between regions, which a global count can't see.
const { Silica } = require('./lib/silica.js');

const TICKS = 6000, WARMUP = 600;
const sim = new Silica({ seed: 7 });
let prevB = 0;
const births = [], pop = [], patch = [];   // patch = variance of occupancy across 6x6 blocks
const COLS = sim.cols, ROWS = sim.rows, BS = 10;                 // 6x6 blocks of 10x10 cells
for (let t = 0; t < TICKS; t++) {
  sim.step();
  const s = sim.stats();
  if (t >= WARMUP) {
    births.push(s.births - prevB);
    pop.push(s.pop);
    // spatial: count occupancy per block, take variance (high = clumpy, low = even)
    const blocks = new Float64Array((COLS / BS | 0) * (ROWS / BS | 0));
    for (const o of sim.orgs) {
      if (o.dead) continue;
      const x = o.cell % COLS, y = (o.cell / COLS | 0);
      const bx = Math.min((COLS / BS | 0) - 1, x / BS | 0), by = Math.min((ROWS / BS | 0) - 1, y / BS | 0);
      blocks[by * (COLS / BS | 0) + bx]++;
    }
    const m = blocks.reduce((a, b) => a + b, 0) / blocks.length;
    patch.push(blocks.reduce((a, b) => a + (b - m) ** 2, 0) / blocks.length);
  }
  prevB = s.births;
}

function detrend(x, half = 60) {
  const out = [];
  for (let i = 0; i < x.length; i++) {
    let lo = Math.max(0, i - half), hi = Math.min(x.length, i + half + 1), s = 0;
    for (let j = lo; j < hi; j++) s += x[j];
    out.push(x[i] - s / (hi - lo));
  }
  return out;
}
function autocorr(x, maxLag) {
  const n = x.length, mean = x.reduce((a, b) => a + b, 0) / n, c = x.map(v => v - mean);
  const denom = c.reduce((a, b) => a + b * b, 0) || 1, out = [];
  for (let lag = 0; lag <= maxLag; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += c[i] * c[i + lag]; out.push(s / denom); }
  return out;
}
function peakSlow(x, minLag = 20, maxLag = 800) {
  const ac = autocorr(x, maxLag);
  let bestLag = -1, bestVal = -Infinity;
  for (let lag = minLag; lag < ac.length - 1; lag++)
    if (ac[lag] > ac[lag - 1] && ac[lag] > ac[lag + 1] && ac[lag] > bestVal) { bestVal = ac[lag]; bestLag = lag; }
  return { bestLag, bestVal };
}

const meanPop = pop.reduce((a, b) => a + b, 0) / pop.length;
const sdPop = Math.sqrt(pop.reduce((a, b) => a + (b - meanPop) ** 2, 0) / pop.length);
console.log(`analyzed ${pop.length} ticks | mean pop ${meanPop.toFixed(0)} ± ${sdPop.toFixed(0)} (CV ${(sdPop/meanPop).toFixed(3)})`);

for (const [name, series] of [['population', pop], ['births(smoothed)', births], ['spatial patchiness', patch]]) {
  const { bestLag, bestVal } = peakSlow(detrend(series));
  const verdict = bestLag < 0 ? 'no slow period — drift/noise' :
    bestVal > 0.20 ? `PERIOD ≈ ${bestLag} ticks (strong, ac ${bestVal.toFixed(2)})` :
    bestVal > 0.10 ? `weak period ≈ ${bestLag} ticks (ac ${bestVal.toFixed(2)})` :
    `no real rhythm (best ac ${bestVal.toFixed(2)} @ ${bestLag})`;
  console.log(`  ${name.padEnd(20)} → ${verdict}`);
}
// eyeball the spatial patchiness wave (this is closest to what the screenshots show)
const seg = detrend(patch).slice(0, 200), mx = Math.max(...seg.map(Math.abs)) || 1, bars = '▁▂▃▄▅▆▇█';
console.log('patchiness (detrended, 200t): ' + seg.map(v => bars[Math.min(7, Math.floor((v / mx / 2 + 0.5) * 8))]).join(''));
