// selfwave-exp.js — solving for x: does the world's OWN population wave sustain the deep level,
// with NO external disturbance? Manual soft-knockout held depth>=3 24% of the time vs 1% calm.
// But manual = my finger. The system already makes its own boom-bust (resource-consumer wave).
// Hypothesis: a strong-enough endogenous wave self-disturbs — crashes deep enough to fund rebuilds —
// and sustains depth like the manual poking did, with nobody touching it.
// Knob swept = wave strength via REGEN (low regen = starved, no wave; high = flat, no wave; the
// interesting bit is intermediate, where a real limit cycle swings). ZERO external knockouts here.
'use strict';
const { Graph } = require('./lib/graph.js');
const settle = (g, n) => { for (let i = 0; i < n; i++) g.step(); };

function run(seed, basal, stockMax) {
  // enrichment sweep (Rosenzweig-MacArthur / paradox of enrichment): a richer resource (higher stock
  // ceiling relative to inflow) lets the population overshoot and crash the resource → a real limit
  // cycle. basal = inflow, stockMax = how much the resource can bank before it's overexploited.
  const g = new Graph({ seed, roots: 2, seedPerRoot: 8, construct: true, regulate: true, nodeCap: 10,
    maxNodes: 24, energetic: true, transfer: 0.4, basal, stockMax, regen: 8, orphanGrace: 0.22 });
  settle(g, 800);
  let deep3 = 0, deep4 = 0, n = 0; const pops = [];
  for (let t = 1; t <= 2000; t++) {
    g.step(); const s = g.stats();
    if (s.maxDepth >= 3) deep3++; if (s.maxDepth >= 4) deep4++; n++;
    if (t % 5 === 0) pops.push(s.pop);
  }
  // wave amplitude: coefficient of variation of population (swing / mean)
  const mean = pops.reduce((a, b) => a + b, 0) / pops.length;
  const sd = Math.sqrt(pops.reduce((a, b) => a + (b - mean) ** 2, 0) / pops.length);
  return { seed, pctDepth3: +(100 * deep3 / n).toFixed(0), pctDepth4: +(100 * deep4 / n).toFixed(0),
    cv: +(sd / mean).toFixed(3), meanPop: +mean.toFixed(0), reinv: g.stats().reinventions };
}
const seeds = [1, 2, 3, 4, 5, 6];
console.log('SELF-WAVE enrichment sweep: no external knockout. Does a stronger endogenous wave sustain depth>=3?\n');
console.log('(CV = population swing; higher = stronger self-disturbance)\n');
for (const [basal, stockMax] of [[42, 90], [30, 150], [24, 250], [18, 350], [14, 500], [10, 700]]) {
  const rs = seeds.map(s => run(s, basal, stockMax));
  const d3 = (rs.reduce((a, r) => a + r.pctDepth3, 0) / rs.length).toFixed(0);
  const d4 = (rs.reduce((a, r) => a + r.pctDepth4, 0) / rs.length).toFixed(0);
  const cv = (rs.reduce((a, r) => a + r.cv, 0) / rs.length).toFixed(3);
  const ri = (rs.reduce((a, r) => a + r.reinv, 0) / rs.length).toFixed(0);
  console.log(`basal ${String(basal).padStart(2)} stock ${String(stockMax).padStart(3)}: depth>=3 ${String(d3).padStart(3)}%  depth>=4 ${d4}%  | wave CV ${cv}  meanPop ${(rs.reduce((a,r)=>a+r.meanPop,0)/rs.length).toFixed(0)}  auto re-adopts ${ri}`);
}
console.log('\nBaseline to beat: manual disturbance held depth>=3 ~24%, calm ~1%.');
console.log('If any regen gives depth>=3 well above 1% with a HIGH CV and NO knockouts, the wave self-sustains the tower.');
