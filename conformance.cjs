'use strict';

/**
 *  Adapter conformance gate.  Every adapter must demonstrably move a known
 *  machine through known states before it is allowed near the benchmark —
 *  with twenty-odd third-party adapters, a silently broken one would
 *  otherwise publish garbage numbers.
 *
 *  Checks per adapter (capability-gated; missing caps are skipped):
 *    core   : chain-3 walk s0 -> s1 -> s2 -> s0, reset, repeat
 *    action : go1/go2/go3 cycles a -> b -> c -> a twice
 *    guard  : guard fn runs once per step and passes; 4 steps -> count 4
 *    hook   : observer fires once per transition; 4 steps -> count 4
 *    data   : payload of the last step is readable from machine context
 *    timer  : arm+disarm round trip returns to start; a final arm left to
 *             expire actually fires the delayed transition (proves the timer
 *             is real, not decorative)
 *
 *  Usage: node conformance.cjs [adapterName ...]   (default: all)
 *  Exits nonzero on any failure; prints one line per adapter+family.
 */

const { chainShape } = require('./shapes.cjs');
const { ADAPTERS }   = require('./adapters/index.cjs');

const only = process.argv.slice(2);
let failures = 0;

function check(adapter, family, fn) {
  try {
    fn();
    console.log(`  ok    ${adapter.name.padEnd(26)} ${family}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${adapter.name.padEnd(26)} ${family}: ${e.message}`);
  }
}

async function checkAsync(adapter, family, fn) {
  try {
    await fn();
    console.log(`  ok    ${adapter.name.padEnd(26)} ${family}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${adapter.name.padEnd(26)} ${family}: ${e.message}`);
  }
}

function expect(actual, wanted, label) {
  if (actual !== wanted) {
    throw new Error(`${label}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runCore(a) {
  const shape = chainShape(3);
  const ctx   = a.open(shape);
  expect(ctx.now(), 's0', 'initial');
  for (const target of ['s1', 's2', 's0', 's1']) {
    const r = a.step(ctx, target);
    if (a.caps.async) await r;
    expect(ctx.now(), target, `after step(${target})`);
  }
  a.reset(ctx);
  expect(ctx.now(), 's0', 'after reset');
  const r2 = a.step(ctx, 's1');
  if (a.caps.async) await r2;
  expect(ctx.now(), 's1', 'step after reset');
}

async function runAction(a) {
  const ctx = a.openAction();
  expect(ctx.now(), 'a', 'initial');
  for (const [ev, dest] of [['go1','b'], ['go2','c'], ['go3','a'], ['go1','b'], ['go2','c'], ['go3','a']]) {
    const r = a.stepAction(ctx, ev);
    if (a.caps.async) await r;
    expect(ctx.now(), dest, `after ${ev}`);
  }
}

async function runGuard(a) {
  const ctx = a.openGuard();
  expect(ctx.now(), 'a', 'initial');
  for (const target of ['b', 'a', 'b', 'a']) {
    const r = a.stepGuard(ctx, target);
    if (a.caps.async) await r;
    expect(ctx.now(), target, `after guarded step(${target})`);
  }
  expect(ctx.guardCount(), 4, 'guard invocation count');
}

async function runHook(a) {
  const ctx = a.openHook();
  for (const target of ['b', 'a', 'b', 'a']) {
    const r = a.stepHook(ctx, target);
    if (a.caps.async) await r;
    expect(ctx.now(), target, `after hooked step(${target})`);
  }
  expect(ctx.hookCount(), 4, 'hook fire count');
}

async function runData(a) {
  const ctx = a.openData();
  const r1 = a.stepData(ctx, 'b', 'v1');  if (a.caps.async) await r1;
  const r2 = a.stepData(ctx, 'a', 'v2');  if (a.caps.async) await r2;
  expect(ctx.now(), 'a', 'after data steps');
  expect(ctx.data(), 'v2', 'payload readable');
}

async function runTimer(a) {
  const ctx = a.openTimer();
  expect(ctx.now(), 'a', 'initial');
  const r = a.stepTimer(ctx);
  if (a.caps.async) await r;
  expect(ctx.now(), 'a', 'after arm+disarm round trip');

  // Arm and let it expire: the delayed transition must actually fire.
  const r2 = a.armTimer(ctx);                 // a -> b, schedules b -> a
  if (a.caps.async) await r2;
  expect(ctx.now(), 'b', 'armed');
  await sleep(a.timerDelayMs() + 80);
  expect(ctx.now(), 'a', 'delayed transition fired');
  a.closeTimer(ctx);
}

(async () => {
  for (const a of ADAPTERS) {
    if (only.length && !only.includes(a.name)) continue;
    await checkAsync(a, 'core', () => runCore(a));
    if (a.caps.action) await checkAsync(a, 'action', () => runAction(a));
    if (a.caps.guard)  await checkAsync(a, 'guard',  () => runGuard(a));
    if (a.caps.hook)   await checkAsync(a, 'hook',   () => runHook(a));
    if (a.caps.data)   await checkAsync(a, 'data',   () => runData(a));
    if (a.caps.timer)  await checkAsync(a, 'timer',  () => runTimer(a));
  }
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nall conformant');
  process.exit(failures ? 1 : 0);
})();
