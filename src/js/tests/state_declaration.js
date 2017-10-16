
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe("doesn't throw", async it => {

  it('with no attributes',   t => t.notThrows(() => { const _foo = sm`c: {}; a -> b;`; }) );
  it('with just whitespace', t => t.notThrows(() => { const _foo = sm`c: { }; a -> b;`; }) );
  it('with just node color', t => t.notThrows(() => { const _foo = sm`c: { node_color: red; }; a -> b;`; }) );

});





describe('can read declaration', async _it => {

  const mach0 = sm`c: { };                                              a -> b;`;
  const mach1 = sm`c: { node_color: red; };                             a -> b;`;
  const mach2 = sm`c: { node_color: red; node_shape: circle; };         a -> b;`;
  const machT = sm`c: { node_color: red; }; d: { node_shape: circle; }; a -> b;`;

  const machP = sm`
    c: { node_shape: circle; node_color: red; };
    d: { node_shape: circle; node_color: red; };
    a -> b;
  `;

  describe('of w/ nothing', async _it2 => {
    const decls = mach0.state_declarations();
    describe('through .state_declarations/0', async it => {
      it('yielding map',  t => t.is(true, decls instanceof Map));
      it('having size 0', t => t.is(0,    decls.size));
    });
  });

  describe('of just w/ node_color', async it => {
    const decls = mach0.state_declarations();
    describe('through .state_declarations/0', async it2 => {
      it2('yielding map',  t => t.is(true, decls instanceof Map));
      it2('having size 1', t => t.is(1,    decls.size));
      // todo whargarbl check the actual members comeback
    });

    it('through .state_declaration/1',  t => t.is('left', mach1.state_declaration('c') ) );
  });

  describe('of w/ node_color, node_shape', async it => {
    it('through .state_declaration/1',  t => t.is('left', mach2.state_declaration('c') ) );
    it('through .state_declarations/0', t => t.is('left', mach2.state_declarations() ) );
  });

  describe('of w/ node_color on c, node_shape on d', async it => {
    it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('c') ) );
    it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('d') ) );
    it('through .state_declarations/0', t => t.is('left', machT.state_declarations() ) );
  });

  describe('of w/ node_color, node_shape on each c and d', async it => {
    it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('c') ) );
    it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('d') ) );
    it('through .state_declarations/0', t => t.is('left', machP.state_declarations() ) );
  });

});
