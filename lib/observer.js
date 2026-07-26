/* observer.js — a small TRAINABLE model that watches artifacts and learns to predict them.
 *
 * This is the thing /kin makes heritable. In Hughes et al. 2024's formalism an observer
 * holds a predictive model X̂ₜ trained on artifacts up to time t, and open-endedness is
 * defined by how its loss ℓ(t,T) behaves:
 *     NOVELTY      ℓ rises with T for a frozen observer   (later artifacts surprise it more)
 *     LEARNABILITY ℓ falls with t for a fixed artifact    (watching longer predicts better)
 * Both, or it isn't open-endedness. Novelty alone is satisfied by pure noise.
 *
 * WHY AN AUTOENCODER. The observer's job is "how well do I model the kind of thing this
 * lineage makes?" Reconstruction error through a bottleneck answers exactly that: structure
 * that recurs gets compressed and predicted well; genuinely new structure reconstructs badly
 * until learned. This is Schmidhuber's compression-progress framing, which is the same idea
 * as learning progress and is the established answer to the noisy-TV problem.
 *
 * THE BOTTLENECK IS LOAD-BEARING, NOT DECORATION. H < D is what makes noise unlearnable:
 * a low-dimensional code cannot memorise incompressible data no matter how long it trains.
 * That is the property the whole experiment rests on, so observer.test.js measures it
 * directly rather than trusting this comment.
 *
 * SCORE ON LEARNING PROGRESS, NOT RAW ERROR. Raw prediction error is maximised by noise —
 * the noisy-TV trap, named by Schmidhuber in 1991 and re-derived badly by many since
 * (nearly including me). progress() reports how much the error FELL, which noise cannot fake.
 */
'use strict';

function rng(s){ let a=s>>>0; return()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }

/* D = artifact dimension, H = bottleneck (must be < D or noise becomes learnable). */
function makeObserver(D, H, seed, lr){
  if(!(H < D)) throw new Error(`observer bottleneck must be < D (got H=${H}, D=${D}) — otherwise it can memorise noise and learnability is meaningless`);
  const r = rng(seed>>>0);
  const g = n => { const a=new Float64Array(n); for(let i=0;i<n;i++) a[i]=(r()*2-1)*0.5; return a; };
  return { D, H, lr: lr==null?0.05:lr,
           W1: g(H*D), b1: new Float64Array(H),
           W2: g(D*H), b2: new Float64Array(D),
           seen: 0 };
}

// deep copy — inheritance must carry the observer WHOLE.
// Reticuli's extensive/intensive point on Colony: a model is an INTENSIVE property of a
// lineage. Averaging two parents' observers would be the interpolation bug in a new coat.
function cloneObserver(o){
  return { D:o.D, H:o.H, lr:o.lr, seen:o.seen,
           W1:Float64Array.from(o.W1), b1:Float64Array.from(o.b1),
           W2:Float64Array.from(o.W2), b2:Float64Array.from(o.b2) };
}

function forward(o, x, h, y){
  const {D,H,W1,b1,W2,b2}=o;
  for(let j=0;j<H;j++){ let s=b1[j]; const off=j*D; for(let i=0;i<D;i++) s+=W1[off+i]*x[i]; h[j]=Math.tanh(s); }
  for(let i=0;i<D;i++){ let s=b2[i]; const off=i*H; for(let j=0;j<H;j++) s+=W2[off+j]*h[j]; y[i]=s; }
  return y;
}

/* PREDICTION error: given `cue` (the parent), how wrong was the guess at `target` (the child)?
 *
 * THIS MUST BE PREDICTION, NOT RECONSTRUCTION — the first version got it wrong and the unit
 * test caught it by the numbers rather than by argument. As an autoencoder (cue === target)
 * it "learned away" 41% of pure uniform noise on HELD-OUT data. That was not overfitting:
 * 0.21 is (D-H)/D of the variance. An autoencoder SEES ITS OWN INPUT, so it can always
 * project anything — noise included — onto its bottleneck and reconstruct that part exactly.
 * Compressing noise is free; predicting it is impossible. Only the second one measures
 * what open-endedness is about.
 *
 * In /kin the cue is the parent's descriptor and the target is the child's: "how well can
 * I predict my offspring from myself?" A lineage with real structure is predictable from
 * its parent. A lineage emitting garbage is not, no matter how long anyone watches. */
function surprise(o, cue, target){
  const h=new Float64Array(o.H), y=new Float64Array(o.D);
  forward(o,cue,h,y);
  let e=0; for(let i=0;i<o.D;i++){ const d=y[i]-target[i]; e+=d*d; }
  return e/o.D;
}

/* One SGD step on a (cue -> target) pair. Returns the error BEFORE the update. */
function observe(o, cue, target){
  const {D,H,W1,b1,W2,b2,lr}=o;
  const h=new Float64Array(H), y=new Float64Array(D);
  forward(o,cue,h,y);
  let e=0; const dy=new Float64Array(D);
  for(let i=0;i<D;i++){ const d=y[i]-target[i]; e+=d*d; dy[i]=2*d/D; }
  const dh=new Float64Array(H);
  for(let j=0;j<H;j++){ let s=0; for(let i=0;i<D;i++) s+=W2[i*H+j]*dy[i]; dh[j]=s*(1-h[j]*h[j]); }
  for(let i=0;i<D;i++){ const off=i*H; for(let j=0;j<H;j++) W2[off+j]-=lr*dy[i]*h[j]; b2[i]-=lr*dy[i]; }
  for(let j=0;j<H;j++){ const off=j*D; for(let i=0;i<D;i++) W1[off+i]-=lr*dh[j]*cue[i]; b1[j]-=lr*dh[j]; }
  o.seen++;
  return e/D;
}

/* LEARNING PROGRESS — measured on HELD-OUT artifacts, never on the training batch.
 *
 * This distinction is the entire experiment, and the first version got it wrong.
 * Measured on the TRAINING batch, this observer "learned away" 46% of pure uniform noise:
 * with ~59 parameters against 3,200 values it memorised nothing, but the top-3 principal
 * components of any finite random sample capture a large chunk of that sample's variance
 * by chance. That is sample-specific covariance, not structure — the classic failure to
 * separate aleatoric (irreducible) from epistemic (reducible) uncertainty, and it would
 * have handed /kin the noisy-TV trap wearing a lab coat.
 *
 * On held-out draws the difference is categorical rather than a matter of degree:
 * real structure GENERALISES (fresh samples get easier), noise does not (fresh samples
 * stay exactly as hard, because there was never anything to carry over).
 *
 * evalBatch must be drawn from the same source as trainBatch but never trained on. */
function progress(o, trainPairs, evalPairs, epochs, warmup){
  const ep = epochs==null?4:epochs, wu = warmup==null?4:warmup;
  const evp = evalPairs || trainPairs;
  const meanErr = p => { let s=0; for(const [c,t] of p) s+=surprise(o,c,t); return s/p.length; };
  // WARM UP FIRST. Learning progress is a DERIVATIVE, so it must be measured after the
  // easy win of learning the marginal mean is already banked. Otherwise "figured out the
  // average" counts as progress and noise scores well for a reason that has nothing to do
  // with structure.
  for(let e=0;e<wu;e++) for(const [c,t] of trainPairs) observe(o,c,t);
  const first = meanErr(evp);
  for(let e=0;e<ep;e++) for(const [c,t] of trainPairs) observe(o,c,t);
  const last = meanErr(evp);
  return { before:first, after:last, progress: first>1e-12 ? (first-last)/first : 0 };
}

module.exports = { makeObserver, cloneObserver, surprise, observe, progress, rng };
