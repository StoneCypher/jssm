
import { describe } from 'ava-spec';
import { Shapes }   from './constants.js';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('GraphViz Shapes', async it => {

  Shapes.map(shape =>
    it(`Shape "${shape}" parses as a shape`, t =>
      t.notThrows( () => { const _foo = sm`state c: { shape: ${shape}; }; a -> b;`; }) ) );

  // misspelling the last character of restrictionsite gets parser coverage
  it('handles parse end', t =>
    t.throws( () => { const _foo = sm`state c: { shape: restrictionsitz; }; a -> b;`; }) );

});
