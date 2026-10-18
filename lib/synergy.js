// void synergy — creatures built from parts that modify each other's behaviour.
//
// The mash (each piece is someone's; the combination is ours):
//   The Binding of Isaac's item system (McMillen & Himsl 2011, Rebirth 2014): an item
//     is not a stat bump, it is a MODIFIER OF WHAT THE OTHER ITEMS DO — tear shape ×
//     splitting × homing × orbiting × chaining — so a few dozen items make thousands of
//     qualitatively different builds and synergies the designers never enumerated.
//   Karl Sims 1994 "Evolving Virtual Creatures": morphology and control evolved
//     together as a directed graph of parts, behaviour = what the assembled body does.
//   "Affordance composition" in open-ended evolution (Stanley, Lehman, Soros 2017
//     "Open-endedness: the last grand challenge"): novelty comes from parts offering new
//     ways to use other parts, not from more of the same.
//   Our own OBSERVATION-why-reach-is-pinned.md: a world stays simple when its food is
//     simple. Here the far food is reachable only by composed behaviour.
//
// A creature carries an ordered list of PARTS (1–6) from a palette of 22. Every tick the
// parts run as a pipeline over one state object {heading, move, emissions, hooks}: a sense
// part sets the heading, a motor part adds a motion vector, a TRANSFORM part rewrites the
// motion vector or the emissions list the earlier parts produced, a projectile part rewrites
// what emitted projectiles do when they fly or hit, a trigger part hooks events. Nothing is
// enumerated: `spiral` after `thrust` is a spiral; `spiral` after `orbit` is a different one;
// `split` after `spray` after `homing` is a thing nobody wrote.
//
// Two arms share this file:
//   compose  — the pipeline above (parts transform each other's outputs).
//   additive — the CONTROL: every part contributes a fixed, independent term to a fixed set
//              of channels (speed, turn, tangential, straight-emission rate, homing-emission
//              rate, tether share, ...). No part reads or rewrites another part's output.
//              Same palette names, same world, same energy law.
//
// The world: a bounded disc. A CURRENT pulls everything toward the centre, stronger further
// out (c = C0·r). Food comes in three tiers: near (r < 0.35, energy 1, body contact), mid
// (ring r≈0.62, energy 3, body contact — needs more outward speed than any one part gives),
// far (ring r≈0.86, energy 10, eaten ONLY by projectiles, and the energy comes home ONLY if
// the creature has `tether`). Upkeep grows with part count; reproduce at ENERGY_REPRO by
// budding a mutated copy (add / drop / swap / reorder a part). Food respawns at a fixed
// throughput per tier, so the far tiers are the only way to feed a bigger, stranger body.
//
// The observer measures BEHAVIOUR, not parts: each distinct genome is run alone in a fixed
// test arena for T ticks and summarised as 12 numbers (displacement, path, reach, turning,
// projectiles, projectile reach, food eaten per tier, energy returned, planted, orbit-ness),
// normalised and binned — a behaviour cell. SYNERGY: predict a combo's descriptor as the
// base creature plus the sum of each single part's deviation from base; a combo is a
// synergy when its measured descriptor is ≥ SYN_THETA scale-units from that prediction on
// some axis. The canary (hand-built {radial, thrust, emit, boost, homing, tether} reaches far
// food while no single part does) must register; the additive-arm pair {thrust, emit} and the
// compose-arm pair {thrust, emit} (independent channels: legs and a gun) must not.
// v2 (2026-10-18, after RESULT-synergy.md named two flaws):
//   (a) THE DETECTOR IS COUNTERFACTUAL, NOT LINEAR. v1 predicted a combo's descriptor as a linear
//       sum of single-part descriptors, so the world's own nonlinearity (turning of a vector sum,
//       the current's equilibrium radius) read as synergy and the additive control scored as many
//       "synergies" as the pipeline. Now the null model is SIMULATED: the same parts, in the same
//       arena and physics, where every tick each part acts ALONE from the composite's state and
//       the isolated contributions are summed (isolated clones composed additively). synergy =
//       behaviour(pipeline) - behaviour(additive null). For an additive-arm creature the null and
//       the actual are the same program, so the control scores exactly 0 — that is the canary.
//   (b) THE FAR FOOD IS A QUALITATIVE LOCK, NOT A DISTANCE. v1's far food was reachable by stacking
//       speed (thrust + boost + pulse summed to the rim). Now a barrier at r = 0.70 stops every body,
//       and far food opens only to a projectile that has SPLIT and is HOMING — a transform of a
//       transform, which no sum of independent single-modifier projectiles can carry. Homing
//       steers toward the richest food in range (so a plain homing projectile hovers at the far
//       food without opening it). The additive arm cannot open the lock by construction; that is
//       reported as the lock's check, not as a finding.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.VoidSynergy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rng(seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = n => Math.floor(f() * n);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  }

  // ── the palette ────────────────────────────────────────────────────────────
  // kind: sense | motor | motion-transform | emitter | projectile-transform | trigger | effect
  const PALETTE = [
    { id: 'radial',  kind: 'sense',   glyph: 'ray',   txt: 'heading: away from the centre' },
    { id: 'seek',    kind: 'sense',   glyph: 'eye',   txt: 'heading: toward the nearest food' },
    { id: 'wander',  kind: 'sense',   glyph: 'wave',  txt: 'heading: slow drift' },
    { id: 'thrust',  kind: 'motor',   glyph: 'bar',   txt: 'move along the heading' },
    { id: 'pulse',   kind: 'motor',   glyph: 'dash',  txt: 'burst along the heading, 5 ticks in 20' },
    { id: 'spiral',  kind: 'xform',   glyph: 'coil',  txt: 'rotate the motion by a growing angle' },
    { id: 'orbit',   kind: 'xform',   glyph: 'ring',  txt: 'turn the motion tangential to the centre' },
    { id: 'mirror',  kind: 'xform',   glyph: 'twin',  txt: 'flip the motion every 15 ticks; mirror every projectile' },
    { id: 'boost',   kind: 'xform',   glyph: 'chev',  txt: 'scale motion and projectiles ×1.6' },
    { id: 'anchor',  kind: 'xform',   glyph: 'dot',   txt: 'halve the current, halve the motion' },
    { id: 'emit',    kind: 'emitter', glyph: 'tri',   txt: 'shoot one projectile along the heading every 30 ticks' },
    { id: 'spray',   kind: 'emitter', glyph: 'fan',   txt: 'shoot three projectiles at ±35° every 30 ticks' },
    { id: 'homing',  kind: 'pxform',  glyph: 'arc',   txt: 'projectiles steer toward the richest food in range' },
    { id: 'split',   kind: 'pxform',  glyph: 'fork',  txt: 'projectiles split in two at half life' },
    { id: 'chain',   kind: 'pxform',  glyph: 'link',  txt: 'a projectile that eats fires a new one' },
    { id: 'tether',  kind: 'pxform',  glyph: 'line',  txt: 'what projectiles eat comes home' },
    { id: 'ontouch', kind: 'trigger', glyph: 'spark', txt: 'eating by body fires every emitter now' },
    { id: 'ondeath', kind: 'trigger', glyph: 'cross', txt: 'death leaves half the energy as food' },
    { id: 'onbirth', kind: 'trigger', glyph: 'seed',  txt: 'a child fires every emitter at birth' },
    { id: 'plant',   kind: 'effect',  glyph: 'leaf',  txt: 'eating mid or far food plants near food here' },
    { id: 'attract', kind: 'effect',  glyph: 'pull',  txt: 'pull nearby food toward the body' },
    { id: 'repel',   kind: 'effect',  glyph: 'push',  txt: 'push nearby creatures away' },
  ];
  const BY_ID = Object.fromEntries(PALETTE.map(p => [p.id, p]));
  const IDS = PALETTE.map(p => p.id);

  // ── constants ──────────────────────────────────────────────────────────────
  const C0 = 0.025;            // current: inward speed = C0 · r
  const SPEED = 0.012, PSPEED = 0.02, PLIFE = 70, EMIT_EVERY = 30, EMIT_COST = 0.04;
  const TIER = [
    { name: 'near', energy: 1,  rMin: 0.00, rMax: 0.35, cap: 60, rate: 0.50, body: true },
    { name: 'mid',  energy: 3,  rMin: 0.56, rMax: 0.68, cap: 30, rate: 0.15, body: true },
    { name: 'far',  energy: 10, rMin: 0.80, rMax: 0.92, cap: 20, rate: 0.06, body: false },   // v2: projectile-only, and only a split+homing fragment opens it
  ];
  const EAT_R = 0.03, PEAT_R = 0.025, R_BODY = 0.70;   // R_BODY: the barrier no body crosses (v2)
  const UPKEEP = 0.004, UPKEEP_PART = 0.0015, ENERGY_REPRO = 3.0, CHILD_E = 1.4, MAX_PARTS = 6, POP_CAP = 200, R_MAX = 0.98;

  // ── pipeline (compose arm) ─────────────────────────────────────────────────
  // state: {heading:[x,y], move:[x,y], emissions:[{dir, speed, mods:{homing,split,chain,tether,mirror}}], hooks:Set, cur:1, fire:false}
  function freshState(c) { return { heading: c.heading.slice(), move: [0, 0], emissions: [], hooks: new Set(), cur: 1, fireNow: false, attract: 0, repel: 0 }; }
  function mergeInto(st, S) { st.move[0] += S.move[0]; st.move[1] += S.move[1]; st.emissions.push(...S.emissions); for (const h of S.hooks) st.hooks.add(h); st.cur = Math.min(st.cur, S.cur); st.attract += S.attract; st.repel += S.repel; if (S.fireNow) st.fireNow = true; }
  function applyPart(p, S, c, world, t, additive, emitTick) {
    const r = Math.hypot(c.x, c.y) || 1e-6;
    switch (p) {
      case 'radial': S.heading = [c.x / r, c.y / r]; break;
      case 'seek': { const f = nearestFood(world, c.x, c.y, 0.5); if (f) { const d = Math.hypot(f.x - c.x, f.y - c.y) || 1e-6; S.heading = [(f.x - c.x) / d, (f.y - c.y) / d]; } break; }
      case 'wander': { const a = Math.atan2(S.heading[1], S.heading[0]) + 0.35 * Math.sin((t + c.phase) * 0.07); S.heading = [Math.cos(a), Math.sin(a)]; break; }
      case 'thrust': S.move[0] += S.heading[0] * SPEED; S.move[1] += S.heading[1] * SPEED; break;
      case 'pulse': if (((t + c.phase) % 20) < 5) { S.move[0] += S.heading[0] * SPEED * 3; S.move[1] += S.heading[1] * SPEED * 3; } break;
      case 'spiral': {
        if (additive) { const a = (t + c.phase) * 0.05; S.move[0] += Math.cos(a) * SPEED * 0.5; S.move[1] += Math.sin(a) * SPEED * 0.5; break; }
        const a = ((t + c.phase) % 200) * 0.03; const cs = Math.cos(a), sn = Math.sin(a);
        S.move = [S.move[0] * cs - S.move[1] * sn, S.move[0] * sn + S.move[1] * cs]; break; }
      case 'orbit': {
        const tx = -c.y / r, ty = c.x / r;
        if (additive) { S.move[0] += tx * SPEED * 0.5; S.move[1] += ty * SPEED * 0.5; break; }
        const m = Math.hypot(S.move[0], S.move[1]); S.move = [tx * m, ty * m]; break; }
      case 'mirror': {
        if (additive) { if ((((t + c.phase) / 15) | 0) % 2) { S.move[0] += -S.heading[0] * SPEED * 0.3; } else { S.move[0] += S.heading[0] * SPEED * 0.3; } break; }
        if ((((t + c.phase) / 15) | 0) % 2) S.move[0] = -S.move[0];
        const extra = S.emissions.map(e => ({ dir: [-e.dir[0], e.dir[1]], speed: e.speed, mods: Object.assign({}, e.mods) }));
        S.emissions.push(...extra); break; }
      case 'boost': {
        if (additive) { S.move[0] += S.heading[0] * SPEED * 0.5; S.move[1] += S.heading[1] * SPEED * 0.5; break; }
        S.move[0] *= 1.6; S.move[1] *= 1.6; for (const e of S.emissions) e.speed *= 1.6; break; }
      case 'anchor': {
        if (additive) { S.cur = 0.75; break; }
        S.cur *= 0.5; S.move[0] *= 0.5; S.move[1] *= 0.5; break; }
      case 'emit': if (emitTick || S.fireNow) S.emissions.push({ dir: S.heading.slice(), speed: PSPEED, mods: {} }); break;
      case 'spray': if (emitTick || S.fireNow) for (const da of [-0.61, 0, 0.61]) { const a = Math.atan2(S.heading[1], S.heading[0]) + da; S.emissions.push({ dir: [Math.cos(a), Math.sin(a)], speed: PSPEED, mods: {} }); } break;
      case 'homing': case 'split': case 'chain': case 'tether': {
        if (additive) { if (emitTick) S.emissions.push({ dir: S.heading.slice(), speed: PSPEED, mods: { [p]: true } }); break; }
        for (const e of S.emissions) e.mods[p] = true; break; }
      case 'ontouch': S.hooks.add('ontouch'); if (!additive && c.touched) S.fireNow = true; break;
      case 'ondeath': S.hooks.add('ondeath'); break;
      case 'onbirth': S.hooks.add('onbirth'); if (!additive && c.born) S.fireNow = true; break;
      case 'plant': S.hooks.add('plant'); break;
      case 'attract': S.attract += 1; break;
      case 'repel': S.repel += 1; break;
    }
  }
  function fireEmitters(st, parts) {
    for (const p of parts) if (p === 'emit') st.emissions.push({ dir: st.heading.slice(), speed: PSPEED, mods: {} });
      else if (p === 'spray') for (const da of [-0.61, 0, 0.61]) { const a = Math.atan2(st.heading[1], st.heading[0]) + da; st.emissions.push({ dir: [Math.cos(a), Math.sin(a)], speed: PSPEED, mods: {} }); }
    for (const p of parts) if (p === 'homing' || p === 'split' || p === 'chain' || p === 'tether') for (const e of st.emissions) e.mods[p] = true;
  }
  // arm: 'compose' (pipeline) | 'additive' (independent terms). isolate: the NULL MODEL — every
  // part is applied alone, from a fresh copy of the creature's state, under this arm's own
  // semantics, and the isolated results are summed. Under 'additive' that is the same program
  // as the arm itself (so null == actual, exactly). Under 'compose' it is the counterfactual
  // "what these parts would do if none of them could read the others" in this very physics.
  function runPipeline(c, world, t, arm, isolate) {
    const st = freshState(c);
    const additive = arm === 'additive';
    const emitTick = (t % EMIT_EVERY) === (c.phase % EMIT_EVERY);
    for (let i = 0; i < c.parts.length; i++) {
      const p = c.parts[i];
      if (additive || isolate) { const S = freshState(c); applyPart(p, S, c, world, t, additive, emitTick); mergeInto(st, S); }
      else applyPart(p, st, c, world, t, false, emitTick);
    }
    // compose: a trigger that fired this tick re-runs the emitters it sits after — simplest
    // honest reading of "fires every emitter now": emitters later in the pipeline saw fireNow.
    // (Not under isolate: a trigger alone has no emitter to fire — that coupling IS the synergy.)
    if (!additive && !isolate && st.fireNow && !st.emissions.length) fireEmitters(st, c.parts);
    c.touched = false; c.born = false;
    return st;
  }

  function nearestFood(world, x, y, range, far) {
    let best = null, bd = range * range;
    for (const f of world.food) { if (far && f.tier !== 2) continue; const d = (f.x - x) ** 2 + (f.y - y) ** 2; if (d < bd) { bd = d; best = f; } }
    return best;
  }
  // v2 homing: the richest food in range, nearest among equals. A projectile that can smell the
  // far food steers for it whether or not it can open it — opening is the lock's business.
  function richestFood(world, x, y, range) {
    let best = null, bt = -1, bd = range * range;
    for (const f of world.food) { const d = (f.x - x) ** 2 + (f.y - y) ** 2; if (d >= range * range) continue; if (f.tier > bt || (f.tier === bt && d < bd)) { bt = f.tier; bd = d; best = f; } }
    return best;
  }

  // ── world ──────────────────────────────────────────────────────────────────
  function World(seed, opts) {
    opts = opts || {};
    const R = rng(seed);
    const W = { seed, arm: opts.arm || 'compose', t: 0, R, creatures: [], food: [], proj: [], nextId: 1, foodAcc: [0, 0, 0],
      births: 0, deaths: 0, eaten: [0, 0, 0], returned: 0, planted: 0, test: !!opts.test, log: [] };
    W.step = () => step(W);
    W.spawn = (parts, x, y, e) => spawn(W, parts, x, y, e);
    W.addFood = (tier, x, y, e) => { W.food.push({ x, y, tier, e: e == null ? TIER[tier].energy : e }); };
    return W;
  }
  function spawn(W, parts, x, y, e) {
    const a = W.R() * Math.PI * 2;
    const c = { id: W.nextId++, parts: parts.slice(), x, y, heading: [Math.cos(a), Math.sin(a)], e: e == null ? CHILD_E : e, phase: W.R.int(1000), age: 0, touched: false, born: true, children: 0, key: parts.join('+') };
    W.creatures.push(c); return c;
  }
  function randomPos(R, tier) { const T = TIER[tier]; const r = T.rMin + R() * (T.rMax - T.rMin), a = R() * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a)]; }
  function seedFood(W, n) { for (let i = 0; i < n; i++) { const tier = W.R() < 0.6 ? 0 : W.R() < 0.7 ? 1 : 2; const [x, y] = randomPos(W.R, tier); W.addFood(tier, x, y); } }

  function eatFood(W, f, c, viaProj) {
    const idx = W.food.indexOf(f); if (idx < 0) return 0;
    W.food.splice(idx, 1); W.eaten[f.tier]++;
    const gain = f.e;
    if (!viaProj) { c.e += gain; W.returned += gain; c.touched = true; }
    if (f.tier >= 1 && c.parts.includes('plant')) { W.food.push({ x: c.x, y: c.y, tier: 0, e: TIER[0].energy }); W.planted++; }
    return gain;
  }

  function step(W) {
    const t = ++W.t;
    // food throughput (not in the test arena)
    if (!W.test) for (let k = 0; k < 3; k++) { W.foodAcc[k] += TIER[k].rate; while (W.foodAcc[k] >= 1) { W.foodAcc[k] -= 1; if (W.food.filter(f => f.tier === k).length < TIER[k].cap) { const [x, y] = randomPos(W.R, k); W.addFood(k, x, y); } } }
    const newborn = [];
    for (const c of W.creatures) {
      c.age++;
      const st = runPipeline(c, W, t, W.arm, !!c.isolate);
      const r = Math.hypot(c.x, c.y) || 1e-6;
      // current
      const cur = C0 * r * st.cur;
      let vx = st.move[0] - c.x / r * cur, vy = st.move[1] - c.y / r * cur;
      c.vx = vx; c.vy = vy;
      c.x += vx; c.y += vy;
      const r2 = Math.hypot(c.x, c.y); if (r2 > R_BODY) { c.x *= R_BODY / r2; c.y *= R_BODY / r2; }   // v2: the barrier — no body reaches the far ring
      if (Math.hypot(st.move[0], st.move[1]) > 1e-9) { const m = Math.hypot(st.move[0], st.move[1]); c.heading = [st.move[0] / m, st.move[1] / m]; } else c.heading = st.heading;
      // emissions
      for (const e of st.emissions) { if (W.proj.filter(p => p.owner === c.id).length >= 12) break; if (!W.test) { if (c.e < EMIT_COST) break; c.e -= EMIT_COST; } W.proj.push({ owner: c.id, x: c.x, y: c.y, vx: e.dir[0] * e.speed, vy: e.dir[1] * e.speed, speed: e.speed, life: PLIFE, mods: e.mods, maxR: 0 }); c.emitted = (c.emitted || 0) + 1; }
      // effects
      if (st.attract) for (const f of W.food) { const dx = c.x - f.x, dy = c.y - f.y, d = Math.hypot(dx, dy); if (d < 0.12 && d > 1e-6) { f.x += dx / d * 0.004 * st.attract; f.y += dy / d * 0.004 * st.attract; } }
      if (st.repel) for (const o of W.creatures) { if (o === c) continue; const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy); if (d < 0.08 && d > 1e-6) { o.x += dx / d * 0.003; o.y += dy / d * 0.003; } }
      // body eating
      for (let i = W.food.length - 1; i >= 0; i--) { const f = W.food[i]; if (!TIER[f.tier].body) continue; if ((f.x - c.x) ** 2 + (f.y - c.y) ** 2 < EAT_R * EAT_R) eatFood(W, f, c, false); }
      // energy law
      if (!W.test) {
        c.e -= UPKEEP + UPKEEP_PART * c.parts.length;
        if (c.e >= ENERGY_REPRO && W.creatures.length + newborn.length < POP_CAP) {
          c.e -= CHILD_E; c.children++;
          const parts = mutate(W.R, c.parts); const ch = spawn(W, parts, c.x + (W.R() - 0.5) * 0.02, c.y + (W.R() - 0.5) * 0.02, CHILD_E); ch.parent = c.id;
          W.creatures.pop(); newborn.push(ch); W.births++;
        }
      }
    }
    W.creatures.push(...newborn);
    // projectiles
    const byId = new Map(W.creatures.map(c => [c.id, c]));
    const spawned = [];
    for (let i = W.proj.length - 1; i >= 0; i--) {
      const p = W.proj[i]; const o = byId.get(p.owner);
      if (p.mods.homing) { const f = richestFood(W, p.x, p.y, 0.6); if (f) { const dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy) || 1e-6; p.vx += (dx / d * p.speed - p.vx) * 0.25; p.vy += (dy / d * p.speed - p.vy) * 0.25; } }
      const r = Math.hypot(p.x, p.y) || 1e-6; const cur = C0 * r;
      p.x += p.vx - p.x / r * cur; p.y += p.vy - p.y / r * cur;
      const pr = Math.hypot(p.x, p.y); if (pr > p.maxR) p.maxR = pr; if (o && pr > (o.pReach || 0)) o.pReach = pr;
      p.life--;
      if (p.mods.split && !p.didSplit && p.life === (PLIFE >> 1)) { p.didSplit = true; const a = Math.atan2(p.vy, p.vx); for (const da of [-0.78, 0.78]) spawned.push({ owner: p.owner, x: p.x, y: p.y, vx: Math.cos(a + da) * p.speed, vy: Math.sin(a + da) * p.speed, speed: p.speed, life: p.life, mods: p.mods, maxR: p.maxR, didSplit: true }); }
      let ate = false;
      // v2: projectiles eat ONLY far food (near and mid are body food), and far food opens only to a
      // split, homing fragment — the lock. An unsplit or unguided projectile passes through it.
      const opens = !!(p.mods.homing && p.mods.split && p.didSplit);
      for (let j = W.food.length - 1; j >= 0; j--) { const f = W.food[j]; if (f.tier !== 2 || !opens) continue; if ((f.x - p.x) ** 2 + (f.y - p.y) ** 2 < PEAT_R * PEAT_R) {
        const gain = o ? eatFood(W, f, o, true) : (W.food.splice(j, 1), W.eaten[f.tier]++, 0);
        if (o) { if (p.mods.tether) { o.e += gain; W.returned += gain; o.pReturned = (o.pReturned || 0) + gain; } o.pAte = (o.pAte || 0) + 1; o.pAteTier = o.pAteTier || [0, 0, 0]; o.pAteTier[f.tier]++; }
        if (p.mods.chain) { const a = Math.atan2(p.vy, p.vx) + (W.R() - 0.5); spawned.push({ owner: p.owner, x: p.x, y: p.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, speed: p.speed, life: PLIFE >> 1, mods: p.mods, maxR: p.maxR }); }
        ate = true; break; } }
      if (ate || p.life <= 0 || pr > R_MAX) W.proj.splice(i, 1);
    }
    W.proj.push(...spawned);
    // deaths
    if (!W.test) for (let i = W.creatures.length - 1; i >= 0; i--) { const c = W.creatures[i]; if (c.e <= 0) { if (c.parts.includes('ondeath') && c.e > -0.5) W.food.push({ x: c.x, y: c.y, tier: 0, e: Math.max(0.2, (c.e + CHILD_E) * 0.5) }); W.creatures.splice(i, 1); W.deaths++; } }
    return W;
  }

  function mutate(R, parts) {
    const p = parts.slice(); const op = R();
    if (op < 0.35 && p.length < MAX_PARTS) p.splice(R.int(p.length + 1), 0, R.pick(IDS));
    else if (op < 0.6 && p.length > 1) p.splice(R.int(p.length), 1);
    else if (op < 0.8) p[R.int(p.length)] = R.pick(IDS);
    else if (p.length > 1) { const i = R.int(p.length), j = R.int(p.length); const t = p[i]; p[i] = p[j]; p[j] = t; }
    else p.push(R.pick(IDS));
    return p;
  }

  // ── the observer: behaviour descriptor in a fixed test arena ───────────────
  const T_TEST = 150;
  const SCALE = [0.6, 2.0, 1.0, 0.6, 24, 1.0, 8, 6, 4, 20, 8, 1.0];  // per-axis scale for normalisation
  const NAMES = ['displacement', 'path', 'body reach', 'turning', 'projectiles', 'projectile reach', 'near eaten', 'mid eaten', 'far eaten', 'energy home', 'planted', 'orbit-ness'];
  function testArena(arm) {
    const W = World(777, { arm, test: true });
    for (let k = 0; k < 3; k++) { const r = [0.3, 0.62, 0.86][k]; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; W.addFood(k, r * Math.cos(a), r * Math.sin(a)); } }
    return W;
  }
  function describe(parts, arm, isolate) {
    const W = testArena(arm);
    const c = W.spawn(parts, 0.2, 0, 10); c.heading = [1, 0]; c.phase = 0; c.born = true; c.isolate = !!isolate;
    let path = 0, reach = 0, turn = 0, orb = 0, n = 0; let px = c.x, py = c.y, ph = 0;
    const e0 = c.e;
    for (let t = 0; t < T_TEST; t++) {
      W.step();
      const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy); path += d;
      const r = Math.hypot(c.x, c.y); if (r > reach) reach = r;
      if (d > 1e-6) { const h = Math.atan2(dy, dx); let da = Math.abs(h - ph); if (da > Math.PI) da = 2 * Math.PI - da; if (t) turn += da; ph = h; orb += Math.abs((c.x * dy - c.y * dx) / (r * d + 1e-9)); n++; }
      px = c.x; py = c.y;
    }
    const disp = Math.hypot(c.x - 0.2, c.y);
    const bodyAte = W.eaten.slice(); const pt = c.pAteTier || [0, 0, 0];
    const raw = [disp, path, reach, n ? turn / n : 0, c.emitted || 0, c.pReach || 0, W.eaten[0], W.eaten[1], W.eaten[2], c.e - e0, W.planted, n ? orb / n : 0];
    const norm = raw.map((v, i) => v / SCALE[i]);
    return { raw, norm, cell: norm.map(v => Math.max(0, Math.min(4, Math.floor(v * 2.5)))).join(','), ateByProj: pt };
  }
  const BINS = 5;
  const SYN_THETA = 0.4;
  // v1 detector, kept for the record: measured vs a LINEAR sum of single-part descriptors.
  // It counts the world's nonlinearity as synergy (RESULT-synergy.md). Not used for verdicts.
  function synergyLinear(parts, arm, cache) {
    cache = cache || new Map();
    const get = ps => { const k = 'L:' + arm + ':' + ps.join('+'); let d = cache.get(k); if (!d) { d = describe(ps, arm); cache.set(k, d); } return d; };
    const base = get([]), actual = get(parts);
    const pred = base.norm.slice();
    for (const p of parts) { const s = get([p]); for (let i = 0; i < pred.length; i++) pred[i] += s.norm[i] - base.norm[i]; }
    let maxDev = 0, axis = -1;
    for (let i = 0; i < pred.length; i++) { const dev = Math.abs(actual.norm[i] - pred[i]); if (dev > maxDev) { maxDev = dev; axis = i; } }
    return { score: +maxDev.toFixed(3), axis, axisName: NAMES[axis] || null, isSynergy: parts.length >= 2 && maxDev >= SYN_THETA };
  }
  // v2 detector (counterfactual): measured behaviour vs the SAME parts simulated with every part
  // acting alone from the composite's state each tick (isolated clones composed additively), in
  // the same arena and physics. Nonlinearity of the world is inside the null; only coupling
  // between parts is left over. additive-arm creatures score exactly 0 by construction.
  function synergy(parts, arm, cache) {
    cache = cache || new Map();
    const k = arm + ':' + parts.join('+'), kn = 'N:' + k;
    let actual = cache.get(k); if (!actual) { actual = describe(parts, arm, false); cache.set(k, actual); }
    let nul = cache.get(kn); if (!nul) { nul = describe(parts, arm, true); cache.set(kn, nul); }
    let maxDev = 0, axis = -1;
    for (let i = 0; i < nul.norm.length; i++) { const dev = Math.abs(actual.norm[i] - nul.norm[i]); if (dev > maxDev) { maxDev = dev; axis = i; } }
    return { score: +maxDev.toFixed(3), axis, axisName: NAMES[axis] || null, isSynergy: parts.length >= 2 && maxDev >= SYN_THETA, actual: actual.norm.map(v => +v.toFixed(3)), predicted: nul.norm.map(v => +v.toFixed(3)), cell: actual.cell, raw: actual.raw.map(v => +(+v).toFixed(3)), nullWords: words({ norm: nul.norm }) };
  }
  function words(d) { // a human reading of a descriptor
    const n = d.norm || d.actual, out = [];
    if (n[8] > 0.05) out.push('eats far food'); else if (n[7] > 0.05) out.push('eats mid food'); else if (n[6] > 0.05) out.push('eats near food'); else out.push('eats nothing');
    if (n[2] > 0.8) out.push('reaches the rim'); else if (n[2] > 0.55) out.push('reaches the mid ring'); else if (n[0] < 0.1 && n[1] < 0.1) out.push('stays put');
    if (n[11] > 0.6) out.push('orbits'); else if (n[3] > 0.5) out.push('turns constantly');
    if (n[4] > 0.05) { out.push(n[5] > 0.8 ? 'projectiles reach the rim' : 'shoots'); }
    if (n[9] > 0.2) out.push('brings energy home');
    if (n[10] > 0) out.push('plants');
    return out.join(' · ');
  }

  return { PALETTE, BY_ID, IDS, TIER, C0, R_BODY, World, spawn, mutate, describe, synergy, synergyLinear, words, rng, NAMES, SCALE, SYN_THETA, T_TEST, ENERGY_REPRO, MAX_PARTS, POP_CAP };
});
