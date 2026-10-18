// Trims data/garden-archive.json (every archived genome, ~20k) to data/garden-gallery.json
// for the page: the 150 most-novel-at-entry members per world plus every member whose
// code they borrowed (transitively) and their nearest archived ancestors, so each M⟨…⟩
// link on the page resolves. Pure selection — no genome is altered.
'use strict';
const fs = require('fs'), path = require('path');
const PER = +process.argv[2] || 150;
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'garden-archive.json'), 'utf8'));
const byId = {}; for (const g of src.gallery) byId[g.id] = g;
const keep = new Set();
const worlds = [...new Set(src.gallery.map(g => g.world))];
for (const w of worlds) src.gallery.filter(g => g.world === w).sort((a, b) => b.novelty - a.novelty).slice(0, PER).forEach(g => keep.add(g.id));
let frontier = [...keep];
while (frontier.length) { const next = []; for (const id of frontier) { const g = byId[id]; if (!g) continue; for (const r of g.macros.concat(g.parent ? [g.parent] : [])) if (byId[r] && !keep.has(r)) { keep.add(r); next.push(r); } } frontier = next; }
const gallery = src.gallery.filter(g => keep.has(g.id));
fs.writeFileSync(path.join(__dirname, 'data', 'garden-gallery.json'), JSON.stringify({ written: src.written, source: 'data/garden-archive.json', total: src.count, count: gallery.length, perWorld: PER, gallery }));
console.log('kept', gallery.length, 'of', src.count, 'bytes', fs.statSync(path.join(__dirname, 'data', 'garden-gallery.json')).size);
