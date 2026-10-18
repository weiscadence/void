#!/usr/bin/env node
// MAINTENANCE test: seed a community that ALREADY has constructor-specialists of every type,
// then ask — does niche construction SUSTAIN coexistence a non-constructing control cannot?
// This is separate from invasion (niche-exp.js, which found the trait can't bootstrap). Same
// paired-seed discipline, same pre-registered MIN_EFFECT = 0.30 niches.
const { Niche } = require(__dirname + '/lib/niche.js');
const SEEDS = 8, TICKS = 3000, TAIL = 0.25, MIN_EFFECT = 0.30;
const REGIME = { resources: 4, window: 2, skew: 0.85, predation: false,
                 buildThresh: 3, buildCost: 3, buildP: 0.5, seedConstructors: true };
function run(seed, construct) {
  const sim = new Niche({ ...REGIME, seed: seed*1000+7, construct });
  const tail = TICKS*(1-TAIL); let eff=0,built=0,own=0,any=0,n=0,ex=false;
  for (let t=0;t<TICKS;t++){ sim.step(); if(sim.orgs.filter(o=>!o.dead).length===0){ex=true;break;}
    if(t>=tail){const s=sim.stats();eff+=s.effNiches;built+=s.builtFrac;own+=s.bornOnOwnBuiltFrac;any+=s.bornOnBuiltFrac;n++;} }
  n=n||1; return {eff:eff/n,built:built/n,own:own/n,any:any/n,builds:sim.builds,ex};
}
console.log(`niche construction — MAINTENANCE (seeded constructor community) | ${SEEDS}×${TICKS}t\n`);
console.log('seed | CTRL eff | TREAT eff |  Δeff | built% | bornOwn% bornAny% | note');
const diffs=[];
for(let s=0;s<SEEDS;s++){
  const c=run(s,false), t=run(s,true), d=t.eff-c.eff; diffs.push(d);
  console.log(`  ${s}  |   ${c.eff.toFixed(2)}   |    ${t.eff.toFixed(2)}   | ${(d>=0?'+':'')}${d.toFixed(2)} |  ${(t.built*100).toFixed(0).padStart(2)}%   |   ${(t.own*100).toFixed(0).padStart(2)}%    ${(t.any*100).toFixed(0).padStart(2)}%   | ${c.ex?'C-ext ':''}${t.ex?'T-ext':''}`);
}
const mean=diffs.reduce((a,b)=>a+b,0)/diffs.length;
const sd=Math.sqrt(diffs.reduce((a,b)=>a+(b-mean)**2,0)/diffs.length);
const nPos=diffs.filter(d=>d>0).length;
console.log(`\nmean Δeff = ${mean>=0?'+':''}${mean.toFixed(3)} | SD ${sd.toFixed(3)} | positive ${nPos}/${SEEDS}`);
console.log('\n── VERDICT (pre-registered: mean Δ >= 0.30, positive >=6/8, mean > 2×SD) ──');
if(mean>=MIN_EFFECT && nPos>=6 && mean>2*sd)
  console.log(`SUPPORTED: an established constructor community sustains +${mean.toFixed(2)} more coexisting\n  niches than a non-constructing control. The mechanism WORKS once present — it just can't invade.`);
else
  console.log(`NOT SUPPORTED: mean Δ ${mean>=0?'+':''}${mean.toFixed(2)} (need >=${MIN_EFFECT}), positive ${nPos}/8, vs 2×SD ${(2*sd).toFixed(2)}.`);
