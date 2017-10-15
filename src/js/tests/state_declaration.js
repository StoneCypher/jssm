
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe("doesn't throw", async it => {

  const mach = sm`c: { node_color: red; }; a -> b;`;

  it('with no attributes',   t => t.notThrows(() => { const _foo = sm`c: {}; a -> b;` }) );
  it('with just whitespace', t => t.notThrows(() => { const _foo = sm`c: { }; a -> b;` }) );
  it('with just node color', t => t.notThrows(() => { const _foo = sm`c: { node_color: red; }; a -> b;` }) );

});





describe('can read declaration', async it => {

  const mach = sm`c: { node_color: red; }; a -> b;`;

  it('through .state_declaration/1', t => t.is('left', mach.state_declaration('c') ) );

});
