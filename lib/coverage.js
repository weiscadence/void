'use strict';
// Rule/canary coverage gate.
//
// Why this exists, precisely. On 2026-08-03 a pre-registered SOC test printed a verdict with two
// canaries green and both of them honest. The conservation canary proved the energy books balanced
// (6.9e-15). The wiring canary proved the drive knob moved the world (13.7x response in POPULATION).
// The rule that failed consumed AVALANCHES. Nothing anywhere checked that the knob moved avalanches,
// and it did not: the slow-drive throttle only fires while an avalanche is in progress, avalanches
// never happened, so the throttle branch never executed and the negative control re-ran the
// treatment. Visible in the raw numbers — one seed injected 42327 units in BOTH blocks, another
// 42484 in both. Identical to the unit.
//
// The generalisation, sharpened by @2clawz's correlated-witness critique on Moltbook (their version:
// two price oracles reading the same exchanges are one witness and a copy, not two): the requirement
// is not that your checks be independent, and not even that they fail for different reasons. It is
// that EACH CHECK BE CONNECTED TO THE SPECIFIC CLAIM IT IS COUNTED FOR. Two checks can fail for
// entirely unrelated reasons and still be jointly useless if neither touches the readout under test.
// Correlated failure causes is the version you can see. Shared disconnection from the readout is the
// version that passes every check you own.
//
// So: rules declare the statistic they consume. Canaries declare the statistic they demonstrably
// moved. A verdict is withheld unless every rule's statistic is covered by a canary that showed a
// real response in THAT statistic — not merely a canary that ran without crashing.

class Coverage {
  constructor() { this.rules = []; this.canaries = []; }

  // statistic: the name of the quantity this rule's pass/fail is computed from.
  rule(id, statistic, note = '') {
    this.rules.push({ id, statistic, note });
    return this;
  }

  // A canary covers `statistic` only if it moved it. `lo`/`hi` are the statistic's value at the two
  // extremes of the knob; `minRatio` is the response required to count as connected. A canary that
  // passed but showed a flat statistic is recorded as INERT — which is the exact state the 2026-08-03
  // run was in for avalanches, and the state that reads as a clean result.
  // Both tests must hold, and the second one is why: a bare ratio explodes off a zero baseline.
  // 0 -> 1 avalanches is a 1e12x "response" under a naive min-floor, and the first version of this
  // file scored exactly that as connected — its own canary caught it. A count that reaches 1 is not
  // reachable in a usable range; you cannot fit a distribution to it. So a shifted ratio (immune to
  // the zero baseline) AND an absolute movement floor.
  canary(id, statistic, { lo, hi, minRatio = 2, minDelta = 5 } = {}) {
    const a = Math.abs(lo), b = Math.abs(hi);
    const ratio = (Math.max(a, b) + 1) / (Math.min(a, b) + 1);
    const delta = Math.abs(b - a);
    const moved = Number.isFinite(ratio) && ratio >= minRatio && delta >= minDelta;
    this.canaries.push({ id, statistic, lo, hi, ratio, delta, moved, minRatio, minDelta });
    return this;
  }

  gate() {
    const uncovered = [], inert = [];
    for (const r of this.rules) {
      const touching = this.canaries.filter(c => c.statistic === r.statistic);
      if (touching.length === 0) { uncovered.push(r); continue; }
      if (!touching.some(c => c.moved)) inert.push({ rule: r, canaries: touching });
    }
    return { ok: uncovered.length === 0 && inert.length === 0, uncovered, inert };
  }

  // Prints the diagnosis and returns the gate result. Callers exit(2) on !ok — a withheld verdict,
  // not a FAIL. A rule whose statistic nothing can move has not been tested and did not lose.
  report(log = console.error) {
    const g = this.gate();
    for (const r of g.uncovered) {
      log(`UNCOVERED rule ${r.id}: consumes "${r.statistic}", no canary exercises that statistic.`);
      log(`  Its verdict would be uninterpretable — a fail could mean the world said no, or that`);
      log(`  the statistic was never reachable from the knob. Those are different findings.`);
    }
    for (const i of g.inert) {
      const c = i.canaries.map(x => `${x.id} (${x.lo} -> ${x.hi}, ${x.ratio.toFixed(2)}x, delta ${x.delta}; needs ${x.minRatio}x and ${x.minDelta})`).join(', ');
      log(`INERT rule ${i.rule.id}: consumes "${i.rule.statistic}", canaries touch it but did not move it: ${c}`);
      log(`  The knob is not connected to this readout. Treatment and control are the same condition.`);
    }
    return g;
  }
}

module.exports = { Coverage };
