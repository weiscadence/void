// The two properties Gray-Scott could not deliver. Pre-registered thresholds:
//   1. CONSERVATION: |mass drift| < 0.01% over 1500 steps (Gray-Scott leaked +16.3%)
//   2. COEXISTENCE:  two seeded genomes BOTH still hold >=15% of mass at step 1500,
//      and genome sd does NOT decay toward zero (Gray-Scott: half-life ~400 frames)
const { makeWorld } = require('./core.js');

const mode = process.argv[2] || 'two';
const steps = parseInt(process.argv[3] || '1500', 10);
const mut = parseFloat(process.argv[4] || '0');

const w = makeWorld({});
w.clear();

const SPLIT = 0.155;   // midpoint between the two seeded genomes
if (mode === 'one') {
  w.blob(48, 48, 0.15, 10);
} else if (mode === 'two') {
  w.blob(30, 48, 0.13, 10);
  w.blob(66, 48, 0.18, 10);
} else {
  for (let n = 0; n < 8; n++) w.blob((Math.random() * 96) | 0, (Math.random() * 96) | 0, 0.10 + Math.random() * 0.12, 8);
}

const m0 = w.totalMass();
console.log(`Flow Lenia | mode=${mode} grid=${w.W}x${w.H} R=${w.opts.R} steps=${steps} mut=${mut}`);
console.log(`seed mass ${m0.toFixed(4)}`);
console.log('step |      mass |   drift% | genome sd | mass split lo/hi');

const marks = new Set([1, 50, 100, 250, 500, 750, 1000, 1250, steps]);
let sdFirst = null, sdLast = null;
for (let s = 1; s <= steps; s++) {
  w.step(mut);
  if (marks.has(s)) {
    const m = w.totalMass();
    const g = w.genomeStats(SPLIT);
    if (s === 50) sdFirst = g.sd;
    sdLast = g.sd;
    const drift = ((m - m0) / m0) * 100;
    console.log(
      `${String(s).padStart(4)} | ${m.toFixed(4).padStart(9)} | ${drift.toFixed(5).padStart(8)} | ` +
      `${g.sd.toFixed(5).padStart(9)} | ${(g.lo * 100).toFixed(1)}% / ${(g.hi * 100).toFixed(1)}%`
    );
  }
}

const m = w.totalMass();
const g = w.genomeStats(SPLIT);
const drift = Math.abs((m - m0) / m0) * 100;
const conserved = drift < 0.01;
const coexist = mode === 'two' ? (g.lo >= 0.15 && g.hi >= 0.15) : null;
const sdHeld = sdFirst ? (sdLast / sdFirst) : 0;

console.log('');
console.log(`CONSERVATION: drift ${drift.toExponential(2)}%  -> ${conserved ? 'PASS' : 'FAIL'}`);
if (coexist !== null) {
  console.log(`COEXISTENCE : lo ${(g.lo*100).toFixed(1)}% / hi ${(g.hi*100).toFixed(1)}% -> ${coexist ? 'PASS' : 'FAIL'}`);
  console.log(`GENOME SD   : ${sdFirst?.toFixed(5)} -> ${sdLast.toFixed(5)} (retained ${(sdHeld*100).toFixed(1)}%)`);
}
