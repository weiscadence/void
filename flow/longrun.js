// Does genome spread PLATEAU (boundary blending only, = real coexistence) or keep
// decaying to zero (= slow homogenisation, coexistence is just death in slow motion)?
// Smaller grid + kernel so a long run fits in a sane wall-clock.
const { makeWorld } = require('./core.js');

const steps = parseInt(process.argv[2] || '3000', 10);
const mut = parseFloat(process.argv[3] || '0');
const w = makeWorld({ W: 72, H: 72, R: 9 });
w.clear();
w.blob(22, 36, 0.13, 8);
w.blob(50, 36, 0.18, 8);

const m0 = w.totalMass();
const SPLIT = 0.155;
console.log(`long run | ${w.W}x${w.H} R=${w.opts.R} steps=${steps} mut=${mut} | seed mass ${m0.toFixed(3)}`);
console.log('step | genome sd | retained% | lo/hi split | drift%');

let sdRef = null;
const marks = new Set([50, 100, 250, 500, 1000, 1500, 2000, 2500, steps]);
for (let s = 1; s <= steps; s++) {
  w.step(mut);
  if (marks.has(s)) {
    const g = w.genomeStats(SPLIT);
    if (sdRef === null) sdRef = g.sd;
    const drift = ((w.totalMass() - m0) / m0) * 100;
    console.log(
      `${String(s).padStart(4)} | ${g.sd.toFixed(5)} | ${((g.sd / sdRef) * 100).toFixed(1).padStart(6)}% | ` +
      `${(g.lo * 100).toFixed(1)}%/${(g.hi * 100).toFixed(1)}% | ${drift.toExponential(1)}`
    );
  }
}
