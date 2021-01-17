
/* eslint-disable max-len */

import * as jssm from '../jssm';





describe('arrow_direction', () => {

  const lefts  = ['<-', '<=', '<~', '←', '⇐', '↚'],
        rights = ['->', '=>', '~>', '→', '⇒', '↛'],
        boths  = ['<->', '<=>', '<~>',
                  '<-=>', '<-~>', '<=->', '<=~>', '<~->', '<~=>',
                  '←⇒',   '←↛',   '⇐→',   '⇐↛',   '↚→',   '↚⇒',
                  '←=>',  '←~>',  '⇐->',  '⇐~>',  '↚->',  '↚=>',
                  '<-⇒',  '<-↛',  '<=→',  '<=↛',  '<~→',  '<~⇒'  ],

        check  = (lab, dir) =>
                   it(lab, () =>
                     expect( jssm.arrow_direction(lab) ).toBe(dir) );

  lefts.map(  e => check(e, 'left')  );
  rights.map( e => check(e, 'right') );
  boths.map(  e => check(e, 'both')  );

  test.todo('Bunch of commented out tests here, not clear why');

/*
  test('<-',   () => expect(jssm.arrow_direction('<-')   ).toBe('left') );
  test('<=',   () => expect(jssm.arrow_direction('<=')   ).toBe('left') );
  test('<~',   () => expect(jssm.arrow_direction('<~')   ).toBe('left') );

  test('->',   () => expect(jssm.arrow_direction('->')   ).toBe('right') );
  test('=>',   () => expect(jssm.arrow_direction('=>')   ).toBe('right') );
  test('~>',   () => expect(jssm.arrow_direction('~>')   ).toBe('right') );

  test('<->',  () => expect(jssm.arrow_direction('<->')  ).toBe('both') );
  test('<=>',  () => expect(jssm.arrow_direction('<=>')  ).toBe('both') );
  test('<~>',  () => expect(jssm.arrow_direction('<~>')  ).toBe('both') );

  test('<-=>', () => expect(jssm.arrow_direction('<-=>') ).toBe('both') );
  test('<=->', () => expect(jssm.arrow_direction('<=->') ).toBe('both') );
  test('<-~>', () => expect(jssm.arrow_direction('<-~>') ).toBe('both') );
  test('<~->', () => expect(jssm.arrow_direction('<~->') ).toBe('both') );
  test('<=~>', () => expect(jssm.arrow_direction('<=~>') ).toBe('both') );
  test('<~=>', () => expect(jssm.arrow_direction('<~=>') ).toBe('both') );
*/

});





describe('arrow_left_kind', () => {

  test('->',   () => expect(jssm.arrow_left_kind('->')   ).toBe('none') );
  test('=>',   () => expect(jssm.arrow_left_kind('=>')   ).toBe('none') );
  test('~>',   () => expect(jssm.arrow_left_kind('~>')   ).toBe('none') );

  test('<-',   () => expect(jssm.arrow_left_kind('<-')   ).toBe('legal') );
  test('<->',  () => expect(jssm.arrow_left_kind('<->')  ).toBe('legal') );
  test('<-=>', () => expect(jssm.arrow_left_kind('<-=>') ).toBe('legal') );
  test('<-~>', () => expect(jssm.arrow_left_kind('<-~>') ).toBe('legal') );

  test('<=',   () => expect(jssm.arrow_left_kind('<=')   ).toBe('main') );
  test('<=>',  () => expect(jssm.arrow_left_kind('<=>')  ).toBe('main') );
  test('<=->', () => expect(jssm.arrow_left_kind('<=->') ).toBe('main') );
  test('<=~>', () => expect(jssm.arrow_left_kind('<=~>') ).toBe('main') );

  test('<~',   () => expect(jssm.arrow_left_kind('<~')   ).toBe('forced') );
  test('<~>',  () => expect(jssm.arrow_left_kind('<~>')  ).toBe('forced') );
  test('<~->', () => expect(jssm.arrow_left_kind('<~->') ).toBe('forced') );
  test('<~=>', () => expect(jssm.arrow_left_kind('<~=>') ).toBe('forced') );

});





describe('arrow_right_kind', () => {

  test('<-',   () => expect(jssm.arrow_right_kind('<-')   ).toBe('none') );
  test('<=',   () => expect(jssm.arrow_right_kind('<=')   ).toBe('none') );
  test('<~',   () => expect(jssm.arrow_right_kind('<~')   ).toBe('none') );

  test('->',   () => expect(jssm.arrow_right_kind('->')   ).toBe('legal') );
  test('<->',  () => expect(jssm.arrow_right_kind('<->')  ).toBe('legal') );
  test('<=->', () => expect(jssm.arrow_right_kind('<=->') ).toBe('legal') );
  test('<~->', () => expect(jssm.arrow_right_kind('<~->') ).toBe('legal') );

  test('=>',   () => expect(jssm.arrow_right_kind('=>')   ).toBe('main') );
  test('<=>',  () => expect(jssm.arrow_right_kind('<=>')  ).toBe('main') );
  test('<-=>', () => expect(jssm.arrow_right_kind('<-=>') ).toBe('main') );
  test('<~=>', () => expect(jssm.arrow_right_kind('<~=>') ).toBe('main') );

  test('~>',   () => expect(jssm.arrow_right_kind('~>')   ).toBe('forced') );
  test('<~>',  () => expect(jssm.arrow_right_kind('<~>')  ).toBe('forced') );
  test('<-~>', () => expect(jssm.arrow_right_kind('<-~>') ).toBe('forced') );
  test('<=~>', () => expect(jssm.arrow_right_kind('<=~>') ).toBe('forced') );

});





describe('arrow error catchery', () => {

test.todo('Used to enforce throws on unknown arrow kinds, but now TS catches and blocks.  How to verify safe JS?');

  // test('unknown arrow direction throws', () =>
  //   expect( () => jssm.arrow_direction('boop') ).toThrow() );

  // test('unknown arrow left kind throws', () =>
  //   expect( () => jssm.arrow_left_kind('boop') ).toThrow() );

  // test('unknown arrow right kind throws', () =>
  //   expect( () => jssm.arrow_right_kind('boop') ).toThrow() );

});

// stochable
