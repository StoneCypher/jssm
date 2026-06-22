
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for `val` extended-state declarations — the
// stochastic companion to `vals.spec.ts`.  Where the spec pins specific
// shapes, this sweeps random names and values to confirm the invariants
// hold across the space:
//
//   - an `int` / `boolean` val round-trips its declared default;
//   - a bounded `int lo..hi` accepts an in-range default and rejects any
//     out-of-range default at construction time; and
//   - `set_val` rejects any out-of-range write on a bounded int.
//
// `m.val(name)` reads the current value; `m.set_val(name, v)` mutates it,
// type-/range-validating the write (see `vals.spec.ts`).



const RUNS = 100;



// Identifiers that are safe as val names: lowercase, short, and never an FSL
// keyword (which would change how the line parses).
const KEYWORDS = new Set([
  'val', 'int', 'boolean', 'string', 'enum', 'default', 'required',
  'after', 'true', 'false', 'state', 'prop', 'property', 'sensor', 'graph'
]);

const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const REST  = 'abcdefghijklmnopqrstuvwxyz0123456789_'.split('');

const ident = fc.tuple(
  fc.constantFrom(...LOWER),
  fc.array(fc.constantFrom(...REST), { maxLength: 7 })
).map(([first, rest]) => first + rest.join('')).filter(s => !KEYWORDS.has(s));



describe('val (stochastic)', () => {

  test('an int val round-trips its default for any safe integer', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: -1000, max: 1000 }), (name, n) => {
        const m = jssm.from(`val ${name} : int default ${n}; a -> b;`);
        return m.val(name) === n;
      }),
      { numRuns: RUNS }
    );
  });

  test('a boolean val round-trips its default', () => {
    fc.assert(
      fc.property(ident, fc.boolean(), (name, b) => {
        const m = jssm.from(`val ${name} : boolean default ${b}; a -> b;`);
        return m.val(name) === b;
      }),
      { numRuns: RUNS }
    );
  });

  test('a bounded int rejects any default outside its range', () => {
    fc.assert(
      fc.property(
        ident,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: -100, max: 100 }),
        (name, a, b, v) => {
          const lo = Math.min(a, b), hi = Math.max(a, b);
          const src = `val ${name} : int ${lo}..${hi} default ${v}; s -> t;`;
          const inRange = (v >= lo) && (v <= hi);
          if (inRange) {
            return jssm.from(src).val(name) === v;
          }
          try { jssm.from(src); return false; } catch { return true; }
        }
      ),
      { numRuns: RUNS }
    );
  });

  test('set_val rejects any out-of-range write on a bounded int', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: 11, max: 1000 }), (name, v) => {
        const m = jssm.from(`val ${name} : int 0..10 default 0; a -> b;`);
        try { m.set_val(name, v); return false; } catch { return true; }
      }),
      { numRuns: RUNS }
    );
  });

});
