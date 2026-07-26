// NEED — do parts get kept when they are load-bearing?
//
// Jiggy, 2026-07-20: "people or animals keep stuff because they NEED the evolution to survive."
// That sentence diagnoses why compose.js returned a null. In that experiment a lineage could
// lift a sub-structure into a library and splice it into descendants — but keeping a part cost
// nothing and conferred nothing. It floated free of survival. So evolution dropped it: average
// library size stayed 1.2-1.7 of 6 slots across 1,200 generations while 28% of children were
// still using parts. Reuse was AVAILABLE. It was never NEEDED.
//
// A foothold nothing stands on is not a foothold, it is litter.
//
// He also asked whether more GPU / speed would force evolution along. Answering here because
// the experiment is the answer: speed is a QUANTITY knob. Every quantity knob tried this week
// (more archive room, a 4th axis, bigger genomes, more external signal) moved nothing or moved
// within noise. Running the same search faster cannot manufacture a level that the
// representation makes unreachable. So no compute is added here. The manipulation is structural.
//
// THE MECHANISM — dependency, not a reward-for-reuse fudge.
//   Every library part carries an AGE. A part that survives in a lineage matures. A matured
//   part that a child actually uses makes that child CHEAPER TO BUILD: its effective complexity
//   is discounted in proportion to the part's maturity. So a lineage that holds a proven part
//   and builds on it pays less than one that keeps reinventing from scratch — and a lineage
//   that loses the part pays full price again. That is what "needing" a part means mechanically:
//   losing it hurts.
//   Crucially the reward is NOT "you used a module, have points". It is a cost structure, the
//   way a real organ is: you do not get fitness for having a heart, you pay enormously for
//   losing one. I have been burned once tonight by hand-coding the conclusion (the frequency
//   -dependence penalty), so this is deliberately a price, not a prize.
//
//   FREE   — control. Exactly compose.js: parts available, keeping them costs and gives nothing.
//   NEEDED — the same, plus maturity discount. Only difference.
//
// PRE-REGISTERED, before running:
//   P1 (validity): NEEDED libraries must FILL and PERSIST — average library clearly above the
//      FREE arm's ~1.5. If libraries stay empty the mechanism did not engage and this is VOID.
//   P2 (the hope): retention is the lever — discovery rises in NEEDED.
//   P3 (the real possibility): libraries fill, parts persist, AND DISCOVERY STAYS FLAT. That
//      would mean composition is not the discovery lever even once retention is solved, and
//      four nights of "composability is the missing ingredient" is wrong. I am not pre-judging
//      between P2 and P3 and will report whichever lands.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '1200', 10);
const REPS = parseInt(process.argv[3] || '2', 10);

const POP=70, RW=20, RH=14, T0=0, FINE=48, FORGET=0.90, SAT=12, CAP=260;
const LIB_MAX=6, P_ABSTRACT=0.25, P_REUSE=0.5;
// BOOTSTRAP FIX (found by the first smoke test, and the finding is worth more than the fix).
// With MATURE_AT=40 the libraries never filled: average 0.5 parts, oldest part ONE generation.
// A part cannot become load-bearing until it has been kept, and nothing keeps it until it is
// load-bearing — the same fixed-point trap aria_between described for cold-start ecologies.
// Worse, in the control, splicing a part makes the genome BIGGER, which the thrift term
// punishes, so using a part was actively costly and dependency could never get off the ground.
// So: a part pays off immediately (a floor) and matures fast. If dependency needs a subsidy to
// exist at all, that is itself a result about how levels get started.
const MATURE_AT=6;         // generations to fully mature (was 40 — nothing survived that long)
const DISCOUNT_FLOOR=0.35; // a brand-new used part is already this fraction of the way to full
const MAX_DISCOUNT=0.55;   // a fully matured, used part makes a child up to 55% cheaper

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }
function allNodes(n,acc){ acc.push(n); if(n.kids) for(const k of n.kids) allNodes(k,acc); return acc; }
function pickSub(n,r){ const a=allNodes(n,[]); return a[(r()*a.length)|0]; }
function spliceRandom(root,repl,r){
  const nodes=allNodes(root,[]); const target=nodes[(r()*nodes.length)|0]; let done=false;
  const rec=n=>{ if(n===target&&!done){ done=true; return G.clone(repl); }
    if(n.t==='f') return {t:'f',f:n.f,kids:n.kids.map(rec)}; return G.clone(n); };
  return rec(root);
}
function describe(gm){
  let sumL=0,sumS=0,sqL=0,edge=0,n=0; const lum=new Float32Array(RW*RH);
  for(let py=0;py<RH;py++){ const y=(py/RH)*2-1;
    for(let px=0;px<RW;px++){ const x=(px/RW)*2-1;
      const rgb=G.hsv(G.ev(gm.h,x,y,T0,gm.seed),G.ev(gm.s,x,y,T0,gm.seed),G.ev(gm.v,x,y,T0,gm.seed));
      const L=(rgb[0]+rgb[1]+rgb[2])/3;
      const st=1-(Math.min(rgb[0],rgb[1],rgb[2])/(Math.max(rgb[0],rgb[1],rgb[2])+1e-6));
      lum[py*RW+px]=L; sumL+=L; sqL+=L*L; sumS+=st; n++; } }
  for(let py=0;py<RH;py++) for(let px=0;px<RW-1;px++){
    edge+=Math.abs(lum[py*RW+px]-lum[py*RW+px+1]);
    if(py<RH-1) edge+=Math.abs(lum[py*RW+px]-lum[(py+1)*RW+px]); }
  const meanL=sumL/n, varL=sqL/n-meanL*meanL;
  return { d:[Math.min(0.9999,edge/(n*120)), Math.min(0.9999,sumS/n)], varL };
}
const dead=de=>de.varL<260||de.varL>16000;
// quality takes EFFECTIVE complexity: a matured, used part is partly free tissue.
const quality=(de,effC)=>{ const s=Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6);
  return 0.85*s + 0.15*(1-Math.min(1,effC/CAP)); };
const coarseOf=d=>Math.min(11,(d[0]*12)|0)*12+Math.min(11,(d[1]*12)|0);
const fineOf=d=>Math.min(FINE-1,(d[0]*FINE)|0)*FINE+Math.min(FINE-1,(d[1]*FINE)|0);

function makeChild(parent, mode, r){
  let gm=G.mutate(parent.gm,r);
  // library is heritable; ages advance so parts that survive in a lineage mature
  let lib=(parent.lib||[]).map(m=>({tree:m.tree, ch:m.ch, age:m.age+1}));
  let usedMaturity=0, used=false;
  if(r()<P_ABSTRACT){
    const ch=['h','s','v'][(r()*3)|0]; const sub=pickSub(gm[ch],r);
    if(G.size(sub)>=3&&G.size(sub)<=40){ lib.push({tree:G.clone(sub),ch,age:0}); if(lib.length>LIB_MAX) lib.shift(); }
  }
  if(lib.length&&r()<P_REUSE){
    const m=lib[(r()*lib.length)|0];
    gm={...gm,[m.ch]:spliceRandom(gm[m.ch],m.tree,r)};
    used=true;
    usedMaturity=Math.min(1, DISCOUNT_FLOOR + (1-DISCOUNT_FLOOR)*(m.age/MATURE_AT));
  }
  const raw=G.complexity(gm);
  // THE ONLY DIFFERENCE BETWEEN ARMS
  const effC = (mode==='needed' && used) ? raw*(1 - MAX_DISCOUNT*usedMaturity) : raw;
  return {gm, lib, used, effC, raw};
}

function evolve(mode, seed){
  const r=rng(seed), NC=144, FAM=new Float32Array(NC);
  let pop=[], guard=0;
  while(pop.length<POP&&guard++<4000){
    const gm=G.genome(r,(r()*1e9)|0); const de=describe(gm); if(dead(de)) continue;
    pop.push({gm,lib:[],de,q:quality(de,G.complexity(gm)),born:0});
  }
  const ever=new Set(); const trace=[]; let everAt75=0, births=0, reuse=0;
  for(let g=0;g<GENS;g++){
    const cnt=new Float32Array(NC); for(const o of pop) cnt[coarseOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    const fit=pop.map(o=>o.q*(0.15+0.85*Math.max(0,1-FAM[coarseOf(o.de.d)])));
    const order=fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total=fit.reduce((s,f)=>s+f,0);
    const pick=()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    const nKill=Math.max(1,Math.floor(POP*0.12)); const babies=[]; let tries=0;
    while(babies.length<nKill&&tries++<nKill*30){
      const c=makeChild(pick(),mode,r);
      if(c.raw>CAP) continue;                       // real size cap identical in both arms
      const de=describe(c.gm); if(dead(de)) continue;
      births++; if(c.used) reuse++;
      babies.push({gm:c.gm, lib:c.lib, de, q:quality(de,c.effC), born:g});
    }
    for(let i=0;i<babies.length;i++) pop[order[i][1]]=babies[i];
    for(const o of pop) ever.add(fineOf(o.de.d));
    if(g===Math.floor(GENS*0.75)) everAt75=ever.size;
    if(g%300===0||g===GENS-1){
      const al=pop.reduce((s,o)=>s+(o.lib?o.lib.length:0),0)/pop.length;
      const ma=pop.reduce((s,o)=>s+(o.lib&&o.lib.length?Math.max(...o.lib.map(m=>m.age)):0),0)/pop.length;
      trace.push([g, ever.size, +al.toFixed(1), Math.round(ma)]);
    }
  }
  const depths=pop.map(o=>o.gm.gen||0).sort((a,b)=>a-b);
  const md=depths[Math.floor(depths.length/2)];
  console.error(`   [${mode}] TRUE DESCENT: median ${md} ancestors deep, max ${depths[depths.length-1]}, after ${GENS} ticks -> ${(GENS/Math.max(1,md)).toFixed(0)} ticks per real generation`);
  const ages=pop.map(o=>GENS-o.born).sort((a,b)=>b-a);
  const founders=pop.filter(o=>o.born===0).length;
  console.error(`   [${mode}] incumbency: ${founders}/${pop.length} are ORIGINAL founders | median age ${ages[Math.floor(ages.length/2)]} gens | oldest ${ages[0]}`);
  const avgLib=pop.reduce((s,o)=>s+(o.lib?o.lib.length:0),0)/pop.length;
  const oldest=pop.reduce((s,o)=>s+(o.lib&&o.lib.length?Math.max(...o.lib.map(m=>m.age)):0),0)/pop.length;
  return { ever:ever.size, lateGain:ever.size-everAt75, avgLib, oldest, reuseFrac:births?reuse/births:0, trace };
}

const out={free:[],needed:[]};
for(let rep=0;rep<REPS;rep++){
  for(const mode of ['free','needed']){
    const o=evolve(mode, 17000+rep*71);
    out[mode].push(o);
    console.error(`${mode.padEnd(7)} rep${rep} ever ${o.ever} lateGain ${o.lateGain} avgLib ${o.avgLib.toFixed(1)} oldestPart ${o.oldest.toFixed(0)}g reuse ${o.reuseFrac.toFixed(2)}  curve ${o.trace.map(t=>`${t[0]}:${t[1]}/lib${t[2]}/age${t[3]}`).join(' ')}`);
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log(`\nNEED: do parts get kept when losing them costs something? (${REPS} reps, ${GENS} gens)`);
console.log('arm     | ever discovered | final-25% gain | avg library | oldest part (gens)');
for(const m of ['free','needed']){
  console.log(`${m.padEnd(7)} | ${mean(out[m].map(o=>o.ever)).toFixed(1).padStart(15)} | ${mean(out[m].map(o=>o.lateGain)).toFixed(1).padStart(14)} | ${mean(out[m].map(o=>o.avgLib)).toFixed(2).padStart(11)} | ${mean(out[m].map(o=>o.oldest)).toFixed(0)}`);
}
console.log('\nP1 VALID only if needed avgLib clearly > free avgLib (retention actually engaged).');
console.log('P2 retention is the lever: needed discovery > free.');
console.log('P3 parts persist but discovery flat => composition is NOT the discovery lever. Real answer.');
