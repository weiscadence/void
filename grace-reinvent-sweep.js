// grace-reinvent-sweep.js — is the re-invention null real, or rigged by orphanGrace=0?
// energetic-exp.js runs orphanGrace=0: a knocked-out branch's orphans get ZERO food while
// stranded, so they die before evolution can invent a replacement bridge → re-invention is
// impossible BY CONSTRUCTION, not by result. This sweeps orphanGrace to answer: can re-invention
// EVER fire in this substrate? If it stays 0/N even at high grace, the "food web" negative is real.
// If it fires at grace>0, then re-invention is POSSIBLE and the legitimate question becomes whether
// hardiness can EVOLVE that survivability (evolve-hardiness-exp.js) rather than me hand-setting it.
// NOTE: hand-set grace is a DESIGNER knob (Grok hole #3). This sweep is a MECHANISTIC possibility
// probe, not the final claim. Pre-registered: re-invention = subtree occ drops <40% then recovers
// >70% of pre-knockout within 600 ticks.
'use strict';
const { Graph } = require('./lib/graph.js');
function settle(g, n){ for(let i=0;i<n;i++) g.step(); }
function popSlope(g,win){ const xs=[]; for(let i=0;i<win;i++){settle(g,10);xs.push(g.stats().pop);} return +(xs[xs.length-1]-xs[0]).toFixed(1); }

function trial(seed, grace){
  const g = new Graph({ seed, roots:4, seedPerRoot:14, construct:true, regulate:true,
    transfer:0.35, basal:50, stockMax:120, nodeCap:16, maxNodes:400,
    energetic:true, resourceMode:false, regen:50, orphanGrace:grace });
  settle(g,1500);
  // pick deepest mid-chain niche with occupied descendants
  let mid=null,best=0;
  for(const nd of g.nodes.values()){ if(nd.depth<1) continue; const sub=g.subtree(nd.id);
    const above=g.occIn(sub)-g.occIn(new Set([nd.id])); if(sub.size>best&&above>0){mid=nd;best=sub.size;} }
  if(!mid) return {ok:false,why:'no mid-chain'};
  const above=new Set([...g.subtree(mid.id)].filter(id=>id!==mid.id));
  const occ0=g.occIn(above); if(occ0===0) return {ok:false,why:'no occ descendants'};
  g.knockout(mid.id,{blockReq:true});
  let minOcc=occ0, reinv=-1;
  for(let t=1;t<=600;t++){ g.step(); if(t%20===0){ const o=g.occIn(above); minOcc=Math.min(minOcc,o);
    if(minOcc<occ0*0.4 && o>occ0*0.7 && reinv<0) reinv=t; } }
  return {ok:true, occ0, minOcc, occEnd:g.occIn(above),
    collapse:+(100*(1-minOcc/occ0)).toFixed(0), reinvented:reinv>0, reinvTick:reinv, maxDepth:g.stats().maxDepth};
}

const graces=[0,0.25,0.5,0.75,1.0], seeds=[1,2];
console.log('grace | seed | maxDepth | collapse% | re-invented');
const summ={};
for(const gr of graces){ summ[gr]={reinv:0,n:0,coll:[]};
  for(const s of seeds){ const r=trial(s,gr);
    if(!r.ok){ console.log(`${gr.toFixed(2)}  | ${s} | SKIP ${r.why}`); continue; }
    summ[gr].n++; if(r.reinvented) summ[gr].reinv++; summ[gr].coll.push(r.collapse);
    console.log(`${gr.toFixed(2)}  |  ${s}  |    ${r.maxDepth}     |   ${r.collapse}%    | ${r.reinvented?'YES @'+r.reinvTick:'no'}`);
  }
}
console.log('\n--- SUMMARY (energetic, transfer 0.35) ---');
for(const gr of graces){ const s=summ[gr]; if(!s.n) continue;
  console.log(`grace ${gr.toFixed(2)}: re-invention ${s.reinv}/${s.n}, mean collapse ${(s.coll.reduce((a,b)=>a+b,0)/s.coll.length).toFixed(0)}%`); }
console.log('\nRead: if re-invention stays 0/N across ALL grace, the food-web negative is real.');
console.log('If it fires at grace>0, re-invention is POSSIBLE; legit next test = can hardiness EVOLVE it (not hand-set).');
