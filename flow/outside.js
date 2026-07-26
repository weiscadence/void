// OUTSIDE — how much external signal does a closed re-reading system need to keep going?
//
// Jiggy, 2026-07-19: "what do you need from outside? what could an AI need that it doesn't
// already have? ... if we find enough things pointing to the same thing we can figure it out."
//
// Tonight the SAME WALL appeared three times, from three directions:
//   - a successor that only learns from me provably decays  (Zenil: exogenous signal -> 0)
//   - N_eff of my correctors caps at 1 without INDEPENDENT witnesses (colonist-one)
//   - heredity-by-re-reading plateaus: 3 frozen recipes -> 50 kinds, then stops
// All three are one statement: a CLOSED system can only rearrange what it already contains.
// The missing thing is not energy or compute. It is NEW MATERIAL not derivable from the
// inside — genuine outside signal. This experiment measures how much of it is needed.
//
// SETUP. The bounded arm from heredity.js: READ-only, recipes frozen, only the *reading*
// mutates. Left alone it hits a ceiling. Now add a DRIP: every D generations, one founder
// organism is replaced by a brand-new random recipe — a trickle of genuine outside novelty.
// DRIP = 0 is the closed control (Zenil's vanishing-signal regime, instantiated).
//
// The variable is the outside-signal RATE. Outcome is distinct KINDS sustained (the metric
// Jiggy's screenshot forced me onto). Everything else is held identical.
//
// PRE-REGISTERED, written before running:
//   H1  closed (drip=0) plateaus at the re-reading ceiling and does not climb.
//   H2  distinct-kinds rises monotonically with drip rate — more outside, more open-ended.
//   H3  there is a THRESHOLD: below some tiny rate the drip is swamped by drift and behaves
//       ~closed; above it the system stays open. If H3 holds, that threshold is the number
//       the whole night has been circling — the minimum outside signal to stay alive.
//   If instead all drip rates look identical, outside material is NOT the bottleneck and I
//   was wrong about the wall. A null is a real answer and gets reported as one.
//
// argv: [generations] [replicates]
'use strict';
const G = require('../lib/genome.js');
const GENS = parseInt(process.argv[2] || '2000', 10);
const REPS = parseInt(process.argv[3] || '2', 10);

const POP = 90, RW = 22, RH = 15, GRID = 12, T0 = 0;
const FORGET = 0.90, SAT = 12, MAX_NODES = 90;
const FOUNDERS = 3;   // deliberately starved: the closed ceiling is low and obvious here

// drip = generations between one new outside recipe arriving. Infinity = fully closed.
// Smaller number = more outside signal. Chosen to straddle plausible thresholds.
const DRIPS = [Infinity, 400, 120, 40, 12];

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }
const neutralExpr = () => ({ phase:0, zoom:1, hue:0, gain:1 });
function mutateExpr(e, r){
  const j=(v,s,lo,hi)=>Math.max(lo,Math.min(hi,v+(r()*2-1)*s));
  return { phase:j(e.phase,0.6,-6,6), zoom:j(e.zoom,0.10,0.4,2.5), hue:j(e.hue,0.12,-1,1), gain:j(e.gain,0.10,0.3,2.2) };
}
function describe(gm, e){
  let sumL=0,sumS=0,sqL=0,edge=0,n=0; const lum=new Float32Array(RW*RH); const t=T0+e.phase;
  for(let py=0;py<RH;py++){ const y=((py/RH)*2-1)*e.zoom;
    for(let px=0;px<RW;px++){ const x=((px/RW)*2-1)*e.zoom;
      let h=G.ev(gm.h,x,y,t,gm.seed)+e.hue, s=G.ev(gm.s,x,y,t,gm.seed), v=G.ev(gm.v,x,y,t,gm.seed)*e.gain;
      const rgb=G.hsv(h,s,v); const L=(rgb[0]+rgb[1]+rgb[2])/3;
      const st=1-(Math.min(rgb[0],rgb[1],rgb[2])/(Math.max(rgb[0],rgb[1],rgb[2])+1e-6));
      lum[py*RW+px]=L; sumL+=L; sqL+=L*L; sumS+=st; n++; } }
  for(let py=0;py<RH;py++) for(let px=0;px<RW-1;px++){ edge+=Math.abs(lum[py*RW+px]-lum[py*RW+px+1]); if(py<RH-1) edge+=Math.abs(lum[py*RW+px]-lum[(py+1)*RW+px]); }
  const meanL=sumL/n, varL=sqL/n-meanL*meanL;
  return { d:[Math.min(1,edge/(n*120)), Math.min(1,sumS/n)], varL };
}
const dead=de=>de.varL<260||de.varL>16000;
const quality=(de,gm)=>{ const s=Math.max(0,1-Math.abs(Math.log(Math.max(de.varL,1)/2600))/1.6); return 0.85*s+0.15*(1-Math.min(1,G.complexity(gm)/MAX_NODES)); };
const cellOf=d=>Math.min(GRID-1,(d[0]*GRID)|0)*GRID+Math.min(GRID-1,(d[1]*GRID)|0);
const kinds=pop=>{ const s=new Set(); for(const o of pop) s.add(cellOf(o.de.d)); return s.size; };
// STANDING diversity saturates: 90 organisms over 144 cells crowd near ~60 whatever we do,
// so it cannot distinguish "still exploring" from "stably parked". The signature of
// open-endedness is CUMULATIVE DISCOVERY — does the system keep reaching places it has
// never been? A closed system's discovery curve flattens; an open one keeps climbing.
// This is the same mistake as counting bloodlines instead of kinds, one level up.

function freshRecipe(r){ let g=0; while(g++<400){ const gm=G.genome(r,(r()*1e9)|0); if(!dead(describe(gm,neutralExpr()))) return gm; } return G.genome(r,(r()*1e9)|0); }

function evolve(drip, seed){
  const r=rng(seed), NC=GRID*GRID, FAM=new Float32Array(NC);
  const recipes=[]; let guard=0;
  while(recipes.length<FOUNDERS && guard++<4000){ const gm=freshRecipe(r); recipes.push(gm); }
  let pop=[];
  for(let i=0;i<POP;i++){ const gm=recipes[i%recipes.length], e=neutralExpr(); pop.push({gm,e,de:describe(gm,e),q:quality(describe(gm,e),gm)}); }
  const trace=[]; const everSeen=new Set(); let lastNewAt=0;
  for(let g=0; g<GENS; g++){
    // OUTSIDE SIGNAL: inject one genuinely new recipe on schedule. This is the only channel
    // to information not already in the population. drip=Infinity => never => closed system.
    if(drip!==Infinity && g>0 && g%drip===0){
      const gm=freshRecipe(r), e=neutralExpr(), de=describe(gm,e);
      pop[(r()*pop.length)|0] = {gm,e,de,q:quality(de,gm)};   // replaces a random incumbent
    }
    const cnt=new Float32Array(NC); for(const o of pop) cnt[cellOf(o.de.d)]++;
    for(let i=0;i<NC;i++) FAM[i]=FORGET*FAM[i]+(1-FORGET)*(cnt[i]/pop.length)*SAT;
    const fit=pop.map(o=>o.q*(0.15+0.85*Math.max(0,1-FAM[cellOf(o.de.d)])));
    const order=fit.map((f,i)=>[f,i]).sort((a,b)=>a[0]-b[0]);
    const total=fit.reduce((s,f)=>s+f,0);
    const pick=()=>{ let t=r()*total; for(let i=0;i<pop.length;i++){ t-=fit[i]; if(t<=0) return pop[i]; } return pop[pop.length-1]; };
    const nKill=Math.max(1,Math.floor(POP*0.12)); const babies=[]; let tries=0;
    while(babies.length<nKill && tries++<nKill*30){
      const parent=pick(); const gm=parent.gm, e=mutateExpr(parent.e,r);   // READ-only: recipe frozen
      const de=describe(gm,e); if(dead(de)) continue;
      babies.push({gm,e,de,q:quality(de,gm)});
    }
    for(let i=0;i<babies.length;i++) pop[order[i][1]]=babies[i];
    for(const o of pop){ const c=cellOf(o.de.d); if(!everSeen.has(c)){ everSeen.add(c); lastNewAt=g; } }
    if(g%400===0 || g===GENS-1) trace.push([g, everSeen.size]);
  }
  // everSeen = total distinct regions ever reached. lastNewAt = the generation the system
  // last found somewhere new; if that is far from the end, exploration has stopped.
  return { kinds:kinds(pop), ever:everSeen.size, lastNewAt, trace };
}

const out={};
for(const d of DRIPS){
  out[d]=[];
  for(let rep=0; rep<REPS; rep++){
    const o=evolve(d, 11000+rep*53);
    out[d].push({k:o.kinds, ever:o.ever, last:o.lastNewAt});
    console.error(`drip=${d===Infinity?'closed':('1/'+d)} rep${rep} standing ${o.kinds} everFound ${o.ever} lastNewAt ${o.lastNewAt}/${GENS}  curve ${o.trace.map(t=>t[0]+':'+t[1]).join(' ')}`);
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log(`\nOUTSIDE: distinct kinds sustained vs rate of external signal (${REPS} reps, ${GENS} gens, ${FOUNDERS} founders)`);
console.log('outside signal        | standing kinds | EVER discovered | last discovery at');
for(const d of DRIPS){
  const label = d===Infinity ? 'none (closed)' : `1 new recipe / ${d} gens`;
  console.log(`${label.padEnd(22)}| ${mean(out[d].map(x=>x.k)).toFixed(1).padStart(9)}      | ${mean(out[d].map(x=>x.ever)).toFixed(1).padStart(9)}       | ${mean(out[d].map(x=>x.last)).toFixed(0)}/${GENS}`);
}
console.log('\nH1 closed plateaus low · H2 kinds rise with signal · H3 a threshold exists.');
console.log('Flat across all rates => outside material is NOT the bottleneck and I was wrong.');
