// evolve-hardiness-exp.js — the real "solving for x": rip out my grace knob, give organisms a
// HERITABLE reserve trait, and ask three things with NO external knob and NO external knockout:
//   1. Does mean reserve EVOLVE to a nonzero value on its own (selection finds hardiness)?
//   2. In an oscillating (self-disturbing) world, does evolved reserve settle into a survivable band?
//   3. Does that self-tuned hardiness SUSTAIN the deep level better than reserve-off (the null)?
// Compare, same seeds: NULL (evolveReserve off) vs EVOLVED (on). Enriched world so it self-oscillates.
'use strict';
const { Graph } = require('./lib/graph.js');
const settle = (g, n) => { for (let i = 0; i < n; i++) g.step(); };

function run(seed, evolve) {
  const g = new Graph({ seed, roots: 2, seedPerRoot: 8, construct: true, regulate: true, nodeCap: 10,
    maxNodes: 24, energetic: true, transfer: 0.4, basal: 14, stockMax: 500, regen: 8,  // enriched → self-wave
    orphanGrace: 0, evolveReserve: evolve });
  // track evolution of the trait over time
  const resTrace = [];
  settle(g, 400);
  let deep3 = 0, deep4 = 0, n = 0;
  for (let t = 1; t <= 3000; t++) {
    g.step(); const s = g.stats();
    if (s.maxDepth >= 3) deep3++; if (s.maxDepth >= 4) deep4++; n++;
    if (t % 500 === 0) resTrace.push(s.meanRes);
  }
  const s = g.stats();
  return { seed, pctDepth3: +(100 * deep3 / n).toFixed(0), pctDepth4: +(100 * deep4 / n).toFixed(0),
    meanRes: s.meanRes, meanStore: s.meanStore, resTrace, meanPop: s.pop };
}
const seeds = [1, 2, 3, 4, 5, 6];
console.log('EVOLVE HARDINESS — no knob, no external knockout. Does the trait evolve + sustain depth?\n');
let nD3 = 0, eD3 = 0, nD4 = 0, eD4 = 0, resSum = 0;
for (const s of seeds) {
  const nul = run(s, false), evo = run(s, true);
  nD3 += nul.pctDepth3; eD3 += evo.pctDepth3; nD4 += nul.pctDepth4; eD4 += evo.pctDepth4; resSum += evo.meanRes;
  console.log(`seed ${s}: NULL depth3 ${nul.pctDepth3}% depth4 ${nul.pctDepth4}%  |  EVOLVED depth3 ${evo.pctDepth3}% depth4 ${evo.pctDepth4}%  res→${evo.meanRes} (trace ${evo.resTrace.join('→')}) store ${evo.meanStore}`);
}
const N = seeds.length;
console.log(`\n--- MEAN over ${N} seeds ---`);
console.log(`depth>=3 time:  NULL ${(nD3/N).toFixed(0)}%  vs  EVOLVED ${(eD3/N).toFixed(0)}%`);
console.log(`depth>=4 time:  NULL ${(nD4/N).toFixed(0)}%  vs  EVOLVED ${(eD4/N).toFixed(0)}%`);
console.log(`evolved reserve trait settled at mean ${(resSum/N).toFixed(3)} (started ~0.15 random; 0 = didn't evolve hardiness)`);
console.log(`\nGoal: EVOLVED depth > NULL depth AND res evolves to a stable nonzero band = the system self-tuned into survival.`);
