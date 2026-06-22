'use strict';

/**
 *  Scaling-exponent computation for the jssm scaling benchmark.  Pure
 *  post-processing of the per-run ops: fit `log(ops)` vs `log(N)` across each
 *  shape family's size sweep to recover an empirical cost exponent (O(1)→~0,
 *  O(N)→~1, O(N²)→~2) plus R², so a superlinear regression is auto-flagged.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Parse a scaling shape name (`<family>-<N>`, e.g. `dense-200`) into its parts.
 *
 *  @param name Shape name.
 *  @returns `{ family, n }`, or `null` when the name isn't `<letters>-<digits>`.
 *
 *  @example parseShape('chain-1000') // => { family: 'chain', n: 1000 }
 */
function parseShape(name) {
  const m = name.match(/^([a-z]+)-(\d+)$/);
  if (!m) { return null; }
  return { family: m[1], n: parseInt(m[2], 10) };
}

/**
 *  Least-squares fit of `log(y)` against `log(x)`.  The slope is the power-law
 *  exponent of `y` in `x`; `r2` is the coefficient of determination (1 = perfect
 *  line in log-log space).
 *
 *  @param points Array of `{ x, y }` with positive x and y.
 *  @returns `{ slope, r2 }`.
 *
 *  @example logLogFit([{x:1,y:1},{x:2,y:4},{x:4,y:16}]) // => { slope: ~2, r2: ~1 }
 */
function logLogFit(points) {
  const xs = points.map((p) => Math.log(p.x));
  const ys = points.map((p) => Math.log(p.y));
  const n  = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; ++i) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const r2    = (sxx === 0 || syy === 0) ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, r2 };
}

/**
 *  Compute the cost-scaling exponent per operation and shape-family from a
 *  results set.  Groups `<family>-<N> <op>` rows by (op, family), fits
 *  `log(ops)` vs `log(N)`, and reports `exponent = −slope` (so O(1)→~0,
 *  O(N)→~1, O(N²)→~2) plus R² and the point count.  Families with fewer than
 *  `minPoints` sizes, non-positive ops, and unparseable names are skipped.
 *
 *  @param results The `scaling.json` `results` array (`{ name, ops }`).
 *  @param minPoints Minimum sizes in a family to fit (default 2).
 *  @returns `{ [op]: { [family]: { exponent, r2, points } } }`.
 *
 *  @example computeExponents([{name:'chain-10 t()',ops:8},{name:'chain-100 t()',ops:4}])
 */
function computeExponents(results, minPoints = 2) {
  const byOp = new Map();   // op -> Map(family -> [{x, y}])
  for (const r of results) {
    const sp     = r.name.lastIndexOf(' ');
    const shape  = r.name.slice(0, sp);
    const op     = r.name.slice(sp + 1);
    const parsed = parseShape(shape);
    if (!parsed || !(r.ops > 0)) { continue; }
    if (!byOp.has(op)) { byOp.set(op, new Map()); }
    const fam = byOp.get(op);
    if (!fam.has(parsed.family)) { fam.set(parsed.family, []); }
    fam.get(parsed.family).push({ x: parsed.n, y: r.ops });
  }

  const out = {};
  for (const [op, fam] of byOp) {
    for (const [family, pts] of fam) {
      if (pts.length < minPoints) { continue; }
      const { slope, r2 } = logLogFit(pts);
      if (!out[op]) { out[op] = {}; }
      out[op][family] = { exponent: -slope, r2, points: pts.length };
    }
  }
  return out;
}

module.exports = { parseShape, logLogFit, computeExponents };
