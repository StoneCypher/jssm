
import * as jssm from '../jssm';





describe('seq/1', () => {

  test('(0) generates []',    () => expect( jssm.seq(0) ).toEqual( []    ) );
  test('(1) generates [0]',   () => expect( jssm.seq(1) ).toEqual( [0]   ) );
  test('(2) generates [0,1]', () => expect( jssm.seq(2) ).toEqual( [0,1] ) );

});





describe('seq/1 over wrong sizes', () => {

  test(`Negative sizes must throw`, () => {
    expect(() => jssm.seq(-1 as any)).toThrow();
  });

  test(`Fractional sizes must throw`, () => {
    expect(() => jssm.seq(2.5 as any)).toThrow();
  });

  test(`NaN sizes must throw`, () => {
    expect(() => jssm.seq(NaN as any)).toThrow();
  });

  test(`Infinite sizes must throw`, () => {
    expect(() => jssm.seq(Number.POSITIVE_INFINITY as any)).toThrow();
  });

  test(`Non-numeric sizes must throw`, () => {
    expect(() => jssm.seq('d' as any)).toThrow();
  });

});
