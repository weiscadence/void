#!/usr/bin/env node
'use strict';
// halt-time.js — post-hoc companion to commitment-time.js (NOT pre-registered; exploratory).
// The replay run found that forks of frozen parents at tau=10,000 reproduce the parent to the
// integer under fresh randomness, i.e. the frozen basin is a HALTED demography. This measures,
// per frozen world, the tick at which births and deaths stop for good (the halt time), and the
// crowd census at the halt — the prediction being that every exposed key sits at exactly
// crowd = CROWD * (YIELD - UPKEEP) / UPKEEP = 18, where harvest equals upkeep.
const { newSim } = require(__dirname + '/commitment-time.js');
const H = Number(process.env.H || 30000), WIN = 500;
const seeds = (process.env.SEEDS || '207,307,507,707,807,407,107,607').split(',').map(Number);
for (const seed of seeds) {
  const s = newSim(seed); let lastEvent = 0, pb = 0, pd = 0;
  while (s.tick < H) { s.step(); if (s.births !== pb || s.deaths !== pd) { lastEvent = s.tick; pb = s.births; pd = s.deaths; } }
  const st = s.stats(), live = s.orgs.filter(o => !o.dead);
  const share = new Map(); for (const o of live) share.set(o.keyStr, (share.get(o.keyStr) || 0) + 1);
  const exposed = new Map(); // keys with at least one member that has a free neighbour
  for (const o of live) if (s._neighbors(o.cell).some(c => s.grid[c] === -1)) exposed.set(o.keyStr, share.get(o.keyStr));
  const ex = [...exposed.values()], at18 = ex.filter(c => c === 18).length;
  const halted = H - lastEvent >= 1000;
  console.log(`${seed}: stable=${st.stableNiches} pop=${st.pop} ${halted ? 'HALTED at tick ' + lastEvent : 'still breathing (last birth/death at ' + lastEvent + ')'} | exposed keys ${ex.length}, at crowd=18: ${at18}, crowd range ${Math.min(...ex)}-${Math.max(...ex)}`);
}
