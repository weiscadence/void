#!/usr/bin/env node
/* life.js — the void's metabolism. One organism, living on the server forever.
 *
 * Architecture (synthesized from the research, 2026-07-19):
 *  - Electric Sheep (Draves): the creature lives server-side; all viewers are
 *    phase-locked to ONE state written to disk. Not a per-visitor restart.
 *  - MAP-Elites (Mouret & Clune): keep an ARCHIVE of the most interesting organism
 *    in each cell of a 2-D behavior space (edge-density × colorfulness), so the
 *    species never collapses to one champion — it illuminates the whole space.
 *  - Novelty search (Stanley/Lehman): parents are chosen and children accepted for
 *    being DIFFERENT from what already exists, not for a fixed goal. Breeding for
 *    novelty beats breeding for quality; it's what keeps it surprising forever.
 *  - Assembly Theory (Cronin & Walker): the organism's "aliveness" is a measurable
 *    VITAL SIGN — assembly index ≈ accumulated selection history (lineage depth +
 *    structural complexity of what survived). If it climbs, selection is doing real
 *    work. If it flatlines, we built a screensaver. The graph can prove us wrong.
 *  - Continuity (autopoiesis / stigmergy): the archive + lineage on disk ARE the
 *    organism; this process is just its current body. Restart-safe: it resumes life.
 *
 * Writes: data/void/state.json (current body + vitals, phase-lock source),
 *         data/void/archive.json (the species — diversity memory),
 *         data/void/lineage.jsonl (fossil record, append-only).
 * pm2: void-life. Ticks forever.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('./lib/genome.js');

const DIR = process.env.VOID_DATA || require('path').join(__dirname, 'data'); // set VOID_DATA for a live site
const STATE = path.join(DIR, 'state.json');
const ARCH = path.join(DIR, 'archive.json');
const FOSSIL = path.join(DIR, 'lineage.jsonl');
const LOG = path.join(DIR, 'life.log');

// GRID is MUTABLE and PERSISTED (v5, 2026-07-19). A fixed board is a board that fills.
// v3's cube (12³ = 1,728) unsealed the archive and then filled to 1,719/1,728 in ~7h —
// the SAME failure as the 144-cell shelf, just further away. Coverage is a finite fuel.
// So the resolution is now a ladder the organism climbs when it runs out of room: see
// refine(). Persisted in state.json because a restart that forgot GRID would re-key
// every elite into the wrong cell.
let GRID = 12;                   // MAP-Elites resolution per axis (12³ = 1,728 rooms)
// THE LADDER MUST BE MULTIPLES, and this is a correctness constraint, not a style choice.
// I first wrote [12,16,20,26] and claimed the expansion was "strictly lossless because a
// finer grid only splits cells". That is FALSE unless each rung divides evenly into the
// next. Counterexample at 12→16: desc 0.1666 bins to cell 1 and 0.1668 to cell 2 at
// GRID=12, but BOTH land in cell 2 at GRID=16 — different rooms merging into one, so one
// elite silently evicts the other. Multiples make each rung a strict refinement of the
// last: every old cell splits into exactly (r³) new ones and no two can ever merge.
// LADDER TOPS OUT AT 24, AND THE REASON IS THE HOST, NOT THE BIOLOGY.
// I first wrote [12,24,48]. Measured trajectory: elites cost ~1.4 KB each, discovery runs
// at ~265 new cells/min, so grid-24 fills in ~35 min and grid-48's 110,592 rooms would be
// ~151 MB of JSON and well over a gigabyte resident — on a box with 1.9 GB free. That is
// not open-endedness, that is an OOM with extra steps, and this machine has OOMed before.
// Open-ended growth still has to fit in the thing it grows inside.
const GRID_LADDER = [12, 24];          // 4D: 20,736 → 331,776 rooms
// Cells are free; ORGANISMS are what cost memory. Only occupied cells are stored, so the
// hypercube's room count doesn't change the footprint — this ceiling does, and it is the
// one that keeps void inside a 3.8 GB box. ~14k x 1.4 KB ≈ 20 MB on disk.
// RAISED 14000 -> 22000 because 14000 sealed the organism shut. The refine() ladder fires at
// 0.97 occupancy of 12^4 = 20,114 elites, but the ceiling stopped new cells at 14,000 = 0.675.
// The trigger was mathematically unreachable, so refine() could NEVER run: void sat at exactly
// 14000/20736 with "new 0/12t" for 20 hours, discovering nothing, and the guard inside refine()
// was dead code. Two constants tuned against different assumptions, each sane alone.
// 22000 clears the 20,114 threshold so the ladder can actually engage. Memory checked, not
// assumed: 231 MB RSS at 14,000 (~17 KB/elite) -> ~372 MB at 22,000, against 1.85 GB free.
// HONEST LIMIT: refinement cannot cure a POPULATION ceiling. A finer grid with the same cap is
// a finer prison. This buys real room, not open-endedness — memory is the true wall.
const MAX_ELITES = 22000;              // hard population ceiling, independent of grid

// ── NEGATIVE FREQUENCY DEPENDENCE (v6, 2026-07-19 late) — the ecology experiment ──
// Three separate interventions tonight failed to move the monoculture: 8x the rooms
// (effective lineages 3.21 → 3.37), a fourth axis (3.37 → 3.65). One family has held
// ~51% of the archive throughout. That is now three independent confirmations that
// MAP RESOLUTION IS NOT THE LEVER — you cannot manufacture an ecology by redrawing
// the map, because MAP-Elites cells never interact. Nothing in this system has ever
// made it costly to be common.
//
// This is the mechanism real ecosystems use instead: as a type becomes abundant its
// predators specialise and its resource thins, so RARITY IS AN ADVANTAGE. Formally it
// is what mutual invasibility tests for — can a rare type invade a resident at
// equilibrium? Here a challenger's score is discounted by its own lineage's share of
// the population, so a lineage at 51% must be substantially better than a rare invader
// to keep a room, rather than merely equal.
//
// FALSIFIABLE PREDICTION, recorded before running it: effective lineages rises from
// 3.65 and the largest family falls below 51%. If neither moves, frequency dependence
// is not the missing mechanism either and I was wrong about the diagnosis, not just
// the dose. Logged every tick so the trajectory is checkable rather than asserted.
//
// The stored `quality` stays RAW — the discount applies only to the contest. Polluting
// the stored score would corrupt the gallery, the dream selection, and every downstream
// aesthetic judgement with a population statistic that has nothing to do with beauty.
const FREQ_DEP = 0.6;
const RW = 60, RH = 38;          // fitness render buffer (small = cheap)
const EVALS_PER_TICK = 60;       // mutation attempts per heartbeat
const TICK_MS = 5000;            // metabolism period
const K_NOV = 6;                 // neighbours for novelty distance
const MAX_NODES = 90;            // parsimony: cap genome size so it stays renderable
                                 // (unbounded GP trees BLOAT until nothing can draw them —
                                 //  a real organism has a metabolism that limits its size)
const DIMS = 4;                 // detail × colour × symmetry × motion
let CELLS = GRID**DIMS;         // recomputed by refine() when the board is outgrown
const T0 = 0;                    // FIXED phase for ALL descriptor measurement, forever.
                                 // was `Date.now()/1000 % 1000` — so every elite was measured
                                 // at whatever moment it happened to be born, and the archive
                                 // compared an organism sampled at t=100 against one at t=740.
                                 // ~31% of the reported "100% coverage" was that phase noise.
const DREAM_FLOOR = 0.34;        // minimum quality for the DISPLAYED organism.
                                 // novelty alone drove it to greyscale corners once the
                                 // archive saturated. The dream stays weird, not degenerate.
// v5 = flux PROMOTED to a binning axis (4D hypercube) and removed from quality;
//      alive now scores coherence only. See cell() and quality().
// REJECTED at v5, recorded so nobody re-proposes it: a GENOME-STRUCTURAL axis (code
// depth / warp density / source length). Measured on 9,746 elites it looked ideal —
// r = 0.01..0.15 against every existing axis, beautifully independent. That near-zero
// correlation is exactly the disqualification: the code is independent of the picture
// because it is INVISIBLE. Binning on it would file two identical-looking organisms
// into different rooms and call it coverage — the same manufactured diversity the
// research rejected when it rejected naive resolution-bumping. An axis has to measure
// something a viewer could point at.
const QUALITY_VERSION = 5;

function log(m){ const l=`[${new Date().toISOString()}] ${m}`; console.log(l); try{fs.appendFileSync(LOG,l+'\n');}catch{} }
function loadJson(f,d){ try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;} }

// deterministic rng (seedable so the daemon is reproducible from a seed)
let SEED = (Date.now() ^ 0x9e3779b9) >>> 0;
function rng(){ SEED = (SEED*1664525 + 1013904223) >>> 0; return SEED/4294967296; }

// ── render a genome to the tiny buffer and extract its BEHAVIOR DESCRIPTOR ──
// descriptor = [edgeDensity, colorfulness, meanLum]; also variance for liveness.
function describe(gm, t){
  let sumL=0, sumS=0, sqL=0, edge=0, n=0;
  const lum=new Float32Array(RW*RH);
  for(let py=0; py<RH; py++){
    const y=(py/RH)*2-1;
    for(let px=0; px<RW; px++){
      const x=(px/RW)*2-1;
      const h=G.ev(gm.h,x,y,t,gm.seed), s=G.ev(gm.s,x,y,t,gm.seed), v=G.ev(gm.v,x,y,t,gm.seed);
      const rgb=G.hsv(h,s,v);
      const L=(rgb[0]+rgb[1]+rgb[2])/3;
      const sat=(1-(Math.min(rgb[0],rgb[1],rgb[2])/(Math.max(rgb[0],rgb[1],rgb[2])+1e-6)));
      lum[py*RW+px]=L; sumL+=L; sqL+=L*L; sumS+=sat; n++;
    }
  }
  for(let py=0; py<RH; py++) for(let px=0; px<RW-1; px++){
    edge += Math.abs(lum[py*RW+px]-lum[py*RW+px+1]);
    if(py<RH-1) edge += Math.abs(lum[py*RW+px]-lum[(py+1)*RW+px]);
  }
  const meanL=sumL/n, varL=sqL/n-meanL*meanL;
  const edgeDensity=Math.min(1, edge/(n*40));   // 0..1
  const colorful=Math.min(1, sumS/n);           // 0..1
  const mo = motion(gm, t);
  // FOURTH AXIS: flux (2026-07-19 late). Measured on 500 real elites, flux is the
  // best-spread axis in the system — stdev 0.353 vs symmetry 0.281, all 12 bins filled,
  // and near-orthogonal to every existing axis (r = +0.11 edge, -0.19 colour, -0.02 symm).
  // Chosen over coherence, which piles 31% of the population into one bin because
  // coherence is UNDEFINED for a still image (75% of motionless organisms sit at exactly
  // 0.5). Chosen over a genome-structural axis — see the note above quality().
  return { d:[edgeDensity, colorful, symmetry(lum), mo.flux], varL, edgeDensity, colorful,
           meanL:meanL/255, flux:mo.flux, tempCoher:mo.coher };
}

// ── MOTION (v4) — the void was an ANIMATED artwork that could not perceive animation ──
// Measured across all 1,716 elites: 33% completely frozen, 45% barely moving. To selection
// a writhing creature and a dead-still one were IDENTICAL, because every descriptor was
// taken at a single frozen instant.
//
// Two numbers, because "moves" is not one thing:
//   flux      — HOW MUCH it changes
//   tempCoher — WHETHER the change has direction. 1 = smooth drift, 0 = strobe/flicker.
// They correlate only -0.44, so they are genuinely independent. Rewarding flux ALONE
// would breed epileptic static, which is the messy kind of motion. flux × tempCoher
// rewards the alive kind: things that flow.
//
// Cost: two extra stride-2 renders ≈ +44% descriptor time (measured). Affordable — void
// runs at ~8.5% of one core.
function motion(gm, t){
  const S=2, w=Math.ceil(RW/S), h=Math.ceil(RH/S), DT=1.3;
  const grab = tt => { const a=new Float32Array(w*h); let i=0;
    for(let py=0; py<RH; py+=S){ const y=(py/RH)*2-1;
      for(let px=0; px<RW; px+=S){ const x=(px/RW)*2-1;
        const rgb=G.hsv(G.ev(gm.h,x,y,tt,gm.seed),G.ev(gm.s,x,y,tt,gm.seed),G.ev(gm.v,x,y,tt,gm.seed));
        a[i++]=(rgb[0]+rgb[1]+rgb[2])/3; } }
    return a; };
  const f0=grab(t), f1=grab(t+DT), f2=grab(t+2*DT);
  let sum=0, dot=0, n1=0, n2=0;
  for(let i=0;i<f0.length;i++){
    const a=f1[i]-f0[i], b=f2[i]-f1[i];
    sum+=Math.abs(a); dot+=a*b; n1+=a*a; n2+=b*b;
  }
  return {
    flux:  Math.min(1, (sum/f0.length)/60),
    coher: (n1>0 && n2>0) ? ((dot/Math.sqrt(n1*n2))+1)/2 : 0.5,
  };
}

// ── THE THIRD AXIS: SYMMETRY ──────────────────────────────────────────────────
// Replaces meanLum as the third descriptor. meanLum was measured at stdev 0.099 vs
// 0.257/0.280 for the two axes in use — clumped in the middle, a weak place to sort on.
// Symmetry measured as the BEST-distributed of eight candidate axes (12/12 bins filled).
//
// Two things had to be right, and the obvious implementation gets both wrong:
//   1. Vertical mirror ALONE fails badly — >75% of the archive has ~zero vertical
//      symmetry, so it dumps ~110 of 144 into one bin. Take the BEST of three
//      symmetries instead (mirror-x, mirror-y, 180° rotation).
//   2. Symmetry error is distributed near-exponentially, so a linear remap crushes
//      everything toward zero. Remap through exp(-d/25).
//
// Why this axis and not another: life advances by BREAKING symmetry. A perfectly
// symmetric field is a crystal; a fully asymmetric one is noise; organisms live in the
// tension between. Making it a sorting axis means the void must go find every degree of
// that tension — from mandala to chaos — instead of only ever being scored on colour.
// Costs zero extra tree evaluations: it reads the luminance buffer we already rendered.
function symmetry(lum){
  let dV=0, dH=0, dR=0, n=0;
  const halfW = RW>>1;
  for(let y=0; y<RH; y++){
    for(let x=0; x<halfW; x++){
      const a = lum[y*RW+x];
      dV += Math.abs(a - lum[y*RW + (RW-1-x)]);            // mirror across vertical axis
      dH += Math.abs(a - lum[(RH-1-y)*RW + x]);            // mirror across horizontal axis
      dR += Math.abs(a - lum[(RH-1-y)*RW + (RW-1-x)]);     // 180° rotation
      n++;
    }
  }
  if(!n) return 0;
  const best = Math.min(dV, dH, dR) / n;   // smallest mismatch = most symmetric
  return Math.max(0, Math.min(1, Math.exp(-best/25)));
}
function dead(desc){ return desc.varL < 260 || desc.varL > 16000; } // flat or static

// ── QUALITY (v2, 2026-07-19) ──────────────────────────────────────────────────
// THE RULE: no term of quality() may be a binning axis of cell(). Ever.
//
// v1 broke this. cell() bins on [edgeDensity, colorful] and v1's quality was 85%
// built from those same two numbers. Inside one cell they're pinned to a 1/12 window,
// so quality became a near-constant function of the cell index: each cell climbed a
// ~0.07-tall hill, reached its analytic maximum, and sealed permanently.
// Measured before this change: 124/144 cells at their theoretical ceiling,
// `placed 0 this tick` for 130 consecutive ticks. The archive wasn't full — it was shut.
//
// v2 scores only on axes cell() does NOT bin, so there is a real gradient inside a cell.
function quality(desc, gm){
  // structure: reward mid-range luminance variance. Flat images and pure noise both lose.
  const struct = Math.max(0, 1 - Math.abs(Math.log(Math.max(desc.varL,1)/2600)) / 1.6);
  // thrift: the same behaviour from a smaller genome is better. This PRICES complexity
  // rather than forbidding it — MAX_NODES alone gave a random walk off a wall, with no
  // selective direction at all (complexity appeared nowhere in v1's quality).
  // alive (v4): moves AND moves smoothly. flux ALONE would breed strobing static —
  // the messy kind of motion. flux × tempCoher rewards the kind that flows.
  // v5: alive scores HOW it moves, never HOW MUCH. flux became a binning axis, and the
  // rule that sealed this archive once already is that no quality term may be a binning
  // axis — inside a room flux is pinned to a 1/12 window, so scoring on it would flatten
  // the gradient again. Coherence carries the aesthetic instead: smooth drift beats
  // strobing flicker, which is the distinction that actually matters to a viewer.
  //
  // Consequence, stated plainly: void no longer hunts for MOVEMENT. A still organism is
  // no longer punished — it lands in the flux≈0 rooms and competes there on smoothness
  // and structure like everything else. What protects the thing Jiggy actually watches is
  // showable(), which still demands real motion of the DREAM. Archive collects every kind;
  // the display stays animated. Two judges, two different questions, on purpose.
  const alive  = Math.min(1, (desc.tempCoher ?? 0.5) * 1.15);
  // thrift DEMOTED 0.28 → 0.10 on evidence (2026-07-19). v3 assumed big genomes = mess.
  // I measured that across 1,716 elites and it is FALSE:
  //     coherence vs complexity correlation = 0.19  (essentially unrelated)
  //     genomes >60 nodes: mean coherence 0.968  vs  0.941 median — bigger is if
  //     anything slightly MORE coherent.
  // Thrift at 0.28 shaved mean size 69 → 41 to buy an aesthetic gain that doesn't exist.
  // 0.10 still breaks ties toward the elegant solution; MAX_NODES remains the real guard.
  //
  // ALSO TESTED AND REJECTED: a multi-scale "coherence" quality term. Median 0.941,
  // stdev 0.094 — nearly every organism scores the same, which would have recreated the
  // near-constant-quality bug that sealed the archive in the first place. A quality term
  // without variance is decoration.
  const thrift = 1 - Math.min(1, G.complexity(gm)/MAX_NODES);
  return 0.50*struct + 0.40*alive + 0.10*thrift;
}
// THE CUBE (v3, 2026-07-19): detail × colour × symmetry = 12³ = 1,728 rooms, was 144.
// Deliberately far more space than the population can fill. A board that saturates is a
// board that seals; a mostly-empty cube is somewhere to keep going.
// THE HYPERCUBE (v4, 2026-07-19 late): detail × colour × symmetry × MOTION.
// 12⁴ = 20,736 rooms. Motion is the first axis that isn't read off a frozen frame —
// void has always been an animated artwork that filed its organisms as if they were
// still images, so "moves a lot" and "doesn't move at all" were the same kind of thing.
// They are now different kinds, which means a still organism is no longer competing
// against a writhing one for the same room. It gets its own.
function cell(desc){
  const b = i => Math.min(GRID-1, (desc.d[i]*GRID)|0);
  return ((b(0)*GRID + b(1))*GRID + b(2))*GRID + b(3);
}

// ── SHOWABLE — a display criterion, NOT an archive criterion ─────────────────
// My first attempt at fixing the grey dream gated it on quality(), which failed,
// and the reason is my own rule: quality may never contain a binning axis, and
// COLOUR IS A BINNING AXIS. So a pure-greyscale organism scores perfectly well on
// quality (good variance, high motion) and cleared the floor untouched.
//
// The resolution is that the dream is not binned at all — it is what a human looks
// at. So it gets its own, separate, frankly aesthetic test. This is the one place
// in the system where "does it look good" is allowed to be the criterion, and it
// should be, because a person is watching.
function showable(desc, q){
  if(q < DREAM_FLOOR) return false;
  if(desc.colorful < 0.18) return false;      // not a greyscale corner case
  if(desc.varL < 900 || desc.varL > 12000) return false;  // not flat, not screaming
  if((desc.flux||0) < 0.02) return false;     // not frozen — it is an animated piece
  return true;
}
function novelty(desc, archive){
  const ds=[];
  // ALL FOUR AXES. This summed only d[0..2] and silently dropped d[3] — motion — which is
  // the axis added specifically to break the plateau. Two organisms at opposite ends of the
  // motion axis, identical elsewhere, both scored novelty 0 against the same entry: verified.
  // So the organism crowned on screen could never be chosen for moving differently, and
  // ASSEMBLY (the headline vital sign) was computed blind to a quarter of the behaviour space.
  // A stale docstring above describe() still described the old 3-axis descriptor — the
  // fingerprint of a function that was never updated when the fourth axis landed.
  for(const c in archive){ const a=archive[c].desc;
    ds.push(Math.hypot(desc.d[0]-a[0], desc.d[1]-a[1], desc.d[2]-a[2], (desc.d[3]??0)-(a[3]??0))); }
  if(!ds.length) return 1;
  ds.sort((x,y)=>x-y);
  let s=0,k=Math.min(K_NOV,ds.length); for(let i=0;i<k;i++) s+=ds[i]; return s/k;
}

// ── resurrect from disk, or spawn genesis ──
let archive = loadJson(ARCH, null);   // { cellIndex: {genome, desc, quality, gen} }
let state = loadJson(STATE, null);
let ASSEMBLY = state && state.assembly || 0;  // running vital sign
let BORN = state && state.born || Date.now();
let acceptedTotal = state && state.accepted || 0;

// RESTORE THE BOARD SIZE BEFORE ANY cell() CALL. The archive is keyed by an index that
// is a function of GRID; resuming at GRID=12 with an archive written at GRID=16 would
// silently scatter every elite into the wrong room — no error, just a corrupted map.
// Trusting state.grid alone is not safe: refine() re-keys the archive in memory, but the
// archive is only flushed every 12 ticks, so a crash in between leaves the two files
// disagreeing about the board size. So RECONCILE rather than trust — infer the board from
// the archive's own keys (indices run 0..GRID³-1) and cross-check against state.
//
// When the two disagree, ALWAYS ROUND UP. The asymmetry is the whole point: re-keying at
// too FINE a grid only splits cells (lossless), while too COARSE a grid merges them and
// silently evicts one elite per collision. Given uncertainty, the larger board is free and
// the smaller one costs genomes.
if(archive){
  const maxKey = Object.keys(archive).reduce((m,k)=>Math.max(m, +k||0), 0);
  const inferred = GRID_LADDER.find(g => g**DIMS > maxKey) || GRID_LADDER[GRID_LADDER.length-1];
  const claimed = (state && GRID_LADDER.includes(state.grid)) ? state.grid : GRID_LADDER[0];
  GRID = Math.max(inferred, claimed); CELLS = GRID**DIMS;
  if(inferred !== claimed)
    log(`grid reconcile: archive implies ${inferred}, state claims ${claimed} -> using ${GRID} (round up: splitting is lossless, merging is not)`);
}

if(!archive){
  archive = {};
  // seed the archive with a handful of living genesis organisms
  let seeded=0, guard=0;
  while(seeded<8 && guard++<400){
    const gm=G.genome(rng, (rng()*1e9)|0); gm.born=Date.now();
    const desc=describe(gm,T0);
    if(dead(desc)) continue;
    const cidx=cell(desc); const q=quality(desc,gm);
    if(!archive[cidx] || q>archive[cidx].quality){ archive[cidx]={genome:gm,desc:desc.d,varL:desc.varL,quality:q,gen:0}; seeded++; }
  }
  log(`genesis: seeded ${Object.keys(archive).length} organisms into the archive`);
}

// ── MIGRATION: re-score and re-bin the whole species under a new quality function ──
// The genomes ARE the history; the archive is only an index over them. Changing how we
// measure must never destroy a genome. Procedure (drain & refill, per AURORA §1.3):
//   1. pool every surviving genome   2. re-describe at the FIXED time base T0
//   3. refill cells best-first       4. preserve each genome's lineage depth
//   5. abort if the new space is degenerate, rather than commit a mass extinction
function migrate(reason){
  const pool = Object.values(archive).map(a => a.genome).filter(Boolean);
  const scored = pool.map(g => { const d = describe(g, T0); return { g, d, q: quality(d, g) }; })
                     .filter(s => !dead(s.d))
                     .sort((a,b) => b.q - a.q);          // seed with proven elites first
  const next = {};
  for(const s of scored){
    const c = cell(s.d);
    if(!next[c] || s.q > next[c].quality)
      next[c] = { genome:s.g, desc:s.d.d, varL:s.d.varL, quality:s.q, gen:s.g.gen||0 };
  }
  const after = Object.keys(next).length;
  if(after < pool.length * 0.4){    // sanity gate: refuse to gut the species on a bad rule
    log(`MIGRATION ABORTED (${reason}): ${pool.length} elites collapsed to ${after} cells — keeping v1 archive`);
    return false;
  }
  log(`migration (${reason}): ${pool.length} elites -> ${after} cells @ fixed T0, quality v${QUALITY_VERSION}`);
  archive = next;
  return true;
}

// ── REFINE: climb the resolution ladder when the board is outgrown (v5) ──────
// The plateau we just escaped was never "the archive is full". It was "there is nowhere
// left to be different". Coverage is fuel, and a fixed board holds a fixed amount:
// the 144-cell shelf ran dry in weeks, the 1,728-cell cube ran dry in seven hours.
// Making the board bigger ONCE just buys a longer fuse. So the board grows on demand.
//
// This is NOT the same operation as migrate(), and the difference is the whole reason
// it is cheap: quality is unchanged, so nothing needs re-rendering. Every elite already
// stores its descriptor, so a finer grid is pure re-keying — 1,719 divisions, not 1,719
// renders (~60s of blocked event loop avoided). It is also STRICTLY LOSSLESS: a finer
// grid only ever SPLITS a cell, never merges two, so no elite can evict another and no
// genome can be dropped. That is why there is no sanity gate here and one in migrate().
//
// Trigger is deliberately placement rate AND occupancy, not occupancy alone. A full board
// that is still placing is healthy — elites are improving in place. A full board that has
// stopped placing is the sealed state. Only the second one needs more room.
function refine(){
  const at = GRID_LADDER.indexOf(GRID);
  if(at < 0 || at === GRID_LADDER.length-1){
    // Top of the ladder is a real, permanent state, not an error — say so once rather
    // than silently doing nothing forever. From here the organism improves in place.
    if(!refine.toppedOut){ refine.toppedOut = true;
      log(`ladder topped out at grid ${GRID} (${CELLS} rooms, ${Object.keys(archive).length} elites) — `
        + `no more room by design: growth is bounded by the host, improvement is not`); }
    return false;
  }
  if(Object.keys(archive).length >= MAX_ELITES){
    log(`refine refused: at population ceiling ${MAX_ELITES} — a bigger board cannot help`);
    return false;
  }
  const prevGrid = GRID, prevCells = Object.keys(archive).length;
  GRID = GRID_LADDER[at+1]; CELLS = GRID**DIMS;
  const next = {};
  for(const a of Object.values(archive)){
    if(!a || !a.desc || a.desc.length < DIMS) continue;
    const b = i => Math.min(GRID-1,(a.desc[i]*GRID)|0);
    const c = ((b(0)*GRID + b(1))*GRID + b(2))*GRID + b(3);
    if(!next[c] || a.quality > next[c].quality) next[c] = a;   // preserves .gen, lineage intact
  }
  archive = next;
  recentPlaced = []; recentNew = [];   // both histories describe a board that no longer exists
  saveArchive(); persist();   // flush BOTH immediately: the re-keyed archive and the new
                              // board size must never sit unsaved across a crash window
  log(`REFINE: grid ${prevGrid} -> ${GRID} (${prevCells} elites into ${CELLS} rooms, `
    + `${Object.keys(next).length} distinct, ${(100*Object.keys(next).length/CELLS).toFixed(1)}% occupancy)`);
  try{ fs.appendFileSync(FOSSIL, JSON.stringify({ event:'refine', at:Date.now(),
    gridFrom:prevGrid, gridTo:GRID, elites:prevCells }) + '\n'); }catch{}
  return true;
}

// current visible body = the most recently accepted novel organism
let current = state && state.current || archive[Object.keys(archive)[0]].genome;
let generation = state && state.generation || 0;

// quality rule changed since this archive was written? re-measure the whole species once.
// Old quality values are not comparable to new ones — without this, v1 scores would sit
// in the cells forever and every v2 child would be judged against a different yardstick.
const priorQV = (state && state.qualityVersion) || 1;
if(priorQV !== QUALITY_VERSION) migrate(`quality v${priorQV} -> v${QUALITY_VERSION}`);

// THE ORGANISM IS TWO POPULATIONS, AND THEY ARE NOT THE SAME ANIMAL.
//
//  BODY  — the archive. What actually survives selection. Real descent, real lineage.
//  DREAM — `current`. Each tick we crown the most NOVEL viable child and display it.
//          Novelty pushes AWAY from the archive; quality pulls TOWARD it. So the
//          displayed creature is almost never accepted into the archive.
//          Measured 2026-07-19: 0 of 1,896 fossils were ever archive members. Zero.
//
// This was an accident, but it is a beautiful one, so it is now on purpose and LABELLED.
// The body is what the void IS. The dream is what it is reaching for and failing to hold.
// What we must never do again is print the dream's numbers and call them the body's.
// Rolling window of placements-per-tick. THE health metric.
// Coverage % is occupancy on a 144-slot shelf — it drifts to 100% and stays there whether
// the organism is thriving or sealed. Placement rate is the one that tells them apart:
// pre-v2 the archive read 144/144 with placed=0 for 130 straight ticks. Full AND shut.
let recentPlaced = [];
// Rolling window of NEW CELLS per tick — discovery, as distinct from improvement.
// This is the one that says whether the QD engine still has anywhere to go.
let recentNew = [];
function vitals(){
  const elites = Object.values(archive);
  const cells = elites.length;
  const archiveIds = new Set(elites.map(e => e.genome && e.genome.id));
  const seeds = new Set(elites.map(e => e.genome && e.genome.seed));
  return {
    body: {
      cells, coverage: +(cells/CELLS).toFixed(3),
      // REAL cumulative selection: longest chain of accepted improvements. Not tick count.
      lineageDepth: elites.reduce((m,e) => Math.max(m, e.gen||0), 0),
      distinctSeeds: seeds.size,          // 1 = founder collapse. Watch this recover.
      // ...but distinctSeeds is a COUNT, and a count hides concentration. Measured
      // 2026-07-19: 94 distinct seeds while the top 3 lineages held 83% of the species.
      // Inverse Simpson gives the EFFECTIVE number of lineages — how many there really
      // are once you weight by how much of the population each actually holds.
      // 94 distinct -> 4.2 effective. This is the honest one. Same family of mistake as
      // "100% mapped": a number that sounds like health while hiding a monoculture.
      effectiveLineages: (()=>{ const n=cells||1, c={};
        for(const e of elites){ const s=e.genome&&e.genome.seed; c[s]=(c[s]||0)+1; }
        let sum=0; for(const k in c){ const p=c[k]/n; sum+=p*p; }
        return sum>0 ? +(1/sum).toFixed(1) : 0; })(),
      // share of the single largest family — the monoculture, stated directly. Inverse
      // Simpson says how many families there effectively are; this says how badly the
      // biggest one dominates. They can move independently, so report both.
      topFamilyPct: (()=>{ const c={};
        for(const e of elites){ const s=e.genome&&e.genome.seed; c[s]=(c[s]||0)+1; }
        const mx=Math.max(0,...Object.values(c));
        return +(100*mx/(cells||1)).toFixed(1); })(),
      meanComplexity: Math.round(elites.reduce((s,e)=>s+G.complexity(e.genome),0)/(cells||1)),
      accepted: acceptedTotal,
      // avg placements/tick over the last ~minute — IMPROVEMENT, including cells we
      // already own. On its own this number lies: it stays high while the archive is
      // sealed, because polishing an owned cell counts the same as finding a new one.
      placementRate: +(recentPlaced.reduce((a,b)=>a+b,0)/(recentPlaced.length||1)).toFixed(1),
      // ...so DISCOVERY is reported beside it, and the page's verdict reads THIS one.
      // These two decouple exactly when it matters: at the population ceiling placement
      // stays busy and discovery goes to zero. Shipping only the first would have put
      // "discovering" on screen while nothing new was being found — the same failure I
      // just fixed in the engine, surviving in the display.
      discoveryRate: +(recentNew.reduce((a,b)=>a+b,0)/(recentNew.length||1)).toFixed(1),
      atCeiling: Object.keys(archive).length >= MAX_ELITES || (GRID === GRID_LADDER[GRID_LADDER.length-1] && cells/CELLS > 0.97),
    },
    dream: {
      id: current.id,
      complexity: G.complexity(current),
      // is tonight's dream one of us, or a stranger? (historically: always a stranger)
      inBody: archiveIds.has(current.id),
    },
  };
}

function persist(){
  const cells=Object.keys(archive).length;
  const bestCell = Object.values(archive).sort((a,b)=>b.quality-a.quality)[0];
  const v = vitals();
  const out = {
    current, generation, born:BORN, updatedAt:Date.now(),
    archiveCells: cells, archiveCoverage: +(cells/CELLS).toFixed(3),
    grid: GRID, cells: CELLS,   // the board size MUST round-trip or the archive re-keys wrong
    assembly: Math.round(ASSEMBLY), accepted: acceptedTotal,
    complexity: G.complexity(current),
    ageSec: Math.round((Date.now()-BORN)/1000),
    best: bestCell ? { quality:+bestCell.quality.toFixed(3), gen:bestCell.gen } : null,
    // `generation` counts TICKS of the dream, not generations of descent. Kept for the
    // client's sake; `ticks` is its honest name and body.lineageDepth is the real depth.
    ticks: generation,
    qualityVersion: QUALITY_VERSION,
    ...v,
  };
  fs.writeFileSync(STATE, JSON.stringify(out));
}
// ATOMIC: write a temp file, then rename. rename() is atomic on the same filesystem, so a
// reader either sees the whole old archive or the whole new one — never a torn middle.
// writeFileSync truncates in place and takes ~200ms for 21MB, so for that window any reader
// got a partial file and JSON.parse threw: roughly 0.35% of gallery loads failing at random,
// which looks exactly like an unreproducible flake. Found by an outside reader, reproduced
// with a concurrent writer (5 clean parses, 1 torn at 11.4MB of 21.1MB).
function saveArchive(){
  const tmp = ARCH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(archive));
  fs.renameSync(tmp, ARCH);
}

// ── one heartbeat: many mutation attempts, novelty-driven, MAP-Elites illumination
let ticks=0;
function tick(){
  const keys=Object.keys(archive);
  let bestNovel=null, bestNov=-1, placed=0, discovered=0;
  // counted once per tick and incremented locally: Object.keys() inside the eval loop
  // would be O(n) x 60 evals x 14k elites every 5s, which is real CPU for a number we
  // can just carry.
  let archiveSize = keys.length;
  // Lineage census for frequency dependence. Counted once, then updated INCREMENTALLY as
  // placements happen — with a static snapshot a dominant lineage could place 30 times in
  // one tick before its own penalty caught up, which is the exact runaway being fixed.
  const seedN = new Map();
  for(const k of keys){ const s = archive[k].genome && archive[k].genome.seed;
    seedN.set(s, (seedN.get(s)||0) + 1); }
  const shareOf = s => (seedN.get(s)||0) / (archiveSize||1);
  let fallbackNovel=null, bestNovFallback=-1;   // used only if nothing clears the floor
  for(let i=0;i<EVALS_PER_TICK;i++){
    // parent: mostly from the archive (diversity), sometimes the current body (lineage)
    const parent = (rng()<0.75 && keys.length) ? archive[keys[(rng()*keys.length)|0]].genome : current;
    const child = G.mutate(parent, rng);
    // STAMP AT BIRTH, not at archive acceptance (2026-07-25). G.mutate returns born:0,
    // and born was only stamped inside the acceptance branch below — but the organism
    // FOSSILIZED each tick is the most NOVEL child, a different criterion, so 93.7% of
    // lineage.jsonl rows carried born:0. The fossil record's timestamp was dead data.
    // Metadata only: nothing selects on .born.
    child.born = Date.now();
    if(G.complexity(child) > MAX_NODES) continue;   // parsimony: reject the bloated
    const desc = describe(child, T0);   // fixed phase: descriptors must be comparable
    if(dead(desc)) continue;
    const nov = novelty(desc, archive);
    const cidx = cell(desc), q = quality(desc, child);
    // MAP-Elites: illuminate this behavior cell if empty or improved.
    // DISCOVERY AND IMPROVEMENT ARE NOT THE SAME EVENT and must be counted apart.
    // "placed" lumps them together, which hides the exact state we care about: at 99.5%
    // occupancy nearly every placement is a cell getting BETTER, not a new region of
    // behaviour being found. The QD engine can be completely spent while `placed` still
    // reads healthy — the same conflation that let 144/144 look full instead of shut.
    const isNew = !archive[cidx];
    // POPULATION CEILING. At the cap we stop COLONISING new cells but keep IMPROVING the
    // ones already owned — the organism goes on getting better, it just stops getting
    // bigger. Chosen over evicting the worst elite because eviction silently destroys
    // lineage to make room for a marginal newcomer, and the whole point of the archive is
    // that the genomes ARE the history. A bounded, honest population beats a churning one.
    if(isNew && archiveSize >= MAX_ELITES) continue;
    // The contest, discounted by each side's lineage abundance. A rare challenger can
    // take a room from a common incumbent at somewhat lower raw quality; that is the
    // rare-type advantage, and it is the whole experiment.
    const inc = isNew ? null : archive[cidx];
    const incSeed = inc && inc.genome && inc.genome.seed;
    const qEff   = q * (1 - FREQ_DEP * shareOf(child.seed));
    const incEff = inc ? inc.quality * (1 - FREQ_DEP * shareOf(incSeed)) : -1;
    if(isNew || qEff > incEff){
      child.gen = (parent.gen||0)+1;   // .born already stamped at birth (see G.mutate above)
      archive[cidx] = { genome:child, desc:desc.d, varL:desc.varL, quality:q, gen:child.gen };
      placed++; acceptedTotal++; if(isNew){ discovered++; archiveSize++; }
      // keep the census live so the penalty tracks reality within the tick
      seedN.set(child.seed, (seedN.get(child.seed)||0) + 1);
      if(inc) seedN.set(incSeed, Math.max(0, (seedN.get(incSeed)||0) - 1));
      // assembly index grows with genuinely novel + complex survivors
      ASSEMBLY += nov * (1 + G.complexity(child)/60);
    }
    // track the most NOVEL viable child this tick to become the visible body
    // THE DREAM MUST STILL BE WORTH LOOKING AT (fixed 2026-07-19, Jiggy spotted it).
    //
    // Selecting the displayed organism on novelty ALONE was fine while the archive was
    // sparse. Once it hit 99.3% coverage, the only way left to be far from everything
    // was to run to the DEGENERATE CORNERS of the space. The organism on screen measured
    // colourfulness 0.000 — pure greyscale — while the archive averaged 0.498.
    //
    // So the healthier the body got, the uglier the dream became. And I never saw it,
    // because I kept measuring the archive while Jiggy was watching the display. That is
    // the SECOND time in one day I optimised one population and reported it as a win for
    // the other. The dream is what a human actually experiences; it needs a floor.
    //
    // It stays the weirdest thing we found — but only among things worth showing.
    if(nov > bestNov && showable(desc, q)){ bestNov = nov; bestNovel = child; }
    if(!bestNovel && nov > bestNovFallback){ bestNovFallback = nov; fallbackNovel = child; }
  }
  recentPlaced.push(placed); if(recentPlaced.length > 12) recentPlaced.shift();
  recentNew.push(discovered); if(recentNew.length > 12) recentNew.shift();
  // OUT OF ROOM? climb the ladder. The trigger is DISCOVERY starvation, not placement
  // starvation — that distinction is the whole point. A board at 99.5% occupancy that is
  // still placing looks alive by placement rate while finding no new behaviour at all;
  // it is optimising inside rooms it already owns. That is precisely the exhausted state
  // more room fixes, and counting placements would hide it until every hill was climbed.
  // Occupancy is still required so we never expand a young sparse board that is merely hard.
  // Fires when discovery has genuinely starved — twelve straight ticks finding nothing new —
  // AND the board is full in the sense that actually binds. Previously this required 0.97 of
  // CELLS, which the population ceiling made unreachable, so the escape hatch was welded shut.
  // Now "full" means full against whichever limit is really binding: cells or the ceiling.
  const occupied = Object.keys(archive).length;
  const full = occupied / CELLS > 0.97 || occupied >= MAX_ELITES;
  if(recentNew.length === 12 && full && recentNew.reduce((a,b)=>a+b,0) === 0) refine();
  // advance the visible organism to the most novel child (it explores, visibly)
  // if no child cleared the floor this tick, fall back to the most novel viable one
  // rather than freezing the display — but prefer a beautiful weirdo every time.
  // Carry the fallback's MEASURED novelty across with it. `bestNov` stays at its -1
  // sentinel on this path, and line ~655 fossilizes it as if it were a measurement —
  // 748 rows recorded novelty:-1 (measured min was exactly -1.0, max 0.5998). This
  // changes ONLY the recorded number; `bestNovel` (what gets crowned and drawn) is
  // unchanged, and `bestNov` is read nowhere else.
  if(!bestNovel){ bestNovel = fallbackNovel; bestNov = bestNovFallback; }
  if(bestNovel){
    current = bestNovel; generation++;
    // fossilize the champion lineage (append-only history)
    try{ fs.appendFileSync(FOSSIL, JSON.stringify({
      gen:generation, id:current.id, parent:current.parent, born:current.born,
      complexity:G.complexity(current), novelty:+bestNov.toFixed(4), assembly:Math.round(ASSEMBLY),
      code:{h:G.fmt(current.h), s:G.fmt(current.s), v:G.fmt(current.v)}
    })+'\n'); }catch{}
  }
  persist();
  if(++ticks % 12 === 0){ saveArchive();
    // effLin + biggest family are logged every cycle because they are the OUTCOME
    // VARIABLE of the frequency-dependence experiment. A prediction you can't plot
    // afterwards is a claim, not a test.
    const v = vitals().body;
    log(`gen ${generation} · cells ${Object.keys(archive).length}/${CELLS} · assembly ${Math.round(ASSEMBLY)}`
      + ` · placed ${placed} (new ${recentNew.reduce((a,b)=>a+b,0)}/12t)`
      + ` · effLin ${v.effectiveLineages} · top ${v.topFamilyPct}%`); }
}

log(`void awakened — resuming life. gen ${generation}, archive ${Object.keys(archive).length}, assembly ${Math.round(ASSEMBLY)}`);
persist(); saveArchive();
tick();
setInterval(tick, TICK_MS);

// graceful shutdown → save the species so it survives the restart (continuity)
for(const sig of ['SIGINT','SIGTERM']) process.on(sig, ()=>{ saveArchive(); persist(); log('body stopped; species preserved on disk'); process.exit(0); });
