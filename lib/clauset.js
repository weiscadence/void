// Clauset-Shalizi-Newman power-law goodness-of-fit for discrete data.
// Grok's hole #3: log-log R^2 is a signal, not a test. This is the test.
//   - alpha by MLE over the discrete tail (>= xmin), with the standard continuous
//     approximation using (xmin - 0.5) — good to <1% for xmin >~ 6.
//   - xmin chosen by minimising the KS distance between empirical and fitted CDF.
//   - p-value by SEMI-PARAMETRIC BOOTSTRAP (Clauset 2009 §4.1): synthesise many datasets
//     that are power-law above xmin and match the empirical below it, refit each end-to-end,
//     and count how often the synthetic KS distance >= the observed. p >= 0.1 => power law
//     is a plausible fit (NOT proof); p < 0.1 => reject power law.
//   - exponential alternative by Vuong's normalised log-likelihood ratio: sign says which
//     distribution fits better, |R|/sqrt(n)/sigma gives significance. A power-law claim is
//     only honest if it also BEATS the exponential (LR > 0 with a significant p).
// Pure + seeded so a run is reproducible.

function hurwitzZeta(s, q) {
  // sum_{k=0}^inf (q+k)^-s  — direct terms + Euler-Maclaurin tail. s>1, q>0.
  let sum = 0;
  const N = 30;
  for (let k = 0; k < N; k++) sum += Math.pow(q + k, -s);
  const a = q + N;
  sum += Math.pow(a, 1 - s) / (s - 1);           // integral tail
  sum += 0.5 * Math.pow(a, -s);                   // first EM correction
  sum += (s / 12) * Math.pow(a, -s - 1);          // second
  return sum;
}

function alphaMLE(tail, xmin) {
  // continuous-approx discrete MLE (Clauset eq. 3.7)
  let s = 0; for (const x of tail) s += Math.log(x / (xmin - 0.5));
  return 1 + tail.length / s;
}

function ksDistance(tail, xmin, alpha) {
  const n = tail.length;
  const sorted = tail.slice().sort((a, b) => a - b);
  const Z = hurwitzZeta(alpha, xmin);
  let cdfModel = 0, maxD = 0, i = 0;
  // empirical CDF stepped at each distinct value; model CDF via cumulative pmf
  const uniq = [...new Set(sorted)];
  let cum = 0;
  for (const x of uniq) {
    // count empirical <= x
    while (i < n && sorted[i] <= x) i++;
    const emp = i / n;
    // model P(X <= x) = 1 - sum_{k=x+1}^inf ... = cumulative pmf up to x
    cum += Math.pow(x, -alpha) / Z;
    const d = Math.abs(emp - cum);
    if (d > maxD) maxD = d;
  }
  return maxD;
}

function fitPowerLaw(data, opts = {}) {
  const vals = data.filter(x => x >= 1 && Number.isFinite(x));
  if (vals.length < 20) return { ok: false, reason: 'n<20', n: vals.length };
  const candidates = [...new Set(vals)].sort((a, b) => a - b);
  const maxXmin = opts.maxXmin ?? candidates[Math.floor(candidates.length * 0.9)];
  let best = null;
  for (const xmin of candidates) {
    if (xmin < 2 || xmin > maxXmin) continue;
    const tail = vals.filter(x => x >= xmin);
    if (tail.length < 15) break;                  // too few points left to fit
    const alpha = alphaMLE(tail, xmin);
    if (!(alpha > 1) || !Number.isFinite(alpha)) continue;
    const D = ksDistance(tail, xmin, alpha);
    if (!best || D < best.D) best = { xmin, alpha, D, nTail: tail.length };
  }
  if (!best) return { ok: false, reason: 'no-fit', n: vals.length };
  return { ok: true, n: vals.length, ...best };
}

// discrete power-law sampler above xmin via inverse-CDF on a precomputed table
function makeSampler(alpha, xmin, rand) {
  const Z = hurwitzZeta(alpha, xmin);
  return () => {
    let u = rand(), cum = 0, x = xmin;
    while (x < xmin + 100000) {
      cum += Math.pow(x, -alpha) / Z;
      if (u <= cum) return x;
      x++;
    }
    return x;
  };
}

function bootstrapP(data, fit, nBoot, rand) {
  const vals = data.filter(x => x >= 1 && Number.isFinite(x));
  const n = vals.length;
  const below = vals.filter(x => x < fit.xmin);
  const ptail = fit.nTail / n;
  const sample = makeSampler(fit.alpha, fit.xmin, rand);
  let ge = 0;
  for (let b = 0; b < nBoot; b++) {
    const syn = [];
    for (let i = 0; i < n; i++) {
      if (rand() < ptail) syn.push(sample());
      else syn.push(below.length ? below[(rand() * below.length) | 0] : fit.xmin - 1);
    }
    const f = fitPowerLaw(syn, { maxXmin: fit.xmin * 3 });
    if (f.ok && f.D >= fit.D) ge++;
  }
  return ge / nBoot;
}

// discrete exponential MLE on the tail (x >= xmin), lambda from mean; Vuong LR vs power law.
function vsExponential(data, fit) {
  const tail = data.filter(x => x >= fit.xmin && Number.isFinite(x));
  const n = tail.length;
  const mean = tail.reduce((a, b) => a + b, 0) / n;
  // discrete exponential p(x) = (1-e^-l) e^{-l(x-xmin)} ; MLE: mean = xmin + 1/(e^l - 1)
  const m = mean - fit.xmin;
  const lambda = Math.log(1 + 1 / Math.max(m, 1e-9));
  const Zp = hurwitzZeta(fit.alpha, fit.xmin);
  const logC = Math.log(1 - Math.exp(-lambda));
  let R = 0; const li = [];
  for (const x of tail) {
    const lpl = -fit.alpha * Math.log(x) - Math.log(Zp);
    const lex = logC - lambda * (x - fit.xmin);
    li.push(lpl - lex); R += (lpl - lex);
  }
  const mu = R / n;
  let v = 0; for (const d of li) v += (d - mu) * (d - mu); v /= n;
  const sigma = Math.sqrt(v);
  const Rnorm = R / (Math.sqrt(n) * (sigma || 1e-9));   // Vuong statistic
  // two-sided normal p
  const p = erfc(Math.abs(Rnorm) / Math.SQRT2);
  return { LR: +R.toFixed(2), Rnorm: +Rnorm.toFixed(2), p: +p.toFixed(3), favors: R > 0 ? 'powerlaw' : 'exponential' };
}

function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

module.exports = { fitPowerLaw, bootstrapP, vsExponential, hurwitzZeta };
