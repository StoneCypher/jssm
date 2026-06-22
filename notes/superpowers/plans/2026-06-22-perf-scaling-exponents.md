# Core Scaling-Exponent Metric — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record an empirical big-O exponent (with R²) per operation × shape-family from the size sweep already in `scaling.json`, so a superlinear regression (the O(n²) class) is auto-flagged.

**Architecture:** A new pure module `benchmark_scaling_exponents.cjs` parses shape names, fits `log(ops)` vs `log(N)` per (op, family) by least squares, and returns an exponent (= −slope, i.e. the cost scaling) plus R². `benchmark_scaling.cjs` adds the resulting block to `scaling.json` as a sibling `exponents` key after the suite — additive, no new measurement, no `--expose-gc`.

**Tech Stack:** Node CommonJS `.cjs`, vitest (spec config).

## Global Constraints

- **Additive & feature-gated:** `exponents` is a new sibling key on `scaling.json`; absent/short data → that (op, family) is simply omitted, never a crash. (spec §1)
- **Determinism boundary:** computed from per-run ops; lives only in the per-run JSON. (spec §1)
- **Cost-exponent convention:** `exponent = −slope` of `log(ops)` vs `log(N)`, so O(1)→~0, O(N)→~1, O(N²)→~2. (spec §2.4 "big-O exponent")
- **Node, not Python.** **No golden-file tests** (exact-value/`toBeCloseTo`). **Pathspec commits only.**
- Tests run under `npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false`.

---

### Task 1: Pure fit primitives — `parseShape` + `logLogFit`

**Files:**
- Create: `src/buildjs/benchmark_scaling_exponents.cjs`
- Test: `src/buildjs/tests/benchmark_scaling_exponents.spec.ts`

**Interfaces:**
- Produces: `parseShape(name: string): {family: string, n: number} | null`; `logLogFit(points: {x:number,y:number}[]): {slope: number, r2: number}`.

- [ ] **Step 1: Write the failing test**

```ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exp = require('../benchmark_scaling_exponents.cjs');

describe('parseShape', () => {
  test('splits family and size', () => {
    expect(exp.parseShape('dense-200')).toEqual({ family: 'dense', n: 200 });
    expect(exp.parseShape('messy-5000')).toEqual({ family: 'messy', n: 5000 });
  });
  test('returns null on an unparseable name', () => {
    expect(exp.parseShape('weird')).toBeNull();
  });
});

describe('logLogFit', () => {
  test('recovers the exponent of a clean power law y = x^2 (slope 2, r2 1)', () => {
    const pts = [10, 50, 200, 1000].map((x) => ({ x, y: x * x }));
    const { slope, r2 } = exp.logLogFit(pts);
    expect(slope).toBeCloseTo(2, 6);
    expect(r2).toBeCloseTo(1, 6);
  });
  test('recovers a flat (constant) relationship as slope 0', () => {
    const pts = [10, 50, 200].map((x) => ({ x, y: 42 }));
    const { slope, r2 } = exp.logLogFit(pts);
    expect(slope).toBeCloseTo(0, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_exponents.spec.ts --coverage.enabled=false`
Expected: FAIL — `Cannot find module '../benchmark_scaling_exponents.cjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/buildjs/benchmark_scaling_exponents.cjs
'use strict';

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

module.exports = { parseShape, logLogFit };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_exponents.spec.ts --coverage.enabled=false`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling_exponents.cjs src/buildjs/tests/benchmark_scaling_exponents.spec.ts
git commit -m "feat(bench): log-log fit + shape-name parse primitives"
```

---

### Task 2: `computeExponents` over a results set

**Files:**
- Modify: `src/buildjs/benchmark_scaling_exponents.cjs`
- Test: `src/buildjs/tests/benchmark_scaling_exponents.spec.ts`

**Interfaces:**
- Consumes: `results: {name: string, ops: number}[]` (the `scaling.json` results).
- Produces: `computeExponents(results, minPoints=2): { [op]: { [family]: {exponent, r2, points} } }`. `exponent = −slope`. Families with fewer than `minPoints` sizes, or any non-positive ops, are skipped.

- [ ] **Step 1: Write the failing test**

```ts
describe('computeExponents', () => {
  test('emits exponent (=-slope) and r2 per op and family', () => {
    const results = [
      { name: 'chain-10 edges_between()',   ops: 1000 },
      { name: 'chain-100 edges_between()',  ops: 100 },     // ops ∝ 1/N  -> cost exponent 1
      { name: 'chain-1000 edges_between()', ops: 10 },
      { name: 'dense-10 edges_between()',   ops: 50 },      // only one dense point -> skipped
    ];
    const out = exp.computeExponents(results);
    expect(out['edges_between()'].chain.exponent).toBeCloseTo(1, 6);
    expect(out['edges_between()'].chain.r2).toBeCloseTo(1, 6);
    expect(out['edges_between()'].chain.points).toBe(3);
    expect(out['edges_between()'].dense).toBeUndefined();   // <2 points
  });

  test('skips non-positive ops and unparseable shapes without throwing', () => {
    const results = [
      { name: 'chain-10 transition()',  ops: 0 },
      { name: 'weird transition()',     ops: 5 },
      { name: 'chain-50 transition()',  ops: 5 },
    ];
    const out = exp.computeExponents(results);
    expect(out['transition()']).toBeUndefined();   // only one usable point
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_exponents.spec.ts --coverage.enabled=false`
Expected: FAIL — `exp.computeExponents is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/buildjs/benchmark_scaling_exponents.cjs, above module.exports

/**
 *  Compute the cost-scaling exponent per operation and shape-family from a
 *  results set.  Groups `<family>-<N> <op>` rows by (op, family), fits
 *  `log(ops)` vs `log(N)`, and reports `exponent = −slope` (so O(1)→~0,
 *  O(N)→~1, O(N²)→~2) plus R² and the point count.  Families with fewer than
 *  `minPoints` sizes, non-positive ops, and unparseable names are skipped.
 *
 *  @param results The `scaling.json` `results` array.
 *  @param minPoints Minimum sizes in a family to fit (default 2).
 *  @returns `{ [op]: { [family]: { exponent, r2, points } } }`.
 */
function computeExponents(results, minPoints = 2) {
  const byOp = new Map();   // op -> Map(family -> [{x,y}])
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
```

Update exports:

```js
module.exports = { parseShape, logLogFit, computeExponents };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_exponents.spec.ts --coverage.enabled=false`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling_exponents.cjs src/buildjs/tests/benchmark_scaling_exponents.spec.ts
git commit -m "feat(bench): per-op/family scaling-exponent computation"
```

---

### Task 3: Wire `exponents` into the saved scaling.json

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` (require near L11; add the write inside the `b.complete` `setImmediate`, after `memoryPass()`)

**Interfaces:**
- Consumes: `exponents.computeExponents` (Task 2) and the saved `benchmark/results/scaling.json`.
- Produces: a `data.exponents` block on `scaling.json`.

- [ ] **Step 1: Add the require**

In `src/buildjs/benchmark_scaling.cjs`, after the `const memory = require('./benchmark_scaling_memory.cjs');` line, add:

```js
const exponents = require('./benchmark_scaling_exponents.cjs');
```

- [ ] **Step 2: Add an `exponentsPass` helper just above `b.suite(`**

```js
/**
 *  Compute the per-op/family scaling exponents from the saved ops and write them
 *  to scaling.json as an additive `exponents` block. Pure post-processing — runs
 *  every time (no gc needed), unlike the memory pass.
 */
function exponentsPass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.exponents = exponents.computeExponents(data.results);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}
```

- [ ] **Step 3: Call it in `b.complete`, after `memoryPass()`**

Change the `setImmediate` body so it reads:

```js
    setImmediate(() => {
      if (DEEP) { augmentDeepJson(summary); }
      memoryPass();
      exponentsPass();
      writeMarkdownPivot();
    });
```

- [ ] **Step 4: Verify against the existing scaling.json (fast, no full re-run)**

A prior smoke already produced `benchmark/results/scaling.json`. Confirm the pure computation yields a sensible block over real data:

Run:
```
node -e "const e=require('./src/buildjs/benchmark_scaling_exponents.cjs'); const d=require('./benchmark/results/scaling.json'); const x=e.computeExponents(d.results); console.log('edges_between dense exponent:', x['edges_between()'] && x['edges_between()'].dense); console.log('transition chain exponent:', x['transition()'] && x['transition()'].chain);"
```
Expected: two objects printed, each `{ exponent: <number>, r2: <0..1>, points: <int≥2> }`.

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling.cjs
git commit -m "feat(bench): write per-op/family scaling exponents into scaling.json"
```

---

## Self-Review

**Spec coverage:** metric-design family #4 (scaling exponent + R²) — covered by Tasks 1–3 (fit, per-op/family computation, JSON wiring). R² is emitted alongside every exponent (spec's "so a noisy fit never false-alarms"). No other family is in scope here.

**Placeholder scan:** none — every step shows complete code or an exact command.

**Type consistency:** `parseShape` returns `{family, n}`; `logLogFit` takes `{x,y}[]` and returns `{slope, r2}`; `computeExponents` returns `{ [op]: { [family]: {exponent, r2, points} } }` — used consistently in Tasks 2 and 3. The wiring mirrors the proven `memoryPass` (read fixed path → mutate → write), and the require name `exponents` matches its use in `exponentsPass`.
