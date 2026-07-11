/**
 * @vitest-environment jsdom
 */

import * as fc from 'fast-check';

import * as jssm from '../jssm';

import '../wc/fsl_instance_wc.define';

import {
  walk_path, resolve_binding, set_on_element, install_bindings
} from '../wc/fsl_bind_wc';

import {
  make_hook_proxy, normalize_hook_kind, parse_hook_element,
  wrap_user_handler, build_hook_descriptor
} from '../wc/fsl_hook_wc';

import { normalize_viz_error } from '../wc/fsl_viz_wc';





// Property-based coverage for the <fsl-bind> binding helpers and the
// <fsl-hook> parsing/wrapping pipeline, plus viz error normalization.



const RUNS = 80;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 8 }
);





describe('walk_path', () => {

  test('a constructed nested object resolves its own construction path; siblings miss', () => {

    fc.assert(
      fc.property(
        fc.array(word, { minLength: 1, maxLength: 5 }),
        fc.integer(),
        (segments, leaf) => {

          // build {a: {b: {c: leaf}}} from the inside out
          const obj = segments.reduceRight<unknown>( (acc, seg) => ({ [seg]: acc }), leaf );
          const path = segments.join('.');

          expect(walk_path(obj, path)).toBe(leaf);

          // one extra step into the numeric leaf fails
          expect(walk_path(obj, `${path}.deeper`)).toBe(undefined);

          // a first-segment miss fails immediately (constructed names never
          // collide with the reserved word below)
          expect(walk_path(obj, `zzz_${segments[0]}`)).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('empty path is identity; null and undefined swallow any path', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.object(), fc.constant(null)),
        word,
        (obj, path) => {
          expect(walk_path(obj, '')).toBe(obj);
          expect(walk_path(null, path)).toBe(undefined);
          expect(walk_path(undefined, path)).toBe(undefined);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('resolve_binding', () => {

  test('every documented expression projects the machine surface it names', () => {

    fc.assert(
      fc.property(
        word, fc.integer(),
        (key, val) => {

          const machine = jssm.from("ba 'step' -> bb;  bb 'step' -> ba;", { data: { [key]: val } });

          expect(resolve_binding(machine, 'state')).toBe('ba');
          expect(resolve_binding(machine, 'terminal')).toBe(false);
          expect(resolve_binding(machine, 'complete')).toBe(false);
          expect(resolve_binding(machine, 'legal-actions')).toBe('step');
          expect(resolve_binding(machine, 'data')).toEqual({ [key]: val });
          expect(resolve_binding(machine, `data.${key}`)).toBe(val);
          expect(resolve_binding(machine, `data.${key}x`)).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('unknown expressions throw, naming the expression', () => {

    fc.assert(
      fc.property(
        word.filter( w => !['state', 'terminal', 'complete', 'data'].includes(w) ),
        (expr) => {
          const machine = jssm.from('ba -> bb;');
          expect(() => resolve_binding(machine, expr)).toThrow(`unknown binding expression "${expr}"`);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('set_on_element', () => {

  test('data-* goes to attributes, textContent coerces, everything else assigns raw', () => {

    fc.assert(
      fc.property(
        word, fc.integer(), fc.boolean(),
        (attr_suffix, n, b) => {

          const el = document.createElement('div');

          set_on_element(el, `data-${attr_suffix}`, n);
          expect(el.getAttribute(`data-${attr_suffix}`)).toBe(String(n));

          set_on_element(el, 'textContent', n);
          expect(el.textContent).toBe(String(n));

          set_on_element(el, 'hidden', b);
          expect(el.hidden).toBe(b);   // raw boolean, not 'true'/'false' strings

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('install_bindings', () => {

  test('inline data-jssm-bind paints immediately and repaints per transition; unsubscribe freezes it', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        (steps) => {

          const machine = jssm.from('ia -> ib;  ib -> ia;');

          const host = document.createElement('div');
          const span = document.createElement('span');
          span.dataset.jssmBind = 'state';
          host.append(span);

          const unsubs = install_bindings(host, machine);

          expect(span.textContent).toBe('ia');   // painted immediately

          for (let s = 0; s < steps; ++s) {
            machine.transition(s % 2 === 0 ? 'ib' : 'ia');
            expect(span.textContent).toBe(machine.state());
          }

          const frozen_at = span.textContent;
          for (const u of unsubs) { u(); }
          machine.transition(steps % 2 === 0 ? 'ib' : 'ia');
          expect(span.textContent).toBe(frozen_at);   // no longer live

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('dedicated config tags bind by selector; missing selector or source throws', () => {

    fc.assert(
      fc.property(
        word,
        (cls) => {

          const machine = jssm.from('ia -> ib;  ib -> ia;');

          const host = document.createElement('div');
          const target = document.createElement('p');
          target.className = cls;
          host.append(target);

          const bind = document.createElement('fsl-bind');
          bind.setAttribute('selector', `.${cls}`);
          bind.setAttribute('source', 'state');
          host.append(bind);

          install_bindings(host, machine);
          expect(target.textContent).toBe('ia');

          const broken = document.createElement('div');
          const tag = document.createElement('jssm-bind');
          tag.setAttribute('source', 'state');
          broken.append(tag);
          expect(() => install_bindings(broken, machine)).toThrow(/selector/);

          const broken2 = document.createElement('div');
          const tag2 = document.createElement('jssm-bind');
          tag2.setAttribute('selector', 'p');
          broken2.append(tag2);
          expect(() => install_bindings(broken2, machine)).toThrow(/source/);

        }
      ),
      { numRuns: 40 }
    );

  });

});





describe('hook element parsing and wrapping', () => {

  const HOOK_KINDS = new Set([
    'hook', 'named', 'any transition', 'standard transition', 'main transition',
    'forced transition', 'entry', 'exit', 'any action', 'global action'
  ]);

  test('normalize_hook_kind passes valid kinds, defaults blanks, rejects junk', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...HOOK_KINDS),
        word.filter( w => !HOOK_KINDS.has(w) ),
        (kind, junk) => {

          expect(normalize_hook_kind(kind)).toBe(kind);
          expect(normalize_hook_kind(null)).toBe('hook');
          expect(normalize_hook_kind(undefined)).toBe('hook');
          expect(normalize_hook_kind('')).toBe('hook');
          expect(() => normalize_hook_kind(junk)).toThrow(/unknown hook kind/);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('parse_hook_element resolves named handlers and carries from/to/action through', () => {

    fc.assert(
      fc.property(
        word, word, fc.option(word, { nil: undefined }),
        (from, to, action) => {

          const registry = new Map<string, (m: unknown) => unknown>();
          const handler  = () => true;
          registry.set('myhook', handler);

          const el = document.createElement('jssm-hook');
          el.setAttribute('handler', 'myhook');
          el.setAttribute('from', from);
          el.setAttribute('to', to);
          if (action !== undefined) { el.setAttribute('action', action); }

          const spec = parse_hook_element(el, 'stoch', registry);

          expect(spec.user_handler).toBe(handler);
          expect(spec.kind).toBe('hook');
          expect(spec.from).toBe(from);
          expect(spec.to).toBe(to);
          expect(spec.action).toBe(action);

          // descriptor carries exactly the present keys
          const desc = build_hook_descriptor(spec, () => true);
          expect(desc.from).toBe(from);
          expect(desc.to).toBe(to);
          if (action === undefined) {
            expect('action' in desc).toBe(false);
          } else {
            expect(desc.action).toBe(action);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('mutual exclusion: both forms or neither form throw', () => {

    const both = document.createElement('jssm-hook');
    both.setAttribute('handler', 'x');
    both.textContent = 'return true';
    expect(() => parse_hook_element(both, 'stoch')).toThrow(/not both/);

    const neither = document.createElement('jssm-hook');
    expect(() => parse_hook_element(neither, 'stoch')).toThrow(/must specify/);

  });

  test('wrap_user_handler: false cancels; anything else passes and adopts proxy data', () => {

    fc.assert(
      fc.property(
        fc.integer(), fc.integer(),
        fc.constantFrom<'false' | 'true' | 'undefined' | 'object'>('false', 'true', 'undefined', 'object'),
        (data_in, data_out, result_kind) => {

          const user = (m: { data: number }) => {
            m.data = data_out;
            switch (result_kind) {
              case 'false': {     return false;
              }
              case 'true': {      return true;
              }
              case 'undefined': { return;
              }
              default: {          return { arbitrary: 'thing' };
              }
            }
          };

          const spec = {
            kind: 'hook' as const, name: undefined,
            from: 'a', to: 'b', action: undefined,
            user_handler: user as never
          };

          const wrapped = wrap_user_handler(spec, { state: () => 'a' });
          const result  = wrapped({ data: data_in, from: 'a', to: 'b' });

          if (result_kind === 'false') {
            expect(result).toBe(false);
          } else {
            expect(result).toEqual({ pass: true, data: data_out });
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('make_hook_proxy exposes context read-only fields and live data mutation', () => {

    fc.assert(
      fc.property(
        word, word, fc.integer(), fc.integer(),
        (from, to, data_in, data_next) => {

          const ctx = { data: data_in, from, to, action: undefined };
          const proxy = make_hook_proxy(ctx, { state: () => from });

          expect(proxy.from).toBe(from);
          expect(proxy.to).toBe(to);
          expect(proxy.action).toBe(undefined);
          expect(proxy.data).toBe(data_in);
          expect(proxy.state()).toBe(from);

          proxy.data = data_next;
          expect(ctx.data).toBe(data_next);   // writes flow back to the context

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('normalize_viz_error', () => {

  test('errors, strings, and arbitrary values all normalize to a message-bearing detail', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (msg) => {

          const from_error = normalize_viz_error(new Error(msg));
          expect(from_error.message).toBe(msg);

          const from_value = normalize_viz_error(msg);
          expect(typeof from_value.message).toBe('string');
          expect(from_value.message).toContain(msg);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
