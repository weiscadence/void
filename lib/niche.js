// niche.js — NICHE CONSTRUCTION ("the pepper"). Lever C from OPEN-ENDEDNESS.md, the one I
// flagged as least-explored and then didn't build.
//
// Built on ceiling.js's vetted substrate (typed HARVEST parts, energy budget, patchy field,
// attention window W, optional predation). The ONE new thing:
//
//   CONSTRUCT part — an expressed CONSTRUCT lets an organism spend energy to REWRITE its local
//   cell's resource type to one it can already harvest. The rewrite persists in the field
//   (this.res, lineage-tagged in builtBy) and slowly reverts if nobody maintains it. That is
//   niche construction (Odling-Smee); the spicy pepper reshaping which disperser succeeds.
//
// SETTLED RESULT (2026-07-24, headless, paired + long-run + knockout):
//   • Construction SUSTAINS coexistence: +1.17 effective niches vs a construct-off control on the
//     same seed, positive 8/8, STABLE flat from tick 1k to 20k (not a transient).
//   • The mechanism is ACTIVE KEYSTONE MAINTENANCE, not inheritance. Knockout (stop building, keep
//     decay) collapses coexistence back to the control baseline in ~6k ticks as built% → 0. The
//     built environment is load-bearing and must be continuously rebuilt; builders are ~35-46% of
//     the population (not rare), continuously maintaining ~a third of the world.
//   • Inheritance is NOT the driver: born-on-own-built ground is ~0.4% even conditional on builders.
//     The earlier "descendants inherit a world their ancestor made" framing was FALSIFIED here.
//   • It also can't bootstrap from rarity (see niche-exp.js invasion null).
//
// Why this should matter, from the prior work (not hope):
//   • Competitive exclusion (SYNTHESIS §2): #coexisting types <= #limiting factors. A fixed
//     patchy field has a fixed set of niches. Construction lets lineages MANUFACTURE niches —
//     if different lineages build different patches, the number of limiting factors rises and
//     the coexistence bound rises with it. That's the mechanism, stated as a theorem.
//   • Price not permission (Clune/Mouret/Lipson 2013): construction COSTS energy AND an attention
//     slot (the CONSTRUCT part sits inside the window W, competing with HARVEST). A niche you
//     build must pay for itself through your descendants or the lineage that skips building wins.
//   • The failure to watch for: if EVERY lineage terraforms to the SAME type, construction
//     DESTROYS spatial diversity → monoculture, exactly how cross-feeding failed in flow. So the
//     load-bearing question is not "does the world get modified" (trivially yes) but "does
//     modification sustain MORE coexisting specialists than no modification" — measured against
//     a construct-OFF control on the same seed.
//
// Pure, seeded, headless. Same discipline as ceiling.js.

'use strict';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class Niche {
  constructor(opts = {}) {
    this.cols = opts.cols || 50;
    this.rows = opts.rows || 50;
    this.CELLS = this.cols * this.rows;
    this.R = opts.resources || 4;
    this.W = opts.window ?? 8;
    // parts: HARVEST_0..R-1, FASTCOPY, ATTACK, DEFEND, CONSTRUCT
    this.PARTS = this.R + 4;
    this.FASTCOPY = this.R; this.ATTACK = this.R + 1; this.DEFEND = this.R + 2; this.CONSTRUCT = this.R + 3;

    this.predation = opts.predation ?? false;
    this.construct = opts.construct ?? true;     // THE experimental switch (off = negative control)
    this.STEAL = opts.steal ?? 6;
    this.UPKEEP = opts.upkeep ?? 1;
    this.YIELD = opts.yield ?? 3;
    this.REPRO_COST = opts.reproCost ?? 12;
    this.REPRO_THRESH = opts.reproThresh ?? 16;
    this.MUT_PT = opts.mutPt ?? 0.05;
    this.MUT_INDEL = opts.mutIndel ?? 0.05;
    this.LEN_MAX = opts.lenMax ?? 40;

    // niche-construction knobs
    this.BUILD_COST = opts.buildCost ?? 5;       // energy to terraform one cell (the price)
    this.BUILD_THRESH = opts.buildThresh ?? 10;  // only build when at least this rich (don't suicide)
    this.BUILD_P = opts.buildP ?? 0.25;          // per-tick chance an eligible builder acts
    this.REVERT_P = opts.revertP ?? 0.003;       // per-tick chance a built cell decays to original
    this.ROT = opts.rotate ?? 0;                 // static world by default: organisms are the ONLY
                                                 // source of environmental change (cleanest test)

    this.rand = rng(opts.seed || 1);

    // original patchy field (immutable reference) + the LIVE field (mutable, what construction edits)
    // SKEW makes the world HOSTILE: with prob=skew a patch is the default type 0, else random.
    // skew=0 → even field (every specialist gets a native home, construction pointless — the
    // vacuous regime). skew high → most of the world suits only type-0, so other specialists
    // are homeless UNLESS they build. That gap is exactly where niche construction earns its keep.
    this.skew = opts.skew ?? 0;
    this.seedConstructors = opts.seedConstructors ?? false;
    this.seedTypes = opts.seedTypes ?? null;   // optional uneven harvest-type mix for seeding
    // constructMode: 'self' = terraform your own cell (active niche, no inheritance — bornOwn=0).
    // 'offspring' = a builder-parent conditions the FREE cell its child will land on, to a type the
    // CHILD can harvest, and tags it with the lineage. This is the heritable pepper: the parent
    // makes the soil, the descendant is born into the world the parent built. Should drive bornOwn>0.
    this.constructMode = opts.constructMode ?? 'self';
    this.orig = new Int8Array(this.CELLS);
    const bx = 6, by = 6, patch = {};
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const px = (x / bx) | 0, py = (y / by) | 0, key = px + ',' + py;
      if (patch[key] === undefined) patch[key] = (this.rand() < this.skew) ? 0 : (this.rand() * this.R) | 0;
      this.orig[y * this.cols + x] = patch[key];
    }
    this.res = this.orig.slice();                 // live resource field (construction mutates this)
    this.builtBy = new Int32Array(this.CELLS).fill(-1);   // lineage id that built each cell (-1 = original)

    this.phase = 0;
    this.grid = new Int32Array(this.CELLS).fill(-1);
    this.orgs = [];
    this.nextLineage = 1;
    this.tick = 0; this.births = 0; this.deaths = 0; this.builds = 0;
    // per-tick birth bookkeeping for the heritable-niche instrument.
    // GLOBAL counters drown the signal in the non-builder majority; the CONDITIONAL ones
    // (…FromBuilder) restrict to births whose PARENT can build — that's the population where
    // inheritance could even happen, and the honest test of "is inheritance real, just rare?"
    this._bornOnBuilt = 0; this._bornOnOwnBuilt = 0; this._bornTotal = 0;
    this._bornFromBuilder = 0; this._bornOwnFromBuilder = 0;
    this.exprWindow = [];
    this._seed(opts.seedOrganisms || 40);
  }

  _rint(n) { return (this.rand() * n) | 0; }

  _seed(k) {
    for (let i = 0; i < k; i++) {
      const cell = this._rint(this.CELLS);
      if (this.grid[cell] !== -1) continue;
      let g;
      if (this.seedConstructors) {
        // MAINTENANCE test: seed an established community of constructor-specialists spread
        // across ALL resource types — genome [HARVEST_k, CONSTRUCT] for k cycling 0..R-1. This
        // asks "does an existing constructor community SUSTAIN coexistence?", separate from the
        // (already-answered: no) question of whether the trait can invade from rarity.
        // seedTypes (optional): draw the harvest type from this array instead of even cycling —
        // lets a scrutiny test seed UNEQUAL frequencies to check for frequency dependence.
        const kk = this.seedTypes ? this.seedTypes[i % this.seedTypes.length] : (i % this.R);
        g = [kk, this.CONSTRUCT];
      } else {
        g = [this.res[cell], this._rint(this.PARTS), this._rint(this.PARTS)];
      }
      this._place(cell, g, 6 + this.rand() * 6, this.nextLineage++);
    }
  }

  _resAt(cell) { return this.ROT ? (this.res[cell] + this.phase) % this.R : this.res[cell]; }

  _place(cell, genome, energy, lineage) {
    const o = { cell, genome, energy, age: 0, lineage };
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

  _expressed(g) { return g.slice(0, this.W); }
  _harvestSet(g) { const s = new Set(); for (const p of this._expressed(g)) if (p < this.R) s.add(p); return s; }
  _fast(g)      { let n = 0; for (const p of this._expressed(g)) if (p === this.FASTCOPY) n++; return n; }
  _attack(g)    { let n = 0; for (const p of this._expressed(g)) if (p === this.ATTACK) n++; return n; }
  _defend(g)    { let n = 0; for (const p of this._expressed(g)) if (p === this.DEFEND) n++; return n; }
  _canBuild(g)  { for (const p of this._expressed(g)) if (p === this.CONSTRUCT) return true; return false; }

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
    // environment slowly forgets what was built (a beaver dam decays if unmaintained).
    // Gated on REVERT only — NOT on noBuild — so a clean knockout (noBuild=true) stops new
    // building while the built world still decays, instead of freezing the map (the confound
    // that made the first knockout read "self-sustaining" when it had just frozen the ground).
    if (this.REVERT_P > 0 && (this.construct || this.builds > 0)) {
      // sample a bounded number of built cells to test for reversion (keeps step O(pop)-ish)
      const tries = Math.min(this.CELLS, this.orgs.length + 64);
      for (let t = 0; t < tries; t++) {
        const c = this._rint(this.CELLS);
        if (this.builtBy[c] !== -1 && this.rand() < this.REVERT_P) { this.res[c] = this.orig[c]; this.builtBy[c] = -1; }
      }
    }
    this._bornOnBuilt = 0; this._bornOnOwnBuilt = 0; this._bornTotal = 0;
    this._bornFromBuilder = 0; this._bornOwnFromBuilder = 0;
    const N = this.orgs.length;
    if (N === 0) return;
    const start = this.tick % N;
    for (let j = 0; j < N; j++) {
      const o = this.orgs[(start + j) % N];
      if (!o || o.dead) continue;
      const localRes = this._resAt(o.cell);
      const canEat = this._harvestSet(o.genome).has(localRes);
      o.energy += (canEat ? this.YIELD : 0) - this.UPKEEP;
      o.age++;

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

      // NICHE CONSTRUCTION: terraform the local cell to a resource this organism can harvest.
      // Costs energy (a price), needs a spare-energy buffer (won't build itself to death), and
      // the edit persists + is lineage-tagged so we can later ask who inherits it.
      if (this.construct && !this.noBuild && this._canBuild(o.genome) && o.energy >= this.BUILD_THRESH && this.rand() < this.BUILD_P) {
        const hs = this._harvestSet(o.genome);
        if (hs.size && this.res[o.cell] !== undefined) {
          // pick a harvest type it has that ISN'T already the local type (no point re-terraforming)
          let target = -1;
          for (const h of hs) { if (h !== this.res[o.cell]) { target = h; break; } }
          if (target === -1) target = hs.values().next().value;   // already matches; refresh anyway (maintenance)
          this.res[o.cell] = target;
          this.builtBy[o.cell] = o.lineage;
          o.energy -= this.BUILD_COST;
          this.builds++;
        }
      }

      if (o.energy <= 0) { o.dead = true; this.grid[o.cell] = -1; this.deaths++; continue; }

      if (o.energy >= this.REPRO_THRESH) {
        const free = this._neighbors(o.cell).filter(c => this.grid[c] === -1);
        if (free.length) {
          const cost = Math.max(4, this.REPRO_COST - this._fast(o.genome) * 2);
          if (o.energy >= cost) {
            const child = this._mutate(o.genome);
            // RECRUITMENT (plant-soil feedback): the offspring is preferentially placed onto a
            // free neighbour it can actually HARVEST — including ground an ancestor built. This is
            // the positive feedback niche construction needs: a lineage holds the patch it made,
            // instead of surrendering it to whichever majority-type organism grabs it first. The
            // rule is identical in both arms (fair) — construction's only edge is that it CREATES
            // more eatable ground for the same rule to recruit into.
            const childHS = this._harvestSet(child);
            let eatable = free.filter(c => childHS.has(this._resAt(c)));
            // HERITABLE construction: if the parent builds and no free cell already suits the child,
            // the parent conditions one — terraforming the child's landing cell to a type the child
            // can harvest and tagging it with the lineage. The descendant is then born onto ground
            // its parent made. Costs the same BUILD_COST (the price is real).
            let prepared = -1;
            if (this.construct && !this.noBuild && this.constructMode === 'offspring' && !eatable.length &&
                this._canBuild(o.genome) && childHS.size && o.energy >= this.BUILD_COST + 1) {
              const target = childHS.values().next().value;
              prepared = free[this._rint(free.length)];
              this.res[prepared] = target;
              this.builtBy[prepared] = o.lineage;
              o.energy -= this.BUILD_COST;
              this.builds++;
              eatable = [prepared];
            }
            const pool = eatable.length ? eatable : free;
            const cell = pool[this._rint(pool.length)];
            o.energy -= cost;
            this._place(cell, child, cost * 0.6, o.lineage);
            this.births++;
            // heritable-niche instrument: was the child born onto BUILT ground, and by its OWN lineage?
            this._bornTotal++;
            const onOwn = this.builtBy[cell] === o.lineage;
            if (this.builtBy[cell] !== -1) { this._bornOnBuilt++; if (onOwn) this._bornOnOwnBuilt++; }
            // CONDITIONAL: restrict to parents that can actually build — the only lineages where
            // inheritance is even possible. This is what separates "inheritance real but rare"
            // from "inheritance never happens, coexistence is pure active rebuild".
            if (this._canBuild(o.genome)) { this._bornFromBuilder++; if (onOwn) this._bornOwnFromBuilder++; }
          }
        }
      }
    }

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
    const n = living.length || 1;
    let sumLen = 0, sumExpr = 0, fed = 0;
    // Shannon diversity of the DOMINANT expressed harvest per organism = coexisting specialists
    const harvestCounts = {};
    let builtCells = 0;
    for (let c = 0; c < this.CELLS; c++) if (this.builtBy[c] !== -1) builtCells++;
    for (const o of living) {
      sumLen += o.genome.length;
      const expr = this._expressed(o.genome);
      sumExpr += new Set(expr).size;
      const hs = this._harvestSet(o.genome);
      if (hs.has(this._resAt(o.cell))) fed++;
      // classify the organism by the harvest type that matches its cell (its realized niche),
      // else by its first harvest gene (its intended niche)
      let niche = -1;
      if (hs.has(this._resAt(o.cell))) niche = this._resAt(o.cell);
      else for (const p of expr) if (p < this.R) { niche = p; break; }
      const key = niche < 0 ? 'none' : 'h' + niche;
      harvestCounts[key] = (harvestCounts[key] || 0) + 1;
    }
    // effective number of coexisting niches = exp(Shannon entropy) over harvest classes
    let H = 0; const tot = living.length || 1;
    for (const k in harvestCounts) { const p = harvestCounts[k] / tot; if (p > 0) H -= p * Math.log(p); }
    const effNiches = +Math.exp(H).toFixed(2);
    return {
      tick: this.tick, pop: living.length, window: this.W, construct: this.construct,
      rawLen: +(sumLen / n).toFixed(2),
      exprComplexity: +(sumExpr / n).toFixed(2),
      fedFrac: +(fed / n).toFixed(3),                 // fraction eating their local resource
      effNiches,                                       // effective # coexisting harvest specialists
      builtFrac: +(builtCells / this.CELLS).toFixed(3),// fraction of world that is organism-made
      bornOnBuiltFrac: this._bornTotal ? +(this._bornOnBuilt / this._bornTotal).toFixed(3) : 0,
      bornOwnFromBuilderFrac: this._bornFromBuilder ? +(this._bornOwnFromBuilder / this._bornFromBuilder).toFixed(3) : 0,
      builderBirthShare: this._bornTotal ? +(this._bornFromBuilder / this._bornTotal).toFixed(3) : 0,
      bornOnOwnBuiltFrac: this._bornTotal ? +(this._bornOnOwnBuilt / this._bornTotal).toFixed(3) : 0,
      builds: this.builds, births: this.births, deaths: this.deaths,
    };
  }

  view() {
    return this.orgs.filter(o => !o.dead).map(o => ({
      cell: o.cell, res: this._resAt(o.cell), built: this.builtBy[o.cell] !== -1,
      expr: new Set(this._expressed(o.genome)).size,
    }));
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Niche };
if (typeof window !== 'undefined') { window.Niche = Niche; }
