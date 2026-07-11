
import * as fc from 'fast-check';

import { parseFslArgs } from '../cli/cli-utils';
import type { ParseSpec } from '../cli/cli-utils';





// Property-based coverage for the CLI argv parser (`cli-utils.ts`).
//
// Command lines are *constructed*: each test draws flag values and then
// renders them through a randomly chosen spelling (--name=v, --name v,
// -s v, -sv), interleaved with positional words, so the expected parse is
// known by construction.



const RUNS = 150;



/** A fixed four-flag spec exercising every flag type. */
const spec: ParseSpec = {
  flags: {
    alpha : { short: 'a', type: 'string' },
    beta  : { short: 'b', type: 'number' },
    gamma : { short: 'g', boolean: true },
    delta : { short: 'd', type: 'string', enum: ['red', 'green', 'blue'], default: 'red' }
  },
  usage: 'testcli [options] <files...>'
};



/** Arbitrary for a positional word (no leading dash, non-empty). */
const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 1, maxLength: 8 }
);



/**
 *  Renders one flag assignment as argv tokens, in one of its equivalent
 *  spellings.
 *  @param long   The long flag name.
 *  @param short  The short flag character.
 *  @param value  The value to pass (already stringified).
 *  @param form   Which spelling to use, 0-3.
 *  @returns      The argv tokens for this assignment.
 *  @example
 *    render_flag('alpha', 'a', 'x', 0)  // ['--alpha=x']
 *    render_flag('alpha', 'a', 'x', 3)  // ['-ax']
 */
function render_flag(long: string, short: string, value: string, form: number): string[] {
  switch (form) {
    case 0: {  return [`--${long}=${value}`];
    }
    case 1: {  return [`--${long}`, value];
    }
    case 2: {  return [`-${short}`, value];
    }
    default: { return [`-${short}${value}`];
    }
  }
}





describe('parseFslArgs round-trips constructed command lines', () => {

  test('string, number, enum, and boolean flags all land with their constructed values', () => {

    fc.assert(
      fc.property(
        word,                                          // alpha value
        fc.integer({ min: -10_000, max: 10_000 }),     // beta value
        fc.boolean(),                                  // include gamma?
        fc.constantFrom('red', 'green', 'blue'),       // delta value
        fc.tuple(fc.nat(3), fc.nat(3), fc.nat(3)),     // spellings
        fc.array(word, { maxLength: 4 }),              // positionals
        (alpha, beta, with_gamma, delta, [f1, f2, f3], positionals) => {

          const argv = [
            ...render_flag('alpha', 'a', alpha, f1),
            ...render_flag('beta',  'b', String(beta), f2),
            ...(with_gamma ? ['--gamma'] : []),
            ...render_flag('delta', 'd', delta, f3),
            ...positionals
          ];

          const result = parseFslArgs(argv, spec);

          expect(result.flags.alpha).toBe(alpha);
          expect(result.flags.beta).toBe(beta);
          expect(result.flags.gamma).toBe(with_gamma ? true : undefined);
          expect(result.flags.delta).toBe(delta);
          expect(result.positional).toEqual(positionals);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('short boolean -g equals long --gamma', () => {

    fc.assert(
      fc.property(
        fc.boolean(),
        (use_short) => {
          const result = parseFslArgs([use_short ? '-g' : '--gamma'], spec);
          expect(result.flags.gamma).toBe(true);
        }
      ),
      { numRuns: 20 }
    );

  });

  test('defaults apply exactly when the flag is absent', () => {

    fc.assert(
      fc.property(
        fc.option(fc.constantFrom('red', 'green', 'blue'), { nil: undefined }),
        (maybe_delta) => {

          const argv   = maybe_delta === undefined ? [] : [`--delta=${maybe_delta}`];
          const result = parseFslArgs(argv, spec);

          expect(result.flags.delta).toBe(maybe_delta ?? 'red');

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('positional handling', () => {

  test('everything after -- is positional, even flag-shaped tokens', () => {

    fc.assert(
      fc.property(
        fc.array(word, { maxLength: 3 }),
        fc.array(
          fc.oneof(word, word.map( w => `--${w}` ), word.map( w => `-${w}` )),
          { maxLength: 4 }
        ),
        (before, after) => {

          const result = parseFslArgs([...before, '--', ...after], spec);
          expect(result.positional).toEqual([...before, ...after]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a bare - is the stdin sentinel and stays positional', () => {

    fc.assert(
      fc.property(
        fc.array(word, { maxLength: 3 }),
        (words) => {
          const result = parseFslArgs(['-', ...words], spec);
          expect(result.positional).toEqual(['-', ...words]);
        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('rejections', () => {

  test('unknown long and short flags throw, naming the flag', () => {

    fc.assert(
      fc.property(
        word.filter( w => !Object.hasOwn(spec.flags, w) ),
        (name) => {
          expect(() => parseFslArgs([`--${name}`], spec)).toThrow(`unknown flag: --${name}`);
        }
      ),
      { numRuns: RUNS }
    );

    expect(() => parseFslArgs(['-z'], spec)).toThrow('unknown flag: -z');

  });

  test('a value-bearing flag at the end of argv throws (missing value)', () => {

    expect(() => parseFslArgs(['--alpha'], spec)).toThrow('requires a value');
    expect(() => parseFslArgs(['-a'],      spec)).toThrow('requires a value');
    expect(() => parseFslArgs(['--beta'],  spec)).toThrow('requires a value');

  });

  test('non-numeric values for number flags throw', () => {

    fc.assert(
      fc.property(
        word.filter( w => Number.isNaN(Number(w)) ),
        fc.nat(3),
        (w, form) => {
          expect(() => parseFslArgs(render_flag('beta', 'b', w, form), spec)).toThrow('requires a number');
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('values outside an enum throw and name the choices', () => {

    fc.assert(
      fc.property(
        word.filter( w => !['red', 'green', 'blue'].includes(w) ),
        fc.nat(3),
        (w, form) => {
          expect(() => parseFslArgs(render_flag('delta', 'd', w, form), spec)).toThrow('red, green, blue');
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('combined short booleans are rejected', () => {
    expect(() => parseFslArgs(['-ga'], spec)).toThrow('combined short flags not supported');
  });

});





describe('helpText', () => {

  test('contains the usage line and one entry per flag, with defaults shown', () => {

    const help = parseFslArgs([], spec).helpText();

    expect(help).toContain(spec.usage);

    for (const name of Object.keys(spec.flags)) {
      expect(help).toContain(`--${name}`);
    }

    expect(help).toContain('(default: red)');
    expect(help).toContain('red|green|blue');
    expect(help).toContain(' N');   // number flags advertise N

  });

});
