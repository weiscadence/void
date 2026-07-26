// silica.js v2 — self-replicating organisms with SEX, variable-length genomes, and an
// instrument that makes stagnation visible.
//
// v1 (Tierra-style byte VM) was fair but Jiggy's critique was right: fixed-length genomes +
// point mutations can only plateau trivially — there is nothing to accumulate. And the viz lied
// (reported 30 lineages, showed 2 colours) because most bytes were half-built daughters.
//
// v2 is an agent model that keeps the honest core — REAL substrate scarcity (a finite grid =
// memory; a per-tick action budget = CPU) — and adds the three things he asked for:
//   1. TWO reproduction modes. Each organism carries a `sex` gene. Asexual organisms copy
//      themselves (cheap, no recombination). Sexual ones need an adjacent sexual PARTNER;
//      offspring recombine both parents' genomes — "random stuff from each parent." The
//      classic evolution-of-sex tradeoff, emergent, not scripted.
//   2. VARIABLE-LENGTH genomes. Mutations insert and delete genes, and crossover mixes lengths,
//      so complexity can actually grow or shrink instead of being fixed.
//   3. A STAGNATION instrument. We track every genotype ever seen and the rate at which NEW
//      ones appear. When that novelty rate stays near zero, the system has stopped inventing —
//      the open-ended-evolution plateau, measured instead of asserted. This is the honest
//      "groundbreaking-adjacent" move: not solving OEE, but instrumenting exactly where it dies.
//
// Reproduction costs cycles proportional to genome length (copying more genes costs more CPU),
// and cells are finite — so selection is enforced by the machine, not by fiat (SYNTHESIS §7).
// Pure, seeded, headless-testable.

'use strict';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GENE_MAX = 16;      // gene alphabet 0..15
const LEN_MIN = 3, LEN_MAX = 40;

function hashGenome(g) {   // stable genotype id
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.length; i++) { h ^= g[i] + 1; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

class Silica {
  constructor(opts = {}) {
    this.cols = opts.cols || 60;
    this.rows = opts.rows || 60;
    this.CELLS = this.cols * this.rows;
    this.CYCLES = opts.cycles || 1500;         // CPU budget per tick (rival resource #1)
    this.REAP_AT = opts.reapAt ?? 0.72;        // grid this full → cull (rival resource #2: memory)
    this.MUT_PT = opts.mutPt ?? 0.06;          // point mutation prob per reproduction
    this.MUT_INDEL = opts.mutIndel ?? 0.05;    // insertion/deletion prob
    this.MUT_MODE = opts.mutMode ?? 0.01;      // sex-gene flip prob
    this.sexAllowed = opts.sexAllowed !== false;
    this.rand = rng(opts.seed || 1);

    this.grid = new Int32Array(this.CELLS).fill(-1);  // cell -> organism index (-1 empty)
    this.orgs = [];
    this.nextLineage = 1;
    this.tick = 0;
    this.births = 0; this.deaths = 0; this.sexBirths = 0;

    // stagnation instrument
    this.seenGenotypes = new Set();
    this.novelWindow = [];       // rolling count of new genotypes per 100-tick bucket
    this._novelThisBucket = 0;
    this.stagnatedAt = null;

    this._seed(opts.seedOrganisms || 12);
  }

  _rint(n) { return Math.floor(this.rand() * n); }

  _seed(k) {
    for (let i = 0; i < k; i++) {
      const cell = this._rint(this.CELLS);
      if (this.grid[cell] !== -1) continue;
      const len = 4 + this._rint(4);
      const genome = Array.from({ length: len }, () => this._rint(GENE_MAX));
      const sex = this.sexAllowed && this.rand() < 0.5 ? 1 : 0;
      this._place(cell, genome, sex, this.nextLineage++, null);
    }
  }

  _place(cell, genome, sex, lineage, parentGeno) {
    const o = { cell, genome, sex, lineage, age: 0, children: 0,
                geno: hashGenome(genome) };
    const idx = this.orgs.length;
    this.orgs.push(o);
    this.grid[cell] = idx;
    if (!this.seenGenotypes.has(o.geno)) { this.seenGenotypes.add(o.geno); this._novelThisBucket++; }
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

  _mateSearch(cell) {  // radius-2 neighbourhood — sex needs partners findable, not adjacent-only
    const x = cell % this.cols, y = (cell / this.cols) | 0, out = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
      out.push(ny * this.cols + nx);
    }
    return out;
  }

  _mutate(g) {
    g = g.slice();
    for (let i = 0; i < g.length; i++) if (this.rand() < this.MUT_PT) g[i] = this._rint(GENE_MAX);
    if (this.rand() < this.MUT_INDEL) {
      if (this.rand() < 0.5 && g.length < LEN_MAX) g.splice(this._rint(g.length + 1), 0, this._rint(GENE_MAX)); // insert
      else if (g.length > LEN_MIN) g.splice(this._rint(g.length), 1);                                           // delete
    }
    return g;
  }

  _crossover(a, b) {
    // single-point crossover — offspring takes a prefix from A and a suffix from B, so it
    // literally gains segments from each parent and its length is a mix of the two.
    const pa = 1 + this._rint(Math.max(1, a.length - 1));
    const pb = this._rint(b.length);
    let child = a.slice(0, pa).concat(b.slice(pb));
    if (child.length < LEN_MIN) child = child.concat(a.slice(0, LEN_MIN - child.length));
    if (child.length > LEN_MAX) child = child.slice(0, LEN_MAX);
    return child;
  }

  step() {
    this.tick++;
    const N = this.orgs.length;
    if (N === 0) return;
    let budget = this.CYCLES;
    // rotate who acts first each tick — a fixed start at 0 always burned the budget on the same
    // early, spatially-saturated organisms and starved everyone else, freezing the population
    // below the reaper threshold (caught by the flat novelty curve). Rotation gives fair access.
    const start = this.tick % N;
    for (let j = 0; j < N && budget > 0; j++) {
      const o = this.orgs[(start + j) % N];
      if (!o || o.dead) continue;
      const free = this._neighbors(o.cell).filter(c => this.grid[c] === -1);
      const cost = o.genome.length;                 // reproduction costs cycles ∝ length (real CPU)
      if (budget < cost) { budget--; continue; }
      if (o.sex === 1) {
        // needs a sexual partner within a short radius; searching when none is the cost of sex
        const partners = this._mateSearch(o.cell)
          .map(c => this.grid[c]).filter(k => k >= 0 && this.orgs[k] && this.orgs[k].sex === 1 && this.orgs[k] !== o);
        if (!partners.length || !free.length) { budget--; continue; }
        const mate = this.orgs[partners[this._rint(partners.length)]];
        let child = this._crossover(o.genome, mate.genome);
        child = this._mutate(child);
        let sex = o.sex;
        if (this.sexAllowed && this.rand() < this.MUT_MODE) sex ^= 1;
        this._place(free[this._rint(free.length)], child, sex, o.lineage, o.geno);
        o.children++; this.births++; this.sexBirths++; budget -= cost;
      } else {
        if (!free.length) { budget--; continue; }
        let child = this._mutate(o.genome);
        let sex = o.sex;
        if (this.sexAllowed && this.rand() < this.MUT_MODE) sex ^= 1;
        this._place(free[this._rint(free.length)], child, sex, o.lineage, o.geno);
        o.children++; this.births++; budget -= cost;
      }
    }
    for (const o of this.orgs) if (!o.dead) o.age++;
    this._reap();
    this._novelBucket();
  }

  _reap() {
    const fill = this.orgs.filter(o => !o.dead).length / this.CELLS;
    if (fill < this.REAP_AT) return;
    const living = this.orgs.filter(o => !o.dead);
    const kill = Math.max(1, Math.floor(living.length * 0.12));
    // GRACE PERIOD: newborns (age < 8) are not reapable — otherwise they always score lowest
    // fecundity (0 children at age 0) and get culled before reproducing, which freezes ALL
    // novelty. Bug caught by the instrument: the novelty curve went dead-flat. Only adults
    // compete to die; sort those by fecundity, and if too few adults, take the oldest.
    const GRACE = 8;
    let pool = living.filter(o => o.age >= GRACE);
    if (pool.length < kill) pool = living.slice().sort((a, b) => b.age - a.age);
    else pool.sort((a, b) => (a.children / (a.age + 1)) - (b.children / (b.age + 1)));
    for (let k = 0; k < kill && k < pool.length; k++) { const o = pool[k]; o.dead = true; this.grid[o.cell] = -1; this.deaths++; }
    // compact occasionally so indices/grid stay consistent and memory doesn't grow unbounded
    if (this.orgs.length > this.CELLS * 3) {
      const alive = this.orgs.filter(o => !o.dead);
      this.orgs = alive;
      this.grid.fill(-1);
      for (let j = 0; j < alive.length; j++) this.grid[alive[j].cell] = j;
    }
  }

  _novelBucket() {
    if (this.tick % 100 !== 0) return;
    this.novelWindow.push(this._novelThisBucket);
    if (this.novelWindow.length > 30) this.novelWindow.shift();
    // stagnation: new genotypes per 100 ticks stays < 3 for 5 consecutive buckets
    const recent = this.novelWindow.slice(-5);
    if (this.stagnatedAt == null && recent.length === 5 && recent.every(v => v < 3))
      this.stagnatedAt = this.tick;
    this._novelThisBucket = 0;
  }

  stats() {
    const living = this.orgs.filter(o => !o.dead);
    const genos = new Set(living.map(o => o.geno));
    const lineages = new Set(living.map(o => o.lineage));
    let sumLen = 0, sexN = 0;
    for (const o of living) { sumLen += o.genome.length; if (o.sex === 1) sexN++; }
    return {
      tick: this.tick,
      pop: living.length,
      genotypes: genos.size,          // DISTINCT living genomes (real diversity)
      lineages: lineages.size,
      meanLen: living.length ? +(sumLen / living.length).toFixed(2) : 0,
      sexFrac: living.length ? +(sexN / living.length).toFixed(2) : 0,
      births: this.births, sexBirths: this.sexBirths, deaths: this.deaths,
      seenTotal: this.seenGenotypes.size,
      novelRate: this.novelWindow.length ? this.novelWindow[this.novelWindow.length - 1] : this._novelThisBucket,
      stagnatedAt: this.stagnatedAt,
    };
  }

  // for the viz: living organisms with a colour key that is the GENOTYPE (distinct genome →
  // distinct hue), so what you see matches what's measured — no more "30 lineages, 2 colours".
  view() { return this.orgs.filter(o => !o.dead).map(o => ({ cell: o.cell, geno: o.geno, sex: o.sex, len: o.genome.length })); }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Silica, hashGenome };
if (typeof window !== 'undefined') { window.Silica = Silica; }
