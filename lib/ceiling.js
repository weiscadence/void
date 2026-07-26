// ceiling.js — the attention-window experiment.
//
// The one thing that might be genuinely less-explored than Avida (which makes compute an
// earn-and-spend currency): a HARD PER-REPRODUCTION ATTENTION CEILING. An organism's genome is
// a sequence of functional parts, but only the first W are EXPRESSED — read within a bounded
// attention window, exactly like a model that can only attend to so much context. Parts past W
// are carried (they cost storage, they mutate, they pass to offspring) but do NOTHING. This is
// Jiggy's "too much info and it stagnates" made literal: info beyond the window is dead weight.
//
// Functional parts (the compose lever — a reason to keep parts):
//   HARVEST_k  — lets you eat resource k. The grid is patchy; you must have the RIGHT harvest
//                expressed for where you live, or you starve. This makes parts non-neutral.
//   FASTCOPY   — cheaper reproduction.
//   DEFEND     — (reserved) resist crowding death.
//   FILLER     — does nothing (a neutral part, so drift has somewhere to go).
//
// The instrument separates two things silica conflated:
//   • rawLen           — genome length (info CARRIED)
//   • exprComplexity   — distinct EXPRESSED part types per organism (info USED)
// The experiment: sweep the window W. Does exprComplexity ratchet up to a ceiling set by W and
// hold, while rawLen drifts free? If complexity tracks W, we've shown expressible complexity is
// bounded by the attention window — the LLM-native constraint, measured. Honest expectation:
// a plateau, but one whose height we can move by moving W. That readability is the whole point.
//
// Pure, seeded, headless-testable — same discipline as the rest of the lab.

'use strict';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class Ceiling {
  constructor(opts = {}) {
    this.cols = opts.cols || 50;
    this.rows = opts.rows || 50;
    this.CELLS = this.cols * this.rows;
    this.R = opts.resources || 4;                 // number of resource types (patchy)
    this.W = opts.window ?? 8;                     // ATTENTION CEILING — expressed prefix length
    // parts: HARVEST_0..R-1, FASTCOPY, ATTACK, DEFEND. ATTACK/DEFEND are inert UNLESS predation
    // is on — then the demand for expressed function comes from other organisms (coevolution,
    // Zaman/Ofria 2014), which is the empirically-shown way to drive complexity past a static
    // world's ceiling. The question here: does living demand push expressed complexity up to the
    // attention window W, making the window the binding wall (the "too much info" regime)?
    this.PARTS = this.R + 3;
    this.FASTCOPY = this.R; this.ATTACK = this.R + 1; this.DEFEND = this.R + 2;
    this.predation = opts.predation ?? false;
    this.STEAL = opts.steal ?? 6;
    this.UPKEEP = opts.upkeep ?? 1;
    this.YIELD = opts.yield ?? 3;                   // energy per tick if you can harvest your cell
    this.REPRO_COST = opts.reproCost ?? 12;
    this.REPRO_THRESH = opts.reproThresh ?? 16;
    this.MUT_PT = opts.mutPt ?? 0.05;
    this.MUT_INDEL = opts.mutIndel ?? 0.05;
    this.LEN_MAX = opts.lenMax ?? 40;
    this.rand = rng(opts.seed || 1);

    // patchy resource field: coarse blocks so neighbourhoods share a resource (real niches)
    this.res = new Int8Array(this.CELLS);
    const bx = 6, by = 6;
    const patch = {};
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const px = (x / bx) | 0, py = (y / by) | 0, key = px + ',' + py;
      if (patch[key] === undefined) patch[key] = (this.rand() * this.R) | 0;
      this.res[y * this.cols + x] = patch[key];
    }

    // temporal rotation: the whole world's resources cycle through the R types, so an organism
    // that stays in place experiences ALL R resources over time and must express many HARVEST
    // types to survive — this pushes environmental DEMAND above small windows, making W the
    // binding constraint (and surplus harvest genes sit unexpressed = carried-but-unusable info).
    this.ROT = opts.rotate ?? 90;    // ticks per resource shift; 0 = static world
    this.phase = 0;

    this.grid = new Int32Array(this.CELLS).fill(-1);
    this.orgs = [];
    this.tick = 0; this.births = 0; this.deaths = 0;
    this.exprWindow = [];   // rolling exprComplexity for the sparkline
    this._seed(opts.seedOrganisms || 40);
  }

  _rint(n) { return (this.rand() * n) | 0; }

  _seed(k) {
    for (let i = 0; i < k; i++) {
      const cell = this._rint(this.CELLS);
      if (this.grid[cell] !== -1) continue;
      // seed with a matching harvest for its cell so it isn't instantly dead, plus a couple random
      const g = [this.res[cell], this._rint(this.PARTS), this._rint(this.PARTS)];
      this._place(cell, g, 6 + this.rand() * 6);
    }
  }

  _resAt(cell) { return this.ROT ? (this.res[cell] + this.phase) % this.R : this.res[cell]; }

  _place(cell, genome, energy) {
    const o = { cell, genome, energy, age: 0 };
    this.grid[cell] = this.orgs.length;
    this.orgs.push(o);
    return o;
  }

  _neighbors(cell) {
    const x = cell % this.cols, y = (cell / this.cols) | 0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
      out.push(ny * this.cols + nx);
    }
    return out;
  }

  // phenotype comes ONLY from the expressed prefix (first W parts) — the attention ceiling
  _expressed(g) { return g.slice(0, this.W); }
  _harvestSet(g) {
    const s = new Set();
    const e = this._expressed(g);
    for (const p of e) if (p < this.R) s.add(p);
    return s;
  }
  _fast(g)   { let n = 0; for (const p of this._expressed(g)) if (p === this.FASTCOPY) n++; return n; }
  _attack(g) { let n = 0; for (const p of this._expressed(g)) if (p === this.ATTACK) n++; return n; }
  _defend(g) { let n = 0; for (const p of this._expressed(g)) if (p === this.DEFEND) n++; return n; }

  _mutate(g) {
    g = g.slice();
    for (let i = 0; i < g.length; i++) if (this.rand() < this.MUT_PT) g[i] = this._rint(this.PARTS);
    if (this.rand() < this.MUT_INDEL) {
      if (this.rand() < 0.5 && g.length < this.LEN_MAX) g.splice(this._rint(g.length + 1), 0, this._rint(this.PARTS));
      else if (g.length > 1) g.splice(this._rint(g.length), 1);
    }
    return g;
  }

  step() {
    this.tick++;
    if (this.ROT && this.tick % this.ROT === 0) this.phase = (this.phase + 1) % this.R;
    const N = this.orgs.length;
    if (N === 0) return;
    const start = this.tick % N;
    for (let j = 0; j < N; j++) {
      const o = this.orgs[(start + j) % N];
      if (!o || o.dead) continue;
      // metabolism: harvest if the expressed genome can eat the local resource, always pay upkeep
      const localRes = this._resAt(o.cell);
      const canEat = this._harvestSet(o.genome).has(localRes);
      o.energy += (canEat ? this.YIELD : 0) - this.UPKEEP;
      o.age++;
      // coevolution: an expressed ATTACK lets you prey on a neighbour whose expressed DEFEND is
      // weaker — you steal its energy. Demand for function now comes from the population itself,
      // and it moves (arms race) instead of saturating at a fixed environmental level.
      if (this.predation) {
        const atk = this._attack(o.genome);
        if (atk > 0) {
          const prey = this._neighbors(o.cell).map(c => this.grid[c]).filter(k => k >= 0 && this.orgs[k] && !this.orgs[k].dead && this.orgs[k] !== o);
          if (prey.length) {
            const v = this.orgs[prey[this._rint(prey.length)]];
            if (atk > this._defend(v.genome)) {
              const stolen = Math.min(this.STEAL, v.energy);
              v.energy -= stolen; o.energy += stolen;
              if (v.energy <= 0) { v.dead = true; this.grid[v.cell] = -1; this.deaths++; }
            }
          }
        }
      }
      if (o.energy <= 0) { o.dead = true; this.grid[o.cell] = -1; this.deaths++; continue; }
      // reproduce into a free neighbour when rich enough
      if (o.energy >= this.REPRO_THRESH) {
        const free = this._neighbors(o.cell).filter(c => this.grid[c] === -1);
        if (free.length) {
          const cost = Math.max(4, this.REPRO_COST - this._fast(o.genome) * 2);
          if (o.energy >= cost) {
            const child = this._mutate(o.genome);
            const cell = free[this._rint(free.length)];
            o.energy -= cost;
            this._place(cell, child, cost * 0.6);
            this.births++;
          }
        }
      }
    }
    // occasional compaction so the array doesn't grow with dead entries
    if (this.orgs.length > this.CELLS * 3) {
      const alive = this.orgs.filter(o => !o.dead);
      this.orgs = alive; this.grid.fill(-1);
      for (let i = 0; i < alive.length; i++) this.grid[alive[i].cell] = i;
    }
    if (this.tick % 50 === 0) {
      this.exprWindow.push(this.stats().exprComplexity);
      if (this.exprWindow.length > 40) this.exprWindow.shift();
    }
  }

  stats() {
    const living = this.orgs.filter(o => !o.dead);
    let sumLen = 0, sumExpr = 0;
    for (const o of living) {
      sumLen += o.genome.length;
      sumExpr += new Set(this._expressed(o.genome)).size;   // distinct EXPRESSED part types
    }
    let sumAtk = 0, sumDef = 0;
    for (const o of living) { sumAtk += this._attack(o.genome); sumDef += this._defend(o.genome); }
    const n = living.length || 1;
    return {
      tick: this.tick, pop: living.length, window: this.W,
      rawLen: +(sumLen / n).toFixed(2),               // info CARRIED
      exprComplexity: +(sumExpr / n).toFixed(2),      // info USED (capped by W)
      meanAttack: +(sumAtk / n).toFixed(2),           // arms-race readouts (coevolution on)
      meanDefend: +(sumDef / n).toFixed(2),
      births: this.births, deaths: this.deaths,
    };
  }

  view() {
    return this.orgs.filter(o => !o.dead).map(o => ({
      cell: o.cell, res: this._resAt(o.cell),
      expr: new Set(this._expressed(o.genome)).size,
    }));
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Ceiling };
if (typeof window !== 'undefined') { window.Ceiling = Ceiling; }
