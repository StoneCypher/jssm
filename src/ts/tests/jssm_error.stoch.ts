
import * as fc from 'fast-check';

import { JssmError } from '../jssm_error';
import * as jssm     from '../jssm';





// Property-based coverage for `jssm_error.ts`.
//
// `JssmError` enriches a base message with machine context (instance name,
// current state) and an optional requested state.  The tests below assert
// the *presence and placement* of each enrichment with substring checks
// rather than rebuilding the whole format string, so a formatting tweak
// that preserves the contract stays green while a lost field fails.



const RUNS = 100;



/**
 *  Minimal stand-in for a `Machine` as far as `JssmError` is concerned:
 *  just `state()` and `instance_name()`.  Lets the tests drive every
 *  machine-context combination without compiling FSL each time.
 *
 *  @param state          Value `state()` should return.
 *  @param instance_name  Value `instance_name()` should return.
 *  @returns              An object satisfying JssmError's machine usage.
 *
 *  @example
 *    stub_machine('Red', 'traffic')  // → { state: () => 'Red', instance_name: () => 'traffic' }
 */
function stub_machine(state: string | undefined, instance_name: string | undefined) {
  return {
    state         : () => state,
    instance_name : () => instance_name
  };
}





describe('JssmError without a machine', () => {

  test('message and base_message are exactly the raw message; identity fields are set', () => {

    fc.assert(
      fc.property(
        fc.fullUnicodeString(),
        (msg) => {

          const err = new JssmError(undefined, msg);

          expect(err.message).toBe(msg);
          expect(err.base_message).toBe(msg);
          expect(err.name).toBe('JssmError');
          expect(err.requested_state).toBe(undefined);
          expect(err.source_location).toBe(undefined);
          expect(err instanceof JssmError).toBe(true);
          expect(err instanceof Error).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('requested_state is stored and quoted into the message', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (msg, requested) => {

          const err = new JssmError(undefined, msg, { requested_state: requested });

          expect(err.requested_state).toBe(requested);
          expect(err.base_message).toBe(msg);
          expect(err.message.startsWith(msg)).toBe(true);
          expect(err.message).toContain(`requested "${requested}"`);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('source_location passes through untouched', () => {

    fc.assert(
      fc.property(
        fc.record({
          start_line   : fc.integer({ min: 1, max: 10_000 }),
          start_column : fc.integer({ min: 1, max: 500 }),
          end_line     : fc.integer({ min: 1, max: 10_000 }),
          end_column   : fc.integer({ min: 1, max: 500 })
        }),
        fc.string(),
        (loc, msg) => {
          const err = new JssmError(undefined, msg, { source_location: loc as never });
          expect(err.source_location).toBe(loc);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('JssmError with machine context', () => {

  test('instance name brackets the front; current state lands in the at-clause', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (msg, state, iname) => {

          const err = new JssmError(stub_machine(state, iname), msg);

          expect(err.message.startsWith(`[[${iname}]]: `)).toBe(true);
          expect(err.message).toContain(msg);
          expect(err.message).toContain(`at "${state}"`);
          expect(err.base_message).toBe(msg);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('an undefined instance name omits the [[..]] prefix; undefined state omits the at-clause', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (msg, state) => {

          const no_iname = new JssmError(stub_machine(state, undefined), msg);
          expect(no_iname.message.startsWith('[[')).toBe(false);
          expect(no_iname.message).toContain(`at "${state}"`);

          const no_state = new JssmError(stub_machine(undefined, undefined), msg);
          expect(no_state.message).toBe(msg);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('state and requested_state both present joins the clauses in one parenthetical', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (msg, state, requested) => {

          const err = new JssmError(stub_machine(state, undefined), msg, { requested_state: requested });

          expect(err.message).toContain(`(at "${state}", requested "${requested}")`);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a real machine with an instance_name produces the same enrichment', () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter( s => !s.includes('`') ),
        (msg) => {

          const machine = jssm.from('aa -> bb;', { instance_name: 'real_machine' });
          const err     = new JssmError(machine, msg);

          expect(err.message.startsWith('[[real_machine]]: ')).toBe(true);
          expect(err.message).toContain('at "aa"');
          expect(err.base_message).toBe(msg);

        }
      ),
      { numRuns: 20 }
    );

  });

});
