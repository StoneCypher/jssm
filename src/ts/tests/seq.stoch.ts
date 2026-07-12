
import * as assert from 'node:assert';
import * as fc     from 'fast-check';
import * as jssm   from '../jssm';

const rand_cap = 10_000;





// Note on `void`:
//
// fast-check@2's `Property.run` considers a predicate "failed" unless it
// returns `null`, `undefined`, or boolean `true`.  `expect(...).toBe(...)`
// in vitest returns an object (the assertion chain), which fast-check then
// treats as failure even when the assertion itself succeeded.  Under jest
// the same chain returned `undefined`, hiding the issue.  Wrapping the
// predicate in `void <expr>` ensures it always returns `undefined`, which
// fast-check accepts.

describe(`seq/1 over random sizes 0 - ${rand_cap.toLocaleString()}`, () => {

  test(`Any non-negative size will create safely`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         void expect( () => jssm.seq(Size) ).not.toThrow()
       )
     );

  });

  test(`Length will match the requested size`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         void expect( jssm.seq(Size).length ).toBe(Size)
       )
     );

  });

  test(`The type will be object`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         void expect( typeof jssm.seq(Size) ).toBe('object')
       )
     );

  });

  test(`Array.isArray will be yes`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         void expect( Array.isArray(jssm.seq(Size)) ).toBe(true)
       )
     );

  });

});





describe('seq/1 over wrong sizes', () => {

  test(`Non-integer sizes must throw`, () => {

     fc.assert(
       fc.property(fc.nat(), Size => {
         const useSize = Number.isSafeInteger(Size)? Size + 0.5 : Size;
         expect( () => jssm.seq(useSize) ).toThrow();
       } )
     );

  });

  test(`Negative sizes must throw`, () => {

     fc.assert(
       fc.property(fc.integer(-rand_cap, -1), Size => {
         expect( () => jssm.seq(Size) ).toThrow();
       } )
     );

  });

});





describe('seq/1 over wrong arguments', () => {

  test(`Non-integer sizes must throw`, () => {

     fc.assert(
       fc.property(fc.nat(), Size => {
         const useSize = Number.isSafeInteger(Size)? Size + 0.5 : Size;
         expect( () => jssm.seq(useSize) ).toThrow();
       } )
     );

  });

  test(`Negative sizes must throw`, () => {

     fc.assert(
       fc.property(fc.integer(-rand_cap, -1), Size => {
         expect( () => jssm.seq(Size) ).toThrow();
       } )
     );

  });

});
