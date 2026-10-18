// POST-HOC, not pre-registered. The garden canary failed: the planted 11-petal form scored
// 0.163 against the finished macro/11 archive, under the p90 leave-one-out of 0.225.
// Question here: did the observer fail to SEE the form, or did the archive REACH it?
// Score the planted form against the archive truncated at each generation.
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./lib/garden.js');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'garden-archive.json'), 'utf8')).gallery;
const planted = ['fold', 11, ['gauss', ['mul', ['k', 3], ['add', ['t'], ['k', -0.28]]]]];
const pd = G.describe(G.render(planted, 48), 48).desc;
const desc = g => [Math.min(1, g.symOrder / 16), null, Math.min(1, g.radialFreq / 12), Math.max(0, Math.min(1, g.fractalDim / 2)), Math.min(1, g.edgeDensity), g.fibShare];
// the exported archive dropped symStrength (dim 1); recompute descriptors from the genomes instead
const cache = new Map(); const full = g => { if (!cache.has(g.id)) cache.set(g.id, G.describe(G.render(g.tree, 48), 48).desc); return cache.get(g.id); };
for (const world of ['macro/11', 'control/11', 'macro/44']) {
  const arch = src.filter(g => g.world === world);
  const row = [];
  for (const cut of [1, 5, 10, 25, 50, 100, 200, 300]) {
    const pool = arch.filter(g => g.gen <= cut).map(full);
    const nov = G.novelty(pd, pool, 5);
    const loo = pool.map((d, i) => G.novelty(d, pool.filter((_, j) => j !== i), 5)).sort((a, b) => a - b);
    row.push(`g≤${cut}: n=${pool.length} planted=${nov.toFixed(3)} p90=${(loo[Math.floor(loo.length * .9)] || 0).toFixed(3)}`);
  }
  const nearest = arch.map(g => ({ g, d: G.dist(pd, full(g)) })).sort((a, b) => a.d - b.d)[0];
  console.log(world + '\n  ' + row.join('\n  ') + `\n  nearest member ${nearest.g.id} gen ${nearest.g.gen} dist ${nearest.d.toFixed(3)} code ${G.toCode(nearest.g.tree)}`);
}
