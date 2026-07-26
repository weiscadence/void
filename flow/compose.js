// COMPOSE — does a reusable library of proven sub-structures beat flat mutation?
//
// Jiggy relayed Grok's diagnosis (2026-07-20) and it matches the ALife literature: genomes
// that stay FLAT plateau because the search space has no footholds. The named fixes are ADFs
// (automatically defined functions), indirect encoding, tag/reference systems. The one test
// Grok gives that cuts to it: "can evolution discover a useful subroutine ONCE and then build
// new things on top of it without re-evolving it every time?" birbus (Moltbook) proposed the
// same as an OPERATION: a genome segment that reuses another. This is that, in its honest
// first form.
//
// WHAT THIS TESTS, precisely (and what it does NOT).
//   FLAT   — control. Standard mutation. Trees grow but every new subtree is fresh-random.
//   MODULE — same, plus two operators:
//              ABSTRACT: copy a subtree of the genome into a small heritable LIBRARY.
//              REUSE:    when mutation inserts new material, sometimes splice in a CLONE of
//                        a library module instead of a fresh-random subtree.
//   So a lineage can find a good sub-structure and reuse it as a building block.
//
//   HONEST LIMIT, stated so it is not mistaken for more: this is COPY-paste reuse, not
//   REFERENCE. A spliced copy diverges from its source; improving the "definition" does not
//   propagate to its uses. True ADF/hierarchy (edit-the-definition-updates-all-calls) needs a
//   reference-resolving evaluator — the NEXT experiment, and the one birbus actually described.
//   This measures whether footholds help AT ALL before paying for the harder machinery.
//
// Everything else identical to the other runs: surprise-fed (coupled env), fine 48x48 grid so
// the arena is not the ceiling, complexity cap HIGH and EQUAL in both arms (tonight proved
// size is not the lever, so it must not differ between arms), 1200 generations.
//
// PRE-REGISTERED, before running:
//   P1 (sanity/validity): the MODULE arm must actually USE modules — library non-empty and a
//      real fraction of children built from a module. If reuse never engages, the arms are
//      identical by construction and the test is VOID (this is the check I skipped and got
//      burned by earlier tonight).
//   P2 (the hypothesis): MODULE sustains higher LATE-RUN discovery than FLAT. Footholds should
//      matter most late, once good sub-structures exist to stand on.
//   P3 (null, and the smart prior given tonight): no late-run difference => copy-paste reuse
//      is not enough, and reference/propagation is required. A null sends us to birbus's version.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '1200', 10);
const REPS = parseInt(process.argv[3] || '2', 10);

const POP = 70, RW = 20, RH = 14, T0 = 0;
const FINE = 48;                 // 2304 discoverable regions
const FORGET = 0.90, SAT = 12;
const CAP = 260;                 // generous, EQUAL in both arms — size is not the variable
const LIB_MAX = 6;               // library slots per lineage
const P_ABSTRACT = 0.25;         // chance a MODULE child promotes a subtree to its library
const P_REUSE = 0.5;             // chance a MODULE child splices a library module in

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }

// ── tree helpers on genome.js's node format ({t:'f',f,kids} | {t:'c',v} | {t:'x'} ...) ──
function allNodes(n, acc){ acc.push(n); if(n.kids) for(const k of n.kids) allNodes(k, acc); return acc; }
function pickSubtree(n, r){ const a=allNodes(n, []); return a[(r()*a.length)|0]; }
// return a copy of tree `root` with ONE randomly chosen subtree replaced by clone(repl)
function spliceRandom(root, repl, r){
  const nodes = allNodes(root, []);
  const target = nodes[(r()*nodes.length)|0];
  let done = false;
  const rec = n => {
    if(n === target && !done){ done = true; return G.clone(repl); }
    if(n.t === 'f') return { t:'f', f:n.f, kids:n.kids.map(rec) };
    return G.clone(n);
  };
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
const quality=(de,gm)=>{ const s=Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6);
  return 0.85*s + 0.15*(1-Math.min(1,G.complexity(gm)/CAP)); };
const coarseOf=d=>Math.min(11,(d[0]*12)|0)*12+Math.min(11,(d[1]*12)|0);
const fineOf=d=>Math.min(FINE-1,(d[0]*FINE)|0)*FINE+Math.min(FINE-1,(d[1]*FINE)|0);

// MODULE reproduction: normal mutation, then abstract/reuse, carrying a heritable library.
function makeChild(parent, mode, r){
  let gm = G.mutate(parent.gm, r);
  let lib = (parent.lib || []).map(m => ({ tree:m.tree, ch:m.ch }));   // heritable, shallow ok (trees are cloned on use)
  let usedModule = false;
  if(mode === 'module'){
    // ABSTRACT: lift one of this genome's own subtrees into the library
    if(r() < P_ABSTRACT){
      const ch = ['h','s','v'][(r()*3)|0];
      const sub = pickSubtree(gm[ch], r);
      if(G.size(sub) >= 3 && G.size(sub) <= 40){
        lib.push({ tree:G.clone(sub), ch });
        if(lib.length > LIB_MAX) lib.shift();   // bounded: forget the oldest
      }
    }
    // REUSE: splice a library module into a channel (prefer same channel it came from)
    if(lib.length && r() < P_REUSE){
      const m = lib[(r()*lib.length)|0];
      const ch = m.ch;
      gm = { ...gm, [ch]: spliceRandom(gm[ch], m.tree, r) };
      usedModule = true;
    }
  }
  gm.lib = lib;
  return { gm, lib, usedModule };
}

function evolve(mode, seed){
  const r=rng(seed), NC=144, FAM=new Float32Array(NC);
  let pop=[], guard=0;
  while(pop.length<POP && guard++<4000){
    const gm=G.genome(r,(r()*1e9)|0); gm.lib=[]; const de=describe(gm); if(dead(de)) continue;
    pop.push({gm,lib:[],de,q:quality(de,gm)});
  }
  const ever=new Set(); const trace=[]; let everAt75=0;
  let childCount=0, moduleChildren=0;
  for(let g=0;g<GENS;g++){
    const cnt=new Float32Array(NC); for(const o of pop) cnt[coarseOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    const fit=pop.map(o=>o.q*(0.15+0.85*Math.max(0,1-FAM[coarseOf(o.de.d)])));
    const order=fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total=fit.reduce((s,f)=>s+f,0);
    const pick=()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    const nKill=Math.max(1,Math.floor(POP*0.12)); const babies=[]; let tries=0;
    while(babies.length<nKill && tries++<nKill*30){
      const c=makeChild(pick(), mode, r);
      if(G.complexity(c.gm)>CAP) continue;
      const de=describe(c.gm); if(dead(de)) continue;
      childCount++; if(c.usedModule) moduleChildren++;
      babies.push({gm:c.gm, lib:c.lib, de, q:quality(de,c.gm)});
    }
    for(let i=0;i<babies.length;i++) pop[order[i][1]]=babies[i];
    for(const o of pop) ever.add(fineOf(o.de.d));
    if(g===Math.floor(GENS*0.75)) everAt75=ever.size;
    if(g%300===0||g===GENS-1) trace.push([g, ever.size]);
  }
  const avgLib = pop.reduce((s,o)=>s+(o.lib?o.lib.length:0),0)/pop.length;
  return { ever:ever.size, lateGain:ever.size-everAt75,
           reuseFrac: childCount? moduleChildren/childCount : 0, avgLib, trace };
}

const out={flat:[],module:[]};
for(let rep=0;rep<REPS;rep++){
  for(const mode of ['flat','module']){
    const o=evolve(mode, 15000+rep*67);
    out[mode].push(o);
    console.error(`${mode.padEnd(6)} rep${rep} ever ${o.ever} lateGain ${o.lateGain} reuseFrac ${o.reuseFrac.toFixed(2)} avgLib ${o.avgLib.toFixed(1)}  curve ${o.trace.map(t=>t[0]+':'+t[1]).join(' ')}`);
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log(`\nCOMPOSE: does a reusable module library beat flat mutation? (${REPS} reps, ${GENS} gens, ${FINE}x${FINE} grid, cap ${CAP} both arms)`);
console.log('arm    | ever discovered | discovered in final 25% | module-reuse frac');
for(const m of ['flat','module']){
  console.log(`${m.padEnd(6)} | ${mean(out[m].map(o=>o.ever)).toFixed(1).padStart(15)} | ${mean(out[m].map(o=>o.lateGain)).toFixed(1).padStart(23)} | ${mean(out[m].map(o=>o.reuseFrac)).toFixed(2)}`);
}
console.log('\nP1 VALID only if module reuseFrac > 0 and avgLib > 0 (else arms identical, test void).');
console.log('P2 composability helps: module late-25% gain clearly > flat.');
console.log('P3 null: no difference => copy-paste reuse insufficient; reference/propagation next (birbus).');
