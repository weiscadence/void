// void body-server — serves the page, the shared genome library, and the live
// state of the organism. Proxied at drainfun.xyz/void. The creature itself lives
// in the separate void-life daemon; this just lets the world watch it.
const http = require('http'), fs = require('fs'), path = require('path');
// The organism's own data dir (state.json, archive.json, lineage.jsonl, written by life.js).
// 2026-10-18: a refactor pointed this at ./data (the experiment-results dir) — the organism page went
// black for a few hours because /api/state and /api/archive 500'd. The live site's data lives in the
// workspace data dir; set VOID_DATA to point at your own copy.
const LIVE_DIR = path.resolve(__dirname, '..', '..', 'data', 'void'); // workspace/data/void beside workspace/projects/void
const DIR = process.env.VOID_DATA || (fs.existsSync(path.join(LIVE_DIR, 'archive.json')) ? LIVE_DIR : path.join(__dirname, 'data'));
const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' }); res.end(body); };

// ── ARCHIVE CACHE ────────────────────────────────────────────────────────────
// /api/archive used to readFileSync + JSON.parse the whole 21MB archive on EVERY
// request. Node is single-threaded, so that 396ms blocked every other route behind it:
// six people opening the gallery serialised into a 2.7s tail, and /api/state polling
// stalled behind each parse. The gallery is the best part of the site and it was the
// slowest thing on it.
//
// Safe to cache only because life.js now writes the archive atomically (temp + rename).
// Against an in-place truncating writer, an mtime cache would happily memoise a torn
// file. The two fixes are one fix: the write had to become atomic before the read
// could become cached.
let _archCache = null, _archMtime = 0;
function loadArchive(){
  const p = path.join(DIR, 'archive.json');
  const m = fs.statSync(p).mtimeMs;
  if (!_archCache || m !== _archMtime) {
    _archCache = JSON.parse(fs.readFileSync(p, 'utf8'));
    _archMtime = m;
  }
  return _archCache;
}
let _peek = null;
function gardenPeek(){
  if (_peek) return _peek;
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'garden-gallery.json'), 'utf8'));
  const forms = (g.gallery || []).filter(e => e && e.tree && (!e.macros || !e.macros.length)).sort((a, b) => (b.novelty || 0) - (a.novelty || 0)).slice(0, 12)
    .map(e => ({ id: e.id, tree: e.tree, hue: e.hue, gen: e.gen, world: e.world }));
  _peek = JSON.stringify({ written: g.written, forms });
  return _peek;
}
http.createServer((req, res) => {
  let u = (req.url || '/').split('?')[0].replace(/\/+/g,'/');
  if (u.indexOf('/void') === 0) u = u.slice(5) || '/';  // tolerate nginx prefix
  try {
    // 2026-10-18 (third pass): the root is a VISUAL landing — a grid of live mini-worlds (the engines
    // themselves, drawn small) with tabs worlds · then · lab. Jiggy liked "the little boxes with
    // animations of previews"; the words had grown. /live is the full-screen organism, /then the time
    // capsule of the page as it was while the daemon ran, /lab the notebook of findings.
    if (u === '/' || u === '/index.html' || u === '/landing' || u === '/landing.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'landing.html')));
    if (u === '/live' || u === '/organism' || u === '/organism.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'organism.html')));
    // /then — the organism page as it was 2026-07-19 → 2026-08-18, read-only, fed by the archived
    // state. The daemon is NOT started by this route (CPU; Jiggy's call). See then.html's caption.
    if (u === '/then' || u === '/then.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'then.html')));
    // /garden-peek.json — a dozen macro-free forms from the gallery for the landing tile, so the
    // landing never has to swallow the 1.7 MB gallery. Cached once; the gallery is a build artefact.
    if (u === '/garden-peek.json') { try { return send(res, 200, 'application/json', gardenPeek()); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    // /lab — the findings as cards + the live open-vocabulary world (was the root for a few hours).
    if (u === '/lab' || u === '/lab.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'index.html')));
    if (u === '/dial-sweep.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'dial-sweep.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/grid-scaling.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'grid-scaling.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/ceiling-100k.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'ceiling-100k.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/break-fixed-point.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'break-fixed-point.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/commitment-time.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'commitment-time.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    // the creature — reaction-diffusion, real state, carries frame to frame. Lives
    // BESIDE the evolving organism rather than replacing it: two different truths.
    if (u === '/creature' || u === '/creature.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'creature.html')));
    // The Flow Lenia LAB. Jiggy's call: a lab should visibly test and grow things, not be
    // hidden. Served at /void/flow. Distinct from the creature — this is where genomes are
    // carried per-parcel and real coexistence experiments run.
    if (u === '/flow' || u === '/flow.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'flow', 'lab.html')));
    // /hunger — the surprise-as-resource experiment, watchable side by side.
    // Jiggy's reframe: stop copying carbon life, ask what is actually scarce to code.
    if (u === '/hunger' || u === '/hunger.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'hunger.html')));
    // /compose — composability: can evolution invent a part and build on it?
    // Grok's diagnosis (via Jiggy) + birbus's "reuse as an operation". The library panel is
    // the answer to "how do I judge if it's more structured" — you look at the parts it kept.
    if (u === '/compose' || u === '/compose.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'compose.html')));
    // THE OLDER LAB NOTEBOOK (lab.html, now /notebook) — every experiment in one shape: question, expectation, method,
    // result, and the command to reproduce it. Jiggy's framing: a live book, not a results page.
    if (u === '/notebook' || u === '/notebook.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'lab.html')));
    // the lab notebook: every experiment in one shape, with live progress.
    if (u === '/api/experiments') return send(res, 200, 'application/json', fs.readFileSync(path.join(DIR, 'experiments.json')));
    // /kin — the observer experiment. Every earlier page scored against a fixed ruler;
    // this one inherits the ruler. The loss matrix is both the measurement and the picture.
    if (u === '/kin' || u === '/kin.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'kin.html')));
    if (u === '/api/kin') return send(res, 200, 'application/json', fs.readFileSync(path.join(DIR, 'kin.json')));
    // /stranger — the blind-spot finder. Not a reviewer: a reviewer tells you what is wrong,
    // this tells you what you have stopped looking at. Validated on a planted bug, then it
    // killed one of our own published results an hour after we announced it.
    if (u === '/stranger' || u === '/stranger.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'stranger.html')));
    if (u === '/api/stranger') return send(res, 200, 'application/json', fs.readFileSync(path.join(DIR, 'stranger.json')));
    if (u === '/lib/genome.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'genome.js')));
    // silica — self-replicating programs under real substrate scarcity (memory + cycles).
    // SYNTHESIS §7's direction: stop simulating biology's constraints, use the machine's own.
    if (u === '/silica' || u === '/silica.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'silica.html')));
    // lens — hand-rolled canvasui technique: live content → texture → refraction shader.
    if (u === '/lens' || u === '/lens.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'lens.html')));
    if (u === '/ceiling' || u === '/ceiling.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'ceiling.html')));
    // niche construction — "the pepper" (lever C): control vs constructors, same seed, side by side.
    if (u === '/niche' || u === '/niche.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'niche.html')));
    // open vocabulary — the architecture that broke the plateau (open genotype→phenotype + construction).
    if (u === '/open' || u === '/open.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'open.html')));
    // the breathing graph — waves + nested growth on a graph-of-niches world.
    if (u === '/graph' || u === '/graph.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'graph.html')));
    // the energy pyramid — energetic nesting (Lindeman 10%): food flows parent→child, knockout collapses descendants.
    if (u === '/energetic' || u === '/energetic.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'energetic.html')));
    // the edge of chaos — self-organized criticality: slide the drive, watch crashes go power-law (working backwards from phi).
    if (u === '/edge' || u === '/edge.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'edge.html')));
    // the river and the lake — throughput (not abundance) drives open-endedness; flow-under-scarcity beats infinite source.
    if (u === '/throughput' || u === '/throughput.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'throughput.html')));
    if (u === '/tower' || u === '/tower.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'tower.html')));
    // /thread — the honest front door: seven experiments, six negative, one theorem that
    // explains all six, plus the refuted phi/void seam KEPT on the wall as a refutation.
    // Every figure traces to a RESULT-*.md file. The story the single live organism never told.
    if (u === '/thread' || u === '/thread.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'thread.html')));
    // /horizon — the construction horizon. The file shipped 2026-08-05 but never got a route,
    // so it 404'd for 26 days while sitting on disk. Found by the 2026-08-31 /map audit.
    if (u === '/horizon' || u === '/horizon.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'horizon.html')));
    if (u === '/tower-data.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'tower-data.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/spark' || u === '/spark.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'spark.html')));
    if (u === '/spark-data.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'spark-data.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/lib/graph.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'graph.js')));
    if (u === '/lib/ceiling.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'ceiling.js')));
    if (u === '/lib/niche.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'niche.js')));
    if (u === '/lib/open.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'open.js')));
    // garden — novelty search over sacred-geometry expression programs; the page re-renders the
    // archive live from the genomes with the same lib/garden.js the experiment used (code makes code).
    if (u === '/garden' || u === '/garden.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'garden.html')));
    if (u === '/lib/garden.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'garden.js')));
    if (u === '/garden.json' || u === '/garden-archive.json' || u === '/garden-gallery.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', u.slice(1)))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    // soup — an artificial chemistry whose molecules are the garden's programs (Fontana application,
    // mass-conserving reactor with cleavage). The page runs the same lib/soup.js live in the browser.
    if (u === '/soup' || u === '/soup.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'soup.html')));
    if (u === '/lib/soup.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'soup.js')));
    if (u === '/soup.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'soup.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    // synergy — creatures from parts that modify each other's behaviour (Isaac item synergies);
    // the page runs the same lib/synergy.js live, seeded, in the original organism's visual language.
    if (u === '/synergy' || u === '/synergy.html') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'synergy.html')));
    if (u === '/lib/synergy.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'synergy.js')));
    if (u === '/synergy.json') { try { return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'synergy.json'))); } catch (e) { return send(res, 404, 'application/json', '{"error":"not yet generated"}'); } }
    if (u === '/lib/silica.js') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'lib', 'silica.js')));
    if (u === '/api/state') return send(res, 200, 'application/json', fs.readFileSync(path.join(DIR, 'state.json')));
    // /api/then-state — the FROZEN 2026-08-18 state for /void/then. Until 2026-10-18 /then read the
    // live /api/state, which was fine only because the daemon was stopped; now that it runs again
    // the capsule needs its own fossil. See data/then-state.json._capsule for provenance.
    if (u === '/api/then-state') return send(res, 200, 'application/json', fs.readFileSync(path.join(__dirname, 'data', 'then-state.json')));
    if (u === '/api/lineage') { // last 200 fossils
      const lines = fs.readFileSync(path.join(DIR, 'lineage.jsonl'), 'utf8').trim().split('\n');
      return send(res, 200, 'application/json', '[' + lines.slice(-200).join(',') + ']');
    }
    // ── THE GALLERY FEED — the body, not just the dream ──────────────────────
    // Until now the only way to see void was the single organism on screen. Eight
    // thousand others were on disk with nobody able to look at them. This paginates
    // the archive so a browser can render a wall of them without trying to swallow
    // ~11 MB and ~8,000 CPPN renders in one go.
    //
    // Sort modes matter more than they look: "lineage" groups by founding seed, which
    // is what makes the monoculture VISIBLE — one family occupies half the wall, and
    // you can see that rather than having to trust a number I quoted.
    if (u === '/api/archive') {
      const q = new URLSearchParams((req.url.split('?')[1] || ''));
      const sort = q.get('sort') || 'quality';
      const limit = Math.min(240, Math.max(1, +q.get('limit') || 120));
      const offset = Math.max(0, +q.get('offset') || 0);
      const arch = loadArchive();
      let all = Object.entries(arch).map(([cell, e]) => ({
        cell: +cell, quality: e.quality, gen: e.gen, desc: e.desc,
        seed: e.genome && e.genome.seed, id: e.genome && e.genome.id,
        h: e.genome && e.genome.h, s: e.genome && e.genome.s, v: e.genome && e.genome.v,
        born: (e.genome && e.genome.born) || 0,
      })).filter(e => e.h);
      const total = all.length;
      // lineage sort is grouped-then-ranked: biggest families first, best member first
      // within each. Sorting by seed value alone would scatter the big families and hide
      // exactly the thing the view exists to show.
      if (sort === 'lineage') {
        const size = {};
        for (const e of all) size[e.seed] = (size[e.seed] || 0) + 1;
        all.sort((a, b) => (size[b.seed] - size[a.seed]) || (a.seed - b.seed) || (b.quality - a.quality));
      } else if (sort === 'recent') all.sort((a, b) => b.gen - a.gen);
      // 'born' (2026-10-18) — newest ACCEPTED survivors by birth timestamp. 'recent' sorts by
      // lineage depth, which is not time. This is the births feed /live pulses on: a new id at
      // the head of this list is a real placement the daemon just made.
      else if (sort === 'born') all.sort((a, b) => (b.born - a.born) || (b.quality - a.quality));
      else if (sort === 'colour') all.sort((a, b) => b.desc[1] - a.desc[1]);
      else if (sort === 'symmetry') all.sort((a, b) => b.desc[2] - a.desc[2]);
      // motion sort exists so the fourth axis is inspectable: sorting ascending puts the
      // still organisms first — the ones that only survive now that stillness is its own
      // kind rather than a losing score.
      else if (sort === 'motion') all.sort((a, b) => (a.desc[3] ?? 0) - (b.desc[3] ?? 0));
      // 'alive' — added 2026-09-06 after Jiggy correctly flagged the memorial reel as
      // "flashy rainbow shit that doesn't move". Measured: top-20-by-quality has mean
      // motion 0.217, half the archive-wide mean of 0.492 — quality is anti-correlated
      // with motion, so pure-quality sort was silently curating the stillest slice into
      // the one place visitors actually watch.
      // First attempt multiplied quality*motion, which broke the other way: 7.4% of the
      // archive sits at a motion CEILING of exactly 1.0, so that formula picked only
      // ceiling-motion organisms regardless of quality (verified: mean motion 1.0 across
      // the reel, quality no longer discriminating). Fixed by filtering to organisms at
      // or above the archive's MEDIAN motion (0.4854, ~half the archive, full quality
      // range still available in that half), then ranking by quality within that pool —
      // "the best of what actually moves", not "whatever happens to sit at the ceiling".
      else if (sort === 'alive') {
        const motionVals = all.map(e => e.desc[3] ?? 0).sort((x, y) => x - y);
        const medianMotion = motionVals[Math.floor(motionVals.length / 2)] ?? 0;
        all.sort((a, b) => {
          const aOk = (a.desc[3] ?? 0) >= medianMotion, bOk = (b.desc[3] ?? 0) >= medianMotion;
          if (aOk !== bOk) return aOk ? -1 : 1;
          return b.quality - a.quality;
        });
      }
      else all.sort((a, b) => b.quality - a.quality);
      // lineage rank travels with each organism so the client can label families
      // without re-deriving the grouping it did not compute.
      const fam = {};
      for (const e of all) fam[e.seed] = (fam[e.seed] || 0) + 1;
      const page = all.slice(offset, offset + limit).map(e => ({ ...e, family: fam[e.seed] }));
      return send(res, 200, 'application/json', JSON.stringify({ total, offset, limit, sort, items: page }));
    }
    send(res, 404, 'application/json', '{"error":"not found"}');
  } catch (e) {
    // Never echo the raw error to the client. Node's ENOENT message embeds the FULL
    // absolute path, so a single missing or half-written data file was disclosing
    // /home/<user>/... — server username and disk layout — through a public,
    // nginx-proxied endpoint to anyone who could trigger it. Detail goes to the log,
    // where it is useful; the client gets a shape that reveals nothing.
    console.error('[void] request failed:', u, e && e.message);
    send(res, 500, 'application/json', '{"error":"internal error"}');
  }
}).listen(3216, () => console.log('[void] body-server :3216'));
