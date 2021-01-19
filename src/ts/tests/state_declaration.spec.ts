
/* eslint-disable max-len */

import * as jssm from '../jssm';

const sm = jssm.sm;





describe("doesn't throw", () => {

  test('with no attributes', () =>
    expect(() => { const _foo = sm`state c: {}; a -> b;`; })
      .not.toThrow() );

  test('with just whitespace', () =>
    expect(() => { const _foo = sm`state c: { }; a -> b;`; })
      .not.toThrow() );

  test('with just node color', () =>
    expect(() => { const _foo = sm`state c: { color: red; }; a -> b;`; })
      .not.toThrow() );

});





describe('can read declaration', () => {

  const mach0 = sm`state c: { }; a -> b;`,
        mach1 = sm`state c: { color: red; }; a -> b;`,
        mach2 = sm`state c: { color: red; shape: circle; }; a -> b;`;

  test.todo('Incomplete test prototypes in state_declaration');

//  const machT = sm`c: { color: red; }; d: { shape: circle; }; a -> b;`;

  // const machP = sm`
  //   c: { shape: circle; color: red; };
  //   d: { shape: circle; color: red; };
  //   a -> b;
  // `;


  describe('of w/ nothing', () => {
    const decls = mach0.state_declarations();
    describe('through .state_declarations/0 w nothing', () => {

      test('yielding map', () =>
        expect( decls instanceof Map ).toBe(true) );

      test('list having size 1', () =>
        expect( decls.size ).toBe(1) );

      test.todo('Re-enable once state_declarations/0 exposes type 1');

      // test('props having length 0', () =>
      //   expect( decls.get('c').declarations.length ).toBe(0) );

    });
  });


  describe('of just w/ color', () => {
    const decls = mach1.state_declarations();
    describe('through .state_declarations/0 just state color', () => {

      test('yielding map', () =>
        expect(decls instanceof Map ).toBe(true) );

      test('list having size 1', () =>
        expect(decls.size).toBe(1) );

      test.todo('Re-enable once state_declarations/0 exposes type 2');

      // test('props having length 1', () =>
      //   expect(decls.get('c').declarations.length ).toBe(1) );

      // todo whargarbl check the actual members comeback
    });

//  test('through .state_declaration/1',  () =>
//    expect(mach1.state_declaration('c') )
//      .toBe('left') );
  });


  describe('of w/ color, shape', () => {

    test('through .state_declaration/1 red hex-8', () =>
      expect(mach2.state_declaration('c').declarations[0].value )
        .toBe('#ff0000ff') );

    test('through .state_declaration/1 circle', () =>
      expect(mach2.state_declaration('c').declarations[1].value )
        .toBe('circle') );

    test('through .state_declarations/0 size', () =>
      expect(mach2.state_declarations().size )
        .toBe(1) );

    test.todo('Re-enable once state_declarations/0 exposes type 3');

    // test('through .state_declarations/0 declarations length', () =>
    //   expect(mach2.state_declarations().get('c').declarations.length )
    //     .toBe(2) );

  });

/*
  describe('of w/ color on c, shape on d', () => {

    test('through .state_declaration/1', () =>
      expect(machT.state_declaration('c') )
        .toBe('left') );

    test('through .state_declaration/1', () =>
      expect(machT.state_declaration('d') )
        .toBe('left') );

    test('through .state_declarations/0', () =>
      expect(machT.state_declarations() )
        .toBe('left') );

  });


  describe('of w/ color, shape on each c and d', () => {

    test('through .state_declaration/1', () =>
      expect(machP.state_declaration('c') )
        .toBe('left') );

    test('through .state_declaration/1', () =>
      expect(machP.state_declaration('d') )
        .toBe('left') );

    test('through .state_declarations/0', () =>
      expect(machP.state_declarations() )
        .toBe('left') );

  });
*/
});





describe('error catchery', () => {

  describe('repeated declaration', () => {
    test('throws', () =>
      expect( () => { const _mach1 = sm`state c: { color: red; }; state c: { color: red; }; a -> b;`; } )  // eslint-disable-line no-unused-vars
        .toThrow() );
  });


  test.todo('state_declaration declarations key needs tidied up');

  // describe('unknown state property', () => {

  //   const prestate = {
  //     "start_states":["b"],
  //     "transitions":[{"from":"b","to":"c","kind":"legal","forced_only":false,"main_path":false}],
  //     "state_declaration":[{"state":"a","declarations":[{"key":"urgle bergle","value":"circle"}]}]};

  //   test('throws', () =>
  //     expect( () => { const _m0 = new jssm.Machine(prestate); } )
  //       .toThrow() );

  // });


  test.todo('maybe malformed test, need to check');

  // describe('transfer state properties throws on unknown key', () => {
  //   test('throws', () =>
  //     expect( () => { jssm.transfer_state_properties({declarations: [{key: 'agsrhdtjfy', value: 'seven'}]}); } )
  //       .toThrow() );
  // });

});
