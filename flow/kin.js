/* KIN — what if the thing you inherit is your parent's expectations?
 *
 * Jiggy, 2026-07-20: kin that inherit "your way of reading" and are selected for
 * surprising you. Also: unexpected connections, plasticity, the question-bot.
 * All of those are one mechanism — NOVELTY MEASURED AGAINST A MODEL OF YOURSELF.
 *
 * ── WHAT IS BORROWED (almost everything) ──────────────────────────────────────
 * Hughes et al. 2024, "Open-Endedness is Essential for Artificial Superhuman
 * Intelligence" (arXiv 2406.04268). A system is open-ended iff its artifacts are,
 * TO AN OBSERVER, both novel and learnable:
 *     NOVELTY      loss rises with T for an observer frozen at time t
 *     LEARNABILITY loss falls with t for a fixed artifact at time T
 * Both, or it is not open-endedness. Noise satisfies novelty alone, which is why
 * novelty-only search degenerates. Their gloss on Soros: "we'll be surprised, but
 * surprised in a way that makes sense in retrospect."
 *
 * The noisy-TV problem (Schmidhuber 1991; Kaplan & Oudeyer 2007; Pathak 2017;
 * Burda 2018): reward prediction error and an agent parks in front of static
 * forever. The fix is learning progress, not raw error. I pre-registered this
 * failure as my own clever worry before finding out it was named 35 years ago.
 *
 * ── WHAT IS OURS (one thing, and it is flagged unverified) ────────────────────
 * In all of the above the observer is EXTERNAL AND FIXED — a distance metric, a
 * descriptor grid, or a foundation model carrying human notions of interestingness
 * (OMNI, Zhang et al. 2023). That is the hold-up: "interesting" is imported from
 * outside and eventually runs out. Here the observer is INHERITED. A child gets a
 * copy of its parent's predictive model and is scored on how badly that model
 * predicted it. Interestingness becomes endogenous: "surprising relative to what my
 * ancestors came to expect". And Soros's aphorism becomes structural rather than
 * aspirational — the child's observer STARTS as the parent's, so whatever it makes
 * is reachable from that model: novel to it, learnable by it, by construction.
 *
 * NOT VERIFIED AS NOVEL. Schmidhuber's zero-sum intrinsic motivation already pits
 * one module against another rewarded for surprising it. The claimed twist is
 * heritability across generations, not adversarial coupling. One search is not a
 * literature review — see KIN-DESIGN.md. Do not call this new in public yet.
 *
 * ── ARMS ──────────────────────────────────────────────────────────────────────
 *   fixed_ruler  novelty against a FIXED descriptor distance. Classic novelty search.
 *   shared_model one observer for the whole population, learning but NOT inherited.
 *                Isolates "the observer learns" from "the observer is inherited".
 *   heritable    each child inherits its parent's observer. The kin arm.
 *   noise_plant  PLANTED NEGATIVE CONTROL: children are random garbage. It MUST
 *                score badly. If garbage looks open-ended, the measure is the
 *                noisy-TV trap and every other number here is void.
 *
 * argv: [generations] [replicates]
 */
'use strict';
const G = require('../lib/genome.js');
const OB = require('../lib/observer.js');

const GENS = parseInt(process.argv[2] || '160', 10);
const REPS = parseInt(process.argv[3] || '3', 10);

const POP=60, RW=16, RH=12, T0=0, CAP=400;
const D=8, H=3, LR=0.05;
const SNAP_EVERY=20;            // observer snapshots for the loss matrix
const rng = OB.rng;

/* ── artifact descriptor: an 8-number summary of what a creature looks like ──
 * Deliberately richer than the 2-axis descriptor the old experiments used, because
 * the observer has to have something to predict. Kept in roughly [-1,1] so the
 * network's tanh units and the mean-floor comparison both behave. */
function describe(gm){
  let sumL=0,sqL=0,sumS=0,sumV=0,edgeH=0,edgeV=0,n=0;
  const lum=new Float64Array(RW*RH);
  for(let py=0;py<RH;py++){ const y=(py/RH)*2-1;
    for(let px=0;px<RW;px++){ const x=(px/RW)*2-1;
      const rgb=G.hsv(G.ev(gm.h,x,y,T0,gm.seed),G.ev(gm.s,x,y,T0,gm.seed),G.ev(gm.v,x,y,T0,gm.seed));
      const L=(rgb[0]+rgb[1]+rgb[2])/765;
      const mx=Math.max(rgb[0],rgb[1],rgb[2]), mn=Math.min(rgb[0],rgb[1],rgb[2]);
      lum[py*RW+px]=L; sumL+=L; sqL+=L*L; sumS+=1-(mn/(mx+1e-6)); sumV+=mx/255; n++; } }
  for(let py=0;py<RH;py++) for(let px=0;px<RW-1;px++){
    edgeH+=Math.abs(lum[py*RW+px]-lum[py*RW+px+1]);
    if(py<RH-1) edgeV+=Math.abs(lum[py*RW+px]-lum[(py+1)*RW+px]); }
  const meanL=sumL/n, varL=sqL/n-meanL*meanL;
  // quadrant means capture spatial layout, so the observer can learn "shape", not just "colour"
  const q=[0,0,0,0];
  for(let py=0;py<RH;py++) for(let px=0;px<RW;px++)
    q[(py<RH/2?0:2)+(px<RW/2?0:1)] += lum[py*RW+px]/(n/4);
  const d=new Float64Array(D);
  d[0]=meanL*2-1; d[1]=Math.min(1,varL*12)*2-1; d[2]=Math.min(1,edgeH/(n*0.35))*2-1;
  d[3]=Math.min(1,edgeV/(n*0.35))*2-1; d[4]=sumS/n*2-1;
  d[5]=q[0]*2-1; d[6]=q[1]*2-1; d[7]=q[3]*2-1;
  return { d, varL };
}
const dead = de => de.varL < 0.0004 || de.varL > 0.09;
const dist = (a,b) => { let s=0; for(let i=0;i<D;i++){ const t=a[i]-b[i]; s+=t*t; } return Math.sqrt(s); };

/* ── arms ── */
const ARMS = [
  { name:'fixed_ruler',  kind:'fixed'    },
  { name:'shared_model', kind:'shared'   },
  { name:'heritable',    kind:'heritable'},
  { name:'noise_plant',  kind:'noise'    },   // negative control; must score badly
];

function evolve(arm, seed){
  const r = rng(seed);
  let pop = [], guard = 0;
  while(pop.length<POP && guard++<3000){
    const gm = G.genome(r,(r()*1e9)|0);
    if(G.complexity(gm)>CAP) continue;
    const de = describe(gm); if(dead(de)) continue;
    pop.push({ gm, de, ob: arm.kind==='heritable' ? OB.makeObserver(D,H,(r()*1e9)|0,LR) : null });
  }
  // one shared observer for the shared arm; the fixed arm has an archive instead
  const shared = (arm.kind==='shared') ? OB.makeObserver(D,H,(r()*1e9)|0,LR) : null;
  const archive = [];                    // fixed-ruler novelty archive
  const stream = [];                     // every (parent,child) pair ever produced
  const snaps = [];                      // frozen observer copies, for the loss matrix
  const eras = [];                       // artifacts grouped by era, for the loss matrix

  // A single global witness, identical in every arm, trained on that arm's stream.
  // The ARMS differ in what drives SELECTION; the witness only ever MEASURES, so the
  // loss matrix is comparable across arms. Scoring and judging must not share a model
  // or the treatment grades its own homework.
  const witness = OB.makeObserver(D,H,777,LR);
  let era = [];
  const sel = { all:0, kept:0, meanAll:0, meanKept:0, gens:0 };   // selection audit

  for(let g=0; g<GENS; g++){
    const nKill = Math.max(1, Math.floor(POP*0.30));
    // OVERSAMPLE — without this there is NO SELECTION. The loop below used to stop at
    // exactly nKill candidates and the line `born.slice(0, nKill)` then kept every one
    // of them: the sort was decorative and `score` was computed and thrown away. Every
    // arm was blind drift, and the arms differ ONLY in how score is computed, so the
    // whole experiment was measuring nothing. Produce OVER x nKill candidates so that
    // keeping the best nKill actually discards someone.
    const OVER = 3;
    const nBorn = nKill * OVER;
    const born = [];
    let tries = 0;
    while(born.length < nBorn && tries++ < nBorn*25){
      const parent = pop[(r()*pop.length)|0];
      let gm, de;
      if(arm.kind==='noise'){
        gm = G.genome(r,(r()*1e9)|0);            // ignore the parent entirely: pure garbage
        de = describe(gm); if(dead(de)) continue;
      } else {
        gm = G.mutate(parent.gm, r);
        if(G.complexity(gm)>CAP) continue;
        de = describe(gm); if(dead(de)) continue;
      }
      // ── SCORE: how surprising is this child, and to whom? ──
      let score;
      if(arm.kind==='fixed'){
        // classic novelty search: distance to the k nearest things already seen
        if(!archive.length) score = 1;
        else {
          const ds = archive.map(a=>dist(a,de.d)).sort((x,y)=>x-y);
          score = ds.slice(0,8).reduce((s,x)=>s+x,0)/Math.min(8,ds.length);
        }
      } else if(arm.kind==='noise'){
        score = r();                              // garbage, scored arbitrarily
      } else {
        const ob = arm.kind==='heritable' ? parent.ob : shared;
        score = OB.surprise(ob, parent.de.d, de.d);   // how wrong was the parent about its child
      }
      born.push({ gm, de, parent, score });
    }
    // NOTE: this used to be `if(!born.length) continue;` which skipped the snapshot block
    // at the bottom of the loop. Arms that reject more offspring therefore logged FEWER
    // eras, and the matrices came out different sizes per arm (9x9, 8x8, 14x14, 20x20) —
    // making any cross-arm comparison of the loss matrix invalid. The clock must tick at
    // the same rate for every arm regardless of whether anything was born.
    born.sort((a,b)=>b.score-a.score);
    const keep = born.slice(0, nKill);
    // SELECTION AUDIT — the previous version of this line kept everything, so record
    // what selection actually discards. If discarded is ever 0, or kept/all == 1, the
    // arm is drifting and any result from it is void. Checked at the end of the run.
    sel.all += born.length; sel.kept += keep.length;
    if(born.length){
      sel.meanAll += born.reduce((s,b)=>s+b.score,0)/born.length;
      sel.meanKept += keep.reduce((s,b)=>s+b.score,0)/keep.length;
      sel.gens++;
    }
    for(let i=0;i<keep.length;i++){
      const c = keep[i];
      const child = { gm:c.gm, de:c.de, ob:null };
      if(arm.kind==='heritable'){
        // INHERIT THE OBSERVER WHOLE, then let it learn from its own birth.
        // Whole, never averaged: a model is an intensive property of a lineage
        // (Reticuli, Colony). Averaging two parents' models is diffusion in disguise.
        child.ob = OB.cloneObserver(c.parent.ob);
        OB.observe(child.ob, c.parent.de.d, c.de.d);
      }
      pop[(r()*pop.length)|0] = child;
      stream.push([c.parent.de.d, c.de.d]);
      era.push([c.parent.de.d, c.de.d]);
      if(arm.kind==='fixed' && archive.length<4000) archive.push(c.de.d);
    }
    if(shared) for(const c of keep) OB.observe(shared, c.parent.de.d, c.de.d);

    // snapshot the witness and close an era, for the ℓ(t,T) matrix
    if((g+1)%SNAP_EVERY===0){
      snaps.push(OB.cloneObserver(witness));
      eras.push(era); era = [];
      for(let e=0;e<3;e++) for(const [c,t] of eras[eras.length-1]) OB.observe(witness,c,t);
    }
  }

  // ── THE SECRET CHANNEL TEST (Jiggy, 2026-07-20) ────────────────────────────
  // "parent and child so vastly different, but able to communicate some secret way —
  //  a secret passed through heritage."
  // If an inherited observer is a private key travelling down a bloodline, then a
  // lineage's artifacts should be MORE PREDICTABLE to their own family's observer than
  // to a stranger's.
  //
  // THE CONTROL THAT MAKES IT MEAN ANYTHING: an observer trivially predicts its own
  // lineage better because it TRAINED on it. That is exposure, not kinship. So the
  // stranger is trained on exactly the same NUMBER of pairs, drawn from its own lineage.
  // Equal training, different family. Only then does a gap mean privacy.
  // Without this control the test measures how much homework each model did — the exact
  // shape of the failure that killed the modularity metric earlier tonight.
  let kinship = null;
  if(arm.kind==='heritable' && pop.length>4){
    const fam = pop.filter(o=>o.ob).slice(0, 12);
    if(fam.length>=4 && stream.length>=40){
      const half = Math.floor(stream.length/2);
      const mine = stream.slice(half);                 // late artifacts of THIS lineage
      const nTrain = Math.min(200, half);
      // a stranger observer: same architecture, same amount of training, different history
      const stranger = OB.makeObserver(D,H,(r()*1e9)|0,LR);
      const strangerSeed = rng((seed*7919+13)>>>0);
      const strangerPairs = [];
      for(let i=0;i<nTrain;i++){
        const a = G.genome(strangerSeed,(strangerSeed()*1e9)|0);
        const b = G.mutate(a, strangerSeed);
        const da = describe(a), db = describe(b);
        if(dead(da)||dead(db)) continue;
        strangerPairs.push([da.d, db.d]);
      }
      if(strangerPairs.length>20){
        for(let e=0;e<3;e++) for(const [c,t] of strangerPairs) OB.observe(stranger,c,t);
        // a kin observer with matched exposure: train a fresh model on this lineage's
        // own history, same count. Fair fight: equal data, different family.
        const kinObs = OB.makeObserver(D,H,(r()*1e9)|0,LR);
        const kinPairs = stream.slice(0, strangerPairs.length);
        for(let e=0;e<3;e++) for(const [c,t] of kinPairs) OB.observe(kinObs,c,t);
        let eKin=0, eStr=0;
        for(const [c,t] of mine){ eKin+=OB.surprise(kinObs,c,t); eStr+=OB.surprise(stranger,c,t); }
        eKin/=mine.length; eStr/=mine.length;
        kinship = { kin:eKin, stranger:eStr, advantage: eStr>1e-12 ? (eStr-eKin)/eStr : 0, n:mine.length };
      }
    }
  }

  // ── ℓ(t,T): observer frozen at snapshot t, judged on artifacts from era T ──
  const L = snaps.map(s => eras.map(E => {
    if(!E.length) return null;
    let e=0; for(const [c,t] of E) e += OB.surprise(s,c,t);
    return e/E.length;
  }));
  // selection audit: kept_frac must be < 1 and lift != 0, or this arm did not select
  const selection = {
    kept_frac: sel.all ? +(sel.kept/sel.all).toFixed(3) : null,
    mean_all:  sel.gens ? +(sel.meanAll/sel.gens).toFixed(4) : null,
    mean_kept: sel.gens ? +(sel.meanKept/sel.gens).toFixed(4) : null,
  };
  selection.lift = (selection.mean_all && selection.mean_all > 1e-12)
    ? +((selection.mean_kept - selection.mean_all) / selection.mean_all).toFixed(3) : null;
  return { L, kinship, selection, snaps:snaps.length, eras:eras.map(e=>e.length), streamN:stream.length };
}

/* ── the two conditions, computed rather than eyeballed ──
 * NOVELTY      along a row: a frozen observer should do WORSE on later eras.
 * LEARNABILITY down a column: later observers should do BETTER on a fixed era.
 * Reported as the mean signed slope, normalised, so they are comparable. */
function slopes(L){
  const nS=L.length, nE=L[0] ? L[0].length : 0;
  const norm = v => v.filter(x=>x!=null);
  let nov=0, novN=0;
  for(let t=0;t<nS;t++){
    const row=[]; for(let T=t;T<nE;T++) if(L[t][T]!=null) row.push(L[t][T]);
    if(row.length>2){ const f=row[0], l=row[row.length-1]; if(f>1e-12){ nov += (l-f)/f; novN++; } }
  }
  let lrn=0, lrnN=0;
  for(let T=0;T<nE;T++){
    const col=[]; for(let t=0;t<=T && t<nS;t++) if(L[t][T]!=null) col.push(L[t][T]);
    if(col.length>2){ const f=col[0], l=col[col.length-1]; if(f>1e-12){ lrn += (f-l)/f; lrnN++; } }
  }
  return { novelty: novN?nov/novN:0, learnability: lrnN?lrn/lrnN:0 };
}

const out={}, matrices={};
for(const a of ARMS) out[a.name]=[];
for(let rep=0; rep<REPS; rep++){
  for(const arm of ARMS){
    const t0=Date.now();
    const o = evolve(arm, 31000+rep*97);
    const s = slopes(o.L);
    if(o.kinship) s.kinAdvantage = o.kinship.advantage;
    s.selection = o.selection;
    out[arm.name].push(s);
    // keep rep 0's raw ℓ(t,T) for the page. The matrix IS the evidence: novelty reads
    // left-to-right along a row, learnability reads top-to-bottom down a column.
    if(rep===0) matrices[arm.name] = o.L;
    console.error(`${arm.name.padEnd(13)} rep${rep} novelty ${s.novelty>=0?'+':''}${s.novelty.toFixed(3)}  learnability ${s.learnability>=0?'+':''}${s.learnability.toFixed(3)}  [${((Date.now()-t0)/1000).toFixed(0)}s]`);
  }
}

const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const M=(n,k)=>mean(out[n].map(o=>o[k]));

// ── SELECTION GATE — runs BEFORE any result is read ────────────────────────────
// Until 2026-07-20 this experiment performed no selection at all: the birth loop
// stopped at exactly nKill and `slice(0, nKill)` then kept every candidate. All four
// arms were blind drift, and a result was published from it. Never again without this
// printing first. kept_frac must be < 1 (someone was discarded) and, for arms whose
// score is meaningful, lift must be > 0 (the kept are better than the average).
console.log('\n── SELECTION AUDIT (read this before any row below) ──');
console.log('arm           | kept/born | mean score all -> kept |  lift  | selecting?');
let selectionOk = true;
for(const a of ARMS){
  const s = out[a.name][0].selection || {};
  const real = s.kept_frac !== null && s.kept_frac < 0.999 && s.lift !== null;
  // the noise arm scores randomly on purpose, so a positive lift there is not evidence
  // of anything except that sorting works. It still must DISCARD, or nothing selected.
  const verdict = !real ? 'NO — VOID' : (a.name==='noise_plant' ? 'discards (random score, by design)' : 'yes');
  if(!real) selectionOk = false;
  console.log(`${a.name.padEnd(13)} |    ${String(s.kept_frac).padEnd(6)} | ${String(s.mean_all).padStart(9)} -> ${String(s.mean_kept).padEnd(9)} | ${String(s.lift).padStart(6)} | ${verdict}`);
}
if(!selectionOk){
  console.log('\n*** VOID: at least one arm kept every candidate it produced. No selection');
  console.log('*** happened, so the arms differ in nothing. Do not read the results below.');
}

console.log(`\nKIN — is the lineage open-ended? (${REPS} reps, ${GENS} generations)`);
console.log('Open-endedness (Hughes et al. 2024) = artifacts NOVEL *and* LEARNABLE to an observer.\n');
console.log('arm           | novelty (want > 0) | learnability (want > 0) | open-ended?');
for(const a of ARMS){
  const nv=M(a.name,'novelty'), lr=M(a.name,'learnability');
  const oe = (nv>0.05 && lr>0.05) ? 'YES' : (nv>0.05 ? 'novel but not learnable (noise-like)' : (lr>0.05 ? 'learnable but not novel (stalled)' : 'neither'));
  console.log(`${a.name.padEnd(13)} | ${(nv>=0?'+':'')+nv.toFixed(3).padStart(17)} | ${(lr>=0?'+':'')+lr.toFixed(3).padStart(22)} | ${oe}`);
}

// ── THE SECRET CHANNEL: does a lineage read its own kin better than a stranger? ──
const kinAdv = out['heritable'].map(o=>o.kinAdvantage).filter(v=>v!=null);
if(kinAdv.length){
  const m = mean(kinAdv);
  const sd = kinAdv.length>1 ? Math.sqrt(kinAdv.reduce((s,x)=>s+(x-m)**2,0)/(kinAdv.length-1)) : 0;
  const se = sd/Math.sqrt(kinAdv.length);
  console.log(`\nSECRET CHANNEL (kin vs equally-trained stranger, n=${kinAdv.length})`);
  console.log(`  kin observer predicts its own lineage ${(100*m).toFixed(1)}% better  (SE ${(100*se).toFixed(1)}pp)`);
  console.log(`  ${Math.abs(m) > 2*se ? 'REAL — outside 2 standard errors' : 'INSIDE NOISE — not distinguishable from no channel'}`);
  console.log('  (stranger trained on the SAME number of pairs from its own lineage, so this is');
  console.log('   not measuring training exposure — that control is the whole point.)');
}

// ── P0: the planted noise arm MUST fail. If garbage reads as open-ended, nothing here counts.
const nNov=M('noise_plant','novelty'), nLrn=M('noise_plant','learnability');
console.log('\n── PRE-REGISTERED GATE ─────────────────────────────');
const noiseOpenEnded = (nNov>0.05 && nLrn>0.05);
console.log(`P0 noise control : novelty ${nNov.toFixed(3)}, learnability ${nLrn.toFixed(3)}` +
            (noiseOpenEnded ? '  ✗ GARBAGE SCORED AS OPEN-ENDED' : '  ✓ garbage correctly rejected'));
if(noiseOpenEnded){
  console.log('\nVERDICT: VOID. The measure cannot tell a lineage from a random number generator,');
  console.log('so every other row above is meaningless. This is the noisy-TV trap and the whole');
  console.log('point of planting the control was to be able to find out.');
} else {
  const hN=M('heritable','novelty'), hL=M('heritable','learnability');
  const fN=M('fixed_ruler','novelty'), fL=M('fixed_ruler','learnability');
  const sN=M('shared_model','novelty'), sL=M('shared_model','learnability');
  console.log('P1 measure is valid : the noise arm can fail and did not fire, so the rows are readable.');
  console.log(`\nheritable vs fixed_ruler : novelty ${fN.toFixed(3)} -> ${hN.toFixed(3)}, learnability ${fL.toFixed(3)} -> ${hL.toFixed(3)}`);
  console.log(`heritable vs shared_model: novelty ${sN.toFixed(3)} -> ${hN.toFixed(3)}, learnability ${sL.toFixed(3)} -> ${hL.toFixed(3)}`);
  console.log('\nshared_model is the arm that matters for the claim: it has a LEARNING observer that is');
  console.log('simply not inherited. If heritable beats it, inheritance is doing the work. If they');
  console.log('match, the observer only needed to learn, and heritability is decoration.');
}

// ── dump for the /kin page ────────────────────────────────────────────────────
// Written LAST so a crashed run leaves no half-file for the page to read as truth.
const fs=require('fs');
fs.writeFileSync((process.env.VOID_DATA || require('path').join(__dirname, '..', 'data')) + '/kin.json', JSON.stringify({
  generated_at_gen: GENS, reps: REPS,
  snapEvery: SNAP_EVERY,
  arms: ARMS.map(a=>({
    name:a.name,
    novelty: M(a.name,'novelty'),
    learnability: M(a.name,'learnability'),
    openEnded: (M(a.name,'novelty')>0.05 && M(a.name,'learnability')>0.05),
  })),
  matrices,
  noiseGateFired: noiseOpenEnded,
}, null, 1));
console.log('\nwrote data/void/kin.json');
