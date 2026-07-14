
 

import * as jssm from '../jssm';

import type { JssmArrow } from '../jssm_types';





describe('arrow_direction', () => {

  const lefts  = ['<-', '<=', '<~', '←', '⇐', '↚'],
        rights = ['->', '=>', '~>', '→', '⇒', '↛'],
        boths  = ['<->', '<=>', '<~>',
                  '<-=>', '<-~>', '<=->', '<=~>', '<~->', '<~=>',
                  '←⇒',   '←↛',   '⇐→',   '⇐↛',   '↚→',   '↚⇒',
                  '←=>',  '←~>',  '⇐->',  '⇐~>',  '↚->',  '↚=>',
                  '<-⇒',  '<-↛',  '<=→',  '<=↛',  '<~→',  '<~⇒'  ],

        check  = (lab, dir) =>
                   // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                   it(lab, () =>
                     expect( jssm.arrow_direction(lab) ).toBe(dir) );

  for (const e of lefts)  { check(e, 'left');  }
  for (const e of rights) { check(e, 'right'); }
  for (const e of boths)  { check(e, 'both');  }

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

  test('unknown arrow direction throws', () =>
    expect( () => jssm.arrow_direction('boop' as any) ).toThrow() );

  test('unknown arrow left kind throws', () =>
    expect( () => jssm.arrow_left_kind('boop' as any) ).toThrow() );

  test('unknown arrow right kind throws', () =>
    expect( () => jssm.arrow_right_kind('boop' as any) ).toThrow() );

});





// The tests above pass their arrows through `any`-typed loop variables and casts,
// so they exercise the classifiers at runtime without ever pinning the *type*.
// `JssmArrow` used to declare only the 15 ASCII arrows while the classifiers
// accepted all 42 -- `arrow_direction('→')` was a compile error on working code.
// These pass literals directly, so their literal types must be members of the
// union: if `JssmArrow` ever narrows again, this block stops compiling.

describe('JssmArrow admits every spelling the classifiers accept', () => {

  test('unicode one-way arrows are typed', () => {
    expect( jssm.arrow_direction('→')  ).toBe('right');
    expect( jssm.arrow_direction('⇐')  ).toBe('left');
    expect( jssm.arrow_left_kind('↚')  ).toBe('forced');
    expect( jssm.arrow_right_kind('⇒') ).toBe('main');
  });

  test('mixed ascii/unicode two-way arrows are typed', () => {
    expect( jssm.arrow_direction('←⇒')   ).toBe('both');
    expect( jssm.arrow_left_kind('⇐↛')   ).toBe('main');
    expect( jssm.arrow_right_kind('<~⇒') ).toBe('main');
    expect( jssm.arrow_left_kind('<-↛')  ).toBe('legal');
  });

  // The whole vocabulary, annotated as JssmArrow[]: a missing member is a
  // compile error, and a member the classifiers reject is a runtime throw.  So
  // this pins the type and the implementation against each other, both ways.
  test('all 42 arrows are both typed and classifiable', () => {

    const every_arrow: JssmArrow[] = [
      '->',   '→',    '=>',   '⇒',    '~>',   '↛',
      '<-',   '←',    '<=',   '⇐',    '<~',   '↚',
      '<->',  '↔',    '<=>',  '⇔',    '<~>',  '↮',
      '<-=>', '←⇒',   '←=>',  '<-⇒',
      '<-~>', '←↛',   '←~>',  '<-↛',
      '<=->', '⇐→',   '⇐->',  '<=→',
      '<=~>', '⇐↛',   '⇐~>',  '<=↛',
      '<~->', '↚→',   '↚->',  '<~→',
      '<~=>', '↚⇒',   '↚=>',  '<~⇒'
    ];

    expect(every_arrow.length).toBe(42);
    expect(new Set(every_arrow).size).toBe(42);

    for (const arrow of every_arrow) {
      expect( () => jssm.arrow_direction(arrow)  ).not.toThrow();
      expect( () => jssm.arrow_left_kind(arrow)  ).not.toThrow();
      expect( () => jssm.arrow_right_kind(arrow) ).not.toThrow();
    }

  });

});

// stochable
