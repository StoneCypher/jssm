
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

  it('start', t => {
    t.notThrows( () => {
      const _foo = sm`arrange-start [a c]; a -> b -> c -> d;`;
    });
    t.deepEqual(
      sm`arrange-start [a c]; a -> b -> c -> d;`._arrange_start_declaration,
      [['a','c']]
    );
  });

  it('end', t => {
    t.notThrows( () => {
      const _foo = sm`arrange-end [a c]; a -> b -> c -> d;`;
    });
    t.deepEqual(
      sm`arrange-end [b d]; a -> b -> c -> d;`._arrange_end_declaration,
      [['b','d']]
    );
  });

});
