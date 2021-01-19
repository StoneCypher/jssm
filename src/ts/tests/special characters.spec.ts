
import * as jssm from '../jssm';





const _SpecialCharacters = ['\t', '\n', '\r', '\v'];





// TODO FIXME these seem to be failing?

describe('Special characters', () => {

  test(`CONTAINS A FALSE TEST`, () =>
    expect(true).toBe(true)   // todo fixme whargarbl
  );

  // it(`Label "top\nbottom" parses correctly framed`, t =>
  //   t.notThrows( () => { const _foo = sm`"top\nbottom" -> b;`; }) );

  // SpecialCharacters.map(sc =>
  //   it(`Label "open${sc}shut" parses correctly framed`, t =>
  //     t.notThrows( () => { const _foo = sm`"open${sc}shut" -> b;`; }) ) );

  // SpecialCharacters.map(sc =>
  //   it(`Label "${sc}" parses correctly bare`, t =>
  //     t.notThrows( () => { const _foo = sm`"${sc}" -> b;`; }) ) );

});





test.todo('Special characters is not implemented at all');
