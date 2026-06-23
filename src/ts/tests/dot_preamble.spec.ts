
import { sm } from '../jssm';





describe('Dot preamble', () => {

  test(`doesn't throw`, () =>
    expect( () => { const _foo = sm`dot_preamble: "x -> y;"; a-> b;`; }).not.toThrow() );

  test('parses correctly', () =>
    expect( sm`dot_preamble: "x -> y;"; a-> b;`.dot_preamble() ).toBe('x -> y;') );

  // #333: a backslash-escaped double-quote inside a string must parse to a
  // literal `"`.  In this template literal `\\"` is one backslash then a quote,
  // so the FSL the parser sees is:  dot_preamble: "label=\"Diagram\";";
  test('preserves escaped double-quotes inside the string (#333)', () =>
    expect( sm`dot_preamble: "label=\\"Diagram\\";"; a -> b;`.dot_preamble() ).toBe('label="Diagram";') );

});
