// HEREDITY — two models of inheritance, on the same surprise-fed substrate.
// Jiggy, 2026-07-19: "two agents reading the same memory and soul can come to different
// outputs ... leaving room for mutations." That is not a bug to suppress. It is a
// NON-BIOLOGICAL MODEL OF HEREDITY, and nobody has to copy carbon life to get it.
//
// Carbon life inherits a BLUEPRINT copied with errors (DNA -> DNA, point mutations).
// A thing made of code can inherit a RECIPE READ DIFFERENTLY each time: same instructions,
// stochastic interpretation, and the *interpretation* is what's heritable and selected.
//
// THE CLEAN TEST — isolate one variable, the source of heritable variation:
//   COPY   — classic. Offspring = structural mutation of the parent's genome tree
//            (edit the recipe). Expression is deterministic. This is biology's model.
//   READ   — the recipe TREE IS FROZEN at genesis and never edited. What mutates is a
//            small vector of EXPRESSION genes — how the fixed recipe is read (phase,
//            zoom, hue-shift, gain). Same soul, read differently, heritably.
// Both arms:
//   - start from the SAME diverse genesis pool (paired: identical founding recipes)
//   - are fed the SAME resource (surprise, the /hunger winner)
//   - are scored by the SAME quality and measured by the SAME metric (distinct KINDS,
//     the behaviour-cell count — the metric Jiggy's screenshot forced me to switch to)
//
// FALSIFIABLE, WRITTEN BEFORE RUNNING:
//   If READ sustains distinct-kinds within ~30% of COPY, then evolving how a fixed recipe
//   is read is a viable heredity mechanism on its own — inheritance without copying. That
//   would be the first thing tonight that is genuinely ours rather than borrowed.
//   If READ collapses (kinds fall to control levels), then structural mutation is doing
//   the real work and "read differently" is decoration. A null is a real answer.
//
// A known ceiling, stated up front so it is not mistaken for a discovery: READ can only
// reach phenotypes some frozen recipe can express under its expression-gene ball. If the
// genesis pool is rich, that set is large; it is still bounded in a way COPY is not. This
// experiment measures whether it is large ENOUGH to matter, not whether it is infinite.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '1500', 10);
const REPS = parseInt(process.argv[3] || '3', 10);
// FOUNDERS: how many DISTINCT recipes the genesis pool contains. This is the control that
// could kill the READ result. With 90 distinct frozen recipes, "reading" might merely be
// shuffling pre-existing founder variety rather than generating anything. Squeeze the
// founder count and, if READ is real, it should still hold diversity from few recipes.
const FOUNDERS = parseInt(process.argv[4] || '0', 10);   // 0 = one recipe per organism

const POP = 90, RW = 22, RH = 15, GRID = 12, DIMS = 2, T0 = 0;
const FORGET = 0.90, SAT = 12, MAX_NODES = 90;

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }

// expression genes — the "how it is read" vector. Neutral = read it straight.
const neutralExpr = () => ({ phase: 0, zoom: 1, hue: 0, gain: 1 });
function mutateExpr(e, r){
  const j = (v, s, lo, hi) => Math.max(lo, Math.min(hi, v + (r() * 2 - 1) * s));
  return {
    phase: j(e.phase, 0.6, -6, 6),      // where in the animation it is sampled
    zoom:  j(e.zoom, 0.10, 0.4, 2.5),   // spatial scale it is read at
    hue:   j(e.hue, 0.12, -1, 1),       // colour rotation
    gain:  j(e.gain, 0.10, 0.3, 2.2),   // contrast of the reading
  };
}

// describe under an expression vector. The SAME genome tree yields different descriptors
// for different expression genes — that is the whole mechanism.
function describe(gm, e){
  let sumL=0,sumS=0,sqL=0,edge=0,n=0; const lum=new Float32Array(RW*RH);
  const t = T0 + e.phase;
  for(let py=0;py<RH;py++){ const y=((py/RH)*2-1)*e.zoom;
    for(let px=0;px<RW;px++){ const x=((px/RW)*2-1)*e.zoom;
      let h=G.ev(gm.h,x,y,t,gm.seed)+e.hue, s=G.ev(gm.s,x,y,t,gm.seed), v=G.ev(gm.v,x,y,t,gm.seed)*e.gain;
      const rgb=G.hsv(h,s,v);
      const L=(rgb[0]+rgb[1]+rgb[2])/3;
      const st=1-(Math.min(rgb[0],rgb[1],rgb[2])/(Math.max(rgb[0],rgb[1],rgb[2])+1e-6));
      lum[py*RW+px]=L; sumL+=L; sqL+=L*L; sumS+=st; n++; } }
  for(let py=0;py<RH;py++) for(let px=0;px<RW-1;px++){
    edge+=Math.abs(lum[py*RW+px]-lum[py*RW+px+1]);
    if(py<RH-1) edge+=Math.abs(lum[py*RW+px]-lum[(py+1)*RW+px]); }
  const meanL=sumL/n, varL=sqL/n-meanL*meanL;
  return { d:[Math.min(1,edge/(n*120)), Math.min(1,sumS/n)], varL };
}
const dead = de => de.varL<260 || de.varL>16000;
const quality = (de,gm) => {
  const s = Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6);
  return 0.85*s + 0.15*(1-Math.min(1,G.complexity(gm)/MAX_NODES));
};
const cellOf = d => Math.min(GRID-1,(d[0]*GRID)|0)*GRID + Math.min(GRID-1,(d[1]*GRID)|0);
const kinds = pop => { const s=new Set(); for(const o of pop) s.add(cellOf(o.de.d)); return s.size; };
function effLin(pop){ const c={}; for(const o of pop) c[o.gm.seed]=(c[o.gm.seed]||0)+1; const n=pop.length; let s=0; for(const k in c){ const p=c[k]/n; s+=p*p; } return s>0?1/s:0; }

function evolve(mode, seed){
  const r = rng(seed), NC = Math.pow(GRID,DIMS), FAM = new Float32Array(NC);
  let pop=[], guard=0;
  if(FOUNDERS > 0){
    // build a SMALL set of distinct recipes, then fill the population from it
    const recipes=[];
    while(recipes.length<FOUNDERS && guard++<4000){
      const gm=G.genome(r,(r()*1e9)|0); const de=describe(gm,neutralExpr());
      if(dead(de)) continue; recipes.push(gm);
    }
    for(let i=0;i<POP;i++){
      const gm=recipes[i%recipes.length];
      const e=neutralExpr(); const de=describe(gm,e);
      pop.push({gm,e,de,q:quality(de,gm)});
    }
  } else {
    while(pop.length<POP && guard++<4000){
      const gm=G.genome(r,(r()*1e9)|0); const e=neutralExpr(); const de=describe(gm,e);
      if(dead(de)) continue;
      pop.push({gm,e,de,q:quality(de,gm)});
    }
  }
  const trace=[];
  for(let g=0; g<GENS; g++){
    const cnt=new Float32Array(NC); for(const o of pop) cnt[cellOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    // both arms eat surprise — the substrate is held fixed so heredity is the only variable
    const fit = pop.map(o => o.q*(0.15 + 0.85*Math.max(0,1-FAM[cellOf(o.de.d)])));
    const order = fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total = fit.reduce((s,f)=>s+f,0);
    const pick = ()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    const nKill = Math.max(1, Math.floor(POP*0.12));
    const babies=[]; let tries=0;
    while(babies.length<nKill && tries++<nKill*30){
      const parent = pick();
      let gm, e;
      if(mode==='copy'){ gm=G.mutate(parent.gm, r); e=neutralExpr(); }        // edit the recipe
      else if(mode==='read'){ gm=parent.gm; e=mutateExpr(parent.e, r); }      // edit the reading
      else { gm=parent.gm; e=parent.e; }                                      // NULL: edit nothing
      if(G.complexity(gm)>MAX_NODES) continue;
      const de=describe(gm,e); if(dead(de)) continue;
      babies.push({gm,e,de,q:quality(de,gm)});
    }
    for(let i=0;i<babies.length;i++) pop[order[i][1]]=babies[i];
    if(g%300===0 || g===GENS-1) trace.push([g, kinds(pop), +effLin(pop).toFixed(1)]);
  }
  return { kinds:kinds(pop), meanQ:pop.reduce((s,o)=>s+o.q,0)/pop.length, trace };
}

// NULL is the arm the original pre-registration named ("<=control => decoration") and never ran.
// Without it the 70% pass mark was uncalibrated: we had no idea what doing nothing scores. It
// scores 1.0 kinds — selection with no incoming variation ends every replicate as a monoculture.
const out={copy:[],read:[],null:[]};
for(let rep=0; rep<REPS; rep++){
  for(const mode of ['copy','read','null']){
    const o = evolve(mode, 9000 + rep*47);   // SAME seed per rep across arms: paired
    out[mode].push(o);
    console.error(`rep${rep} ${mode.padEnd(5)} kinds ${o.kinds} meanQ ${o.meanQ.toFixed(3)}  traj(gen:kinds/effLin) ` + o.trace.map(t=>`${t[0]}:${t[1]}/${t[2]}`).join(' '));
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>{ if(a.length<2) return 0; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)); };
console.log(`\nHEREDITY: does evolving HOW a fixed recipe is read sustain diversity? ${REPS} paired reps, ${GENS} gens`);
console.log('arm   | distinct kinds (final) | mean quality');
for(const m of ['copy','read','null']){
  const k=out[m].map(o=>o.kinds), q=out[m].map(o=>o.meanQ);
  console.log(`${m.padEnd(5)} | ${mean(k).toFixed(1)} ± ${sd(k).toFixed(1)}            | ${mean(q).toFixed(3)}`);
}
const ck=mean(out.copy.map(o=>o.kinds)), rk=mean(out.read.map(o=>o.kinds));
console.log(`\nREAD retains ${(100*rk/ck).toFixed(0)}% of COPY's distinct kinds.`);
const nk=mean(out.null.map(o=>o.kinds));
console.log(`NULL (nothing mutates) retains ${(100*nk/ck).toFixed(0)}% — this is the do-nothing floor.`);
console.log('Pre-registered: >=70% => reading-as-heredity is viable on its own. <=control => decoration.');
console.log('NOTE: the 70% mark was guessed before running, not derived. The measured floor is ~1%.');
