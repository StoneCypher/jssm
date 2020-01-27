
import { describe } from 'ava-spec';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Arrange', async it => {

  it('Single arrange', t => {
    t.notThrows( () => { const _foo = sm`arrange [a b]; a -> b;`; });
    t.deepEqual(
      sm`arrange [a b]; a -> b;`._arrange_declaration,
      [['a','b']]
    );
  });

  it('Multiple arrange', t => {
    t.notThrows( () => { const _foo = sm`arrange [a b]; a -> b; c -> d; arrange [c d];`; });
    t.deepEqual(
      sm`arrange [a b]; a -> b; c -> d; arrange [c d];`._arrange_declaration,
      [['a','b'],['c','d']]
    );
  });

});
