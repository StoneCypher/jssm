
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
