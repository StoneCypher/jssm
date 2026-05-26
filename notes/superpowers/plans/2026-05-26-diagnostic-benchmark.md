# Diagnostic Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scaling benchmark to jssm that varies state count and topology, so we can localize whether the hot-path bottleneck is the string-keyed `Map<>` lookups, the linear `edges_between` filter, or hook dispatch — before committing to any refactor.

**Architecture:** A new `benchmark_scaling.cjs` sits alongside the existing `benchmark.cjs`, generates structured shapes (chain, dense, hub, hooked) at varying sizes, loads two frozen pseudo-random FSL fixtures (`messy-1000`, `messy-5000`), and registers a benny suite that measures five operations (`transition`, `action`, `edges_between`, `has_state`, construction) per shape. Results go to `benchmark/results/scaling.json` (same envelope as the existing `general.json`) plus a generated markdown pivot at `benchmark/results/scaling.md`.

**Tech Stack:** Node.js, `benny` (already a dev dep), `dist/jssm.es5.cjs` (built artifact). No new dependencies. The benchmark depends on the **built** library, so a build (`npm run build`) must precede every run.

**Branch:** `chore_26-05-26_diagnostic-benchmark` — to be created before any commit. `main` is protected per the user's rules.

**Spec:** [`notes/superpowers/specs/2026-05-26-diagnostic-benchmark-design.md`](../specs/2026-05-26-diagnostic-benchmark-design.md)

---

## File Structure

**Created:**

- `benchmark/fixtures/messy-1000.fsl` — frozen FSL source for the 1000-state messy machine (~50–100KB). Header comment records date, commit, and the prose-described procedure. Read at benchmark startup.
- `benchmark/fixtures/messy-5000.fsl` — same, scaled to 5000 states / ~15000 edges (~300–500KB).
- `src/buildjs/benchmark_scaling.cjs` — the benchmark runner. Generates structured shapes inline, loads the messy fixtures, registers the benny suite, and (after suite completion) writes the markdown pivot.

**Modified:**

- `package.json` — adds `benny:scaling` and `benny:all` npm scripts.

**Untouched (per spec):**

- `src/buildjs/benchmark.cjs`
- `benchmark/results/general.json`
- `src/ts/jssm.ts` and all library source
- All existing npm scripts

**Outputs produced at run time (not committed):**

- `benchmark/results/scaling.json` — machine-readable, mirrors `general.json` envelope. (Note: a `.gitignore` entry is NOT being added; the existing `general.json` is committed, so for consistency a `scaling.json` from a representative run can also be committed when results are interesting. The first such commit happens at the end of Task 8.)
- `benchmark/results/scaling.chart.html` — benny's default HTML output.
- `benchmark/results/scaling.md` — generated markdown pivot table.

---

## Task 1: Create the feature branch and generate the messy fixtures

**Files:**

- Create: `benchmark/fixtures/messy-1000.fsl`
- Create: `benchmark/fixtures/messy-5000.fsl`

**Why a temp script:** The spec mandates no regenerator script in the repo. We write a throwaway Node script, run it twice (N=1000, N=5000), inspect the output, then delete the script. Only the two `.fsl` files get committed.

- [ ] **Step 1: Confirm working tree is clean apart from existing untracked files, then create the feature branch**

Run:

```
git status
git switch -c chore_26-05-26_diagnostic-benchmark
```

Expected: branch creation succeeds; working tree state preserved across the switch.

- [ ] **Step 2: Make the fixtures directory**

Run:

```
mkdir benchmark\fixtures
```

(Windows `cmd` does not understand `mkdir parent/child` with forward slashes when nesting — `benchmark/` already exists, so this is a single-level create and is safe.)

- [ ] **Step 3: Write the throwaway generator at `src/buildjs/_messy_fixture_gen.cjs`**

This script is *not* committed. It exists only long enough to produce the two fixture files. Use the exact content below verbatim — the seed and recipe are what make the output reproducible during this one-shot generation, and the comment at the top of each fixture documents the recipe for posterity.

```js
// THROWAWAY — DO NOT COMMIT
// Run twice: `node src/buildjs/_messy_fixture_gen.cjs 1000` and `node src/buildjs/_messy_fixture_gen.cjs 5000`.
// Delete this file after both runs succeed.

'use strict';

const fs   = require('fs');
const path = require('path');

const N = Number(process.argv[2]);
if (!Number.isInteger(N) || N < 10) {
  console.error('Usage: node _messy_fixture_gen.cjs <N>  (N >= 10)');
  process.exit(1);
}

const SEED = 0xC0FFEE;

// Mulberry32 — a tiny well-known seeded PRNG, deterministic across Node versions.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED ^ N);   // mix N into seed so 1000 and 5000 don't share their prefix
const ri   = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// For each state, emit exactly 3 outgoing edges chosen by recipe:
//   roll < 0.50  -> forward:  target = (i + ri(1, 5)) mod N
//   roll < 0.75  -> back:     target = (i - ri(1, 50) + N) mod N
//   else         -> cross:    target = ri(0, N - 1)
// Dedup (from, to) pairs in the generator; if a duplicate is rolled, re-roll up to 8 times
// then skip (rare for N >= 1000, vanishingly rare for N=5000).
const edges = [];
const seen  = new Set();

for (let i = 0; i < N; ++i) {
  for (let k = 0; k < 3; ++k) {
    let target = -1;
    for (let attempt = 0; attempt < 8; ++attempt) {
      const roll = rand();
      let t;
      if      (roll < 0.50) { t = (i + ri(1, 5)) % N; }
      else if (roll < 0.75) { t = (i - ri(1, 50) + N * 100) % N; }
      else                  { t = ri(0, N - 1); }
      if (t === i) continue;                       // skip self-loops
      const key = i + '->' + t;
      if (seen.has(key)) continue;
      seen.add(key);
      target = t;
      break;
    }
    if (target >= 0) edges.push([i, target]);
  }
}

const header = [
  `# messy-${N}.fsl - frozen benchmark fixture`,
  `# Generated: 2026-05-26 against jssm 5.128.0`,
  `# Procedure: ${N} states (s0..s${N - 1}), ${edges.length} edges placed by a one-shot`,
  `# mulberry32(seed=0xC0FFEE ^ N) run rolling 3 candidate edges per state:`,
  `#   roll < 0.50 -> forward (target = src + rand(1..5) mod N)`,
  `#   roll < 0.75 -> back    (target = src - rand(1..50) mod N)`,
  `#   else        -> cross   (target = rand(0..${N - 1}))`,
  `# Self-loops skipped; (from, to) deduped (up to 8 re-rolls then drop).`,
  `# DO NOT REGENERATE - long-term comparability of messy-${N} ops/sec numbers`,
  `# depends on this file being bit-identical across years.`,
  ''
].join('\n');

const body = edges.map(([f, t]) => `s${f} -> s${t};`).join('\n') + '\n';

const out = path.join(__dirname, '..', '..', 'benchmark', 'fixtures', `messy-${N}.fsl`);
fs.writeFileSync(out, header + body);
console.log(`wrote ${out} (${edges.length} edges)`);
```

- [ ] **Step 4: Run the generator for N=1000 and N=5000**

Run each as a separate command (no compounds):

```
node src/buildjs/_messy_fixture_gen.cjs 1000
node src/buildjs/_messy_fixture_gen.cjs 5000
```

Expected: two lines like `wrote ...messy-1000.fsl (3000 edges)` and `wrote ...messy-5000.fsl (15000 edges)`. Edge counts may be slightly less than 3N if dedup forced drops; that is acceptable so long as both files write.

- [ ] **Step 5: Smoke-test that both fixtures parse via `sm`**

Build is required first if `dist/` is stale:

```
npm run build
```

Then run, as a single Node `-e` invocation per fixture (no compounds):

```
node -e "const fs=require('fs');const {sm}=require('./dist/jssm.es5.cjs');const m=sm([fs.readFileSync('benchmark/fixtures/messy-1000.fsl','utf8')]);console.log('messy-1000 states:', m.states().length, 'state:', m.state());"
node -e "const fs=require('fs');const {sm}=require('./dist/jssm.es5.cjs');const m=sm([fs.readFileSync('benchmark/fixtures/messy-5000.fsl','utf8')]);console.log('messy-5000 states:', m.states().length, 'state:', m.state());"
```

Expected: `messy-1000 states: 1000 state: s0` and `messy-5000 states: 5000 state: s0`. If either errors, inspect the generator's edge output and adjust before proceeding.

- [ ] **Step 6: Delete the throwaway generator**

Run:

```
del src\buildjs\_messy_fixture_gen.cjs
```

Verify it's gone:

```
git status
```

Expected: only `benchmark/fixtures/messy-1000.fsl` and `benchmark/fixtures/messy-5000.fsl` show as new files (no `_messy_fixture_gen.cjs`).

- [ ] **Step 7: Commit the fixtures**

```
git add benchmark/fixtures/messy-1000.fsl benchmark/fixtures/messy-5000.fsl
git commit -m "test(bench): add frozen messy-1000 and messy-5000 FSL fixtures"
```

---

## Task 2: Scaffold `benchmark_scaling.cjs` with a single chain-10 shape

We start with the smallest possible end-to-end pipeline: one shape, one operation, write `scaling.json`. Once that runs cleanly, the rest of the matrix is repetition.

**Files:**

- Create: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Write the scaffold**

```js
'use strict';

const b    = require('benny');
const fs   = require('fs');
const path = require('path');

const jssm = require('../../dist/jssm.es5.cjs');
const sm   = jssm.sm;
const pkg  = require('../../package.json');

// ----------------------------------------------------------------------------
// Shape factories (structured topologies — deterministic from N)
// ----------------------------------------------------------------------------

function buildChainFSL(n) {
  const lines = [];
  for (let i = 0; i < n - 1; ++i) lines.push(`s${i} -> s${i + 1};`);
  lines.push(`s${n - 1} -> s0;`);
  return lines.join('\n');
}

// ----------------------------------------------------------------------------
// Shape registry — populated below; each entry: { name, machine, transitionSeq }
// ----------------------------------------------------------------------------

const K = 100;   // per-call work, matches existing benny convention

function buildShapeChain(n) {
  const machine = sm([buildChainFSL(n)]);
  // For chain: state s_i -> s_{(i+1) mod n}.  Precompute K targets starting from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  return { name: `chain-${n}`, machine, transitionSeq: seq };
}

const shapes = [
  buildShapeChain(10),
];

// ----------------------------------------------------------------------------
// Benny case factory
// ----------------------------------------------------------------------------

function transitionCase(shape) {
  return b.add(`${shape.name} transition()`, () => {
    // Reset machine state to s0 before timed loop so each iteration is comparable.
    shape.machine.override('s0');
    for (let k = 0; k < K; ++k) shape.machine.transition(shape.transitionSeq[k]);
  });
}

// ----------------------------------------------------------------------------
// Suite
// ----------------------------------------------------------------------------

b.suite(
  'jssm scaling diagnostic suite',
  ...shapes.map(transitionCase),
  b.cycle(),
  b.complete(),
  b.save({ file: 'scaling', version: pkg.version }),
  b.save({ file: 'scaling', format: 'chart.html' }),
);
```

- [ ] **Step 2: Ensure a current build exists**

```
npm run build
```

Expected: build completes; `dist/jssm.es5.cjs` is up to date.

- [ ] **Step 3: Run the scaffold**

```
node src/buildjs/benchmark_scaling.cjs
```

Expected: benny prints progress for `chain-10 transition()` and writes `benchmark/results/scaling.json` plus `benchmark/results/scaling.chart.html`. The ops/sec for chain-10 should be on the same order as the existing `general.json` traffic-light transition cases (tens of thousands of ops/sec).

- [ ] **Step 4: Inspect `benchmark/results/scaling.json`**

```
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('benchmark/results/scaling.json','utf8')),null,2));"
```

Expected: an envelope `{name, date, version, results: [{name: 'chain-10 transition()', ops, margin, percentSlower}]}`. If the structure differs, the rest of the plan needs adjustment before continuing.

- [ ] **Step 5: Commit the scaffold**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): scaffold scaling benchmark with chain-10 transition case"
```

---

## Task 3: Add all structured shapes (chain, dense, hub, hooked)

We add the remaining structured topologies and their setup helpers, but still only register `transition()` cases. Adding other operations is Task 5.

**Files:**

- Modify: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Add the remaining shape factories below `buildChainFSL`**

Insert after `buildChainFSL`:

**Note:** Like `buildChainFSL`, every FSL builder must prepend `allows_override: true;` because the per-iteration reset uses `machine.override('s0')`, which requires that directive in the FSL.

```js
function buildDenseFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (i !== j) lines.push(`s${i} -> s${j};`);
    }
  }
  return lines.join('\n');
}

function buildHubFSL(n) {
  // s0 is the hub; every other state has edges to and from s0.
  const lines = ['allows_override: true;'];
  for (let i = 1; i < n; ++i) {
    lines.push(`s${i} -> s0;`);
    lines.push(`s0 -> s${i};`);
  }
  return lines.join('\n');
}

function buildHookedHub(n) {
  const machine = sm([buildHubFSL(n)]);
  // One per-edge hook for every edge in the hub topology.
  for (let i = 1; i < n; ++i) {
    machine.set_hook({ from: `s${i}`, to: 's0', handler: () => true, kind: 'hook' });
    machine.set_hook({ from: 's0', to: `s${i}`, handler: () => true, kind: 'hook' });
  }
  // Plus one global any-transition hook.
  machine.set_hook({ handler: () => true, kind: 'any transition' });
  return machine;
}
```

- [ ] **Step 2: Add shape-setup helpers for dense, hub, hooked**

Insert after `buildShapeChain`:

```js
function buildShapeDense(n) {
  const machine = sm([buildDenseFSL(n)]);
  // For dense: every (i, j) i!=j is valid.  Walk forward by 1 mod n for K steps from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  return { name: `dense-${n}`, machine, transitionSeq: seq };
}

function buildShapeHub(n) {
  const machine = sm([buildHubFSL(n)]);
  // Hub topology: from s0 -> s_i -> s0 -> s_{i+1} -> s0 ...  Alternates hub and spoke.
  const seq = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      seq.push(`s${spoke}`);                       // hub -> spoke
    } else {
      seq.push('s0');                              // spoke -> hub
      spoke = (spoke % (n - 1)) + 1;               // next time pick a new spoke
    }
  }
  return { name: `hub-${n}`, machine, transitionSeq: seq };
}

function buildShapeHookedHub(n) {
  const machine = buildHookedHub(n);
  // Same traversal as hub.
  const seq = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      seq.push(`s${spoke}`);
    } else {
      seq.push('s0');
      spoke = (spoke % (n - 1)) + 1;
    }
  }
  return { name: `hooked-${n}`, machine, transitionSeq: seq };
}
```

- [ ] **Step 3: Replace the `shapes` array with the full structured set**

Replace:

```js
const shapes = [
  buildShapeChain(10),
];
```

with:

```js
const shapes = [
  buildShapeChain(10),
  buildShapeChain(50),
  buildShapeChain(200),
  buildShapeChain(1000),
  buildShapeDense(10),
  buildShapeDense(50),
  buildShapeDense(200),
  buildShapeHub(50),
  buildShapeHub(200),
  buildShapeHookedHub(200),
];
```

- [ ] **Step 4: Run and inspect**

```
node src/buildjs/benchmark_scaling.cjs
```

Expected: benny runs each case in turn and writes `scaling.json` with 10 results. The `dense-200` build will take noticeably longer to construct (~40k edges to parse) but the per-call cost should still register in benny's bracket. If construction blows out the process memory or time, the dense-200 case is the prime suspect — surface this to the human reviewer rather than tuning here.

- [ ] **Step 5: Commit**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): add chain/dense/hub/hooked structured shapes to scaling suite"
```

---

## Task 4: Load and register the two messy fixtures

**Files:**

- Modify: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Add a fixture loader and corresponding shape-setup helper**

Insert after `buildShapeHookedHub`:

```js
function loadMessyFixture(n) {
  const file = path.join(__dirname, '..', '..', 'benchmark', 'fixtures', `messy-${n}.fsl`);
  // Prepend allows_override:true so the per-iteration reset (machine.override('s0')) works,
  // matching the structured shapes.  The fixture files themselves are frozen and don't carry
  // this directive — that's deliberate, so the fixtures stay pure topology data.
  return 'allows_override: true;\n' + fs.readFileSync(file, 'utf8');
}

function buildShapeMessy(n) {
  const machine = sm([loadMessyFixture(n)]);
  // For messy: not every (from, to) is valid.  Walk by following whatever transitions
  // are actually available from the current state.  Precompute by simulating.
  const seq = [];
  let cur = 's0';
  for (let k = 0; k < K; ++k) {
    const exits = machine.list_exits(cur);   // returns Array<StateType> of target names
    if (exits.length === 0) {
      // Dead end — reset to s0 and continue.
      cur = 's0';
      seq.push('s0');
      continue;
    }
    // Pick the first valid target deterministically for reproducible traversal.
    const next = exits[0];
    seq.push(next);
    cur = next;
  }
  machine.override('s0');   // restore before the timed loop sees it
  return { name: `messy-${n}`, machine, transitionSeq: seq };
}
```

- [ ] **Step 2: Append messy shapes to the registry**

Update the `shapes` array, appending:

```js
  buildShapeMessy(1000),
  buildShapeMessy(5000),
```

- [ ] **Step 3: Run and inspect**

```
node src/buildjs/benchmark_scaling.cjs
```

Expected: 12 results in `scaling.json` now. The `messy-5000` construction will take the longest (15k edges through the FSL parser) — note the wall time but don't tune. Per-call ops/sec for messy shapes should still be measurable.

- [ ] **Step 4: Commit**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): load messy-1000 and messy-5000 fixtures into scaling suite"
```

---

## Task 5: Add the remaining operations (`action`, `edges_between`, `has_state`)

The spec calls for five operations per shape (transition is already in). We add three more case factories and register them. The structured shapes (chain/dense/hub/hooked) don't currently have actions defined in their FSL; rather than rewriting the topology generators to include actions, we skip `action()` for now and note it as a deferred enhancement in the commit message. (Adding actions is a topology question — does every edge get the same action name, distinct names, etc. — and rebuilding the fixtures would invalidate trends. Easier to land the diagnostic without it and revisit if the results say `action()` matters.)

**Files:**

- Modify: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Precompute `(from, to)` pairs for `edges_between` per shape**

Modify each `buildShape*` helper to also return an `edgePairs` field — an array of K `[from, to]` tuples drawn from the shape's actual edges, walked cyclically. For shapes with fewer than K distinct edges (chain-10 has 10), wrap around.

Sample modification to `buildShapeChain` (apply analogous changes to dense/hub/hooked/messy):

```js
function buildShapeChain(n) {
  const machine = sm([buildChainFSL(n)]);
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  // edges in a chain: s0->s1, s1->s2, ..., s_{n-1}->s0.  Cycle through K of them.
  const edgePairs = [];
  for (let k = 0; k < K; ++k) {
    const i = k % n;
    const j = (i + 1) % n;
    edgePairs.push([`s${i}`, `s${j}`]);
  }
  return { name: `chain-${n}`, machine, transitionSeq: seq, edgePairs };
}
```

For dense: every (i, j) i!=j is an edge — cycle through `[s_{k%n}, s_{(k+1)%n}]` (same as transitions; trivially valid).

For hub: alternate `[s_{spoke}, s0]` and `[s0, s_{spoke}]` for spoke = 1..n-1 (matching the actual hub edges).

For hooked-200: same as hub-200.

For messy: walk the same transition path you precomputed for `transitionSeq` and emit `[seq[k-1], seq[k]]` pairs.

- [ ] **Step 2: Add the three new case factories**

Insert below `transitionCase`:

```js
function edgesBetweenCase(shape) {
  return b.add(`${shape.name} edges_between()`, () => {
    for (let k = 0; k < K; ++k) {
      const [f, t] = shape.edgePairs[k];
      shape.machine.edges_between(f, t);
    }
  });
}

function hasStateCase(shape) {
  // Use the transition targets as the state list to probe — they're real states.
  return b.add(`${shape.name} has_state()`, () => {
    for (let k = 0; k < K; ++k) shape.machine.has_state(shape.transitionSeq[k]);
  });
}
```

`action()` is deferred for the reason in the task preamble. Document the omission with a brief comment above the case-factory section.

- [ ] **Step 3: Register the new cases in the suite**

Replace `...shapes.map(transitionCase)` with:

```js
  ...shapes.map(transitionCase),
  ...shapes.map(edgesBetweenCase),
  ...shapes.map(hasStateCase),
```

- [ ] **Step 4: Run and inspect**

```
node src/buildjs/benchmark_scaling.cjs
```

Expected: 36 results (12 shapes × 3 operations). The `edges_between()` row for `dense-200` should be visibly slower than for `chain-200` — that's the diagnostic signal we built this benchmark to find. `has_state()` should be roughly flat across all shapes.

- [ ] **Step 5: Commit**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): add edges_between and has_state cases (action deferred)"
```

---

## Task 6: Add the construction-time suite

Construction is one-shot per machine, not in a hot loop. Benny still works — each `b.add` callback just builds the machine once and discards it, and benny averages across iterations.

**Files:**

- Modify: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Add a construction case factory**

Below `hasStateCase`:

```js
function constructionCase(shape) {
  // Re-derive the FSL source for each shape so we time the full sm`...` pipeline.
  // For structured shapes we re-call the builder; for messy we re-read the file
  // *once* outside the timed function and capture the string in a closure.
  let source;
  switch (true) {
    case shape.name.startsWith('chain-'):  source = buildChainFSL(parseInt(shape.name.slice(6), 10)); break;
    case shape.name.startsWith('dense-'):  source = buildDenseFSL(parseInt(shape.name.slice(6), 10)); break;
    case shape.name.startsWith('hub-'):    source = buildHubFSL(parseInt(shape.name.slice(4), 10));   break;
    case shape.name.startsWith('hooked-'): source = buildHubFSL(parseInt(shape.name.slice(7), 10));   break;
    case shape.name.startsWith('messy-'):  source = loadMessyFixture(parseInt(shape.name.slice(6), 10)); break;
    default: throw new Error(`unknown shape: ${shape.name}`);
  }
  return b.add(`${shape.name} construct()`, () => {
    const m = sm([source]);
    if (m === undefined) throw new Error('not defined');   // prevent tree-shaking
  });
}
```

(For `hooked-*` construction we time the underlying hub build, not the hook attachments — hook setup cost is already implicit in the `transition` measurements for the hooked shape, and the spec calls out construction as a parse-cost measurement.)

- [ ] **Step 2: Register construction cases**

Append to the suite:

```js
  ...shapes.map(constructionCase),
```

- [ ] **Step 3: Run and inspect**

```
node src/buildjs/benchmark_scaling.cjs
```

Expected: 48 results now (12 shapes × 4 ops). Construction ops/sec will be tiny for `messy-5000` and `dense-200` (one-figure or low double-digit ops/sec is fine — that's just "how many machines per second can we build").

- [ ] **Step 4: Commit**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): add construction-time cases to scaling suite"
```

---

## Task 7: Add the markdown pivot writer

Run after benny finishes and `scaling.json` is on disk. Reads the just-written JSON, pivots into one markdown table per operation, writes `scaling.md`.

**Files:**

- Modify: `src/buildjs/benchmark_scaling.cjs`

- [ ] **Step 1: Add the markdown-emitter function near the top of the file (after `require`s)**

```js
function writeMarkdownPivot() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const mdPath   = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.md');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Group results by trailing operation token, e.g. "chain-10 transition()" -> op "transition()".
  const groups = new Map();
  for (const r of data.results) {
    const spaceIdx = r.name.lastIndexOf(' ');
    const shape    = r.name.slice(0, spaceIdx);
    const op       = r.name.slice(spaceIdx + 1);
    if (!groups.has(op)) groups.set(op, []);
    groups.get(op).push({ shape, ops: r.ops });
  }

  const lines = [];
  lines.push(`# jssm scaling benchmark results`);
  lines.push('');
  lines.push(`Generated: ${data.date}  `);
  lines.push(`jssm version: ${data.version}`);
  lines.push('');

  for (const [op, rows] of groups) {
    lines.push(`## ${op}`);
    lines.push('');
    lines.push('| shape       | ops/sec     |');
    lines.push('|-------------|------------:|');
    for (const row of rows) {
      lines.push(`| ${row.shape.padEnd(11)} | ${String(row.ops).padStart(11)} |`);
    }
    lines.push('');
  }

  fs.writeFileSync(mdPath, lines.join('\n'));
  console.log(`wrote ${mdPath}`);
}
```

- [ ] **Step 2: Invoke it after benny completes**

Benny's `b.complete` accepts a callback. Replace `b.complete(),` in the suite with:

```js
  b.complete(() => {
    // benny writes scaling.json synchronously during b.save above, so it's already on disk.
    // But b.save runs in suite order; ensure markdown runs last by deferring with setImmediate.
    setImmediate(writeMarkdownPivot);
  }),
```

(If the markdown ends up empty because of ordering, swap to wrapping the `b.suite(...)` call's return value in `.then(writeMarkdownPivot)` — benny's `suite` returns a promise. Document whichever pattern works in a one-line comment.)

- [ ] **Step 3: Run and inspect**

```
node src/buildjs/benchmark_scaling.cjs
```

Then:

```
node -e "process.stdout.write(require('fs').readFileSync('benchmark/results/scaling.md','utf8'));"
```

Expected: four sections (`transition()`, `edges_between()`, `has_state()`, `construct()`), each with 12 rows for the 12 shapes. Numbers should make rough sense (transition fast, construct slow, edges_between worst on dense).

- [ ] **Step 4: Commit**

```
git add src/buildjs/benchmark_scaling.cjs
git commit -m "test(bench): emit grouped markdown pivot of scaling results"
```

---

## Task 8: Wire npm scripts and capture a representative result

**Files:**

- Modify: `package.json`
- Add: `benchmark/results/scaling.json`, `benchmark/results/scaling.md`, `benchmark/results/scaling.chart.html`

- [ ] **Step 1: Edit `package.json` to add the two new scripts**

Locate the `"benny"` script (around line 136 per the spec lookup) and add immediately after it:

```json
"benny:scaling": "node ./src/buildjs/benchmark_scaling.cjs",
"benny:all":     "npm run benny && npm run benny:scaling"
```

(Note: `npm run benny:all` uses a compound, but it's a documented user-facing convenience; the user can substitute back-to-back `npm run benny` + `npm run benny:scaling` invocations if compounds are problematic in their permission setup.)

- [ ] **Step 2: Run the new script end-to-end to verify wiring**

```
npm run benny:scaling
```

Expected: same behavior as Task 7's direct invocation, just via the npm script.

- [ ] **Step 3: Confirm `general.json` is untouched**

```
git status benchmark/results/general.json
```

Expected: no changes. (If it shows modified, something in the scaffold is incorrectly writing to the wrong file.)

- [ ] **Step 4: Eyeball the markdown for the four diagnostic signals**

Open `benchmark/results/scaling.md` and check:

1. `transition()` on `chain-N` roughly flat as N grows? (If yes, per-op overhead dominates.)
2. `transition()` on `dense-N` collapses faster than `chain-N` at the same N? (If yes, edge-filter is the bottleneck.)
3. `edges_between()` direct scales roughly with total edge count? (Confirms filter cost cleanly.)
4. `hooked-200` significantly slower than `hub-200`? (Hook dispatch as its own cost center.)
5. `has_state()` flat across all sizes? (Map<string> behaving normally.)
6. `messy-1000` worse than `chain-1000` per op? (V8 inline cache locality cost.)

Summarize the answers to these six in the commit message for this task — that's the actual deliverable of the whole plan.

- [ ] **Step 5: Commit results and npm scripts**

```
git add package.json benchmark/results/scaling.json benchmark/results/scaling.md benchmark/results/scaling.chart.html
git commit -m "test(bench): wire npm scripts and capture v5.128.0 scaling baseline

[Six-line summary of the signals from Step 4 above]"
```

- [ ] **Step 6: Push the branch and open a PR**

```
git push -u origin chore_26-05-26_diagnostic-benchmark
gh pr create --title "Add diagnostic scaling benchmark" --body "$(cat <<'EOF'
## Summary
- Adds `npm run benny:scaling` — a benny suite that varies state count and topology across structured shapes (chain/dense/hub/hooked) and two frozen pseudo-random fixtures (messy-1000, messy-5000), measuring transition, edges_between, has_state, and construction
- Leaves the existing 4-state `benny` suite and its `general.json` results untouched
- Writes results to `benchmark/results/scaling.{json,md,chart.html}`; the `.md` is a per-operation pivot table for at-a-glance reading
- Origin question: would moving jssm to numbers internally instead of strings be a performance boost? The scaling curves let us answer that with evidence rather than guesswork.

## Test plan
- [x] `npm run benny:scaling` runs end-to-end and writes all three output files
- [x] `benchmark/results/general.json` unchanged (existing `npm run benny` still works)
- [x] Both messy fixtures parse via `sm` and produce machines of the expected state count
- [x] `scaling.md` shows four sections (transition/edges_between/has_state/construct), 12 rows each
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- "Augment, don't replace" → Task 2 creates new file; Task 8 verifies `general.json` untouched. ✓
- "Frozen messy fixtures" → Task 1 generates and deletes the generator. ✓
- "messy-1000 + messy-5000" → Task 1 covers both N values. ✓
- "Structured shapes deterministic from N" → Tasks 2-3 cover chain/dense/hub/hooked. ✓
- "Five operations (transition, action, edges_between, has_state, construct)" → Tasks 2, 5, 6. `action()` deferred with documented reason. ⚠ Spec mentions action as one of five; we defer in Task 5 with stated rationale. If the human reviewer wants action covered before merge, the topology generators need an action-naming pass — flagged in PR.
- "K=100 normalization" → Task 2 constant K=100; all shape helpers use it.  ✓
- "Result format matches general.json envelope" → Task 2 uses `b.save({file, version})` which produces the same envelope.  ✓
- "Markdown pivot at scaling.md" → Task 7.  ✓
- "npm scripts benny:scaling and benny:all" → Task 8.  ✓
- "No PRNG ships with the benchmark" → Task 1 deletes the generator before commit.  ✓
- "No new dependencies" → only uses `benny` (existing), `fs`, `path`, `require('../../package.json')`.  ✓

**Placeholder scan:** No "TBD" / "TODO" / "implement later." One conditional clause in Task 7 ("if the markdown ends up empty because of ordering, swap to ...") — this is a documented fallback, not a placeholder, but it's the closest thing to ambiguity in the plan. Acceptable because the executing subagent can verify the primary path works and skip the fallback.

**Type/name consistency:**

- `K = 100` defined once in Task 2, used in every shape helper.
- `shape.machine`, `shape.transitionSeq`, `shape.edgePairs`, `shape.name` — consistent across all factories and case generators.
- `buildHookedHub` returns a machine directly; `buildShapeHookedHub` wraps it into a shape record.
- `loadMessyFixture(n)` is called from both `buildShapeMessy` (Task 4) and `constructionCase` (Task 6) — same signature, same path.

**One known risk flagged for the executor:**

- Benny's `b.complete(callback)` ordering vs `b.save({format:'chart.html'})` (Task 7). The plan uses `setImmediate(writeMarkdownPivot)` to push the markdown write to the next tick after benny's synchronous chain completes. If `scaling.json` isn't on disk when the callback fires (rare but possible if benny's save is async), swap to wrapping the `b.suite(...)` return value with `.then(writeMarkdownPivot)` — documented inline in Task 7 step 2.

---

## Execution

Per project CLAUDE.md ("always use subagent-driven execution… choose without asking"), this plan will execute via **superpowers:subagent-driven-development** when the user gives the go-ahead.
