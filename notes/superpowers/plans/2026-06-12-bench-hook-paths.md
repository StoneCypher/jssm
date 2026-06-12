# Hook-Path Benchmark Instrument Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Session note:** in this repo, subagents cannot mutate sibling worktrees (cwd resets to the main checkout; see project memory). Execute inline from the main session, in the worktree below.

**Goal:** Make every hook store's fire path canonically benchmarkable: repair the general suite's seven bugs, add after/post/data/rejection cases with startup fire-verification, and make the graviton runner run and publish the general suite.

**Architecture:** `src/buildjs/benchmark.cjs` is rewritten around a `verified(name, builder, opts)` helper — every hooked case is a builder over a fresh machine, and a startup pass with a counting handler must match the case's declared `expectFire`, so silent no-fire cases throw instead of reporting. `src/scripts/graviton_perf.cjs` gains `npm run benny` in both user-data builders and ships `general.json` to `perf_results`.

**Tech Stack:** Node (CommonJS build scripts), benny 3.7.1, vitest (graviton spec), bash user-data scripts on AL2023/Graviton.

**Worktree:** `C:\Users\john\projects\worktrees\stonecypher_jssm_test_26-06-12_bench-hook-paths` (branch `test_26-06-12_bench-hook-paths`). All commands run from the worktree root. **Never `git add -A`** — commit by pathspec only.

**Spec:** `notes/superpowers/specs/2026-06-12-bench-hook-paths-design.md` (including the addendum: bugs 5–7, fire-verification).

**Probe-verified facts this plan relies on** (probes in `build/probe_hook_semantics.cjs`, `build/probe_forced_action.cjs`, run against committed `dist/`):

- `transition()` cannot traverse `~>` edges; `force_transition()` and labeled `action()` can, and both fire the forced-transition hook.
- `set_hook` named/global-action read `HookDesc.action`; `name:` or a missing `action:` registers under interned `undefined` and never fires.
- Named hooks fire only under `action()` dispatch (`jssm.ts:3946` gates on `wasAction`).
- `after` hooks fire keyed by state name under `transition()` and by action name under `action()`; `post hook` fires under `transition()`.
- Exact post kind strings: `'post hook'`, `'post named'` (with `action:`), `'post entry'` (`to:`), `'post exit'` (`from:`), `'post global action'` (`action:`).

---

### Task 1: Rewrite the general suite

**Files:**
- Modify: `src/buildjs/benchmark.cjs` (full rewrite, content below)

- [ ] **Step 1.1: Replace the entire content of `src/buildjs/benchmark.cjs` with:**

```js

const b    = require('benny'),
      jssm = require('../../dist/jssm.es5.cjs'),
      pkg  = require('../../package.json'),
      sm   = jssm.sm;



// ---------------------------------------------------------------------------
// Instrument integrity
// ---------------------------------------------------------------------------
//
// This file's historical failure mode is the silent no-fire benchmark: a
// hooked case whose hook never actually fires still produces a plausible
// ops/sec figure, because the miss path benchmarks fine.  Five separate bugs
// shipped this way (wrong machine in the kitchen sink; `name:` where set_hook
// reads `action:`; global-action with no `action:`; transition() over forced
// edges; unlabeled machines probed with action()).  Every hooked case is
// therefore declared as a builder, and verified() runs one exercise pass
// against a counting handler at startup, throwing unless the observed count
// matches the case's declared expectation.  See
// notes/superpowers/specs/2026-06-12-bench-hook-paths-design.md.

/**
 *  Register a hooked benny case after verifying its hook actually fires (or,
 *  for carrying-cost cases, deliberately cannot).  Builds the case twice: once
 *  with a counting handler for the verification pass, then fresh with the
 *  measurement handler so the verification machine never pollutes timing.
 *
 *  @param name The benny case name; also used in violation messages.
 *  @param builder Given a hook handler, builds a fresh machine wired with that
 *         handler and returns the per-op exercise closure.
 *  @param opts `expectFire` (default true): whether one exercise pass must fire
 *         the hook at least once, or (false) exactly never.  `handler` (default
 *         `() => true`): the measurement handler, overridable for e.g. the
 *         data-carrying case.
 *  @returns The registered benny case (the return value of `b.add`).
 *  @throws Error when the verification pass contradicts `expectFire`.
 *
 *  @example
 *  verified('Basic hook by transition', (h) => {
 *    const m = sm`a => b => a;`;
 *    m.set_hook({ from: 'a', to: 'b', handler: h, kind: 'hook' });
 *    return () => { m.transition('b'); m.transition('a'); };
 *  })
 *
 *  @see kindSupported
 */
function verified(name, builder, opts = {}) {

  const expectFire = opts.expectFire !== false;
  const handler    = opts.handler || (() => true);

  let count = 0;
  const verification_pass = builder((...args) => { count += 1; return handler(...args); });
  verification_pass();

  if (expectFire && count === 0) {
    throw new Error(`instrument bug: "${name}" never fires its hook`);
  }
  if (!expectFire && count !== 0) {
    throw new Error(`instrument bug: "${name}" is a carrying-cost case but fired ${count}x`);
  }

  return b.add(name, builder(handler));

}



/**
 *  Whether this library build supports registering the described hook — so a
 *  `--harness-from` overlay of this suite onto an older jssm degrades to a
 *  partial suite instead of crashing at load.  Mirrors the scaling suite's
 *  `HAS` feature probes in spirit.
 *
 *  @param desc A complete set_hook descriptor, attempted on a throwaway machine.
 *  @returns true when registration succeeds on this build.
 *
 *  @example kindSupported({ kind: 'after', from: 'fpb', handler: () => true })  // => true on current builds
 *
 *  @see verified
 */
function kindSupported(desc) {
  try {
    const m = sm`fpa 'fpgo' => fpb 'fpgo' => fpa;`;
    if (typeof m.set_hook !== 'function') { return false; }
    m.set_hook(desc);
    return true;
  } catch (_e) {
    return false;
  }
}



/**
 *  Build a hooked-case builder from a machine source, a hook-descriptor list
 *  factory, and an exercise factory — the composition glue for verified().
 *
 *  @param src FSL source for a fresh machine per build.
 *  @param descsFor Given the handler, returns the set_hook descriptors to install.
 *  @param exercise Given the machine, returns the per-op exercise closure.
 *  @returns A builder suitable for {@link verified}.
 */
function hooked(src, descsFor, exercise) {
  return (handler) => {
    const m = sm([src]);
    for (const desc of descsFor(handler)) { m.set_hook(desc); }
    return exercise(m);
  };
}



const noop_true = () => true;

// Machine shapes.  MAIN uses => edges (transition() and main-transition hooks);
// STANDARD uses -> (standard-transition hooks); FORCED uses ~>, which
// transition() cannot traverse — forced shapes are exercised by
// force_transition() or by labeled action() (probe-verified).
const TL_MAIN             = `red => green => yellow => red; [red yellow green] ~> off -> red;`;
const TL_MAIN_LABELED     = `red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
const TL_STANDARD         = `red 'foo' -> green -> yellow -> red; [red yellow green] ~> off -> red;`;
const TL_STANDARD_LABELED = `red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] ~> off -> red;`;
const TL_FORCED           = `red 'foo' ~> green ~> yellow ~> red; [red yellow green] ~> off -> red;`;
const TL_FORCED_LABELED   = `red 'next' ~> green 'next' ~> yellow 'next' ~> red; [red yellow green] ~> off -> red;`;
const TL_KITCHEN          = `red 'next' => green 'next' -> yellow 'next' ~> red; [red yellow green] ~> off -> red;`;

function cycleByTransition(m) {
  return () => {
    for (let i = 0; i < 100; ++i) { m.transition('green'); m.transition('yellow'); m.transition('red'); }
  };
}

function cycleByAction(m) {
  return () => {
    for (let i = 0; i < 100; ++i) { m.action('next'); m.action('next'); m.action('next'); }
  };
}

function cycleByForce(m) {
  return () => {
    for (let i = 0; i < 100; ++i) { m.force_transition('green'); m.force_transition('yellow'); m.force_transition('red'); }
  };
}



/**
 *  The kitchen-sink builder: one machine carrying fifteen distinct hook slots
 *  spanning pre, post, and after families, cycled across all three edge types
 *  (main =>, standard ->, forced ~>) so every slot is reachable.  v2: the v1
 *  case cycled the wrong machine entirely, registered named hooks under
 *  `name:`, registered global-action with no `action:`, and double-registered
 *  several single-slot hooks (overwrites, not additions).
 */
function kitchenSink(handler) {
  const m = sm([TL_KITCHEN]);
  m.set_hook({ from: 'red',   to: 'green',  handler, kind: 'hook' });
  m.set_hook({ from: 'green', to: 'yellow', action: 'next',   handler, kind: 'named' });
  m.set_hook({ from: 'red',   to: 'green',  action: 'unused', handler, kind: 'named' });
  m.set_hook({ handler, kind: 'any transition' });
  m.set_hook({ handler, from: 'red', kind: 'exit' });
  m.set_hook({ handler, kind: 'any action' });
  m.set_hook({ handler, kind: 'standard transition' });
  m.set_hook({ handler, kind: 'main transition' });
  m.set_hook({ handler, kind: 'forced transition' });
  m.set_hook({ handler, action: 'next', kind: 'global action' });
  m.set_hook({ handler, to: 'red', kind: 'entry' });
  m.set_hook({ handler, kind: 'after', from: 'green' });
  m.set_hook({ handler, kind: 'post hook', from: 'red', to: 'green' });
  m.set_hook({ handler, kind: 'post entry', to: 'yellow' });
  m.set_hook({ handler, kind: 'post exit', from: 'yellow' });
  return () => {
    for (let i = 0; i < 100; ++i) {
      m.transition('green');        // red    -> green  (main edge)
      m.action('next');             // green  -> yellow (standard edge, named action)
      m.force_transition('red');    // yellow -> red    (forced edge)
    }
  };
}



// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------
//
// Naming: a case keeps its historical name only when its measured semantics
// are unchanged; repaired cases carry a v2 suffix so old (broken) trend lines
// cannot be spliced onto the repaired measurement.

const TlBlindT = sm([TL_MAIN]);
const TlBlindA = sm([TL_MAIN_LABELED]);

const TlRJ = sm([TL_MAIN_LABELED]);
if (TlRJ.action('nope') !== false) { throw new Error('instrument bug: rejected-action case unexpectedly transitioned'); }
function RejectedAction100Times() {
  for (let i = 0; i < 100; ++i) { TlRJ.action('nope'); }
}

function CompileTrivialABStringUsingSm() {
  const ab = sm`a -> b;`;
  if (ab === undefined) { throw 'not defined!'; }  // prevent removal through shaking
}

function CompileTrivialABStringUsingFrom() {
  const ab = jssm.from('a -> b;');
  if (ab === undefined) { throw 'not defined!'; }  // prevent removal through shaking
}

const cases = [

  b.add('Blind cycle a traffic light 100 times by transition', cycleByTransition(TlBlindT)),
  b.add('Blind cycle a traffic light 100 times by action',     cycleByAction(TlBlindA)),

  // --- pre-hook family, transition dispatch -------------------------------

  verified('Blind cycle a basic-hooked traffic light 100 times by transition',
    hooked(TL_MAIN, h => [{ from: 'red', to: 'green', handler: h, kind: 'hook' }], cycleByTransition)),

  // Named hooks fire only under action() dispatch (jssm.ts named fire site is
  // gated on wasAction), so this is by design a carrying-cost case: the store
  // is populated, the dispatch pays _has_named_hooks, and the hook can never
  // fire.  expectFire:false pins that.
  verified('Carry a named hook that cannot fire, 100 cycles by transition v2',
    hooked(TL_MAIN_LABELED, h => [{ from: 'red', to: 'green', action: 'next', handler: h, kind: 'named' }], cycleByTransition),
    { expectFire: false }),

  verified('Blind cycle an any-transition traffic light 100 times by transition',
    hooked(TL_MAIN, h => [{ handler: h, kind: 'any transition' }], cycleByTransition)),

  verified('Blind cycle an exit hooked traffic light 100 times by transition',
    hooked(TL_MAIN, h => [{ handler: h, from: 'red', kind: 'exit' }], cycleByTransition)),

  verified('Blind cycle an enter hooked traffic light 100 times by transition',
    hooked(TL_MAIN, h => [{ handler: h, to: 'red', kind: 'entry' }], cycleByTransition)),

  verified('Blind cycle a standard-transition hooked light by transition',
    hooked(TL_STANDARD, h => [{ handler: h, kind: 'standard transition' }], cycleByTransition)),

  verified('Blind cycle a main-transition hooked light by transition',
    hooked(TL_MAIN, h => [{ handler: h, kind: 'main transition' }], cycleByTransition)),

  // v2: v1 drove this machine with transition(), which cannot traverse ~>
  // edges — every call failed and the hook never fired.
  verified('Cycle a force-transition hooked light 100 times by force_transition v2',
    hooked(TL_FORCED, h => [{ handler: h, kind: 'forced transition' }], cycleByForce)),

  // --- pre-hook family, action dispatch -----------------------------------

  verified('Blind cycle a basic-hooked traffic light 100 times by action',
    hooked(TL_MAIN_LABELED, h => [{ from: 'red', to: 'green', handler: h, kind: 'hook' }], cycleByAction)),

  // v2: v1 registered with name: (set_hook reads action:) — never fired.
  verified('Blind cycle a named-hooked traffic light 100 times by action v2',
    hooked(TL_MAIN_LABELED, h => [{ from: 'red', to: 'green', action: 'next', handler: h, kind: 'named' }], cycleByAction)),

  verified('Blind cycle an any-action traffic light 100 times by action',
    hooked(TL_MAIN_LABELED, h => [{ handler: h, kind: 'any action' }], cycleByAction)),

  // v2: v1 registered with no action: field — never fired.
  verified('Blind cycle a global-action traffic light 100 times by action v2',
    hooked(TL_MAIN_LABELED, h => [{ handler: h, action: 'next', kind: 'global action' }], cycleByAction)),

  verified('Blind cycle an exit hooked traffic light 100 times by action',
    hooked(TL_MAIN_LABELED, h => [{ handler: h, from: 'red', kind: 'exit' }], cycleByAction)),

  verified('Blind cycle an enter hooked traffic light 100 times by action',
    hooked(TL_MAIN_LABELED, h => [{ handler: h, to: 'red', kind: 'entry' }], cycleByAction)),

  // v2 ×3: v1's machines had no 'next' labels — every action() call failed.
  verified('Cycle a standard transition tl 100 times by action v2',
    hooked(TL_STANDARD_LABELED, h => [{ handler: h, kind: 'standard transition' }], cycleByAction)),

  verified('Cycle a main transition tl 100 times by action v2',
    hooked(TL_MAIN_LABELED, h => [{ handler: h, kind: 'main transition' }], cycleByAction)),

  verified('Cycle a forced transition tl 100 times by action v2',
    hooked(TL_FORCED_LABELED, h => [{ handler: h, kind: 'forced transition' }], cycleByAction)),

  // --- data and rejection paths --------------------------------------------

  verified('Data-carrying basic hook, 100 cycles by transition',
    hooked(TL_MAIN, h => [{ from: 'red', to: 'green', handler: h, kind: 'hook' }], cycleByTransition),
    { handler: () => ({ pass: true, data: 7 }) }),

  b.add('Rejected action, 100 calls by action', RejectedAction100Times),

];

// --- after / post families (feature-probed for --harness-from overlays) -----

function addIfSupported(guardDesc, makeCase) {
  if (kindSupported(guardDesc)) { cases.push(makeCase()); }
}

addIfSupported({ kind: 'after', from: 'fpb', handler: noop_true }, () =>
  verified('After hook keyed by state, 100 cycles by transition',
    hooked(TL_MAIN, h => [{ kind: 'after', from: 'green', handler: h }], cycleByTransition)));

addIfSupported({ kind: 'after', from: 'fpgo', handler: noop_true }, () =>
  verified('After hook keyed by action, 100 cycles by action',
    hooked(TL_MAIN_LABELED, h => [{ kind: 'after', from: 'next', handler: h }], cycleByAction)));

addIfSupported({ kind: 'post hook', from: 'fpa', to: 'fpb', handler: noop_true }, () =>
  verified('Post basic hook, 100 cycles by transition',
    hooked(TL_MAIN, h => [{ kind: 'post hook', from: 'red', to: 'green', handler: h }], cycleByTransition)));

addIfSupported({ kind: 'post hook', from: 'fpa', to: 'fpb', handler: noop_true }, () =>
  verified('Post basic hook, 100 cycles by action',
    hooked(TL_MAIN_LABELED, h => [{ kind: 'post hook', from: 'red', to: 'green', handler: h }], cycleByAction)));

addIfSupported({ kind: 'post named', from: 'fpa', to: 'fpb', action: 'fpgo', handler: noop_true }, () =>
  verified('Post named hook, 100 cycles by action',
    hooked(TL_MAIN_LABELED, h => [{ kind: 'post named', from: 'red', to: 'green', action: 'next', handler: h }], cycleByAction)));

addIfSupported({ kind: 'post entry', to: 'fpb', handler: noop_true }, () =>
  verified('Post entry hook, 100 cycles by transition',
    hooked(TL_MAIN, h => [{ kind: 'post entry', to: 'red', handler: h }], cycleByTransition)));

addIfSupported({ kind: 'post exit', from: 'fpa', handler: noop_true }, () =>
  verified('Post exit hook, 100 cycles by transition',
    hooked(TL_MAIN, h => [{ kind: 'post exit', from: 'red', handler: h }], cycleByTransition)));

addIfSupported({ kind: 'post global action', action: 'fpgo', handler: noop_true }, () =>
  verified('Post global action hook, 100 cycles by action',
    hooked(TL_MAIN_LABELED, h => [{ kind: 'post global action', action: 'next', handler: h }], cycleByAction)));

if (    kindSupported({ kind: 'after',     from: 'fpb',            handler: noop_true })
     && kindSupported({ kind: 'post hook', from: 'fpa', to: 'fpb', handler: noop_true }) ) {
  cases.push(verified('Kitchen sink (15 hooks) 100 times v2', kitchenSink));
}

// --- compile ----------------------------------------------------------------

cases.push(b.add('Compile `a -> b;` using sm',    CompileTrivialABStringUsingSm));
cases.push(b.add('Compile `a -> b;` using .from', CompileTrivialABStringUsingFrom));



b.suite('General performance suite',

  ...cases,

  b.cycle(),
  b.complete(),

  b.save({ file: 'general', version: pkg.version }),
  b.save({ file: 'general', format: 'chart.html' }),

);
```

- [ ] **Step 1.2: Run the suite**

Run: `npm run benny`
Expected: no `instrument bug:` throw at startup; benny cycles through ~32 cases (a few minutes); writes `benchmark/results/general.json` and chart.

- [ ] **Step 1.3: Validate the envelope.** Write `build/check_general_envelope.cjs`:

```js
const data = require('../benchmark/results/general.json');
const pkg  = require('../package.json');

if (data.version !== pkg.version) { throw new Error(`envelope version ${data.version} !== package ${pkg.version}`); }

const names = data.results.map((r) => r.name);
const dups  = names.filter((n, i) => names.indexOf(n) !== i);
if (dups.length) { throw new Error(`duplicate case names: ${dups.join(', ')}`); }

const must = [
  'After hook keyed by state, 100 cycles by transition',
  'After hook keyed by action, 100 cycles by action',
  'Post basic hook, 100 cycles by transition',
  'Post basic hook, 100 cycles by action',
  'Post named hook, 100 cycles by action',
  'Post entry hook, 100 cycles by transition',
  'Post exit hook, 100 cycles by transition',
  'Post global action hook, 100 cycles by action',
  'Data-carrying basic hook, 100 cycles by transition',
  'Rejected action, 100 calls by action',
  'Kitchen sink (15 hooks) 100 times v2',
  'Cycle a force-transition hooked light 100 times by force_transition v2',
  'Carry a named hook that cannot fire, 100 cycles by transition v2',
];
for (const m of must) { if (!names.includes(m)) { throw new Error(`missing case: ${m}`); } }

console.log(`envelope ok: ${names.length} cases, version ${data.version}`);
```

Run: `node build/check_general_envelope.cjs`
Expected: `envelope ok: 32 cases, version <current package version>` (case count may differ by ±0; all `must` names present).

- [ ] **Step 1.4: Commit**

```
git add src/buildjs/benchmark.cjs
git commit -m "test(bench): repair seven silent general-suite bugs; add after/post/data/rejection cases with startup fire-verification" -- src/buildjs/benchmark.cjs
```

---

### Task 2: Failing graviton spec tests (TDD)

**Files:**
- Modify: `src/scripts/tests/graviton_perf.spec.ts`

- [ ] **Step 2.1: Add to the `buildRemoteScript — normal vs deep and ref safety` describe block** (it already defines the `ok` fixture):

```ts
  test('runs the general (hook microbenchmark) suite as its own line', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false });
    expect(s.split('\n')).toContain('npm run benny');   // line-exact: 'npm run benny:scaling' contains the substring
  });

  test('general suite is not deepened', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: true });
    expect(s.split('\n')).toContain('npm run benny');
    expect(s).not.toContain('BENNY_DEEP=1 npm run benny\n');
  });

  test('--harness-from overlays and runs the general suite too', () => {
    const s = gp.buildRemoteScript({ ...ok, deep: false, harnessFrom: 'main' });
    expect(s).toContain('src/buildjs/benchmark.cjs');
    expect(s.split('\n')).toContain('node ./src/buildjs/benchmark.cjs');
  });
```

- [ ] **Step 2.2: Add to the detached user-data describe block** (the one exercising `gp.buildDetachedUserData`, fixture `ok` there too):

```ts
  test('runs the general suite and publishes general.json', () => {
    const s = gp.buildDetachedUserData({ ...ok, deep: false });
    expect(s.split('\n')).toContain('npm run benny');
    expect(s).toContain('cp benchmark/results/general.json');
  });
```

(Adapt the fixture spread to that block's existing fixture name if it differs; follow the `normal vs deep benny gate` test's call shape.)

- [ ] **Step 2.3: Run and verify the new tests fail**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: exactly the 4 new tests FAIL (no `npm run benny` line yet); all pre-existing tests PASS.

- [ ] **Step 2.4: Commit the failing tests** (red commit is fine on this branch)

```
git add src/scripts/tests/graviton_perf.spec.ts
git commit -m "test(perf-ci): pin general-suite run + publish lines in graviton user-data (red)" -- src/scripts/tests/graviton_perf.spec.ts
```

---

### Task 3: Graviton implementation

**Files:**
- Modify: `src/scripts/graviton_perf.cjs:518-529` (benchSteps), `:620` (benchLine block), `:700` area (publish cp lines), `:1167-1181` (configureAndRun artifacts), `:1332-1342` (publish files map)

- [ ] **Step 3.1: `buildRemoteScript` benchSteps** — replace the `benchSteps` ternary with:

```js
  const benchSteps = harnessFrom
    ? [
        `# 4. Overlay the current benchmark harnesses from "${harnessFrom}" and run them directly.`,
        `git fetch origin "${harnessFrom}"`,
        'git checkout FETCH_HEAD -- src/buildjs/benchmark_scaling.cjs src/buildjs/benchmark_scaling_plan.cjs src/buildjs/benchmark.cjs benchmark/fixtures',
        'npm install benny@^3.7.1 --no-save --no-audit --no-fund',
        `${deep ? 'BENNY_DEEP=1 ' : ''}node ./src/buildjs/benchmark_scaling.cjs`,
        '# 4b. General (hook microbenchmark) suite — feature-probes degrade it on old libraries.',
        'node ./src/buildjs/benchmark.cjs'
      ]
    : [
        '# 4. Benchmark (mode-dependent).',
        deep ? 'BENNY_DEEP=1 npm run benny:scaling' : 'npm run benny:scaling',
        '# 4b. General (hook microbenchmark) suite — BENNY_DEEP does not apply to it.',
        'npm run benny'
      ];
```

(Scaling files stay first in the checkout list so the existing `toContain('git checkout FETCH_HEAD -- src/buildjs/benchmark_scaling.cjs')` assertion keeps passing.)

- [ ] **Step 3.2: `buildDetachedUserData`** — after the `benchLine,` element add:

```js
    '# 4b. General (hook microbenchmark) suite.',
    'npm run benny',
```

and in the publish block, directly after the `cp benchmark/results/scaling.json` line, add:

```js
    `    cp benchmark/results/general.json "$RESULTS/${destDir}/general.json" || true`,
```

- [ ] **Step 3.3: `configureAndRun`** — add general.json to the scp set and the return:

```js
  const generalJson = path.join(outDir, 'general.json');
  exec.run('scp', [...sshBase, `ec2-user@${dns}:jssm/benchmark/results/general.json`, generalJson]);
```

and change the return to `return { scalingJson, scalingMd, profTxt, generalJson };` (update the DocBlock `@returns`).

- [ ] **Step 3.4: publish call site** — extend the `files` map:

```js
      files         : {
        [perfResultPath(opts.instanceType, opts.prNumber, 'scaling.json')]      : artifacts.scalingJson,
        [perfResultPath(opts.instanceType, opts.prNumber, 'construct.prof.txt')]: artifacts.profTxt,
        [perfResultPath(opts.instanceType, opts.prNumber, 'meta.json')]         : metaPath,
        // general.json is best-effort: an old commit's run may not produce it.
        ...((exec.dryRun || fs.existsSync(artifacts.generalJson))
          ? { [perfResultPath(opts.instanceType, opts.prNumber, 'general.json')]: artifacts.generalJson }
          : {})
      },
```

- [ ] **Step 3.5: DocBlocks** — update `buildRemoteScript`, `buildDetachedUserData`, and `configureAndRun` summaries/`@returns` to mention the general suite and `general.json`. Dead-man's-switch: default is 90 min (`DEFAULTS.shutdownMinutes`); the general suite adds ~2–3 min — no change needed, but note it in `buildDetachedUserData`'s DocBlock sentence about the run budget.

- [ ] **Step 3.6: Run the spec**

Run: `npx vitest run src/scripts/tests/graviton_perf.spec.ts`
Expected: ALL tests PASS (the 4 new ones go green; none of the existing assertions break).

- [ ] **Step 3.7: Commit**

```
git add src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
git commit -m "feat(perf-ci): graviton runs and publishes the general hook suite (general.json) alongside scaling" -- src/scripts/graviton_perf.cjs src/scripts/tests/graviton_perf.spec.ts
```

---

### Task 4: Cleanup and full verification

- [ ] **Step 4.1: Remove the probe scripts** (`build/` is temp space; keep the envelope checker out of the commit too — it lives in build/ and is rerunnable from this plan)

```
rm build/probe_hook_semantics.cjs build/probe_forced_action.cjs
```

- [ ] **Step 4.2: Full test suite**

Run: `npm test`
Expected: all suites green (the rewrite touches no library code; only `benchmark.cjs` + graviton files).

- [ ] **Step 4.3: IDE diagnostics** on `graviton_perf.spec.ts` (the only TS file touched) — expect clean.

---

### Task 5: Ship

- [ ] **Step 5.1:** `/sc-commit` on this branch (version bump + full `npm run build` + commit; never hand-bump).
- [ ] **Step 5.2:** Push and open the PR. Body: bug ledger (7 bugs, table), the fire-verification mechanism, new case inventory, graviton wiring summary, local-numbers caveat (host noise; graviton is the verdict), link to the spec file. Note that `general.json` becomes canonically published from the next release's graviton run onward.
- [ ] **Step 5.3:** PR comment: this PR makes hook-path levers adjudicable; reference the `_after_hooks` candidate (lever 3) discussion in #729's lineage without reopening it.

---

## Self-review

- Spec coverage: Part 1 bugs 1–7 → Task 1 (kitchen sink, labels, dup, version, action:, force_transition); Part 2 cases → Task 1 case list (after ×2, post ×6, data, rejection); Part 3 items 1–5 → Task 3 (user-data ×2, publish ×2, feature probes live in benchmark.cjs itself, dead-man note, spec tests in Task 2). Fire-verification (spec addendum) → `verified()`.
- No placeholders; all code complete.
- Names used in Task 1's `must` list match the case names in Step 1.1 exactly.
