
import { sm } from '../jssm';





describe('Dot preamble', () => {

  test(`doesn't throw`, () =>
    expect( () => { const _foo = sm`dot_preamble: "x -> y;"; a-> b;`; }).not.toThrow() );

  test('parses correctly', () =>
    expect( sm`dot_preamble: "x -> y;"; a-> b;`.dot_preamble() ).toBe('x -> y;') );

});
