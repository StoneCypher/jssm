
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm,
      jp   = jssm.parse;





describe('simple naming', async _it => {

  describe('parse', async it => {

    it('trans then node',  t => t.notThrows(() => { jp('a -> b; a: { node_color: orange; };'); }) );
    it('node then trans',  t => t.notThrows(() => { jp('a: { node_color: orange; }; a -> b;'); }) );
    it('cycle node named', t => t.notThrows(() => { jp('[a b] -> +1; a: { node_color: red; }; &b: [a c e];'); }) );

    it('two properties',   t => t.notThrows(() => { jp('a -> b; a: { node_color: orange; node_shape: circle; };'); }) );

  });

  describe('sm tag', async it => {

    it('trans then node',  t => t.notThrows(() => { sm`a -> b; a: { node_color: orange; };`; }) );
    it('node then trans',  t => t.notThrows(() => { sm`a: { node_color: orange; }; a -> b;`; }) );
//  it('cycle node named', t => t.notThrows(() => { sm`[a b] -> +1; a: { node_color: red; }; &b: [a c e];`; }) );

    it('two properties',   t => t.notThrows(() => { sm`a -> b; a: { node_color: orange; node_shape: circle; };`; }) );

  });

});





describe('spacing variants', async it => {

  it('tight',    t => t.notThrows(() => { jp('a -> b; a:{node_color:orange;};'); }) );
  it('framed',   t => t.notThrows(() => { jp('a -> b; a:{ node_color:orange; };'); }) );
  it('sentence', t => t.notThrows(() => { jp('a -> b; a:{ node_color: orange; };'); }) );
  it('fully',    t => t.notThrows(() => { jp('a -> b; a:{ node_color : orange; };'); }) );
  it('mars',     t => t.notThrows(() => { jp('a -> b; a:{node_color : orange;};'); }) );

});





describe('properties', async it => {

  it('node_color', t => t.deepEqual(
    {state:'a', node_color:'#ffa500ff', declarations:[{key: "node_color", value: "#ffa500ff"}]},
    sm`a -> b; a:{node_color:orange;};`.raw_state_declarations()[0]
  ));

});

// test state_delarations/0
// test state_delaration/1 for has
// test state_delaration/1 for doesn't have
// test that redeclaring a state throws


