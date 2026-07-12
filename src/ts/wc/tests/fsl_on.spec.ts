/**
 * @vitest-environment jsdom
 *
 * Tests for the `<fsl-on>` declarative event-discovery directive (#643).
 * `<jssm-on>` is the synonym tag and is covered in the synonym section.
 *
 * Two facets:
 *   1. {@link parse_jssm_on_element}, {@link resolve_named_handler}, and
 *      {@link compile_inline_body} as pure functions, independent of the
 *      `<fsl-instance>` element.
 *   2. End-to-end behavior with `<fsl-on>` declared as a child of
 *      `<fsl-instance>`, including subscription installation, filtered
 *      delivery, `once` semantics, and cleanup on disconnect.
 */

import '../fsl_instance_wc.define';
import {
  JssmInstance,
  parse_jssm_on_element,
  resolve_named_handler,
  compile_inline_body,
  jssm_handler_registry,
  JSSM_ON_EVENT_NAMES
} from '../fsl_instance_wc';



/**
 * Drive a machine transition by dispatching the named action.  Centralized
 * helper so tests don't repeat the `.do('action')` ceremony.
 */
function step(host: JssmInstance, action: string): void {
  host.do(action);
}



describe('parse_jssm_on_element', () => {

  it('parses handler-name form with no filter', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', 'logStep');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.event).toBe('transition');
    expect(parsed.handler_name).toBe('logStep');
    expect(parsed.inline_body).toBeUndefined();
    expect(parsed.filter).toBeUndefined();
    expect(parsed.once).toBe(false);
    expect(parsed.name).toBeUndefined();
  });

  it('parses inline-body form when no handler attribute is set', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.textContent = 'globalThis.__ran = true;';
    const parsed = parse_jssm_on_element(el);
    expect(parsed.handler_name).toBeUndefined();
    expect(parsed.inline_body).toContain('__ran');
  });

  it('parses once and name attributes', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'terminal');
    el.setAttribute('handler', 'done');
    el.toggleAttribute('once', true);
    el.setAttribute('name', 'terminal-watch');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.once).toBe(true);
    expect(parsed.name).toBe('terminal-watch');
  });

  it('drops the name attribute when it is whitespace-only', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', 'logStep');
    el.setAttribute('name', ' '.repeat(3));
    const parsed = parse_jssm_on_element(el);
    expect(parsed.name).toBeUndefined();
  });

  it('builds {state} filter from state attribute on entry', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'entry');
    el.setAttribute('state', 'paid');
    el.setAttribute('handler', 'onPaid');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toEqual({ state: 'paid' });
  });

  it('builds {state} filter from state attribute on exit', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'exit');
    el.setAttribute('state', 'paid');
    el.setAttribute('handler', 'onPaidExit');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toEqual({ state: 'paid' });
  });

  it('builds {from} filter on transition', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('from', 'red');
    el.setAttribute('handler', 'leaveRed');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toEqual({ from: 'red' });
  });

  it('builds {to} filter on transition', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('to', 'green');
    el.setAttribute('handler', 'reachedGreen');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toEqual({ to: 'green' });
  });

  it('builds {from, to} filter when both are set (AND, specific edge)', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('from', 'red');
    el.setAttribute('to', 'green');
    el.setAttribute('handler', 'onEdge');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toEqual({ from: 'red', to: 'green' });
  });

  it('leaves filter undefined on transition when neither from nor to set', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', 'any');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toBeUndefined();
  });

  it('ignores state on a non-entry/exit event', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('state', 'paid');
    el.setAttribute('handler', 'h');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toBeUndefined();
  });

  it('ignores from on a non-transition event', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'entry');
    el.setAttribute('from', 'red');
    el.setAttribute('handler', 'h');
    const parsed = parse_jssm_on_element(el);
    expect(parsed.filter).toBeUndefined();
  });

  it('throws when event attribute is missing', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('handler', 'h');
    expect(() => parse_jssm_on_element(el)).toThrow(/missing required `event`/);
  });

  it('throws when event attribute is whitespace-only', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', ' '.repeat(3));
    el.setAttribute('handler', 'h');
    expect(() => parse_jssm_on_element(el)).toThrow(/missing required `event`/);
  });

  it('throws when event is unknown', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'no-such-event');
    el.setAttribute('handler', 'h');
    expect(() => parse_jssm_on_element(el)).toThrow(/unknown event "no-such-event"/);
  });

  it('throws when both handler attribute and inline body are supplied', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', 'h');
    el.textContent = 'console.log(e);';
    expect(() => parse_jssm_on_element(el)).toThrow(/handler="name" OR inline body, not both/);
  });

  it('throws when neither handler attribute nor inline body is supplied', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    expect(() => parse_jssm_on_element(el)).toThrow(/must specify handler="name" or an inline body/);
  });

  it('treats null textContent as no inline body', () => {
    // Defensive: textContent on a real HTMLElement is always a string, but
    // we still need to exercise the `body_text !== null` branch in
    // parse_jssm_on_element.  Patch the accessor to return null.
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', 'someHandler');
    Object.defineProperty(el, 'textContent', { get: () => null, configurable: true });
    const parsed = parse_jssm_on_element(el);
    expect(parsed.handler_name).toBe('someHandler');
    expect(parsed.inline_body).toBeUndefined();
  });

  it('treats a whitespace-only handler attribute as not supplied', () => {
    const el = document.createElement('fsl-on');
    el.setAttribute('event', 'transition');
    el.setAttribute('handler', ' '.repeat(3));
    // Whitespace handler + no body = neither form, which throws.
    expect(() => parse_jssm_on_element(el)).toThrow(/must specify handler/);
  });

  it('exposes a complete set of valid event names', () => {
    // Lock in the known set so an upstream addition to JssmEventName
    // can't silently bypass the WC validator.
    expect(JSSM_ON_EVENT_NAMES.has('transition')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('rejection')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('action')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('entry')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('exit')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('terminal')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('complete')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('error')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('data-change')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('override')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('timeout')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('hook-registration')).toBe(true);
    expect(JSSM_ON_EVENT_NAMES.has('hook-removal')).toBe(true);
  });

});



describe('resolve_named_handler', () => {

  afterEach(() => {
    jssm_handler_registry.clear();
    delete (globalThis as Record<string, unknown>).__jssm_on_test_handler;
  });

  it('resolves from the registry first', () => {
    const fn = () => {};
    jssm_handler_registry.set('reg_handler', fn);
    expect(resolve_named_handler('reg_handler')).toBe(fn);
  });

  it('falls back to globalThis if the registry has no entry', () => {
    const fn = () => {};
    (globalThis as Record<string, unknown>).__jssm_on_test_handler = fn;
    expect(resolve_named_handler('__jssm_on_test_handler')).toBe(fn);
  });

  it('throws when the name is not present anywhere', () => {
    expect(() => resolve_named_handler('never_registered_xyz'))
      .toThrow(/handler "never_registered_xyz" not found/);
  });

  it('prefers the registry over globalThis when both define the name', () => {
    const fn_reg    = () => 'reg';
    const fn_global = () => 'global';
    jssm_handler_registry.set('both', fn_reg);
    (globalThis as Record<string, unknown>).both = fn_global;
    expect(resolve_named_handler('both')).toBe(fn_reg);
    delete (globalThis as Record<string, unknown>).both;
  });

});



describe('compile_inline_body', () => {

  it('compiles a body that reads its `e` parameter', () => {
    const fn = compile_inline_body('return e + 1;', 'unit-1');
    expect((fn as unknown as (n: number) => number)(40)).toBe(41);
  });

  it('embeds a //# sourceURL pragma using the provided id', () => {
    const fn = compile_inline_body('return 1;', 'src-id-7');
    // Function.prototype.toString includes the entire body, including the
    // sourceURL pragma we appended.
    expect(String(fn)).toContain('//# sourceURL=jssm-on:src-id-7');
  });

});



/**
 * jsdom captures synchronous throws from a custom-element connection
 * callback as a window 'error' event rather than re-throwing them to
 * `appendChild`.  This helper turns that into a returnable value.
 */
function capture_connection_error(fn: () => void): Error | null {
  let captured: Error | null = null;
  const handler = (e: ErrorEvent) => {
    e.preventDefault();
    captured = e.error instanceof Error ? e.error : new Error(String(e.message));
  };
  addEventListener('error', handler);
  try {
    fn();
  } finally {
    removeEventListener('error', handler);
  }
  return captured;
}



describe('<fsl-on> integration with <jssm-instance> (canonical)', () => {

  // Per-test cleanup to avoid global-state leaks between cases.
  afterEach(() => {
    jssm_handler_registry.clear();
    // Wipe every name we set on globalThis during the suite.
    for (const k of [
      'onAnyTransition', 'onEdge', 'onLeaveRed', 'onReachGreen',
      'onEntryPaid', 'onExitPaid', 'onTerminal', 'badOnce',
      'inlineCounter', 'multiCounter1', 'multiCounter2'
    ]) {
      delete (globalThis as Record<string, unknown>)[k];
    }
  });


  it('installs a named handler with no filter and delivers events', () => {
    let fired = 0;
    (globalThis as Record<string, unknown>).onAnyTransition = () => { fired += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "red 'go' -> green 'go' -> yellow 'go' -> red;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', 'onAnyTransition');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    step(host, 'go');
    expect(fired).toBe(2);

    host.remove();
  });


  it('installs an inline-body handler and delivers events', () => {
    (globalThis as Record<string, unknown>).inlineCounter = 0;

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "a 'go' -> b 'go' -> c;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.textContent = '(globalThis).inlineCounter += 1;';
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    step(host, 'go');
    expect((globalThis as Record<string, unknown>).inlineCounter).toBe(2);

    host.remove();
  });


  it('throws on connect when a <jssm-on> child has both forms', () => {
    const err = capture_connection_error(() => {
      const host = document.createElement('jssm-instance') as JssmInstance;
      host.setAttribute('fsl', 'a -> b;');
      const on_el = document.createElement('fsl-on');
      on_el.setAttribute('event', 'transition');
      on_el.setAttribute('handler', 'foo');
      on_el.textContent = 'console.log(e);';
      host.append(on_el);
      document.body.append(host);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/handler="name" OR inline body/);
  });


  it('throws on connect when a <jssm-on> child has an unknown event', () => {
    const err = capture_connection_error(() => {
      const host = document.createElement('jssm-instance') as JssmInstance;
      host.setAttribute('fsl', 'a -> b;');
      const on_el = document.createElement('fsl-on');
      on_el.setAttribute('event', 'no-such-event');
      on_el.setAttribute('handler', 'foo');
      host.append(on_el);
      document.body.append(host);
    });
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/unknown event/);
  });


  it('filters by {state} on entry — fires only when entering that state', () => {
    const seen: string[] = [];
    (globalThis as Record<string, unknown>).onEntryPaid = (e: { state: string }) => {
      seen.push(e.state);
    };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "cart 'pay' -> paid 'ship' -> shipped;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'entry');
    on_el.setAttribute('state', 'paid');
    on_el.setAttribute('handler', 'onEntryPaid');
    host.append(on_el);
    document.body.append(host);

    step(host, 'pay');    // entry: paid    — should fire
    step(host, 'ship');   // entry: shipped — should NOT fire
    expect(seen).toEqual(['paid']);

    host.remove();
  });


  it('filters by {state} on exit — fires only when leaving that state', () => {
    const seen: string[] = [];
    (globalThis as Record<string, unknown>).onExitPaid = (e: { state: string }) => {
      seen.push(e.state);
    };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "cart 'pay' -> paid 'ship' -> shipped;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'exit');
    on_el.setAttribute('state', 'paid');
    on_el.setAttribute('handler', 'onExitPaid');
    host.append(on_el);
    document.body.append(host);

    step(host, 'pay');    // exit: cart    — should NOT fire
    step(host, 'ship');   // exit: paid    — should fire
    expect(seen).toEqual(['paid']);

    host.remove();
  });


  it('filters transition by {from} only', () => {
    const seen: Array<{ from: string; to: string }> = [];
    (globalThis as Record<string, unknown>).onLeaveRed = (e: { from: string; to: string }) => {
      seen.push({ from: e.from, to: e.to });
    };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "red 'go' -> green 'go' -> yellow 'go' -> red;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('from', 'red');
    on_el.setAttribute('handler', 'onLeaveRed');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go'); // red -> green   — fire
    step(host, 'go'); // green -> yellow — skip
    step(host, 'go'); // yellow -> red   — skip (entering red is not leaving)
    expect(seen).toEqual([{ from: 'red', to: 'green' }]);

    host.remove();
  });


  it('filters transition by {to} only', () => {
    const seen: Array<{ from: string; to: string }> = [];
    (globalThis as Record<string, unknown>).onReachGreen = (e: { from: string; to: string }) => {
      seen.push({ from: e.from, to: e.to });
    };

    // Use two distinct edges that both terminate at "green" so the filter
    // can be exercised against multiple sources.  Edges must be unique in
    // FSL — `red -> green` and `blue -> green` are two separate edges.
    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "red 'go' -> green; green 'go' -> blue; blue 'go' -> green;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('to', 'green');
    on_el.setAttribute('handler', 'onReachGreen');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go'); // red -> green   — fire
    step(host, 'go'); // green -> blue  — skip
    step(host, 'go'); // blue -> green  — fire
    expect(seen).toEqual([
      { from: 'red',  to: 'green' },
      { from: 'blue', to: 'green' }
    ]);

    host.remove();
  });


  it('filters transition by {from, to} (AND, specific edge)', () => {
    const seen: Array<{ from: string; to: string }> = [];
    (globalThis as Record<string, unknown>).onEdge = (e: { from: string; to: string }) => {
      seen.push({ from: e.from, to: e.to });
    };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "red 'go' -> green 'go' -> yellow 'go' -> red;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('from', 'red');
    on_el.setAttribute('to', 'green');
    on_el.setAttribute('handler', 'onEdge');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go'); // red -> green   — fire
    step(host, 'go'); // green -> yellow — skip
    step(host, 'go'); // yellow -> red   — skip
    expect(seen).toEqual([{ from: 'red', to: 'green' }]);

    host.remove();
  });


  it('fires on every transition when neither from nor to are set', () => {
    let count = 0;
    (globalThis as Record<string, unknown>).onAnyTransition = () => { count += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "red 'go' -> green 'go' -> yellow;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', 'onAnyTransition');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    step(host, 'go');
    expect(count).toBe(2);

    host.remove();
  });


  it('once: handler is removed after the first delivery', () => {
    let count = 0;
    (globalThis as Record<string, unknown>).onTerminal = () => { count += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    // Use a multi-transition machine; subscribe to `transition` with `once`.
    host.setAttribute('fsl', "a 'go' -> b 'go' -> c;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', 'onTerminal');
    on_el.toggleAttribute('once', true);
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    step(host, 'go');
    expect(count).toBe(1);

    host.remove();
  });


  it('removes subscriptions on disconnect', () => {
    let fired = 0;
    (globalThis as Record<string, unknown>).onAnyTransition = () => { fired += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "a 'go' -> b 'go' -> c 'go' -> a;");
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', 'onAnyTransition');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    expect(fired).toBe(1);

    // Capture the raw machine BEFORE disconnect so we can poke it after.
    const machine = host.machine;

    host.remove();

    // After disconnect, driving the machine directly must NOT call the
    // handler — the unsubscribe ran in disconnectedCallback.
    machine.transition('c');
    expect(fired).toBe(1);
  });


  it('cleans up cleanly even if an unsubscribe throws', () => {
    // Install a fake "throwing unsubscribe" via the registry, then drive
    // the host through connect → disconnect.  The disconnect must not
    // surface the throw.
    let bad_unsub_called = false;
    (globalThis as Record<string, unknown>).badOnce = () => {};

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', 'a -> b;');
    const on_el = document.createElement('fsl-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', 'badOnce');
    host.append(on_el);
    document.body.append(host);

    // Swap in a throwing unsubscribe behind the host's back so we can
    // exercise the try/catch in disconnectedCallback.
    const list = (host as unknown as { _on_unsubscribes: Array<() => void> })._on_unsubscribes;
    list[0] = () => { bad_unsub_called = true; throw new Error('boom'); };

    expect(() => { host.remove(); }).not.toThrow();
    expect(bad_unsub_called).toBe(true);
  });


  it('installs multiple <jssm-on> children independently', () => {
    (globalThis as Record<string, unknown>).multiCounter1 = 0;
    (globalThis as Record<string, unknown>).multiCounter2 = 0;

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "a 'go' -> b 'go' -> a;");

    const on1 = document.createElement('fsl-on');
    on1.setAttribute('event', 'transition');
    on1.textContent = '(globalThis).multiCounter1 += 1;';
    host.append(on1);

    const on2 = document.createElement('fsl-on');
    on2.setAttribute('event', 'transition');
    on2.textContent = '(globalThis).multiCounter2 += 1;';
    host.append(on2);

    document.body.append(host);
    step(host, 'go');
    step(host, 'go');

    expect((globalThis as Record<string, unknown>).multiCounter1).toBe(2);
    expect((globalThis as Record<string, unknown>).multiCounter2).toBe(2);

    host.remove();
  });

});



describe('<jssm-on> synonym coverage', () => {

  afterEach(() => {
    jssm_handler_registry.clear();
    delete (globalThis as Record<string, unknown>).__jssm_on_syn_handler;
  });


  it('<jssm-on> synonym is discovered and delivers events', () => {
    let fired = 0;
    (globalThis as Record<string, unknown>).__jssm_on_syn_handler = () => { fired += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "a 'go' -> b;");
    const on_el = document.createElement('jssm-on');
    on_el.setAttribute('event', 'transition');
    on_el.setAttribute('handler', '__jssm_on_syn_handler');
    host.append(on_el);
    document.body.append(host);

    step(host, 'go');
    expect(fired).toBe(1);

    host.remove();
  });


  it('mixed-prefix: <fsl-on> and <jssm-on> siblings both fire', () => {
    let fsl_count  = 0;
    let jssm_count = 0;
    (globalThis as Record<string, unknown>).__fsl_counter  = () => { fsl_count  += 1; };
    (globalThis as Record<string, unknown>).__jssm_counter = () => { jssm_count += 1; };

    const host = document.createElement('jssm-instance') as JssmInstance;
    host.setAttribute('fsl', "a 'go' -> b 'go' -> a;");

    const fsl_el = document.createElement('fsl-on');
    fsl_el.setAttribute('event', 'transition');
    fsl_el.setAttribute('handler', '__fsl_counter');
    host.append(fsl_el);

    const jssm_el = document.createElement('jssm-on');
    jssm_el.setAttribute('event', 'transition');
    jssm_el.setAttribute('handler', '__jssm_counter');
    host.append(jssm_el);

    document.body.append(host);
    step(host, 'go');
    step(host, 'go');

    expect(fsl_count).toBe(2);
    expect(jssm_count).toBe(2);

    host.remove();

    delete (globalThis as Record<string, unknown>).__fsl_counter;
    delete (globalThis as Record<string, unknown>).__jssm_counter;
  });

});
