// AFTER CASSINI (2026-07-24): the complexity metric is drift-inflated, so re-test the flow story with a
// DRIFT-ROBUST lens — cumulative EARNED stable niches C (keys held continuously >= STABLE_AGE) and its
// DYNAMICS. Drift can inflate a LEVEL but can't keep EARNING: a no-selection shadow saturates its
// reachable stable set then freezes; genuine open-endedness keeps accruing new earned niches. So the
// test isn't "who has more C" (drift wins on volume) — it's "whose C keeps RISING while the other freezes".
// If selection+flow keeps rising and its shadow freezes, the flow story survives on a metric drift can't fake.
'use strict';
const { Open } = require('./lib/open.js');
const TICKS = 30000, EPOCH = 6000, SEEDS = [1, 2];
const FLOW = { construct:true, stableAge:400, conserveEnergy:true, dissipate:true, influx:400, energyPool:2000 };
const INF  = { construct:true, stableAge:400 };
function runOne(opts, seed){
  const sim=new Open({seed:seed*100+7,...opts}); if(opts.conserveEnergy) sim.pool=opts.energyPool;
  const ep=Math.ceil(TICKS/EPOCH), C=Array(ep).fill(0), pop=Array(ep).fill(0); const ever=new Set();
  for(let t=1;t<=TICKS;t++){ sim.step(); if(sim.orgs.filter(o=>!o.dead).length===0) break;
    for(const [k,r] of sim.keySince) if(sim.tick-r.since>=sim.STABLE_AGE) ever.add(k);
    if(t%EPOCH===0){const i=t/EPOCH-1; C[i]=ever.size; pop[i]=sim.stats().pop;} }
  return {C,pop};
}
function avg(rs,f){const n=rs[0][f].length;return Array.from({length:n},(_,i)=>+(rs.reduce((s,r)=>s+(r[f][i]||0),0)/rs.length).toFixed(1));}
function arm(o){const rs=SEEDS.map(s=>runOne(o,s));return{C:avg(rs,'C'),pop:avg(rs,'pop')};}
const arms={ 'flow400 ON':arm({...FLOW,tol:2}), 'flow400 shadow':arm({...FLOW,tol:999}),
             'infinite ON':arm({...INF,tol:2}), 'infinite shadow':arm({...INF,tol:999}) };
const ep=Math.ceil(TICKS/EPOCH), ends=Array.from({length:ep},(_,i)=>(i+1)*EPOCH);
console.log('DRIFT-ROBUST RE-TEST — cumulative EARNED stable niches C. Does selected C keep RISING while its shadow FREEZES?\n');
for(const [lab,a] of Object.entries(arms)){ console.log(lab.padEnd(16), '| C:', a.C.join(' -> '), '| pop', a.pop[ep-1]); }
const half=Math.floor(ep/2), slope=a=>+((a.C[ep-1]-a.C[half])/(ep-1-half)).toFixed(1);
console.log('\n--- back-half slope of C (new earned niches / epoch) ---');
for(const [lab,a] of Object.entries(arms)) console.log(lab.padEnd(16), slope(a));
const fON=arms['flow400 ON'], fSH=arms['flow400 shadow'];
const survives = slope(fON) > 0.5 && slope(fON) > slope(fSH)*1.3;
console.log('\nverdict:', survives ? 'FLOW STORY SURVIVES on earned-coexistence dynamics (selected keeps earning, shadow does not)' : 'DOES NOT survive — selected C does not out-rise drift; the throughput finding is not established on a drift-robust metric either. Honest retraction.');
