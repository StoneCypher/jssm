# Adapter contract (v2)

Every adapter exports:

```js
{
  name    : 'libname',
  version : '1.2.3',          // from the lib's package.json

  caps : {                     // capability flags; absent = false
    transition : true,         // shape-based target-state stepping (required)
    async      : false,        // step() returns a promise (benny awaits it)
    action     : false,        // event-named dispatch
    guard      : false,        // conditional transitions, guard fn runs per step
    hook       : false,        // lifecycle observer fires per transition
    data       : false,        // payload carried on a transition into machine context
    timer      : false,        // native delayed/auto transition arm + disarm
  },

  // ---- core (shape-based; shapes.cjs provides { name, start, edges, transitionSeq, fsl }) ----
  buildDefinition(shape)       // idiomatic definition (NOT measured)
  construct(def)               // measured: definition -> machine
  open(shape) -> ctx           // unmeasured; ctx.now() returns current state name
  reset(ctx)                   // restore start state (top of each benny iteration)
  step(ctx, target)            // measured: one legal transition toward `target`

  // ---- capability families (each builds its OWN tiny machine; all unmeasured opens) ----
  // action: states a,b,c; events go1: a->b, go2: b->c, go3: c->a
  openAction() -> ctx          // ctx.now()
  stepAction(ctx, eventName)

  // guard: a <-> b via to_b / to_a; a guard fn RUNS per step, increments ctx counter, passes
  openGuard() -> ctx           // ctx.now(), ctx.guardCount()
  stepGuard(ctx, target)

  // hook: a <-> b; lifecycle observer fires per transition
  openHook() -> ctx            // ctx.now(), ctx.hookCount()
  stepHook(ctx, target)

  // data: a <-> b; each step carries a payload into machine context
  openData() -> ctx            // ctx.now(), ctx.data()
  stepData(ctx, target, value)

  // timer: entering b arms a native delayed transition b -> a (>= 1s); leaving disarms
  openTimer() -> ctx           // ctx.now()
  stepTimer(ctx)               // one arm+disarm round trip: a -> b (arm), b -> a (disarm)
  closeTimer(ctx)              // cancel anything pending (conformance cleanup)
}
```

Rules:

- Each library is measured through its **idiomatic** path; no lowest-common-
  denominator wrappers.  Event-named libraries implement `step()` with events
  named `to_<target>`.
- A capability the library lacks is **omitted** (flag false) — skipped, never
  zero-scored.
- `conformance.cjs` must pass for every adapter before it is benchmarked; the
  suite refuses to include adapters that fail.
