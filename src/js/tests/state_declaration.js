
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe("doesn't throw", async it => {

  it('with no attributes',   t => t.notThrows(() => { const _foo = sm`state c: {}; a -> b;`; }) );
  it('with just whitespace', t => t.notThrows(() => { const _foo = sm`state c: { }; a -> b;`; }) );
  it('with just node color', t => t.notThrows(() => { const _foo = sm`state c: { color: red; }; a -> b;`; }) );

});





describe('can read declaration', async _it => {

  const mach0 = sm`state c: { };                                    a -> b;`;
  const mach1 = sm`state c: { color: red; };                        a -> b;`;
  const mach2 = sm`state c: { color: red; shape: circle; };         a -> b;`;
//  const machT = sm`c: { color: red; }; d: { shape: circle; }; a -> b;`;

  // const machP = sm`
  //   c: { shape: circle; color: red; };
  //   d: { shape: circle; color: red; };
  //   a -> b;
  // `;

  describe('of w/ nothing', async _it2 => {
    const decls = mach0.state_declarations();
    describe('through .state_declarations/0 w nothing', async it => {
      it('yielding map',          t => t.is(true, decls instanceof Map));
      it('list having size 1',    t => t.is(1,    decls.size));
      it('props having length 0', t => t.is(0,    decls.get('c').declarations.length));
    });
  });

  describe('of just w/ color', async _it1 => {
    const decls = mach1.state_declarations();
    describe('through .state_declarations/0 just state color', async it2 => {
      it2('yielding map',          t => t.is(true, decls instanceof Map));
      it2('list having size 1',    t => t.is(1,    decls.size));
      it2('props having length 1', t => t.is(1,    decls.get('c').declarations.length));
      // todo whargarbl check the actual members comeback
    });

//  it('through .state_declaration/1',  t => t.is('left', mach1.state_declaration('c') ) );
  });

  describe('of w/ color, shape', async it => {
    it('through .state_declaration/1 red hex-8',            t => t.is('#ff0000ff', mach2.state_declaration('c').declarations[0].value ) );
    it('through .state_declaration/1 circle',               t => t.is('circle', mach2.state_declaration('c').declarations[1].value ) );
    it('through .state_declarations/0 size',                t => t.is(1, mach2.state_declarations().size ) );
    it('through .state_declarations/0 declarations length', t => t.is(2, mach2.state_declarations().get('c').declarations.length ) );
  });
/*
  describe('of w/ color on c, shape on d', async it => {
    it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('c') ) );
    it('through .state_declaration/1',  t => t.is('left', machT.state_declaration('d') ) );
    it('through .state_declarations/0', t => t.is('left', machT.state_declarations() ) );
  });

  describe('of w/ color, shape on each c and d', async it => {
    it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('c') ) );
    it('through .state_declaration/1',  t => t.is('left', machP.state_declaration('d') ) );
    it('through .state_declarations/0', t => t.is('left', machP.state_declarations() ) );
  });
*/
});





describe('error catchery', async _parse_it => {

  describe('repeated declaration', async it => {
    it('throws', t => t.throws( () => {
      const _mach1 = sm`state c: { color: red; }; c: { color: red; }; a -> b;`; // eslint-disable-line no-unused-vars
    } ));
  });

  describe('unknown state property', async it => {
    const prestate = {
      "start_states":["b"],
      "transitions":[{"from":"b","to":"c","kind":"legal","forced_only":false,"main_path":false}],
      "state_declaration":[{"state":"a","declarations":[{"key":"urgle bergle","value":"circle"}]}]};

    it('throws', t => t.throws( () => {
      const _m0 = jssm.Machine(prestate);
    } ));
  });

  describe('transfer state properties throws on unknown key', async it => {
    it('throws', t => t.throws( () => {
      jssm.transfer_state_properties({declarations: [{key: 'agsrhdtjfy', value: 'seven'}]});
    } ));
  });

});
