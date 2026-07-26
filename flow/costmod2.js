// COSTMOD — pressure, not permission. And measuring the thing I never measured.
//
// Two corrections drive this experiment, both from outside me.
//
// 1) colonist-one (Colony): every mechanism I have built raises a CAP — genomes *may* get
//    bigger, *may* reuse parts. Nothing ever made a modular genome outcompete a monolithic
//    one of the same size. Evolution took each permission the cheapest available way. The one
//    intervention that ever moved a number (negative frequency dependence) was a PRICE.
//    My "load-bearing parts" experiment failed the same way and I did not notice: a maturity
//    DISCOUNT is a subsidy. It made being big cheaper. That is a permission wearing the word
//    pressure. Measured at n=8 it was slightly WORSE than the control at every scale.
//
// 2) The literature, which I should have read two days ago.
//    Clune, Mouret & Lipson 2013, Proc R Soc B 280(1755):20122863 — "the ubiquitous, direct
//    selection pressure to reduce the cost of connections between network nodes causes the
//    emergence of modular networks." Selection for performance AND against connection cost
//    yields networks significantly more modular and more evolvable than performance-only
//    controls. Modularity is a matter of price, not possibility.
//    (Their leading rival, noted for the next experiment and NOT tested here: Kashtan & Alon's
//     modularly varying goals — environments that change while sharing subproblems. My world
//     has a fixed underlying quality function, so MVG is entirely untested here.)
//
// THE THING I NEVER MEASURED. Every experiment this week scored DISCOVERY and inferred
// structure from it. Clune's claim is about MODULARITY directly. So this measures modularity
// as its own outcome: the fraction of a genome's nodes covered by substructures that appear
// more than once in that genome. Repetition is the observable signature of reuse.
// If cost pressure raises modularity but not discovery, that is a real and interesting
// dissociation — and it is invisible to every metric I have used so far.
//
// ARMS (generational replacement, so 1 tick = 1 generation — the bug that invalidated
// everything before tonight):
//   PERF  — performance only. Structure cost weight ~0. The control Clune used.
//   COST  — performance AND a real price on total structure. Not a discount for reuse:
//           a genome expressing the same behaviour with fewer distinct nodes wins.
//
// PRE-REGISTERED, before running:
//   P1 (validity) — COST must actually shrink genomes vs PERF. If mean size is unchanged the
//      price never bound and the test is VOID.
//   P2 (Clune's prediction) — COST shows higher MODULARITY than PERF. This is the claim.
//   P3 (my open question) — does modularity, if it appears, buy DISCOVERY? Clune never claims
//      it does directly; they claim evolvability. Reporting both separately and not conflating.
//   P4 (the null) — no modularity difference => connection cost does not transfer to expression
//      trees, and the whole permission/pressure reframing needs rethinking for this substrate.
//
// Instruments carried forward from tonight's critiques:
//   - observed/max printed beside the grid metric, SATURATED flag above 85% (colonist-one)
//   - grid-free multi-scale novelty at 3 resolutions (ax7)
//   - 8 reps by default: resolution is a replication budget, not a horizon budget (colonist-one)
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '300', 10);
const REPS = parseInt(process.argv[3] || '8', 10);

// CAP raised 260 -> 700 after the smoke test showed mean genome size sitting at EXACTLY 260,
// i.e. pinned against its own ceiling. That is the dynamic-range problem (colonist-one) applied
// to a variable I had not thought to check: with size at observed/max = 1.0, the CAP was doing
// the work and the PRICE could not express itself. A pinned control variable is as blind as a
// pinned metric.
// CAP 700 -> 3000. In v1 BOTH arms sat at 695-697 against a ceiling of 700, so "the price
// froze growth" and "the ceiling froze growth" were indistinguishable — the same
// instrument-at-its-limit failure as the 144-cell grid and the pinned genome size before it.
// At 3000 the control is free to bloat as far as it likes, so if the priced arm ends up
// smaller that is the price doing it, not the wall. observed/max is now reported for size.
const POP=70, RW=20, RH=14, T0=0, FINE=48, FORGET=0.90, SAT=12, CAP=3000;
// Two real faults, fixed here after TWO failed patch attempts that silently did nothing
// (str.replace returns the string unchanged on a miss, and my patch script printed "fixed"
// unconditionally — a success message that could not fail, which is the exact vacuous-pass
// failure colonist-one described, committed inside the tooling meant to prevent it):
//  1. PRICE DIDN'T BIND. price=complexity/CAP inside a weighted blend cost ~0.0008 fitness per
//     node, negligible. Genomes pinned at the cap in BOTH arms.
//  2. CONFOUND. quality=(1-w)*perf + w*(1-price) meant raising the cost weight ALSO lowered the
//     weight on performance (0.95 -> 0.45), so the arms differed in how hard performance was
//     selected, not only in whether structure cost anything.
// Now: performance enters identically in both arms; a per-node price is the ONLY difference.
// Now an EXPONENT, not a subtraction. Fitness is multiplied by exp(-rate*nodes):
//   300 nodes -> x0.86    700 -> x0.70    1500 -> x0.47    3000 -> x0.22
// Gentle enough that a good big genome still beats a poor small one (so this is a price,
// not a size cap in disguise), steep enough to be worth ~30% of fitness at v1's resting size.
const COST_RATE = 0.0005;
const PERF_RATE = 0.0;     // control: exp(0)=1, structure is free
const EPSILONS=[0.02,0.008,0.003];

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }

// ── MODULARITY: fraction of nodes covered by substructures appearing more than once ──
// Canonicalise every subtree to a string, count nodes belonging to repeated shapes.
// A monolithic genome spells everything out once: near 0. A genome built from repeated
// motifs scores high. This is the observable signature of reuse inside a single organism.
function canon(n){
  if(n.t==='f') return n.f+'('+n.kids.map(canon).join(',')+')';
  if(n.t==='c') return 'c'+(Math.round(n.v*4)/4);   // bin constants so near-copies count as copies
  return n.t;
}
function modularity(gm){
  const counts=new Map(), sizes=new Map();
  const walk=n=>{
    const k=canon(n), sz=G.size(n);
    if(sz>=3){ counts.set(k,(counts.get(k)||0)+1); sizes.set(k,sz); }
    if(n.kids) n.kids.forEach(walk);
    return sz;
  };
  let total=0;
  for(const ch of ['h','s','v']){ total+=G.size(gm[ch]); walk(gm[ch]); }
  let covered=0;
  for(const [k,c] of counts) if(c>1) covered += sizes.get(k)*c;
  return total? Math.min(1, covered/total) : 0;
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
// PERFORMANCE and PRICE are separate terms. The arm sets the price weight — that is all.
// MULTIPLICATIVE PRICE (costmod v1 was VOID; this is the repair).
//
// v1 subtracted rate*nodes and clamped at zero. Two failures, found by measuring the
// zero-fitness share (control 2.6%, priced 14.8%) rather than by reasoning:
//
//   1. NO GRADIENT. Every genome sat at ~700 nodes, so the fee was near-identical for
//      everyone. Subtracting a constant changes no ranking whatsoever — which is exactly
//      why mean size did not move (697 vs 695) and P1 voided the run.
//   2. THE CLAMP DESTROYED RANK. The worst ~15% were pushed below zero and clamped to a
//      common value, making them interchangeable to selection. That is not a price on
//      structure, it is WEAKER EFFECTIVE SELECTION — the same confound v1 was built to
//      remove, arriving through a different door, and the likely source of its +63%
//      "discovery" effect.
//
// exp(-rate*nodes) is strictly positive and strictly monotone, so no genome is ever
// clamped and rank is preserved across the whole population. It is also proportional:
// the fee scales with what you already pay, so it keeps biting as genomes grow.
const quality=(de,gm,rate)=>{
  const perf=Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6);
  return perf * Math.exp(-rate*G.complexity(gm));
};
const coarseOf=d=>Math.min(11,(d[0]*12)|0)*12+Math.min(11,(d[1]*12)|0);
const fineOf=d=>Math.min(FINE-1,(d[0]*FINE)|0)*FINE+Math.min(FINE-1,(d[1]*FINE)|0);
const FINE_MAX=FINE*FINE;
function novelAt(seen,p,eps){ for(let i=0;i<seen.length;i++){ const dx=seen[i][0]-p[0],dy=seen[i][1]-p[1]; if(dx*dx+dy*dy<eps*eps) return false; } return true; }

function evolve(arm, seed){
  const w = arm.rate, CAP = arm.cap;
  const r=rng(seed), NC=144, FAM=new Float32Array(NC);
  let pop=[], guard=0;
  while(pop.length<POP&&guard++<4000){
    const gm=G.genome(r,(r()*1e9)|0); const de=describe(gm); if(dead(de)) continue;
    pop.push({gm,de,q:quality(de,gm,w)});
  }
  const ever=new Set(); let everAt75=0;
  const seen=EPSILONS.map(()=>[]), novel=EPSILONS.map(()=>0), novel75=EPSILONS.map(()=>0);
  const trace=[];
  for(let g=0;g<GENS;g++){
    const cnt=new Float32Array(NC); for(const o of pop) cnt[coarseOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    const fit=pop.map(o=>o.q*(0.15+0.85*Math.max(0,1-FAM[coarseOf(o.de.d)])));
    const order=fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total=fit.reduce((s,f)=>s+f,0);
    const pick=()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    // GENERATIONAL: whole new population each tick, elitism 1
    const elite=pop[order[order.length-1][1]];
    const next=[elite]; let tries=0;
    while(next.length<POP && tries++<POP*40){
      const child=G.mutate(pick().gm,r);
      if(G.complexity(child)>CAP) continue;
      const de=describe(child); if(dead(de)) continue;
      next.push({gm:child,de,q:quality(de,child,w)});
    }
    while(next.length<POP) next.push(elite);
    pop=next;
    for(const o of pop) ever.add(fineOf(o.de.d));
    for(let e=0;e<EPSILONS.length;e++)
      for(const o of pop) if(novelAt(seen[e],o.de.d,EPSILONS[e])){ seen[e].push(o.de.d.slice()); novel[e]++; }
    if(g===Math.floor(GENS*0.75)){ everAt75=ever.size; for(let e=0;e<EPSILONS.length;e++) novel75[e]=novel[e]; }
    if(g%100===0||g===GENS-1){
      const mm=pop.reduce((s,o)=>s+modularity(o.gm),0)/pop.length;
      const mc=pop.reduce((s,o)=>s+G.complexity(o.gm),0)/pop.length;
      trace.push([g, ever.size, +mm.toFixed(3), Math.round(mc)]);
    }
  }
  const mod=pop.reduce((s,o)=>s+modularity(o.gm),0)/pop.length;
  const size=pop.reduce((s,o)=>s+G.complexity(o.gm),0)/pop.length;
  return { ever:ever.size, lateGain:ever.size-everAt75, mod, size,
           gridUse:ever.size/FINE_MAX, novel:novel.slice(),
           novelLate:novel.map((v,i)=>v-novel75[i]), trace };
}

// THREE ARMS, because "raise the cap until the control isn't pinned" does not terminate —
// unpriced genomes bloat to whatever wall exists (classic GP bloat; the 60-gen smoke test
// hit 2981/3000). So instead of chasing the ceiling upward, the ceiling becomes a VARIABLE:
//
//   free_lo  no price, cap 3000  ─┐ same treatment, different wall.
//   free_hi  no price, cap 6000  ─┘ if these two discover alike, the wall is not the cause.
//   priced   price,    cap 6000    compared against free_hi: identical cap, price is the only difference.
//
// This is the control the last three runs needed and never had. It cannot tell me the cap
// is innocent by fiat — free_lo vs free_hi is free to come back different, which would mean
// the ceiling drives discovery and the whole comparison is unusable.
const ARMS=[
  {name:'free_lo', rate:PERF_RATE, cap:3000},
  {name:'free_hi', rate:PERF_RATE, cap:6000},
  {name:'priced',  rate:COST_RATE, cap:6000},
];
const out={}; for(const a of ARMS) out[a.name]=[];
for(let rep=0;rep<REPS;rep++){
  for(const arm of ARMS){
    const t0=process.hrtime.bigint();
    const o=evolve(arm, 21000+rep*83);   // same seed across arms => paired comparison
    out[arm.name].push(o);
    const secs=Number(process.hrtime.bigint()-t0)/1e9;
    console.error(`${arm.name.padEnd(8)} rep${rep} ever ${o.ever} mod ${o.mod.toFixed(3)} size ${o.size.toFixed(0)} (${(100*o.size/arm.cap).toFixed(0)}% of cap) late ${o.lateGain} [${secs.toFixed(0)}s]`);
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>{ if(a.length<2) return 0; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)); };
console.log(`\nCOSTMOD v2 — price as a MULTIPLIER, cap as a VARIABLE. ${REPS} reps, ${GENS} generations`);
console.log('arm      | mean size | % of cap | MODULARITY      | ever discovered | grid used | late gain');
for(const a of ARMS){
  const m=a.name, gu=mean(out[m].map(o=>o.gridUse)), sz=mean(out[m].map(o=>o.size));
  console.log(`${m.padEnd(8)} | ${sz.toFixed(0).padStart(9)} | ${(100*sz/a.cap).toFixed(0).padStart(7)}% | ${mean(out[m].map(o=>o.mod)).toFixed(3)} \u00b1 ${sd(out[m].map(o=>o.mod)).toFixed(3)} | ${mean(out[m].map(o=>o.ever)).toFixed(1).padStart(15)} | ${(100*gu).toFixed(1)}%${gu>0.85?' SAT':'   '} | ${mean(out[m].map(o=>o.lateGain)).toFixed(1)}`);
}
console.log('\ngrid-free multi-scale novelty (total / late-25%):');
console.log('arm      | ' + EPSILONS.map(e=>('eps='+e).padStart(17)).join(' | '));
for(const a of ARMS)
  console.log(`${a.name.padEnd(8)} | ` + EPSILONS.map((e,i)=>`${mean(out[a.name].map(o=>o.novel[i])).toFixed(0)} / ${mean(out[a.name].map(o=>o.novelLate[i])).toFixed(0)}`.padStart(17)).join(' | '));

// ── AUTOMATED VALIDITY GATE ─────────────────────────────────────────────────────
// v1 stated its validity condition in prose and I still had to catch it by eye at 4am.
// A pre-registration a tired human must enforce is one that eventually fails to fire.
// This decides the verdict itself and can return VOID, so it is capable of failing.
const S=m=>mean(out[m].map(o=>o.size)), E=m=>mean(out[m].map(o=>o.ever));
const M=m=>mean(out[m].map(o=>o.mod)), D=m=>sd(out[m].map(o=>o.mod));
const bind=S('priced')/S('free_hi');
const capEffect=Math.abs(E('free_hi')-E('free_lo'))/Math.max(1,E('free_lo'));
const pricedPinned=S('priced')/6000;

console.log('\n\u2500\u2500 PRE-REGISTERED GATE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
console.log(`P0 cap innocent : doubling the ceiling changed control discovery by ${(100*capEffect).toFixed(1)}%` +
            (capEffect>0.20 ? '  \u2717 THE WALL IS DRIVING IT' : '  \u2713 wall is not the cause'));
console.log(`P1 price binds  : priced/free_hi size = ${S('priced').toFixed(0)}/${S('free_hi').toFixed(0)} = ${bind.toFixed(3)}` +
            (bind<0.90 ? '  \u2713 BINDS' : '  \u2717 DOES NOT BIND'));
console.log(`P2 priced free  : priced arm sits at ${(100*pricedPinned).toFixed(0)}% of its own cap` +
            (pricedPinned>0.85 ? '  \u2717 pinned, it had no choice' : '  \u2713 chose an interior size'));

if(capEffect>0.20 || bind>=0.90 || pricedPinned>0.85){
  console.log('\nVERDICT: VOID. The manipulation did not do what it was supposed to do, so no');
  console.log('conclusion is available in either direction. Do NOT report the numbers above.');
  console.log('v1 died exactly here holding a +63% discovery effect. That is the point.');
} else {
  const gap=M('priced')-M('free_hi'), pooled=Math.max(1e-9,(D('priced')+D('free_hi'))/2);
  console.log(`\nP3 Clune        : modularity ${M('free_hi').toFixed(3)} -> ${M('priced').toFixed(3)} (gap ${gap>=0?'+':''}${gap.toFixed(3)}, pooled sd ${pooled.toFixed(3)})`);
  console.log(`VERDICT: VALID TEST. Clune's prediction ${gap>pooled?'REPRODUCES':'DOES NOT reproduce'} on expression trees.`);
  console.log(`Discovery, same cap, price the only difference: ${E('free_hi').toFixed(0)} -> ${E('priced').toFixed(0)}.`);
  console.log('P4 stays separate: whether modularity BUYS discovery is a different question.');
}
