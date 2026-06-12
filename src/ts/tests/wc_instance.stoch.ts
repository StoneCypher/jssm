/**
 * @vitest-environment jsdom
 */

import * as fc from 'fast-check';

import '../wc/fsl_instance_wc.define';
import {
  FslInstance,
  JSSM_ON_EVENT_NAMES,
  parse_jssm_on_element, resolve_named_handler, compile_inline_body,
  jssm_handler_registry, resolve_fsl_source
} from '../wc/fsl_instance_wc';

import { wc_suffix_matches, closest_wc, define_with_synonym } from '../wc/wc_tag_helpers';





// Property-based coverage for the web-component layer: the dual-prefix
// tag helpers, the <jssm-on> directive parser, handler resolution, FSL
// source-channel resolution, and the <fsl-instance> lifecycle itself
// driven over random constructed machines.



const RUNS = 60;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 10 }
);

/** Randomly flips each character's case in a string. */
const mixed_case = (s: string, flips: boolean[]): string =>
  [...s].map( (ch, i) => (flips[i % flips.length] ? ch.toUpperCase() : ch) ).join('');





describe('wc_tag_helpers', () => {

  test('wc_suffix_matches accepts exactly fsl-/jssm- + suffix, in any case', () => {

    fc.assert(
      fc.property(
        word,
        fc.constantFrom('fsl', 'jssm'),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 12 }),
        (suffix, prefix, flips) => {

          expect(wc_suffix_matches(mixed_case(`${prefix}-${suffix}`, flips), suffix)).toBe(true);

          // near misses all reject
          expect(wc_suffix_matches(`${prefix}-${suffix}x`, suffix)).toBe(false);
          expect(wc_suffix_matches(`x${prefix}-${suffix}`, suffix)).toBe(false);
          expect(wc_suffix_matches(suffix, suffix)).toBe(false);
          expect(wc_suffix_matches(`other-${suffix}`, suffix)).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('closest_wc finds the matching ancestor through any depth of unrelated wrappers', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.constantFrom('fsl-instance', 'jssm-instance'),
        (depth, ancestor_tag) => {

          const ancestor = document.createElement(ancestor_tag);

          let cursor: Element = ancestor;
          for (let i = 0; i < depth; ++i) {
            const wrapper = document.createElement('div');
            cursor.appendChild(wrapper);
            cursor = wrapper;
          }

          const leaf = document.createElement('span');
          cursor.appendChild(leaf);

          expect(closest_wc(leaf, 'instance')).toBe(ancestor);

          // a leaf with no matching ancestor resolves to null
          const orphan = document.createElement('span');
          document.createElement('div').appendChild(orphan);
          expect(closest_wc(orphan, 'instance')).toBe(null);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('define_with_synonym registers both tags and is idempotent', () => {

    fc.assert(
      fc.property(
        word,
        (base) => {

          // unique per draw so repeat registration within the test is the
          // only repetition exercised
          const canonical = `test-${base}-${Math.random().toString(36).slice(2)}`;
          const synonym   = `${canonical}-syn`;

          class Canonical extends HTMLElement {}
          class Synonym   extends Canonical {}

          define_with_synonym(canonical, synonym, Canonical, Synonym);

          expect(customElements.get(canonical)).toBe(Canonical);
          expect(customElements.get(synonym)).toBe(Synonym);

          // calling again must not throw and must not re-register
          expect(() => define_with_synonym(canonical, synonym, Canonical, Synonym)).not.toThrow();
          expect(customElements.get(canonical)).toBe(Canonical);

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('parse_jssm_on_element', () => {

  /**
   *  Builds a `<jssm-on>` element from parts.
   *
   *  @param attrs  Attributes to set (null values skipped).
   *  @param body   Optional text content.
   *  @returns      The constructed element.
   */
  function jssm_on(attrs: Record<string, string | null>, body?: string): HTMLElement {

    const el = document.createElement('jssm-on');

    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) { el.setAttribute(k, v); }
    }

    if (body !== undefined) { el.textContent = body; }

    return el;

  }

  const event_arb = fc.constantFrom(...JSSM_ON_EVENT_NAMES);

  test('a valid named-handler directive parses with its constructed parts', () => {

    fc.assert(
      fc.property(
        event_arb, word, fc.boolean(), fc.option(word, { nil: undefined }),
        (event, handler, once, name) => {

          const el = jssm_on({
            event,
            handler,
            ...(once ? { once: '' } : {}),
            ...(name !== undefined ? { name } : {})
          });

          const parsed = parse_jssm_on_element(el);

          expect(parsed.event).toBe(event);
          expect(parsed.handler_name).toBe(handler);
          expect(parsed.inline_body).toBe(undefined);
          expect(parsed.once).toBe(once);
          expect(parsed.name).toBe(name);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('filters apply only where meaningful: state on entry/exit, from/to on transition', () => {

    fc.assert(
      fc.property(
        event_arb, word, word, word,
        (event, state, from, to) => {

          const el = jssm_on({ event, handler: 'h', state, from, to });
          const parsed = parse_jssm_on_element(el);

          if (event === 'entry' || event === 'exit') {
            expect(parsed.filter).toEqual({ state });
          } else if (event === 'transition') {
            expect(parsed.filter).toEqual({ from, to });
          } else {
            expect(parsed.filter).toBe(undefined);   // silently ignored elsewhere
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('rejections: missing event, unknown event, both handler forms, neither form', () => {

    fc.assert(
      fc.property(
        word.filter( w => !JSSM_ON_EVENT_NAMES.has(w) ),
        word,
        (bad_event, handler) => {

          expect(() => parse_jssm_on_element(jssm_on({ handler })))
            .toThrow(/missing required `event`/);

          expect(() => parse_jssm_on_element(jssm_on({ event: bad_event, handler })))
            .toThrow(`unknown event "${bad_event}"`);

          expect(() => parse_jssm_on_element(jssm_on({ event: 'transition', handler }, 'e => e')))
            .toThrow(/not both/);

          expect(() => parse_jssm_on_element(jssm_on({ event: 'transition' })))
            .toThrow(/must specify/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('handler resolution and inline compilation', () => {

  test('registry handlers win over globalThis; misses throw', () => {

    fc.assert(
      fc.property(
        word.map( w => `handler_${w}` ),
        (name) => {

          const g = globalThis as unknown as Record<string, unknown>;

          try {

            const from_registry = () => 'registry';
            const from_global   = () => 'global';

            // miss
            expect(() => resolve_named_handler(name)).toThrow(`handler "${name}" not found`);

            // global fallback
            g[name] = from_global;
            expect(resolve_named_handler(name)).toBe(from_global);

            // registry precedence
            jssm_handler_registry.set(name, from_registry);
            expect(resolve_named_handler(name)).toBe(from_registry);

          } finally {
            jssm_handler_registry.delete(name);
            delete g[name];
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('compile_inline_body produces a callable that sees the event as `e`', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        (n) => {

          const handler = compile_inline_body(`e.values.push(${n} + e.offset)`, 'stoch-test');

          const detail = { values: [] as number[], offset: 1 };
          handler(detail);
          handler(detail);

          expect(detail.values).toEqual([n + 1, n + 1]);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('resolve_fsl_source channel arithmetic', () => {

  test('exactly one populated channel resolves; zero or several error with the right count', () => {

    fc.assert(
      fc.property(
        fc.boolean(), fc.boolean(), fc.boolean(),
        word, word, word,
        (use_attr, use_script, use_text, fsl_a, fsl_s, fsl_t) => {

          const host = document.createElement('div');

          if (use_script) {
            const script = document.createElement('script');
            script.setAttribute('type', 'text/fsl');
            script.textContent = `${fsl_s} -> b;`;
            host.appendChild(script);
          }

          if (use_text) {
            host.appendChild(document.createTextNode(`  ${fsl_t} -> c;  `));
          }

          const attr_val = use_attr ? `${fsl_a} -> a;` : '';
          const resolved = resolve_fsl_source(host, attr_val);

          const provided = [use_attr, use_script, use_text].filter(Boolean).length;
          expect(resolved.provided_count).toBe(provided === 0 ? 0 : provided);

          if (provided === 1) {
            expect(resolved.error).toBe(undefined);
            const expected = use_attr ? `${fsl_a} -> a;`
                           : use_script ? `${fsl_s} -> b;`
                           :              `${fsl_t} -> c;`;
            expect(resolved.fsl).toBe(expected);
          } else {
            expect(resolved.fsl).toBe(undefined);
            expect(typeof resolved.error).toBe('string');
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('companion fsl-/jssm- children never contaminate the text channel', () => {

    fc.assert(
      fc.property(
        word, word,
        fc.constantFrom('jssm-hook', 'fsl-hook', 'jssm-on', 'fsl-bind'),
        (state, noise, companion_tag) => {

          const host = document.createElement('div');
          host.appendChild(document.createTextNode(` ${state} -> b; `));

          const companion = document.createElement(companion_tag);
          companion.textContent = noise;
          host.appendChild(companion);

          const resolved = resolve_fsl_source(host, '');

          expect(resolved.fsl).toBe(`${state} -> b;`);
          expect(resolved.error).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('FslInstance lifecycle over random machines', () => {

  /**
   *  Builds a connected `<fsl-instance>` for an action ring
   *  `s0 'a0' -> s1 'a1' -> ... -> s0` and waits for its first render.
   *
   *  @param k  Ring size.
   *  @returns  The element, state names, and action names.
   */
  async function connected_ring(k: number) {

    const names   = [...new Array(k).keys()].map( i => `ws${i}` ),
          actions = [...new Array(k).keys()].map( i => `wa${i}` );

    const fsl = names
      .map( (n, i) => `${n} '${actions[i]}' -> ${names[(i + 1) % k]};` )
      .join('  ');

    const el = document.createElement('fsl-instance') as FslInstance;
    el.setAttribute('fsl', fsl);
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    return { el, names, actions };

  }

  test('the element exposes the machine at its start state and reflects current-state', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 6 }),
        async (k) => {

          const { el, names } = await connected_ring(k);

          try {
            expect(el.state()).toBe(names[0]);
            expect(el.machine.states().sort()).toEqual([...names].sort());
            expect(el.getAttribute('current-state')).toBe(names[0]);
          } finally {
            document.body.removeChild(el);
          }

        }
      ),
      { numRuns: 12 }
    );

  });

  test('do() walks the ring, updating reflection and the state-specific slot each step', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        async (k, steps) => {

          const { el, names, actions } = await connected_ring(k);

          try {

            for (let s = 0; s < steps; ++s) {

              const here = s % k;

              expect(el.do(actions[(here + 1) % k])).toBe(false);   // wrong action refused
              expect(el.do(actions[here])).toBe(true);

              await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

              const now = names[(here + 1) % k];
              expect(el.state()).toBe(now);
              expect(el.getAttribute('current-state')).toBe(now);
              expect(el.shadowRoot!.innerHTML).toContain(`name="state-${now}"`);

            }

          } finally {
            document.body.removeChild(el);
          }

        }
      ),
      { numRuns: 10 }
    );

  });

  test('legal-actions reflection lists exactly the current state\'s action', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 6 }),
        async (k) => {

          const { el, actions } = await connected_ring(k);

          try {
            expect(el.getAttribute('legal-actions')).toBe(actions[0]);
            // terminal/complete reflect via toggleAttribute: presence semantics
            expect(el.hasAttribute('terminal')).toBe(false);
            expect(el.hasAttribute('complete')).toBe(false);
          } finally {
            document.body.removeChild(el);
          }

        }
      ),
      { numRuns: 12 }
    );

  });

});
