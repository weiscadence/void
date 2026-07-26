// graph.js — the world is a GRAPH OF NICHES, not a 50x50 box. Jiggy's idea (2026-07-24): stop
// confining organisms to cells in a plane; let the world be relational like memory nodes, growing
// a new node when there's something new to hold. This also answers Grok's Q2 (nested niches):
// niche construction here = GROW A NEW NICHE NODE LINKED to the one you're in, whose requirement
// derives from your own key. So a new niche literally DEPENDS ON an existing niche — a dependency
// EDGE — and higher-order structure (chains/trees of niches) can accumulate. Space is no longer a
// fixed plane that fills up; it's a graph that grows. Local scarcity is preserved as per-node
// CAPACITY (so it isn't a well-mixed mean-field soup — that would kill coexistence).
//
// Genome = a short register program computing a KEY (same open vocabulary as lib/open.js). An
// organism lives at a niche node whose requirement its key matches (L1 <= TOL); it harvests there,
// divided by how many share the node (crowding = frequency dependence). Reproduce into the same
// node or a graph-NEIGHBOUR node with free capacity. Die → free capacity. Empty non-root nodes
// decay (an unmaintained niche disappears, and its dependents lose their parent).
//
// THE Q2 INSTRUMENT: depth(node) = construction-hops from a root (roots = depth 0). If mean/max
// depth of OCCUPIED nodes keeps rising, the world is building niches-on-niches — nested structure,
// the thing niche-count-in-a-bigger-box structurally cannot produce. The pre-registered CONTROL
// (linkMode='flat') makes every constructed niche a NEW ROOT (depth 0, no parent edge): same node
// growth, zero nesting. flat vs nested isolates "higher-order structure" from "just more niches".
//
// Pure, seeded, headless. Same discipline as open.js / niche.js.

'use strict';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const N_OPS = 5;

class Graph {
  constructor(opts = {}) {
    this.K = opts.registers || 3;
    this.CAP = opts.cap ?? 24;
    this.TOL = opts.tol ?? 2;
    this.NODE_CAP = opts.nodeCap ?? 20;         // organisms per niche node (local scarcity)
    this.MAX_NODES = opts.maxNodes ?? 4000;     // safety ceiling (so it can't OOM); logged if hit
    this.linkMode = opts.linkMode ?? 'nested';  // 'nested' = child niche links to parent; 'flat' = new root
    this.construct = opts.construct ?? true;

    this.UPKEEP = opts.upkeep ?? 1;
    this.YIELD = opts.yield ?? 4;
    this.REPRO_COST = opts.reproCost ?? 10;
    this.REPRO_THRESH = opts.reproThresh ?? 14;
    this.MUT_PT = opts.mutPt ?? 0.08;
    this.MUT_INDEL = opts.mutIndel ?? 0.10;
    this.LEN_MAX = opts.lenMax ?? 24;
    this.CROWD = opts.crowd ?? 6;
    this.BUILD_COST = opts.buildCost ?? 5;
    this.BUILD_THRESH = opts.buildThresh ?? 10;
    this.BUILD_P = opts.buildP ?? 0.3;
    this.DECAY_EMPTY = opts.decayEmpty ?? 60;   // ticks a non-root node may stay empty before removal
    // SELF-REGULATION (Jiggy 2026-07-24, from Calhoun density-dependence + Bak self-organized
    // criticality): instead of a fixed build rate, construction is a RELIEF VALVE — you only grow a
    // new niche when your own node is OVERCROWDED (occupancy >= BUILD_DENSITY of capacity). Build-
    // when-full + decay-when-empty is density-dependent negative feedback on both ends, so the
    // system tunes ITSELF toward the edge instead of being hand-tuned. Expected healthy signature:
    // a bounded climb or a bounded OSCILLATION (waves), not runaway-to-cap or collapse-to-roots.
    this.regulate = opts.regulate ?? false;
    this.BUILD_DENSITY = opts.buildDensity ?? 0.75;
    // endogenous stabilizer: construction consumes shared local stock (see step()). Off by default
    // so every prior experiment is unchanged.
    this.buildDrawsStock = opts.buildDrawsStock ?? false;
    this.BUILD_STOCK_COST = opts.buildStockCost ?? 30;
    // RESOURCE-CONSUMER oscillation (Jiggy's "waves", 2026-07-24): each niche holds a STOCK that
    // harvesting depletes and that regrows slowly. The stock is a BUFFER = a time delay: crowding
    // drains it, yield then crashes a few ticks later, population dies back, stock recovers, boom
    // repeats. Instantaneous density-feedback gives a fixed point; a depletable reservoir gives a
    // CYCLE (Rosenzweig-MacArthur; paradox of enrichment — richer regen → bigger swings).
    this.resourceMode = opts.resourceMode ?? false;
    this.STOCK_MAX = opts.stockMax ?? 40;
    this.REGEN = opts.regen ?? 2;
    // ENERGETIC NESTING (Jiggy's energy-pyramid, 2026-07-24; Lindeman's trophic efficiency).
    // The handoff gap: resourceMode lets EVERY niche self-regen, so nesting is TOPOLOGICAL not
    // ENERGETIC — a child doesn't get its food THROUGH its parent, so removing a parent starves
    // nothing and the knockout can't fire. Energetic mode fixes that:
    //   - Basal niches (depth 0 roots) produce food at a FIXED, CAPPED rate (BASAL). Capped is
    //     load-bearing (Grok hole #2): if base energy can grow, the pyramid grows arbitrarily deep.
    //   - A depth-d niche does NOT self-regen. It is fed ONLY by TRANSFER (~10%, Lindeman) of its
    //     PARENT's stock each tick. Energy attenuates up the chain; depth self-limits when 0.1^d of
    //     basal input can't support one organism. Remove a mid niche → everything above it starves.
    // Note: Lindeman himself measured 0.1%-37.5% and never called it a law, so TRANSFER is a knob.
    this.energetic = opts.energetic ?? false;
    this.BASAL = opts.basal ?? this.STOCK_MAX;   // fixed basal production into each root per tick
    this.TRANSFER = opts.transfer ?? 0.1;        // fraction of a niche's stock passed to its children
    this.blockedReqs = new Set();                // knockout: reqs forbidden from being rebuilt
    this.orphans = new Set();                     // soft-knockout: nodes that lost their parent, kept alive
    this.reinventions = 0;                        // times a NEW niche re-adopted an orphaned branch
    // ORPHAN GRACE (the dependency↔recoverability dial): a severed branch normally starves instantly
    // (that's what makes energetic dependency real). But then survivors die before the system can
    // rebuild a bridge, so re-invention never happens. orphanGrace = fraction of self-regen an orphan
    // keeps WHILE orphaned — 0 = pure energetic (bites hard, can't recover), 1 = fully self-feeding
    // (recovers trivially but the knockout stops meaning anything). The interesting question is the
    // threshold: how much self-sufficiency does a branch need to live long enough to be re-adopted?
    this.orphanGrace = opts.orphanGrace ?? 0;
    // EVOLVED HARDINESS (solving for x — Jiggy 2026-07-24): instead of ME setting orphanGrace, give
    // each organism a HERITABLE reserve trait `res` (0..1) — how much of its surplus it banks into a
    // private store to draw on when food runs out. Banking is LOSSY (STORE_LOSS) and skims energy that
    // could have gone to reproduction, so hoarders breed slower — a real cost. Lean times select FOR
    // reserve, fat times select AGAINST it. If the population EVOLVES into the survivable band on its
    // own (mean res settles, deep levels persist) with no knob from me, that's the emergent result.
    this.evolveReserve = opts.evolveReserve ?? false;
    this.STORE_MAX = opts.storeMax ?? 30;
    this.STORE_LOSS = opts.storeLoss ?? 0.3;      // thermodynamic cost of banking (30% lost in storage)
    this.STORE_RATE = opts.storeRate ?? 0.5;      // fraction of surplus a full-res organism skims/tick
    this.RES_MUT = opts.resMut ?? 0.12;           // heritable mutation step on the reserve trait

    this.rand = rng(opts.seed || 1);
    this.nodes = new Map();       // id -> { id, req:[K], depth, parent, edges:Set, occ:count, emptySince }
    this.nextNode = 0;
    this.orgs = [];
    this.tick = 0; this.births = 0; this.deaths = 0; this.builds = 0; this.hitMaxNodes = false;

    // a few ROOT niches (depth 0) with distinct requirements, and founders that satisfy each
    const roots = opts.roots ?? 4;
    for (let i = 0; i < roots; i++) {
      const req = []; for (let k = 0; k < this.K; k++) req.push((this.rand() * 7 | 0) - 3);
      const node = this._addNode(req, 0, null);
      // seed founders whose program yields exactly this req (born fed)
      const g = this._programFor(req);
      for (let j = 0; j < (opts.seedPerRoot ?? 12); j++) this._place(node, this._mutateSmall(g), 8 + this.rand() * 4);
    }
  }

  _rint(n) { return (this.rand() * n) | 0; }
  _clamp(v) { return v < -this.CAP ? -this.CAP : v > this.CAP ? this.CAP : v; }
  _randInstr() { return { op: this._rint(N_OPS), t: this._rint(this.K), s: this._rint(this.K) }; }

  _addNode(req, depth, parent) {
    const id = this.nextNode++;
    const node = { id, req: req.slice(), depth, parent, edges: new Set(), occ: 0, emptySince: -1, stock: this.STOCK_MAX };
    if (parent != null && this.nodes.has(parent)) { node.edges.add(parent); this.nodes.get(parent).edges.add(id); }
    this.nodes.set(id, node);
    return id;
  }

  // build a tiny program whose key == req (greedy INC/DEC per register from 0)
  _programFor(req) {
    const g = [];
    for (let k = 0; k < this.K; k++) { const v = req[k]; for (let n = 0; n < Math.abs(v); n++) g.push({ op: v > 0 ? 0 : 1, t: k, s: 0 }); }
    return g.length ? g : [{ op: 0, t: 0, s: 0 }, { op: 1, t: 0, s: 0 }];
  }
  _mutateSmall(g) { g = g.map(i => ({ ...i })); if (this.rand() < 0.3) g.push(this._randInstr()); return g; }

  _run(genome) {
    const r = new Array(this.K).fill(0); let eff = 0;
    for (const g of genome) {
      const before = r[g.t];
      switch (g.op) {
        case 0: r[g.t] = this._clamp(r[g.t] + 1); break;
        case 1: r[g.t] = this._clamp(r[g.t] - 1); break;
        case 2: r[g.t] = this._clamp(r[g.t] * 2); break;
        case 3: r[g.t] = this._clamp(r[g.t] + r[g.s]); break;
        case 4: r[g.t] = this._clamp(-r[g.t]); break;
      }
      if (r[g.t] !== before) eff++;
    }
    return { key: r, eff };
  }
  _match(key, req) { let d = 0; for (let k = 0; k < this.K; k++) { d += Math.abs(key[k] - req[k]); if (d > this.TOL) return false; } return true; }

  _place(nodeId, genome, energy, res) {
    const { key, eff } = this._run(genome);
    const o = { node: nodeId, genome, energy, age: 0, key, eff, res: res ?? this.rand() * 0.3, store: 0 };
    this.orgs.push(o);
    const nd = this.nodes.get(nodeId); if (nd) { nd.occ++; nd.emptySince = -1; }
    return o;
  }

  _mutate(g) {
    g = g.map(i => ({ ...i }));
    for (const i of g) if (this.rand() < this.MUT_PT) { const m = this._randInstr(); i.op = m.op; i.t = m.t; i.s = m.s; }
    if (this.rand() < this.MUT_INDEL) {
      if (this.rand() < 0.5 && g.length < this.LEN_MAX) g.splice(this._rint(g.length + 1), 0, this._randInstr());
      else if (g.length > 1) g.splice(this._rint(g.length), 1);
    }
    return g;
  }

  // ENERGETIC replenishment: roots produce fixed basal food; every other niche is fed ONLY by a
  // fraction (TRANSFER) of its parent's stock. One pass in depth order (parents before children) so
  // energy flows all the way down the chain in a single tick and attenuates ~TRANSFER per level.
  _energeticReplenish() {
    // basal production into the roots (fixed + capped)
    for (const nd of this.nodes.values()) if (nd.depth === 0) nd.stock = Math.min(this.STOCK_MAX, nd.stock + this.BASAL);
    // orphaned branches get a fraction of self-regen (grace) so they don't starve instantly
    if (this.orphanGrace > 0) for (const id of this.orphans) { const nd = this.nodes.get(id); if (nd) nd.stock = Math.min(this.STOCK_MAX, nd.stock + this.orphanGrace * this.REGEN); }
    // propagate downstream, shallow → deep
    const byDepth = [...this.nodes.values()].sort((a, b) => a.depth - b.depth);
    for (const nd of byDepth) {
      const kids = [...nd.edges].map(e => this.nodes.get(e)).filter(c => c && c.depth === nd.depth + 1);
      if (!kids.length) continue;
      const give = this.TRANSFER * nd.stock;      // total energy this niche passes up the pyramid
      const per = give / kids.length;
      for (const c of kids) {
        const room = this.STOCK_MAX - c.stock;
        const t = Math.max(0, Math.min(per, room));
        c.stock += t; nd.stock -= t;
      }
    }
  }

  // KNOCKOUT: remove a niche and forbid its exact requirement from being rebuilt, so the system
  // can't trivially re-grow the same node. Children keep their edges to it severed → they lose their
  // only inflow → the subtree above should starve. `blockReq=false` (leaf control) removes without
  // blocking. Returns the set of node ids that were in the removed node's subtree (for measurement).
  knockout(nodeId, { blockReq = true } = {}) {
    const nd = this.nodes.get(nodeId); if (!nd) return { removed: false, subtree: new Set() };
    const subtree = this.subtree(nodeId);
    if (blockReq) this.blockedReqs.add(nd.req.join(','));
    for (const e of nd.edges) this.nodes.get(e)?.edges.delete(nodeId);
    // orphan any organisms sitting on the removed node
    for (const o of this.orgs) if (!o.dead && o.node === nodeId) { o.dead = true; this.deaths++; }
    this.nodes.delete(nodeId);
    return { removed: true, subtree };
  }

  // SOFT KNOCKOUT (the gentle version, for the re-invention test): remove the niche and block its
  // req, but do NOT slaughter the branch above it — its children become ORPHANS (parent severed, no
  // inflow) yet stay alive. They now starve slowly as their stock drains, which leaves a window for
  // the system to build a NEW niche (different req, since the old is blocked) that re-adopts the
  // orphaned branch and restores the energy path. That re-adoption = re-invention. The hard knockout
  // couldn't show it because it killed the very lineage that would rebuild; this one gives it a chance.
  softKnockout(nodeId, { blockReq = true } = {}) {
    const nd = this.nodes.get(nodeId); if (!nd) return { removed: false, subtree: new Set() };
    const subtree = this.subtree(nodeId);
    if (blockReq) this.blockedReqs.add(nd.req.join(','));
    for (const e of nd.edges) {
      const c = this.nodes.get(e);
      if (c && c.depth === nd.depth + 1) { c.parent = null; c.edges.delete(nodeId); this.orphans.add(c.id); }
      else if (c) c.edges.delete(nodeId);
    }
    // only the removed node's OWN occupants lose their home; the branch above lives on (orphaned)
    for (const o of this.orgs) if (!o.dead && o.node === nodeId) { o.dead = true; this.deaths++; }
    this.nodes.delete(nodeId);
    return { removed: true, subtree };
  }

  // all nodes reachable by going strictly DEEPER (child edges) from a node, incl. itself
  subtree(nodeId) {
    const seen = new Set([nodeId]); const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop(); const nd = this.nodes.get(id); if (!nd) continue;
      for (const e of nd.edges) { const c = this.nodes.get(e); if (c && c.depth === nd.depth + 1 && !seen.has(e)) { seen.add(e); stack.push(e); } }
    }
    return seen;
  }

  // living organisms whose node is in `set` — the quantity a knockout should collapse
  occIn(set) { let n = 0; for (const o of this.orgs) if (!o.dead && set.has(o.node)) n++; return n; }

  step() {
    this.tick++;
    const N = this.orgs.length;
    if (N === 0) return;
    // regenerate each niche's stock (the delayed buffer that turns feedback into waves)
    if (this.energetic) this._energeticReplenish();
    else if (this.resourceMode) for (const nd of this.nodes.values()) nd.stock = Math.min(this.STOCK_MAX, nd.stock + this.REGEN);
    // crowding census per node
    const share = new Map();
    for (const o of this.orgs) if (!o.dead) share.set(o.node, (share.get(o.node) || 0) + 1);

    const start = this.tick % N;
    for (let j = 0; j < N; j++) {
      const o = this.orgs[(start + j) % N];
      if (!o || o.dead) continue;
      const nd = this.nodes.get(o.node);
      if (!nd) { o.dead = true; this.deaths++; continue; }
      const matched = this._match(o.key, nd.req);
      const crowd = share.get(o.node) || 1;
      let gain;
      if (this.resourceMode || this.energetic) {
        // draw from the shared stock: what you want, capped by your fair share of what's left.
        const want = this.YIELD;
        gain = matched ? Math.min(want, nd.stock / crowd) : 0;
        nd.stock = Math.max(0, nd.stock - gain);
      } else {
        gain = matched ? this.YIELD / (1 + crowd / this.CROWD) : 0;
      }
      o.energy += gain - this.UPKEEP;
      o.age++;
      // evolved hardiness: bank a fraction of INTAKE (lossy) so reserve directly competes with
      // reproduction — a real breed-vs-survive tradeoff selection can act on. Draw on it when starving.
      if (this.evolveReserve) {
        if (o.store === undefined) { o.res = o.res ?? 0; o.store = 0; }
        if (gain > 0 && o.res > 0) {                           // skim intake into the reserve (lossy)
          const bank = Math.min(gain * o.res, this.STORE_MAX - o.store);
          if (bank > 0) { o.energy -= bank; o.store += bank * (1 - this.STORE_LOSS); }
        }
        if (o.energy <= 0 && o.store > 0) {                    // starving → reserve rescues you
          const draw = Math.min(o.store, this.UPKEEP + 1 - o.energy);
          o.energy += draw; o.store -= draw;
        }
      }

      // NICHE CONSTRUCTION → grow a new niche node. nested: linked to current node (depth+1),
      // requirement = the builder's own key mutated a step away (a NEW niche adjacent in key space,
      // reachable from here). flat control: same new node but as a fresh ROOT (no parent edge).
      // regulated: build only when the local niche is overcrowded (relief valve). unregulated:
      // fixed per-tick chance (the runaway/collapse-prone version).
      // BREATHE + GROW: in resourceMode the wave keeps density low, so crowding never triggers
      // building. Instead fund construction from SURPLUS ENERGY — an organism thriving in a boom
      // phase spends its surplus to colonise new niche-space. Growth then PULSES with the wave:
      // booms add structure, busts pause. (regulate w/o resource keeps the crowding relief-valve.)
      const buildTrigger = (this.regulate && (this.resourceMode || this.energetic))
        ? (o.energy >= this.REPRO_THRESH + this.BUILD_COST && this.rand() < 0.3)
        : this.regulate
          ? (crowd / this.NODE_CAP >= this.BUILD_DENSITY && this.rand() < 0.5)
          : (this.rand() < this.BUILD_P);
      // ENDOGENOUS NEGATIVE FEEDBACK (Grok/Cadence 2026-07-24): construction draws its cost from the
      // SAME local niche stock that organisms feed on. A boom then depletes its own fuel through the
      // normal local rules — no global thermostat, no injected winter. If the stock can't cover the
      // build, the build is skipped (the stabilizer only bites when it fires).
      const stockOk = !(this.buildDrawsStock && (this.resourceMode || this.energetic)) || nd.stock >= this.BUILD_STOCK_COST;
      if (stockOk && this.construct && this.nodes.size < this.MAX_NODES && o.energy >= this.BUILD_THRESH && buildTrigger) {
        if (this.buildDrawsStock && (this.resourceMode || this.energetic)) nd.stock -= this.BUILD_STOCK_COST;
        const req = o.key.slice(); const kk = this._rint(this.K); req[kk] = this._clamp(req[kk] + (this.rand() < 0.5 ? 1 : -1));
        // knockout block: the exact requirement of a knocked-out niche can't be rebuilt. Re-invention
        // must therefore route through a DIFFERENT req/path, not just respawn the same node.
        if (this.blockedReqs.has(req.join(','))) { /* forbidden niche — no build this attempt */ }
        else {
        const newId = (this.linkMode === 'nested') ? this._addNode(req, nd.depth + 1, o.node) : this._addNode(req, 0, null);
        o.energy -= this.BUILD_COST; this.builds++;
        // RE-INVENTION: if this fresh niche can sit one level under an orphaned branch, adopt it —
        // a new (differently-keyed) niche regrows the severed bridge and re-feeds the survivors above.
        if (this.energetic && this.orphans.size) {
          const nn = this.nodes.get(newId);
          for (const oid of this.orphans) {
            const O = this.nodes.get(oid);
            if (O && O.depth === nn.depth + 1) {
              nn.edges.add(oid); O.edges.add(newId); O.parent = newId; this.orphans.delete(oid);
              this.reinventions++; break;
            }
          }
        }
        // relief valve with OUTFLOW: the builder relocates into the niche it just made (its key
        // matches the new req within TOL), which actually relieves the crowded parent and seeds the
        // new niche so it isn't an orphan. Without this the new node stays empty and decays.
        if (this.regulate && this._match(o.key, this.nodes.get(newId).req)) {
          nd.occ--; o.node = newId; const nn = this.nodes.get(newId); nn.occ++; nn.emptySince = -1;
        }
        }
      } else if (this.construct && this.nodes.size >= this.MAX_NODES) this.hitMaxNodes = true;

      if (o.energy <= 0) { o.dead = true; nd.occ--; this.deaths++; continue; }

      if (o.energy >= this.REPRO_THRESH) {
        // candidate nodes: current + graph neighbours, with free capacity, that the CHILD matches
        const child = this._mutate(o.genome);
        const { key: ckey } = this._run(child);
        const cands = [o.node, ...nd.edges];
        let target = -1;
        for (const c of cands) { const cn = this.nodes.get(c); if (cn && cn.occ < this.NODE_CAP && this._match(ckey, cn.req)) { target = c; break; } }
        if (target !== -1) {
          o.energy -= this.REPRO_COST;
          const cres = Math.max(0, Math.min(1, (o.res ?? 0) + (this.rand() - 0.5) * this.RES_MUT));
          const co = { node: target, genome: child, energy: this.REPRO_COST * 0.6, age: 0, key: ckey, eff: this._run(child).eff, res: cres, store: 0 };
          this.orgs.push(co);
          const tn = this.nodes.get(target); tn.occ++; tn.emptySince = -1;
          this.births++;
        }
      }
    }

    // compact dead organisms
    if (this.orgs.length > 6000) this.orgs = this.orgs.filter(o => !o.dead);

    // recount occupancy and decay empty non-root nodes (unmaintained niches vanish)
    for (const nd of this.nodes.values()) nd.occ = 0;
    for (const o of this.orgs) if (!o.dead) { const nd = this.nodes.get(o.node); if (nd) nd.occ++; }
    for (const [id, nd] of this.nodes) {
      if (nd.occ > 0) { nd.emptySince = -1; continue; }
      if (nd.depth === 0 && id < 4) continue;            // never remove the original roots
      if (nd.emptySince < 0) nd.emptySince = this.tick;
      else if (this.tick - nd.emptySince > this.DECAY_EMPTY) {
        for (const e of nd.edges) this.nodes.get(e)?.edges.delete(id);
        this.nodes.delete(id); this.orphans.delete(id);
      }
    }
  }

  stats() {
    const living = this.orgs.filter(o => !o.dead);
    const n = living.length || 1;
    const occNodes = new Set(), reqSet = new Set(); let depthSum = 0, depthMax = 0, effSum = 0, lenSum = 0;
    for (const o of living) {
      occNodes.add(o.node);
      const nd = this.nodes.get(o.node); if (nd) { depthSum += nd.depth; if (nd.depth > depthMax) depthMax = nd.depth; reqSet.add(nd.req.join(',')); }
      effSum += o.eff; lenSum += o.genome.length;
    }
    // depth is averaged over OCCUPIED nodes (structure that's actually inhabited, not orphaned)
    let occDepthSum = 0; for (const id of occNodes) occDepthSum += this.nodes.get(id).depth;
    return {
      tick: this.tick, pop: living.length,
      nodes: this.nodes.size, occNodes: occNodes.size,
      distinctReq: reqSet.size,
      meanDepth: +(occDepthSum / (occNodes.size || 1)).toFixed(2),   // Q2 signal: nesting of inhabited niches
      maxDepth: depthMax,
      progComplexity: +(effSum / n).toFixed(2),
      rawLen: +(lenSum / n).toFixed(2),
      builds: this.builds, births: this.births, deaths: this.deaths, hitMaxNodes: this.hitMaxNodes,
      orphans: this.orphans.size, reinventions: this.reinventions,
      meanRes: +(living.reduce((s, o) => s + (o.res || 0), 0) / n).toFixed(3),
      meanStore: +(living.reduce((s, o) => s + (o.store || 0), 0) / n).toFixed(1),
    };
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Graph };
if (typeof window !== 'undefined') { window.Graph = Graph; }
