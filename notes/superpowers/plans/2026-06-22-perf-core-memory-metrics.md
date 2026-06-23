# Core Memory & Allocation Metrics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-machine memory footprint (bytes, bytes/state, bytes/edge) and per-op allocation cost to the jssm scaling benchmark, emitted as additive fields on `scaling.json` — the metric that would have caught the 5.142–5.143 `edges_between` object-weight regression.

**Architecture:** A new pure-ish module `benchmark_scaling_memory.cjs` holds the measurement primitives behind an injectable `{ gc, heapUsed }` seam (so they unit-test without `--expose-gc`), plus a pure JSON augmenter. `benchmark_scaling.cjs` calls them in its `b.complete` handler and injects fields into the saved `scaling.json` — mirroring the existing `augmentDeepJson` flow. The graviton runner gains `--expose-gc` so production runs populate real numbers; without it the fields are `null` (graceful, like `--harness-from` op-gating).

**Tech Stack:** Node (CommonJS `.cjs`), benny (already the harness), vitest (spec config), jssm public API (`sm`, `list_edges`).

## Global Constraints

- **Additive & feature-gated:** every new metric is a new field on `scaling.json` results; absent capability (`global.gc` missing) → field is `null`, never a crash. (copied from spec §1)
- **Determinism boundary:** measurements live only in the per-run JSON (already non-deterministic); `perf_chart.svg`/`perf_data.json` regen determinism is unaffected. (spec §1)
- **Node, not Python**, for all scripts. (project rule)
- **No golden-file/snapshot tests** — substring / exact-value assertions only. (project rule)
- **Tests run under** `npx vitest run --config vitest.spec.config.ts <file>` (the spec project enables globals + coverage).
- **Pathspec commits only** (`git commit -- <paths>` or `git add <explicit path>`), never `git add -A`. (project rule)
- **Out of scope (sibling plans):** object/Map count per machine (needs heap-snapshot machinery), scaling exponent + R², latency percentiles + run-to-run variance, carrying cost. This plan is the heap-delta family only.

---

### Task 1: Footprint primitive — `measureRetainedBytes`

**Files:**
- Create: `src/buildjs/benchmark_scaling_memory.cjs`
- Test: `src/buildjs/tests/benchmark_scaling_memory.spec.ts`

**Interfaces:**
- Produces: `defaultSeam(): { gc: (()=>void)|null, heapUsed: ()=>number }`; `measureRetainedBytes(buildMachine: ()=>object, seam?): number|null` — retained heap bytes of one machine, or `null` when `seam.gc` is not callable.

- [ ] **Step 1: Write the failing test**

```ts
// src/buildjs/tests/benchmark_scaling_memory.spec.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mem = require('../benchmark_scaling_memory.cjs');

describe('measureRetainedBytes', () => {
  test('returns post-build heap delta when gc is injectable', () => {
    const heap = mkHeap([1_000, 1_500]);            // base, after
    const seam = { gc: () => {}, heapUsed: heap };
    expect(mem.measureRetainedBytes(() => ({}), seam)).toBe(500);
  });

  test('returns null when gc is unavailable (graceful degrade)', () => {
    const seam = { gc: null, heapUsed: () => 0 };
    expect(mem.measureRetainedBytes(() => ({}), seam)).toBeNull();
  });

  test('throws if the build returns undefined (instrument bug guard)', () => {
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 0]) };
    expect(() => mem.measureRetainedBytes(() => undefined, seam)).toThrow();
  });
});

function mkHeap(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: FAIL — `Cannot find module '../benchmark_scaling_memory.cjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/buildjs/benchmark_scaling_memory.cjs
'use strict';

/**
 *  Default measurement seam: the real V8 GC (only present under `--expose-gc`)
 *  and the live heap-used reading. Injected in tests so the primitives are
 *  deterministic without `--expose-gc`.
 *
 *  @returns `{ gc, heapUsed }` — `gc` is `global.gc` when exposed, else `null`.
 */
function defaultSeam() {
  return {
    gc       : (typeof global.gc === 'function') ? global.gc : null,
    heapUsed : () => process.memoryUsage().heapUsed,
  };
}

/**
 *  Retained heap cost of a single constructed machine: collect garbage, read the
 *  baseline, build the machine, collect again (sweeping construction garbage so
 *  only the live machine remains), read again. The machine stays referenced
 *  across the second gc, so the delta is its retained size.
 *
 *  @param buildMachine Thunk that constructs and returns one machine.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns Retained bytes, or `null` when `seam.gc` is not callable.
 *  @throws If `buildMachine` returns `undefined` (an instrument bug).
 *
 *  @example measureRetainedBytes(() => sm(['s0 -> s1;']))  // => e.g. 18452
 */
function measureRetainedBytes(buildMachine, seam = defaultSeam()) {
  if (typeof seam.gc !== 'function') { return null; }
  seam.gc();
  const base    = seam.heapUsed();
  const machine = buildMachine();
  seam.gc();
  const after   = seam.heapUsed();
  if (machine === undefined) { throw new Error('measureRetainedBytes: buildMachine returned undefined'); }
  return after - base;
}

module.exports = { defaultSeam, measureRetainedBytes };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: PASS (3 tests). (Coverage gate may report <100% when run alone — that is the single-file artifact, ignore; the full `vitest-spec` suite covers it.)

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling_memory.cjs src/buildjs/tests/benchmark_scaling_memory.spec.ts
git commit -m "feat(bench): retained-bytes footprint primitive with injectable gc seam"
```

---

### Task 2: Allocation primitive — `measureAllocBytes`

**Files:**
- Modify: `src/buildjs/benchmark_scaling_memory.cjs`
- Test: `src/buildjs/tests/benchmark_scaling_memory.spec.ts`

**Interfaces:**
- Produces: `measureAllocBytes(runBatch: ()=>void, seam?): number|null` — heap bytes allocated across one `runBatch()` call (no trailing gc, so transient allocations count), or `null` without gc.

- [ ] **Step 1: Write the failing test**

```ts
describe('measureAllocBytes', () => {
  test('returns the heap delta across the batch (no trailing collect)', () => {
    const seam = { gc: () => {}, heapUsed: mkHeap([2_000, 2_240]) };
    expect(mem.measureAllocBytes(() => {}, seam)).toBe(240);
  });

  test('returns null when gc is unavailable', () => {
    const seam = { gc: null, heapUsed: () => 0 };
    expect(mem.measureAllocBytes(() => {}, seam)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: FAIL — `mem.measureAllocBytes is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/buildjs/benchmark_scaling_memory.cjs, above module.exports

/**
 *  Bytes allocated across one batch of work: collect, read baseline, run the
 *  batch, read again — WITHOUT a trailing collect, so transient allocations are
 *  included (this is allocation pressure, not retained size). Divide by the
 *  batch's op count at the call site to get bytes/op.
 *
 *  @param runBatch Thunk that performs one batch of the operation under test.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns Allocated bytes for the batch, or `null` when `seam.gc` is not callable.
 *
 *  @example measureAllocBytes(() => { for (let i=0;i<100;i++) m.transition(t[i]); })
 */
function measureAllocBytes(runBatch, seam = defaultSeam()) {
  if (typeof seam.gc !== 'function') { return null; }
  seam.gc();
  const base  = seam.heapUsed();
  runBatch();
  const after = seam.heapUsed();
  return after - base;
}
```

Update the exports line:

```js
module.exports = { defaultSeam, measureRetainedBytes, measureAllocBytes };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling_memory.cjs src/buildjs/tests/benchmark_scaling_memory.spec.ts
git commit -m "feat(bench): per-batch allocation primitive"
```

---

### Task 3: Pure JSON augmenter — `injectMemoryFields`

**Files:**
- Modify: `src/buildjs/benchmark_scaling_memory.cjs`
- Test: `src/buildjs/tests/benchmark_scaling_memory.spec.ts`

**Interfaces:**
- Consumes: a parsed `scaling.json` object `{ results: Array<{ name, ops, ... }> }`.
- Produces: `injectMemoryFields(data, footprints: Map<string,{bytes,bytesPerState,bytesPerEdge}>, allocs: Map<string,number>): void` — mutates `data.results` in place. Footprint fields land on `<shape> construct()` rows; `allocBytesPerOp` lands on any row whose full name is a key in `allocs`. Rows with no match are untouched.

- [ ] **Step 1: Write the failing test**

```ts
describe('injectMemoryFields', () => {
  test('puts footprint on construct rows and allocs on matching op rows', () => {
    const data = { results: [
      { name: 'dense-200 construct()',      ops: 1 },
      { name: 'dense-200 edges_between()',  ops: 5 },
      { name: 'dense-200 transition()',     ops: 9 },
    ]};
    const footprints = new Map([['dense-200', { bytes: 40000, bytesPerState: 200, bytesPerEdge: 1 }]]);
    const allocs     = new Map([['dense-200 edges_between()', 12], ['dense-200 transition()', 64]]);

    mem.injectMemoryFields(data, footprints, allocs);

    const byName = Object.fromEntries(data.results.map((r: any) => [r.name, r]));
    expect(byName['dense-200 construct()'].footprintBytes).toBe(40000);
    expect(byName['dense-200 construct()'].bytesPerEdge).toBe(1);
    expect(byName['dense-200 construct()'].allocBytesPerOp).toBeUndefined();   // construct not in allocs map
    expect(byName['dense-200 edges_between()'].allocBytesPerOp).toBe(12);
    expect(byName['dense-200 edges_between()'].footprintBytes).toBeUndefined(); // footprint only on construct
    expect(byName['dense-200 transition()'].allocBytesPerOp).toBe(64);
  });

  test('leaves rows with no match untouched', () => {
    const data = { results: [{ name: 'chain-10 has_state()', ops: 3 }] };
    mem.injectMemoryFields(data, new Map(), new Map());
    expect(data.results[0]).toEqual({ name: 'chain-10 has_state()', ops: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: FAIL — `mem.injectMemoryFields is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/buildjs/benchmark_scaling_memory.cjs, above module.exports

/**
 *  Inject the memory metrics into a parsed `scaling.json` in place. Footprint
 *  fields (`footprintBytes`, `bytesPerState`, `bytesPerEdge`) go on the
 *  `<shape> construct()` row for each measured shape; `allocBytesPerOp` goes on
 *  every result whose full name is a key in `allocs`. Additive and total — rows
 *  without a measurement are left exactly as they were.
 *
 *  @param data Parsed scaling.json (`{ results: [...] }`); mutated in place.
 *  @param footprints Map of shape name -> `{ bytes, bytesPerState, bytesPerEdge }`.
 *  @param allocs Map of full result name -> bytes/op.
 *  @returns void.
 */
function injectMemoryFields(data, footprints, allocs) {
  for (const r of data.results) {
    const sp    = r.name.lastIndexOf(' ');
    const shape = r.name.slice(0, sp);
    const op    = r.name.slice(sp + 1);
    if (op === 'construct()' && footprints.has(shape)) {
      const f = footprints.get(shape);
      r.footprintBytes = f.bytes;
      r.bytesPerState  = f.bytesPerState;
      r.bytesPerEdge   = f.bytesPerEdge;
    }
    if (allocs.has(r.name)) {
      r.allocBytesPerOp = allocs.get(r.name);
    }
  }
}
```

Update exports:

```js
module.exports = { defaultSeam, measureRetainedBytes, measureAllocBytes, injectMemoryFields };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling_memory.cjs src/buildjs/tests/benchmark_scaling_memory.spec.ts
git commit -m "feat(bench): pure memory-field json augmenter"
```

---

### Task 4: Collect + wire into the live harness

**Files:**
- Modify: `src/buildjs/benchmark_scaling.cjs` (add a `sourceForShape` helper near `constructionCase` ~L428; add `collectMemory`; call it in `b.complete` ~L473)
- Modify: `src/buildjs/benchmark_scaling_memory.cjs` (add `collectMemory`)
- Test: `src/buildjs/tests/benchmark_scaling_memory.spec.ts` (unit-test `collectMemory` with a fake shape + injected seam)

**Interfaces:**
- Consumes: the `shapes` registry (each `{ name, machine, transitionSeq, edgePairs, actionMachine?, actionSeq?, actionStates? }`), `K`, and a `rebuild(name): machine` thunk source so footprint reconstructs a fresh machine.
- Produces: `collectMemory(shapes, K, rebuild, opBatches, seam?): { footprints: Map, allocs: Map }` where `opBatches(shape): Array<[name, ()=>void]>` yields the per-op batch thunks to alloc-measure.

- [ ] **Step 1: Write the failing test (unit-test the collector with fakes)**

```ts
describe('collectMemory', () => {
  test('builds footprint + alloc maps from shapes via the seam', () => {
    const shape = { name: 'chain-3', machine: { list_edges: () => [{}, {}, {}] } };
    const rebuild = () => ({});                         // fake machine
    const opBatches = () => [['chain-3 transition()', () => {}]];
    // heapUsed sequence: footprint(base,after) then alloc(base,after)
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 300, 0, 60]) };

    const { footprints, allocs } = mem.collectMemory([shape], 100, rebuild, opBatches, seam);

    expect(footprints.get('chain-3').bytes).toBe(300);
    expect(footprints.get('chain-3').bytesPerEdge).toBe(100);   // 300 / 3 edges
    expect(footprints.get('chain-3').bytesPerState).toBe(100);  // 300 / 3 states (from name)
    expect(allocs.get('chain-3 transition()')).toBeCloseTo(0.6, 5);  // 60 / 100
  });

  test('skips shapes when gc is unavailable', () => {
    const shape = { name: 'chain-3', machine: { list_edges: () => [] } };
    const seam = { gc: null, heapUsed: () => 0 };
    const { footprints, allocs } = mem.collectMemory([shape], 100, () => ({}), () => [], seam);
    expect(footprints.size).toBe(0);
    expect(allocs.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: FAIL — `mem.collectMemory is not a function`.

- [ ] **Step 3a: Implement `collectMemory` in the memory module**

```js
// add to src/buildjs/benchmark_scaling_memory.cjs, above module.exports

/**
 *  Count states from a shape name like `chain-200` / `dense-50` / `messy-1000`.
 *  For structured shapes the count is the suffix N; messy shapes return `null`
 *  (their state count isn't encoded), so `bytesPerState` is omitted for them.
 *
 *  @param name Shape name.
 *  @returns State count, or `null` when not derivable from the name.
 */
function statesFromName(name) {
  const m = name.match(/-(\d+)$/);
  if (!m) { return null; }
  if (name.startsWith('messy-')) { return null; }
  return parseInt(m[1], 10);
}

/**
 *  Build footprint and per-op allocation maps for every shape. Footprint uses a
 *  fresh machine from `rebuild(name)`; allocations use the per-op batch thunks
 *  from `opBatches(shape)`. All measurement goes through the seam, so a missing
 *  gc yields empty maps (graceful).
 *
 *  @param shapes The shape registry.
 *  @param K Ops per batch (to divide alloc bytes into bytes/op).
 *  @param rebuild `(name) => machine` — constructs a fresh machine for a shape.
 *  @param opBatches `(shape) => Array<[resultName, ()=>void]>` — batch thunks to alloc-measure.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns `{ footprints, allocs }` ready for {@link injectMemoryFields}.
 */
function collectMemory(shapes, K, rebuild, opBatches, seam = defaultSeam()) {
  const footprints = new Map();
  const allocs     = new Map();
  if (typeof seam.gc !== 'function') { return { footprints, allocs }; }

  for (const shape of shapes) {
    const edges  = shape.machine.list_edges().length;
    const states = statesFromName(shape.name);
    const bytes  = measureRetainedBytes(() => rebuild(shape.name), seam);
    if (bytes !== null) {
      footprints.set(shape.name, {
        bytes,
        bytesPerState : states ? bytes / states : null,
        bytesPerEdge  : edges  ? bytes / edges  : null,
      });
    }
    for (const [resultName, batch] of opBatches(shape)) {
      const a = measureAllocBytes(batch, seam);
      if (a !== null) { allocs.set(resultName, a / K); }
    }
  }
  return { footprints, allocs };
}
```

Update exports:

```js
module.exports = { defaultSeam, measureRetainedBytes, measureAllocBytes, injectMemoryFields, collectMemory, statesFromName };
```

- [ ] **Step 3b: Refactor the source derivation in `benchmark_scaling.cjs` into a reusable helper**

Replace the `switch (true) { ... }` block inside `constructionCase` (≈ lines 434–442) with a call to a new module-level `sourceForShape`, and define `sourceForShape` just above `constructionCase`:

```js
// new helper, placed just above constructionCase (~L428)
function sourceForShape(name) {
  if (name.startsWith('chain-'))  return buildChainFSL(parseInt(name.slice(6), 10));
  if (name.startsWith('dense-'))  return buildDenseFSL(parseInt(name.slice(6), 10));
  if (name.startsWith('hub-'))    return buildHubFSL(parseInt(name.slice(4), 10));
  if (name.startsWith('hooked-')) return buildHubFSL(parseInt(name.slice(7), 10));
  if (name.startsWith('messy-'))  return loadMessyFixture(parseInt(name.slice(6), 10));
  throw new Error(`unknown shape: ${name}`);
}
```

And inside `constructionCase`, replace the switch with:

```js
  const source = sourceForShape(shape.name);
  const name   = `${shape.name} construct()`;
```

- [ ] **Step 3c: Wire collection into `b.complete`**

At the top of `benchmark_scaling.cjs` add the require (next to the `plan` require, ~L10):

```js
const memory = require('./benchmark_scaling_memory.cjs');
```

Add a `memoryPass` helper near the suite (just above `b.suite(`):

```js
/**
 *  Re-measure every shape's footprint and per-op allocation after the timing
 *  suite, and inject the additive fields into the saved scaling.json. Uses a
 *  fresh machine per footprint (via sourceForShape) and the same K-batch shape
 *  as the timing cases. Requires `--expose-gc`; without it, memory.collectMemory
 *  returns empty maps and the JSON is left untouched.
 */
function memoryPass() {
  const rebuild    = (name) => sm([sourceForShape(name)]);
  const opBatches  = (shape) => {
    const out = [];
    out.push([`${shape.name} transition()`, () => {
      shape.machine.override('s0');
      for (let k = 0; k < K; ++k) shape.machine.transition(shape.transitionSeq[k]);
    }]);
    if (HAS.edges_between) {
      out.push([`${shape.name} edges_between()`, () => {
        for (let k = 0; k < K; ++k) { const [f, t] = shape.edgePairs[k]; shape.machine.edges_between(f, t); }
      }]);
    }
    return out;
  };
  const { footprints, allocs } = memory.collectMemory(shapes, K, rebuild, opBatches);
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  memory.injectMemoryFields(data, footprints, allocs);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}
```

Then call it inside the existing `b.complete` `setImmediate`, before `writeMarkdownPivot()`:

```js
    setImmediate(() => {
      if (DEEP) { augmentDeepJson(summary); }
      memoryPass();
      writeMarkdownPivot();
    });
```

- [ ] **Step 4a: Run the memory unit tests**

Run: `npx vitest run --config vitest.spec.config.ts src/buildjs/tests/benchmark_scaling_memory.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 4b: Smoke-test the live harness with gc exposed**

Run: `node --expose-gc ./src/buildjs/benchmark_scaling.cjs`
Then: `node -e "const d=require('./benchmark/results/scaling.json'); const c=d.results.find(r=>r.name==='dense-200 construct()'); const e=d.results.find(r=>r.name==='dense-200 edges_between()'); console.log('footprintBytes', c.footprintBytes, 'bytesPerEdge', c.bytesPerEdge, 'edges alloc/op', e.allocBytesPerOp);"`
Expected: three finite numbers printed (footprintBytes > 0, bytesPerEdge > 0, allocBytesPerOp ≥ 0). (Local benny results are not canonical and must not be committed — `benchmark/results/` is gitignored.)

- [ ] **Step 4c: Confirm graceful degrade without gc**

Run: `node ./src/buildjs/benchmark_scaling.cjs`
Then: `node -e "const d=require('./benchmark/results/scaling.json'); const c=d.results.find(r=>r.name==='dense-200 construct()'); console.log('footprintBytes', c.footprintBytes);"`
Expected: `footprintBytes undefined` (no `--expose-gc` → fields not injected, no crash).

- [ ] **Step 5: Commit**

```bash
git add src/buildjs/benchmark_scaling.cjs src/buildjs/benchmark_scaling_memory.cjs src/buildjs/tests/benchmark_scaling_memory.spec.ts
git commit -m "feat(bench): collect + inject per-machine footprint and per-op alloc into scaling.json"
```

---

### Task 5: Expose gc in the graviton run so production populates the fields

**Files:**
- Modify: `src/scripts/graviton_perf.cjs` (the remote benchmark step that invokes `benny:scaling` / `node ... benchmark_scaling.cjs`)
- Modify: `package.json` (the `benny:scaling` script, so local + CI both expose gc)
- Test: `src/scripts/tests/graviton_perf.spec.ts` (assert the generated benchmark command contains `--expose-gc`)

**Interfaces:**
- Consumes: the existing remote-script generation in `graviton_perf.cjs` (the array of shell lines that runs the scaling benchmark).
- Produces: that same step, now invoking node with `--expose-gc`.

- [ ] **Step 1: Locate the benchmark invocation and write the failing test**

First find the exact line (it runs the scaling benchmark on the instance):
Run: `npx grep -n "benny:scaling\|benchmark_scaling" src/scripts/graviton_perf.cjs` (or use the Grep tool).

```ts
// src/scripts/tests/graviton_perf.spec.ts  (add to the existing describe block)
test('the scaling benchmark step exposes gc for memory metrics', () => {
  // buildRemoteScript is the existing exported builder of the remote step list;
  // if the export name differs, use the actual exported script-builder.
  const lines = gp.buildRemoteScript({ release: '5.144.0', commit: 'a'.repeat(40) });
  const joined = lines.join('\n');
  expect(joined).toMatch(/node[^\n]*--expose-gc[^\n]*benchmark_scaling/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/scripts/tests/graviton_perf.spec.ts`
Expected: FAIL — the current step runs `npm run benny:scaling` / `node ... benchmark_scaling.cjs` without `--expose-gc`.

- [ ] **Step 3: Implement**

In `package.json`, change the script (verb-first form preserved):

```json
"benny:scaling": "node --expose-gc ./src/buildjs/benchmark_scaling.cjs",
```

If `graviton_perf.cjs` invokes node directly rather than via the npm script, add `--expose-gc` to that node invocation in the remote-script builder so the flag is present regardless of entry point. (Match the surrounding string-building style exactly.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts src/scripts/tests/graviton_perf.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(bench): run scaling benchmark with --expose-gc so footprint/alloc metrics populate"
```

---

## Self-Review

**Spec coverage (against the metrics design doc, Core memory family):** footprint ✓ (Task 1+4), bytes/state ✓ (Task 4 `statesFromName`), bytes/edge ✓ (Task 4), allocs/op ✓ (Task 2+4). **Object/Map count is deliberately deferred** (Global Constraints "out of scope") — it needs heap-snapshot machinery, a different mechanism; it belongs in a sibling plan, and the umbrella spec still tracks it. Scaling exponent, latency percentiles, carrying cost are explicitly other plans.

**Placeholder scan:** no TBD/TODO; every code step shows complete code; the one soft spot is Task 5's "if the export name differs" — mitigated by a grep step and the existing-pattern instruction, since `graviton_perf.cjs`'s exact remote-script export name isn't visible from the spec. Implementer confirms via the grep in Step 1.

**Type consistency:** `defaultSeam`/`measureRetainedBytes`/`measureAllocBytes`/`injectMemoryFields`/`collectMemory`/`statesFromName` names match across tasks and the single exports object; `footprints` is `Map<string,{bytes,bytesPerState,bytesPerEdge}>` and `allocs` is `Map<string,number>` consistently in Tasks 3 and 4; field names `footprintBytes`/`bytesPerState`/`bytesPerEdge`/`allocBytesPerOp` match between injector (Task 3) and smoke test (Task 4b).
