
import * as assert from 'assert';
import * as fc     from 'fast-check';
import * as jssm   from '../jssm';

const rand_cap = 10_000;





describe(`seq/1 over random sizes 0 - ${rand_cap.toLocaleString()}`, () => {

  test(`Any non-negative size will create safely`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         expect( () => jssm.seq(Size) ).not.toThrow()
       )
     );

  });

  test(`Length will match the requested size`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         expect( jssm.seq(Size).length ).toBe(Size)
       )
     );

  });

  test(`The type will be object`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         expect( typeof jssm.seq(Size) ).toBe('object')
       )
     );

  });

  test(`Array.isArray will be yes`, () => {

     fc.assert(
       fc.property(fc.integer(0, rand_cap), Size =>
         expect( Array.isArray(jssm.seq(Size)) ).toBe(true)
       )
     );

  });

});





describe('seq/1 over wrong sizes', () => {

  test(`Non-integer sizes must throw`, () => {

     fc.assert(
       fc.property(fc.nat(), Size => {
         const useSize = Number.isInteger(Size)? Size + 0.5 : Size;
         expect( () => jssm.seq(useSize) ).toThrow()
       } )
     );

  });

  test(`Negative sizes must throw`, () => {

     fc.assert(
       fc.property(fc.integer(-1 * rand_cap, -1), Size => {
         expect( () => jssm.seq(Size) ).toThrow()
       } )
     );

  });

});
