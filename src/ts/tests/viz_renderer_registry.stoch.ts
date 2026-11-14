import * as fc from 'fast-check';

import { JssmError } from '../jssm';
import { fsl_to_svg_string, register_renderer, unregister_renderer, renderer_names, renderer_for } from '../jssm_viz';
import type { VizRenderProvider } from '../jssm_viz';

import { ring_plan_arb } from './stoch_helpers';





// Property-based coverage for the renderer registry behind FSL's
// `graph_renderer`.  The first property drives random sequences of
// register / replace / unregister calls against a plain Map model of the
// documented rules (built-ins are fixed, a taken name needs replace, order is
// registration order) and checks the real registry's names, lookups and
// throws after every step.  The second registers a renderer under a random
// name, bareword or quoted, and checks that FSL selects it for random
// machines through the real render path.



const RUNS = 50;

const BUILTINS = ['graphviz', 'tonal'];

/** Names the model test draws from: a few application names plus the built-ins, so collisions are common. */
const NAME_POOL = ['alpha', 'beta', 'gamma', 'with space', 'dash-ed', ...BUILTINS];

/** Removes every application renderer, returning the registry to just the built-ins. */
function reset_registry(): void {
  for (const name of renderer_names()) {
    if (!BUILTINS.includes(name)) { unregister_renderer(name); }
  }
}

afterEach(reset_registry);

type Op =
  | { kind: 'register',   name: string, replace: boolean }
  | { kind: 'unregister', name: string };

const op_arb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('register' as const),   name: fc.constantFrom(...NAME_POOL), replace: fc.boolean() }),
  fc.record({ kind: fc.constant('unregister' as const), name: fc.constantFrom(...NAME_POOL) })
);

/** What one registry call did: threw a JssmError, or returned a value. */
type Outcome = { threw: true } | { threw: false, value: unknown };

/** The provider a register op installs; one object per op, so replacement is observable by identity. */
const providers = new WeakMap<Op, VizRenderProvider>();

/** The provider object for a register op, created once per op. */
function provider_for(op: Op): VizRenderProvider {
  const existing = providers.get(op);
  if (existing !== undefined) { return existing; }
  const made: VizRenderProvider = { name: op.name, render: () => '<svg/>' };
  providers.set(op, made);
  return made;
}

/**
 *  Applies one op to the real registry and reports what happened.  Any
 *  throw other than a JssmError is rethrown, failing the property.
 */
function outcome_of(op: Op): Outcome {
  try {
    const value = op.kind === 'register'
      ? register_renderer(provider_for(op), { replace: op.replace })
      : unregister_renderer(op.name);
    return { threw: false, value };
  } catch (error: unknown) {
    if (error instanceof JssmError) { return { threw: true }; }
    throw error;
  }
}

/**
 *  Applies one op to the model, following the documented rules, and
 *  returns the outcome the real registry must match: built-ins are fixed,
 *  a taken name needs `replace`, and unregister reports whether it removed.
 */
function model_step(model: Map<string, VizRenderProvider | 'builtin'>, op: Op): Outcome {
  if (model.get(op.name) === 'builtin') { return { threw: true }; }
  if (op.kind === 'unregister') { return { threw: false, value: model.delete(op.name) }; }
  if (model.has(op.name) && !op.replace) { return { threw: true }; }
  model.set(op.name, provider_for(op));
  return { threw: false, value: undefined };
}



describe('renderer registry against a model', () => {

  test('random register / replace / unregister sequences follow the documented rules', () => {

    fc.assert(
      fc.property(fc.array(op_arb, { maxLength: 30 }), (ops) => {

        reset_registry();
        const model = new Map<string, VizRenderProvider | 'builtin'>(BUILTINS.map(n => [n, 'builtin']));

        for (const op of ops) {

          expect(outcome_of(op)).toEqual(model_step(model, op));

          expect(renderer_names()).toEqual([...model.keys()]);
          const applications = [...model].filter((entry): entry is [string, VizRenderProvider] => entry[1] !== 'builtin');
          expect(applications.map(([name]) => renderer_for(name))).toEqual(applications.map(([, provider]) => provider));

        }

      }),
      { numRuns: RUNS }
    );

  });

});



/** A random renderer name and the FSL that spells it: bareword when it can be one, quoted otherwise. */
const name_and_spelling_arb: fc.Arbitrary<{ name: string, spelling: string }> = fc.oneof(
  fc.tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { maxLength: 10 })
  ).map(([first, rest]) => { const name = `r_${first}${rest.join('')}`; return { name, spelling: name }; }),
  fc.array(fc.constantFrom(...'abcxyz09 -.:'.split('')), { minLength: 1, maxLength: 12 })
    .map(chars => { const name = `q ${chars.join('')}`; return { name, spelling: `"${name}"` }; })
);



describe('FSL selects registered renderers for constructed machines', () => {

  test('graph_renderer: <random name> draws with the renderer registered under that name', async () => {

    await fc.assert(
      fc.asyncProperty(
        ring_plan_arb,
        name_and_spelling_arb,
        async ({ names, fsl }, { name, spelling }) => {

          const provider: VizRenderProvider = {
            name,
            render: context => `<svg data-states="${context.machine.states().join('|')}"></svg>`
          };

          register_renderer(provider);
          try {
            const svg   = await fsl_to_svg_string(`graph_renderer: ${spelling}; ${fsl}`);
            const drawn = /data-states="([^"]*)"/.exec(svg)?.[1] ?? '';
            const drawn_states = drawn.split('|');
            expect(drawn_states).toHaveLength(names.length);
            expect(new Set(drawn_states)).toEqual(new Set(names));
          } finally {
            unregister_renderer(name);
          }

          await expect(fsl_to_svg_string(`graph_renderer: ${spelling}; ${fsl}`)).rejects.toThrow(`Unknown renderer "${name}"`);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
