
import * as jssm from '../jssm';
import * as fc   from 'fast-check';



// fast-check 2.x has no `stringMatching`; build a `[a-z][a-z0-9_]{0,7}`
// identifier from a leading letter plus a bounded tail.
const ident = fc.tuple(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { maxLength: 7 })
).map(([first, rest]) => first + rest);



describe('val (stochastic)', () => {

  test('an int val round-trips its default for any safe integer', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: -1000, max: 1000 }), (name, n) => {
        const m = jssm.from(`val ${name} : int default ${n}; a -> b;`);
        return m.val(name) === n;
      })
    );
  });

  test('a boolean val round-trips its default', () => {
    fc.assert(
      fc.property(ident, fc.boolean(), (name, b) => {
        const m = jssm.from(`val ${name} : boolean default ${b}; a -> b;`);
        return m.val(name) === b;
      })
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
      )
    );
  });

  test('set_val rejects any out-of-range write on a bounded int', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: 11, max: 1000 }), (name, v) => {
        const m = jssm.from(`val ${name} : int 0..10 default 0; a -> b;`);
        try { m.set_val(name, v); return false; } catch { return true; }
      })
    );
  });

});
