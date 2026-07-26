// UNBOUNDED — rival-hypothesis test. Two explanations for the same wall; only one can be primary.
//
// Jiggy relayed Grok's diagnosis, 2026-07-20: open-endedness needs unbounded genetic space,
// unlimited mutational pathways, and an environment that changes in response to the agents
// rather than a fixed fitness function.
//
// That is a DIFFERENT explanation from the one I measured tonight, and they conflict:
//   H_OUTSIDE (mine)  — closed systems stop discovering because no genuinely NEW EXTERNAL
//                       material arrives. Measured: a drip of 0.23% external births bought
//                       60% more of the space explored.
//   H_BOUNDED (Grok's) — they stop because the INTERIOR is capped. My genomes were capped at
//                       MAX_NODES=90 and my measurement space at 144 cells. My own /outside
//                       ceiling was ~120 of 144 — I flagged that as a caveat. Grok's claim is
//                       that it was not a caveat, it was the finding.
//
// Checking my setup against Grok's three ingredients honestly:
//   - coupled environment: I ALREADY HAVE IT. The familiarity field is changed by the agents
//     that live in it — that is why /hunger worked at all. Not the missing piece.
//   - unbounded genome / mutational pathways: I DO NOT have it. Entirely my own cap; the
//     mutation operator grafts fresh subtrees (mk(rng,2)) so genomes CAN grow without limit.
//
// THE TEST. Hold the system CLOSED — no outside injection, ever — and lift only the interior
// caps. If a closed-but-unbounded system keeps discovering, Grok is right and my "you need
// outside" was really "you need more room than I gave it". If it plateaus anyway, bounding
// was not the cause and external signal is the real limiting factor.
//
// Discovery is measured on a FINE grid (48x48 = 2304 regions) so the arena cannot be the
// ceiling this time. That was the flaw in /outside and I am not repeating it.
//
// PRE-REGISTERED, before running:
//   P1  genomes must actually GROW when uncapped. If mean complexity stays flat, the cap was
//       never binding, the manipulation did nothing, and the whole comparison is void.
//       This is the sanity check that decides whether the experiment is even valid.
//   P2  if H_BOUNDED: cumulative discovery rises with the cap, and the high-cap curve is STILL
//       CLIMBING at the end (measured as discoveries made in the final quarter of the run).
//   P3  if H_OUTSIDE: discovery plateaus at every cap. Bigger genomes buy a bigger plateau,
//       not a continuing climb. The tell is late-run discovery rate, not the final total.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '1200', 10);
const REPS = parseInt(process.argv[3] || '2', 10);

const POP = 70, RW = 20, RH = 14, T0 = 0;
const FINE = 48;                 // 48x48 = 2304 discoverable regions (was 144)
const FORGET = 0.90, SAT = 12;
const CAPS = [90, 300, 900];     // 90 = my original cap; 900 = effectively unbounded here

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }

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
const quality=(de,gm,cap)=>{
  const s=Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6);
  // thrift scales WITH the cap so it is the same relative pressure in every arm — otherwise
  // a fixed divisor would make big genomes disproportionately punished at high caps and I'd
  // be measuring my own penalty instead of the cap.
  return 0.85*s + 0.15*(1-Math.min(1,G.complexity(gm)/cap));
};
// coarse cell drives the surprise field (the coupled environment); FINE cell measures discovery
const coarseOf=d=>Math.min(11,(d[0]*12)|0)*12+Math.min(11,(d[1]*12)|0);
const fineOf=d=>Math.min(FINE-1,(d[0]*FINE)|0)*FINE+Math.min(FINE-1,(d[1]*FINE)|0);

function evolve(cap, seed){
  const r=rng(seed), NC=144, FAM=new Float32Array(NC);
  let pop=[], guard=0;
  while(pop.length<POP && guard++<4000){
    const gm=G.genome(r,(r()*1e9)|0); const de=describe(gm); if(dead(de)) continue;
    pop.push({gm,de,q:quality(de,gm,cap)});
  }
  const ever=new Set(); const trace=[]; let everAtThreeQuarters=0;
  for(let g=0;g<GENS;g++){
    const cnt=new Float32Array(NC); for(const o of pop) cnt[coarseOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    const fit=pop.map(o=>o.q*(0.15+0.85*Math.max(0,1-FAM[coarseOf(o.de.d)])));
    const order=fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total=fit.reduce((s,f)=>s+f,0);
    const pick=()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    const nKill=Math.max(1,Math.floor(POP*0.12)); const babies=[]; let tries=0;
    while(babies.length<nKill && tries++<nKill*30){
      const child=G.mutate(pick().gm,r);
      if(G.complexity(child)>cap) continue;              // THE ONLY MANIPULATION
      const de=describe(child); if(dead(de)) continue;
      babies.push({gm:child,de,q:quality(de,child,cap)});
    }
    for(let i=0;i<babies.length;i++) pop[order[i][1]]=babies[i];
    for(const o of pop) ever.add(fineOf(o.de.d));
    if(g===Math.floor(GENS*0.75)) everAtThreeQuarters=ever.size;
    if(g%300===0||g===GENS-1){
      const mc=pop.reduce((s,o)=>s+G.complexity(o.gm),0)/pop.length;
      trace.push([g, ever.size, Math.round(mc)]);
    }
  }
  const meanC=pop.reduce((s,o)=>s+G.complexity(o.gm),0)/pop.length;
  return { ever:ever.size, lateGain:ever.size-everAtThreeQuarters, meanC, trace };
}

const out={};
for(const cap of CAPS){
  out[cap]=[];
  for(let rep=0;rep<REPS;rep++){
    const o=evolve(cap, 13000+rep*61);
    out[cap].push(o);
    console.error(`cap=${cap} rep${rep} everFound ${o.ever} lateGain ${o.lateGain} meanComplexity ${o.meanC.toFixed(0)}  curve ${o.trace.map(t=>`${t[0]}:${t[1]}/c${t[2]}`).join(' ')}`);
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log(`\nUNBOUNDED: does lifting the INTERIOR cap keep a CLOSED system discovering? (${REPS} reps, ${GENS} gens, ${FINE}x${FINE} regions)`);
console.log('genome cap | ever discovered | discovered in final 25% | mean genome size');
for(const cap of CAPS){
  const e=mean(out[cap].map(o=>o.ever)), l=mean(out[cap].map(o=>o.lateGain)), c=mean(out[cap].map(o=>o.meanC));
  console.log(`${String(cap).padStart(10)} | ${e.toFixed(1).padStart(15)} | ${l.toFixed(1).padStart(23)} | ${c.toFixed(0)}`);
}
console.log('\nP1 sanity: if mean genome size does not rise with the cap, the cap never bound and this test is VOID.');
console.log('P2 Grok right: ever-discovered rises with cap AND final-25% gain stays high (still climbing).');
console.log('P3 outside right: plateaus at every cap — bigger genomes buy a bigger plateau, not a climb.');
