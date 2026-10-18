#!/usr/bin/env node
/* LOCKING vs NOVELTY v3. Prereg: PREREG-locking-novelty.md.
 * THREE instrument bugs found and fixed across v1->v3:
 *  1. v1 drove REGEN — inert in energetic mode (roots fed by BASAL). Knob disconnected.
 *  2. v1 G0 canary was one-sided (checked oscillation, not novelty) -> licensed SEAM_FAILS
 *     on a dead instrument (novelty=4, sd=0 in all six arms).
 *  3. v2 drove BASAL at 260 with stockMax 260 -> roots top out at the cap every tick, so the
 *     drive was ~90% saturated away (measured CV 0.09 vs 0.43 at BASAL=60). And v2 measured
 *     locking by peak-picking, which found 416-456 "peaks" in 1500 ticks where a real cycle
 *     gives ~15 — it was counting noise, so R~0.02 everywhere was an artifact, not a null.
 * v3: BASAL=60 (drive lands), and locking measured SPECTRALLY (Goertzel at the drive
 * frequency, normalised by total variance) — no peak-picking anywhere.
 */
'use strict';
const fs=require('fs'), path=require('path');
const { Graph } = require('./lib/graph.js');
const PHI=(1+Math.sqrt(5))/2;
const TICKS=+(process.env.TICKS||3000), BURN=+(process.env.BURN||700);
const SEEDS=+(process.env.SEEDS||3), AMP=+(process.env.AMP||0.6), BASAL=+(process.env.BASAL||60);
const ARMS=[{name:'1/1',r:1},{name:'2/1',r:2},{name:'3/2',r:1.5},{name:'5/3',r:5/3},{name:'8/5',r:1.6},{name:'phi',r:PHI}];
const opts=s=>({registers:3,regulate:true,construct:true,energetic:true,basal:BASAL,transfer:0.1,
 stockMax:260,nodeCap:20,buildDensity:0.75,maxNodes:30000,decayEmpty:60,buildDrawsStock:true,
 buildStockCost:20,leak:0.02,roots:8,seedPerRoot:40,driveIn:60,seed:s});
function run(seed,P,ticks){
  const g=new Graph(opts(seed)); const pop=[],nov=[]; const seen=new Set(); let bs=0,inj=[];
  for(let t=0;t<ticks;t++){
    const B = P ? Math.max(0,BASAL*(1+AMP*Math.sin(2*Math.PI*t/P))) : BASAL;
    g.BASAL=B; bs+=B;
    let injected=0; for(const nd of g.nodes.values()) if(nd.depth===0) injected+=Math.min(260,nd.stock+B)-nd.stock;
    inj.push(injected);
    g.step();
    for(const nd of g.nodes.values()) seen.add(nd.req.join(','));
    pop.push(g.stats().pop); nov.push(seen.size);
  }
  const m=inj.reduce((a,b)=>a+b,0)/inj.length;
  const cv=Math.sqrt(inj.reduce((a,b)=>a+(b-m)**2,0)/inj.length)/(m||1);
  return {pop,nov,novelty:seen.size,meanBasal:bs/ticks,injCV:cv,stats:g.stats()};
}
function detrend(x,w){const o=[];for(let i=w;i<x.length-w;i++){let s=0;for(let j=i-w;j<=i+w;j++)s+=x[j];o.push(x[i]-s/(2*w+1));}return o;}
function acPeak(d,lo,hi){if(d.length<hi*3)return null;const mu=d.reduce((a,b)=>a+b,0)/d.length;
 const z=d.map(v=>v-mu);const den=z.reduce((a,b)=>a+b*b,0);if(den<=0)return null;const ac=[];
 for(let lag=lo;lag<=hi;lag++){let s=0;for(let i=0;i+lag<z.length;i++)s+=z[i]*z[i+lag];ac.push({lag,r:s/den});}
 let b=null;for(let i=1;i<ac.length-1;i++)if(ac[i].r>ac[i-1].r&&ac[i].r>ac[i+1].r&&(!b||ac[i].r>b.r))b=ac[i];return b;}
/* SPECTRAL LOCKING: power at the drive frequency / total variance. No peak-picking. */
function specLock(pop,P){
  const x=detrend(pop.slice(BURN),25); const n=x.length; if(n<64)return null;
  const mu=x.reduce((a,b)=>a+b,0)/n; const z=x.map(v=>v-mu);
  const tot=z.reduce((a,b)=>a+b*b,0)/n; if(tot<=0)return null;
  const w=2*Math.PI/P; let re=0,im=0;
  for(let i=0;i<n;i++){re+=z[i]*Math.cos(w*i);im+=z[i]*Math.sin(w*i);}
  return ((re*re+im*im)/(n*n))/tot;
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)));};
console.log(`=== G0 two-sided canary (unforced, BASAL=${BASAL}) ===`);
const per=[],ng=[];
for(let s=1;s<=SEEDS;s++){const u=run(s,null,TICKS);
 const p=acPeak(detrend(u.pop.slice(BURN),25),4,250); const grew=u.nov[u.nov.length-1]-u.nov[BURN];
 if(p)per.push(p); ng.push(grew);
 console.log(`  seed ${s}: osc=${p?`lag${p.lag} r=${p.r.toFixed(3)}`:'NONE'}  novelty=+${grew}  nodes=${u.stats.nodes}`);}
const oscOK=per.filter(p=>p.r>=0.15).length>=Math.ceil(SEEDS/2);
const novOK=ng.filter(g=>g>=10).length>=Math.ceil(SEEDS/2);
console.log(`  G0a osc live: ${oscOK?'PASS':'FAIL'}   G0b novelty live: ${novOK?'PASS':'FAIL'}`);
if(!oscOK||!novOK){console.log('\nUNTRUSTED — substrate lacks both properties. Not a null.');process.exit(2);}
const P_endo=Math.round(mean(per.filter(p=>p.r>=0.15).map(p=>p.lag)));
console.log(`  P_endo=${P_endo}`);
console.log(`\n=== arms (TICKS=${TICKS} SEEDS=${SEEDS} AMP=${AMP} BASAL=${BASAL}) ===`);
const res=[];
for(const a of ARMS){const P=a.r*P_endo; const nv=[],lk=[],mb=[],cvs=[];
 for(let s=1;s<=SEEDS;s++){const o=run(s,P,TICKS);nv.push(o.novelty);mb.push(o.meanBasal);cvs.push(o.injCV);
  const L=specLock(o.pop,P); if(L!=null)lk.push(L);}
 const row={arm:a.name,r:+a.r.toFixed(4),P_drive:+P.toFixed(2),novelty:+mean(nv).toFixed(1),
  noveltySd:+sd(nv).toFixed(1),locking:lk.length?+mean(lk).toFixed(5):null,
  meanBasal:+mean(mb).toFixed(3),injCV:+mean(cvs).toFixed(3),n:nv.length};
 res.push(row);
 console.log(`  ${row.arm.padEnd(4)} P=${String(row.P_drive).padStart(7)} novelty=${String(row.novelty).padStart(7)} ±${String(row.noveltySd).padStart(5)} locking=${String(row.locking).padStart(8)} injCV=${row.injCV}`);}
const spread=Math.max(...res.map(r=>r.meanBasal))-Math.min(...res.map(r=>r.meanBasal));
console.log(`\ncontrol · mean BASAL spread: ${spread.toFixed(4)} (want ~0)`);
const by=Object.fromEntries(res.map(r=>[r.arm,r]));
const phi=by['phi'],dec=by['8/5'],one=by['1/1'];
console.log('\n=== GATES ===');let pass=true;
const g1=phi.locking!=null&&one.locking!=null&&one.locking>phi.locking;
console.log(`G1 knob moves locking (1/1 > phi):       ${g1?'PASS':'FAIL'}  (${one.locking} vs ${phi.locking})`);
if(!g1)pass=false;
const pooled=mean(res.map(r=>r.noveltySd))||1, gap=Math.abs(phi.novelty-dec.novelty);
const g2=gap>pooled;
console.log(`G2 DECOY phi vs 8/5 separates:           ${g2?'PASS':'FAIL'}  (|${phi.novelty}-${dec.novelty}|=${gap.toFixed(1)} vs pooled sd ${pooled.toFixed(1)})`);
if(!g2)pass=false;
let corr=null,g3=false;const L=res.filter(r=>r.locking!=null);
if(L.length>=4){const lx=L.map(r=>r.locking),ny=L.map(r=>r.novelty);const mx=mean(lx),my=mean(ny);
 corr=mean(lx.map((v,i)=>(v-mx)*(ny[i]-my)))/((sd(lx)*sd(ny))||1e-12);g3=corr<-0.5;}
console.log(`G3 novelty tracks locking (corr<-0.5):   ${g3?'PASS':'FAIL'}  (corr=${corr==null?'n/a':corr.toFixed(3)})`);
if(!g3)pass=false;
console.log(`\nVERDICT: ${pass?'SEAM SURVIVES':'SEAM DOES NOT SURVIVE as stated — report as decoration.'}`);
fs.writeFileSync(path.join(__dirname,'locking-novelty3.json'),JSON.stringify({generated:new Date().toISOString(),
 version:3,params:{TICKS,BURN,SEEDS,AMP,BASAL,P_endo},basalSpread:+spread.toFixed(4),results:res,
 gates:{G1:g1,G2:g2,G3:g3,corr},verdict:pass?'SEAM_SURVIVES':'SEAM_FAILS'},null,2));
process.exit(pass?0:1);
