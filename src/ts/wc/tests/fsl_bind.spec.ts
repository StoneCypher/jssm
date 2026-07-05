/**
 * @vitest-environment jsdom
 */

import { sm } from '../../jssm.js';
import {
  install_bindings,
  resolve_binding,
  set_on_element,
  walk_path,
  FslBind,
  JssmBind,
} from '../fsl_bind_wc.js';
import '../fsl_instance_wc.define';
import '../fsl_bind_wc.define';
import type { JssmInstance } from '../fsl_instance_wc.js';

describe('walk_path', () => {

  it('returns the input when the path is empty', () => {
    const obj = { a: 1 };
    expect(walk_path(obj, '')).toBe(obj);
  });

  it('returns the value at a top-level key', () => {
    expect(walk_path({ a: 42 }, 'a')).toBe(42);
  });

  it('returns the value at a nested key', () => {
    expect(walk_path({ a: { b: { c: 'x' } } }, 'a.b.c')).toBe('x');
  });

  it('returns undefined when an intermediate step is missing', () => {
    expect(walk_path({ a: { b: 7 } }, 'a.c')).toBeUndefined();
  });

  it('returns undefined when an intermediate step is not an object', () => {
    // 7 is a number; walking into it must fail gracefully.
    expect(walk_path({ a: { b: 7 } }, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when the root itself is undefined', () => {
    expect(walk_path(undefined, 'a')).toBeUndefined();
  });

  it('returns undefined when the root itself is null', () => {
    expect(walk_path(null, 'a')).toBeUndefined();
  });

  it('returns undefined when an intermediate value is explicitly null', () => {
    // The null check is separate from `typeof === 'object'` (since
    // `typeof null === 'object'`); this exercises that branch.
    expect(walk_path({ a: null }, 'a.b')).toBeUndefined();
  });

});

describe('resolve_binding', () => {

  it('resolves "state" to machine.state()', () => {
    const m = sm`Off 'flip' -> On;`;
    expect(resolve_binding(m, 'state')).toBe('Off');
  });

  it('resolves "terminal" to machine.is_terminal()', () => {
    const m = sm`Off 'flip' -> On;`;
    expect(resolve_binding(m, 'terminal')).toBe(false);
    m.transition('On');
    expect(resolve_binding(m, 'terminal')).toBe(true);
  });

  it('resolves "complete" to machine.is_complete()', () => {
    const m = sm`Off 'flip' -> On;`;
    // The exact value depends on FSL completion configuration; this
    // assertion proves the binding routes to is_complete() rather than
    // returning a hardcoded value.  Whatever the machine reports must
    // match.
    expect(resolve_binding(m, 'complete')).toBe(m.is_complete());
    expect(typeof resolve_binding(m, 'complete')).toBe('boolean');
  });

  it('resolves "legal-actions" to a space-joined list', () => {
    const m = sm`Off 'flip' -> On; Off 'spin' -> Up;`;
    const val = resolve_binding(m, 'legal-actions') as string;
    expect(val.split(' ').sort()).toEqual(['flip', 'spin']);
  });

  it('resolves "legal-actions" to an empty string when no actions are exposed', () => {
    const m = sm`a -> b;`;  // no action labels — only graph edges.
    expect(resolve_binding(m, 'legal-actions')).toBe('');
  });

  it('resolves "data" to machine.data() (whole value)', () => {
    const m = sm`a -> b;`;
    // Default machine has no data — m.data() returns undefined.
    expect(resolve_binding(m, 'data')).toBeUndefined();
  });

  it('resolves "data.path" via dotted traversal', () => {
    type D = { user: { name: string } };
    const m = sm<D>`a -> b;`;
    // Pre-seed data via a transition hook.  The hook contract commits
    // `data` (not `next_data`); use the `pass: true, data: ...` shape.
    m.hook_any_transition(() => ({ pass: true, data: { user: { name: 'alice' } } }));
    m.transition('b');
    expect(resolve_binding(m, 'data.user.name')).toBe('alice');
  });

  it('returns undefined for a missing dotted-data subfield', () => {
    type D = { user?: { name?: string } };
    const m = sm<D>`a -> b;`;
    expect(resolve_binding(m, 'data.user.name')).toBeUndefined();
  });

  it('throws on an unknown expression', () => {
    const m = sm`a -> b;`;
    expect(() => resolve_binding(m, 'wat')).toThrow(/unknown binding expression/);
    expect(() => resolve_binding(m, 'wat')).toThrow(/wat/);
  });

  it('does not treat "data" without a dotted suffix as the dotted form', () => {
    // Defensive: 'data' should go through the `case 'data'` branch, not
    // the `startsWith('data.')` branch (which would slice off "data.").
    const m = sm`a -> b;`;
    expect(resolve_binding(m, 'data')).toBeUndefined();  // not throw
  });

});

describe('set_on_element', () => {

  it('sets textContent by default-style call with target="textContent"', () => {
    const el = document.createElement('span');
    set_on_element(el, 'textContent', 42);
    expect(el.textContent).toBe('42');
  });

  it('coerces non-string values to string when writing textContent', () => {
    const el = document.createElement('span');
    set_on_element(el, 'textContent', { toString: () => 'X' });
    expect(el.textContent).toBe('X');
  });

  it('sets a data-* attribute via setAttribute when target starts with "data-"', () => {
    const el = document.createElement('div');
    set_on_element(el, 'data-current-state', 'red');
    expect(el.getAttribute('data-current-state')).toBe('red');
  });

  it('coerces non-string values when writing a data-* attribute', () => {
    const el = document.createElement('div');
    set_on_element(el, 'data-count', 7);
    expect(el.getAttribute('data-count')).toBe('7');
  });

  it('assigns "value" property for input elements', () => {
    const el = document.createElement('input');
    set_on_element(el, 'value', 'hello');
    expect(el.value).toBe('hello');
  });

  it('assigns boolean "disabled" property for button elements', () => {
    const el = document.createElement('button');
    set_on_element(el, 'disabled', true);
    expect(el.disabled).toBe(true);
    set_on_element(el, 'disabled', false);
    expect(el.disabled).toBe(false);
  });

  it('assigns boolean "hidden" property', () => {
    const el = document.createElement('div');
    set_on_element(el, 'hidden', true);
    expect(el.hidden).toBe(true);
  });

  it('assigns boolean "checked" property for input checkboxes', () => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    set_on_element(el, 'checked', true);
    expect(el.checked).toBe(true);
  });

});

describe('install_bindings — inline data-jssm-bind form', () => {

  it('paints initial textContent from current machine state', () => {
    const host = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'state');
    span.textContent = 'placeholder';
    host.appendChild(span);

    const m = sm`Idle 'go' -> Running;`;
    install_bindings(host, m);

    expect(span.textContent).toBe('Idle');
  });

  it('updates textContent on every transition', () => {
    const host = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'state');
    host.appendChild(span);

    const m = sm`Idle 'go' -> Running 'stop' -> Idle;`;
    install_bindings(host, m);
    expect(span.textContent).toBe('Idle');

    m.transition('Running');
    expect(span.textContent).toBe('Running');

    m.transition('Idle');
    expect(span.textContent).toBe('Idle');
  });

  it('honors data-jssm-bind-to="value" against an input', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    input.setAttribute('data-jssm-bind', 'state');
    input.setAttribute('data-jssm-bind-to', 'value');
    host.appendChild(input);

    const m = sm`A 'go' -> B;`;
    install_bindings(host, m);
    expect(input.value).toBe('A');

    m.transition('B');
    expect(input.value).toBe('B');
  });

  it('honors data-jssm-bind-to="disabled" with a boolean source', () => {
    const host = document.createElement('div');
    const btn = document.createElement('button');
    btn.setAttribute('data-jssm-bind', 'terminal');
    btn.setAttribute('data-jssm-bind-to', 'disabled');
    host.appendChild(btn);

    const m = sm`A 'go' -> B;`;
    install_bindings(host, m);
    expect(btn.disabled).toBe(false);

    m.transition('B');
    expect(btn.disabled).toBe(true);
  });

  it('honors data-jssm-bind-to="data-foo" by writing the attribute', () => {
    const host = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('data-jssm-bind', 'state');
    div.setAttribute('data-jssm-bind-to', 'data-current');
    host.appendChild(div);

    const m = sm`A 'go' -> B;`;
    install_bindings(host, m);
    expect(div.getAttribute('data-current')).toBe('A');

    m.transition('B');
    expect(div.getAttribute('data-current')).toBe('B');
  });

  it('resolves dotted data paths', () => {
    type D = { count: number };
    const m = sm<D>`a 'tick' -> a;`;
    m.hook_global_action('tick', ({ data }) => ({ pass: true, data: { count: (data?.count ?? 0) + 1 } }));

    const host = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'data.count');
    host.appendChild(span);

    install_bindings(host, m);
    expect(span.textContent).toBe('undefined');  // initial data is undefined

    m.action('tick');
    expect(span.textContent).toBe('1');

    m.action('tick');
    expect(span.textContent).toBe('2');
  });

  it('throws on install when an inline binding uses an unknown expression', () => {
    const host = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'nope');
    host.appendChild(span);

    const m = sm`a -> b;`;
    expect(() => install_bindings(host, m)).toThrow(/unknown binding expression/);
  });

  it('returns one unsub per inline binding and stops updates after unsubscribing', () => {
    const host = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'state');
    host.appendChild(span);

    const m = sm`A 'go' -> B 'go' -> C;`;
    const unsubs = install_bindings(host, m);
    expect(unsubs.length).toBe(1);

    m.transition('B');
    expect(span.textContent).toBe('B');

    for (const off of unsubs) { off(); }

    m.transition('C');
    // textContent did not update because we unsubscribed.
    expect(span.textContent).toBe('B');
  });

});

describe('install_bindings — dedicated <jssm-bind> tag form', () => {

  it('binds via selector + source attributes', () => {
    const host = document.createElement('div');
    const target_span = document.createElement('span');
    target_span.id = 'tgt';
    host.appendChild(target_span);

    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '#tgt');
    config.setAttribute('source', 'state');
    host.appendChild(config);

    const m = sm`Alpha 'go' -> Beta;`;
    install_bindings(host, m);
    expect(target_span.textContent).toBe('Alpha');

    m.transition('Beta');
    expect(target_span.textContent).toBe('Beta');
  });

  it('uses target="data-foo" to set a data-attribute', () => {
    const host = document.createElement('div');
    const target_div = document.createElement('div');
    target_div.className = 'tgt';
    host.appendChild(target_div);

    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '.tgt');
    config.setAttribute('source', 'state');
    config.setAttribute('target', 'data-current');
    host.appendChild(config);

    const m = sm`A -> B;`;
    install_bindings(host, m);
    expect(target_div.getAttribute('data-current')).toBe('A');
  });

  it('binds to multiple elements matching the selector', () => {
    const host = document.createElement('div');
    for (let i = 0; i < 3; ++i) {
      const s = document.createElement('span');
      s.className = 'multi';
      host.appendChild(s);
    }

    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '.multi');
    config.setAttribute('source', 'state');
    host.appendChild(config);

    const m = sm`A 'go' -> B;`;
    const unsubs = install_bindings(host, m);
    expect(unsubs.length).toBe(3);

    for (const s of Array.from(host.querySelectorAll<HTMLElement>('.multi'))) {
      expect(s.textContent).toBe('A');
    }

    m.transition('B');
    for (const s of Array.from(host.querySelectorAll<HTMLElement>('.multi'))) {
      expect(s.textContent).toBe('B');
    }
  });

  it('throws when selector attribute is missing', () => {
    const host = document.createElement('div');
    const config = document.createElement('jssm-bind');
    config.setAttribute('source', 'state');
    host.appendChild(config);

    const m = sm`a -> b;`;
    expect(() => install_bindings(host, m)).toThrow(/missing required "selector"/);
  });

  it('throws when source attribute is missing', () => {
    const host = document.createElement('div');
    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '#x');
    host.appendChild(config);

    const m = sm`a -> b;`;
    expect(() => install_bindings(host, m)).toThrow(/missing required "source"/);
  });

  it('throws when selector attribute is empty', () => {
    const host = document.createElement('div');
    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '');
    config.setAttribute('source', 'state');
    host.appendChild(config);

    const m = sm`a -> b;`;
    expect(() => install_bindings(host, m)).toThrow(/missing required "selector"/);
  });

  it('throws when source attribute is empty', () => {
    const host = document.createElement('div');
    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '#x');
    config.setAttribute('source', '');
    host.appendChild(config);

    const m = sm`a -> b;`;
    expect(() => install_bindings(host, m)).toThrow(/missing required "source"/);
  });

});

describe('FslBind re-registration guard', () => {

  // Covers the "already registered" branch of fsl_bind_wc.define.ts so
  // re-evaluating the define module is a no-op rather than a re-define
  // error (custom-elements registry only accepts each tag name once).
  it('does not re-define or throw when the define module is re-evaluated', async () => {
    const before = customElements.get('fsl-bind');
    expect(before).toBe(FslBind);

    vi.resetModules();
    await expect(import('../fsl_bind_wc.define')).resolves.toBeDefined();

    expect(customElements.get('fsl-bind')).toBe(before);
  });

  // Synonym (jssm-bind) is also registered by define_with_synonym.
  it('jssm-bind synonym is registered alongside fsl-bind', () => {
    expect(customElements.get('jssm-bind')).toBeDefined();
    expect(customElements.get('jssm-bind')).not.toBe(FslBind);
  });

});

describe('FslBind class (canonical)', () => {

  it('is registered as the <fsl-bind> custom element', () => {
    expect(customElements.get('fsl-bind')).toBe(FslBind);
  });

  it('createElement(fsl-bind) returns a FslBind instance', () => {
    const el = document.createElement('fsl-bind');
    expect(el).toBeInstanceOf(FslBind);
  });

  it('renders no content (purely declarative configuration)', async () => {
    const el = document.createElement('fsl-bind') as FslBind;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    // shadowRoot exists but contains nothing renderable.
    expect(el.shadowRoot).not.toBeNull();
    // The render() method returns `null` — defensive direct call.
    expect(el.render()).toBeNull();

    document.body.removeChild(el);
  });

});

describe('JssmBind synonym coverage', () => {

  it('jssm-bind is registered and its instances are FslBind instances', () => {
    const ctor = customElements.get('jssm-bind');
    expect(ctor).toBeDefined();
    const el = document.createElement('jssm-bind');
    expect(el).toBeInstanceOf(FslBind);
    // JssmBind is a type alias for FslBind; confirm assignment-compat.
    const typed: JssmBind = el as JssmBind;
    expect(typed).toBeInstanceOf(FslBind);
  });

  it('install_bindings discovers <jssm-bind> config tags as a synonym', () => {
    const host = document.createElement('div');
    const target_span = document.createElement('span');
    target_span.id = 'syn-tgt';
    host.appendChild(target_span);

    const config = document.createElement('jssm-bind');
    config.setAttribute('selector', '#syn-tgt');
    config.setAttribute('source', 'state');
    host.appendChild(config);

    const m = sm`Alpha 'go' -> Beta;`;
    install_bindings(host, m);
    expect(target_span.textContent).toBe('Alpha');

    m.transition('Beta');
    expect(target_span.textContent).toBe('Beta');
  });

});

describe('JssmInstance integration with <jssm-bind>', () => {

  // Note: the existing FSL resolver disallows combining the fsl="" attribute
  // with arbitrary descendant text in the light DOM (descendant text would
  // count as a second source).  These integration tests therefore inject the
  // FSL via a `<script type="text/fsl">` child so the resolver only sees one
  // source while the host carries arbitrary `data-jssm-bind` descendants.
  function add_fsl_script(el: HTMLElement, fsl: string): void {
    const s = document.createElement('script');
    s.setAttribute('type', 'text/fsl');
    s.textContent = fsl;
    el.appendChild(s);
  }

  it('paints inline data-jssm-bind descendants on connect', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    add_fsl_script(el, "Idle 'go' -> Running;");

    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'state');
    el.appendChild(span);

    document.body.appendChild(el);
    expect(span.textContent).toBe('Idle');

    el.do('go');
    expect(span.textContent).toBe('Running');

    document.body.removeChild(el);
  });

  it('paints dedicated <jssm-bind> children on connect', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    add_fsl_script(el, "A 'go' -> B;");

    const tgt = document.createElement('span');
    tgt.id = 'tgt-int';
    el.appendChild(tgt);

    const cfg = document.createElement('jssm-bind');
    cfg.setAttribute('selector', '#tgt-int');
    cfg.setAttribute('source', 'state');
    el.appendChild(cfg);

    document.body.appendChild(el);
    expect(tgt.textContent).toBe('A');

    el.do('go');
    expect(tgt.textContent).toBe('B');

    document.body.removeChild(el);
  });

  it('tears down all bindings on disconnect', () => {
    const el = document.createElement('jssm-instance') as JssmInstance;
    add_fsl_script(el, "A 'go' -> B 'go' -> C;");

    const span = document.createElement('span');
    span.setAttribute('data-jssm-bind', 'state');
    el.appendChild(span);

    document.body.appendChild(el);
    expect(span.textContent).toBe('A');

    el.do('go');
    expect(span.textContent).toBe('B');

    // Capture the machine reference *before* disconnect — the host still
    // holds it after disconnect, but we want to use this as a control to
    // prove the listener was removed.
    const m = el.machine;

    document.body.removeChild(el);

    // After disconnect, no binding listener should remain — transitioning
    // on the (still-reachable) machine must not update the span.
    m.transition('C');
    expect(span.textContent).toBe('B');
  });

});



// dotted-path bindings walk the live data reference but hand back
// mutation-isolated values, exactly as when they cloned the whole tree
describe('resolve_binding data.<path> leaf isolation', () => {

  test('object leaves come back as clones, primitives as themselves', () => {
    type D = { a: { b: number }, n: number };
    const m = sm<D>`x -> y;`;
    // seed data via a transition hook (the hook contract commits `data`)
    m.hook_any_transition(() => ({ pass: true, data: { a: { b: 1 }, n: 7 } }));
    m.transition('y');
    const leaf = resolve_binding(m, 'data.a') as { b: number };
    expect(leaf).toEqual({ b: 1 });
    leaf.b = 999;                                        // mutating the returned clone...
    expect(resolve_binding(m, 'data.a.b')).toBe(1);      // ...never touches machine data
    expect(resolve_binding(m, 'data.n')).toBe(7);        // primitive branch
  });

});
