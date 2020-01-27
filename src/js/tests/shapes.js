
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





describe('Corners', async it => {

  it('rounded', t => {
    t.is(sm`state a: { corners: rounded; }; a->b;`.state_declaration("a").corners, "rounded");
  });

  it('lined', t => {
    t.is(sm`state a: { corners: lined; }; a->b;`.state_declaration("a").corners,   "lined");
  });

  it('regular', t => {
    t.is(sm`state a: { corners: regular; }; a->b;`.state_declaration("a").corners, "regular");
  });

});
