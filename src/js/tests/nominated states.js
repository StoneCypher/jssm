
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm,
      jp   = jssm.parse;





describe('simple naming', async _it => {

  describe('parse', async it => {

    it('trans then node',  t => t.notThrows(() => { jp('a -> b; state a: { color: orange; };'); }) );
    it('node then trans',  t => t.notThrows(() => { jp('state a: { color: orange; }; a -> b;'); }) );
    it('cycle node named', t => t.notThrows(() => { jp('[a b] -> +1; state a: { color: red; }; &b: [a c e];'); }) );

    it('two properties',   t => t.notThrows(() => { jp('a -> b; state a: { color: orange; shape: circle; };'); }) );

  });

  describe('sm tag', async it => {

    it('trans then node',  t => t.notThrows(() => { sm`a -> b; state a: { color: orange; };`; }) );
    it('node then trans',  t => t.notThrows(() => { sm`state a: { color: orange; }; a -> b;`; }) );
//  it('cycle node named', t => t.notThrows(() => { sm`[a b] -> +1; state a: { color: red; }; &b: [a c e];`; }) );

    it('two properties',   t => t.notThrows(() => { sm`a -> b; state a: { color: orange; shape: circle; };`; }) );

  });

});





describe('spacing variants', async it => {

  it('tight',    t => t.notThrows(() => { jp('a -> b; state a:{color:orange;};'); }) );
  it('framed',   t => t.notThrows(() => { jp('a -> b; state a:{ color:orange; };'); }) );
  it('sentence', t => t.notThrows(() => { jp('a -> b; state a:{ color: orange; };'); }) );
  it('fully',    t => t.notThrows(() => { jp('a -> b; state a:{ color : orange; };'); }) );
  it('mars',     t => t.notThrows(() => { jp('a -> b; state a:{color : orange;};'); }) );

});





describe('properties', async it => {

  it('color', t => t.deepEqual(
    {state:'a', color:'#ffa500ff', declarations:[{key: "color", value: "#ffa500ff"}]},
    sm`a -> b; state a:{color:orange;};`.raw_state_declarations()[0]
  ));

});





// TODO FIXME TESTME test state_delarations/0
// TODO FIXME TESTME test state_delaration/1 for has
// TODO FIXME TESTME test state_delaration/1 for doesn't have
// TODO FIXME TESTME test that redeclaring a state throws
