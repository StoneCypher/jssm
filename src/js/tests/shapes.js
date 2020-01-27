
import { describe } from 'ava-spec';
import { Shapes }   from './constants.js';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('GraphViz Shapes', async it => {

  Shapes.map(shape => {
    let mach = undefined;
    it(`Shape "${shape}" parses as a shape`, t =>
      t.notThrows( () => { mach = sm`state c: { shape: ${shape}; }; a -> b;`; }) );
    it(`Result shape ${shape} is what it's supposed to be`, t =>
      t.is( mach.state_declaration("c").shape, shape ));
  });

  it('handles parse end', t =>
    t.throws( () => { const _foo = sm`state c: { shape: thisIsNotAShapeSoItShouldThrow; }; a -> b;`; }) );

});





describe('Rounding', async it =>
  it('rounds', t => {
    t.is(sm`state a: { rounding: true; };  a->b;`.state_declaration("a").rounding, true);
    t.is(sm`state a: { rounding: false; }; a->b;`.state_declaration("a").rounding, false);
  })
);





describe('Diagonals', async it =>
  it('cuts', t =>{
    t.is(sm`state a: { diagonals: true;  }; a->b;`.state_declaration("a").diagonals, true);
    t.is(sm`state a: { diagonals: false; }; a->b;`.state_declaration("a").diagonals, false);
  })
);
