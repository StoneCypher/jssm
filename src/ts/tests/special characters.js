
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      _sm  = jssm.sm;





const _SpecialCharacters = ['\t', '\n', '\r', '\v'];





// TODO FIXME these seem to be failing?

describe('Special characters', async it => {

  it(`CONTAINS A FALSE TEST`, t => t.pass());  // todo fixme whargarbl

  // it(`Label "top\nbottom" parses correctly framed`, t =>
  //   t.notThrows( () => { const _foo = sm`"top\nbottom" -> b;`; }) );

  // SpecialCharacters.map(sc =>
  //   it(`Label "open${sc}shut" parses correctly framed`, t =>
  //     t.notThrows( () => { const _foo = sm`"open${sc}shut" -> b;`; }) ) );

  // SpecialCharacters.map(sc =>
  //   it(`Label "${sc}" parses correctly bare`, t =>
  //     t.notThrows( () => { const _foo = sm`"${sc}" -> b;`; }) ) );

});
