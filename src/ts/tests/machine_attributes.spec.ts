
import { sm } from '../jssm';

const r639 = require('reduce-to-639-1').reduce;





test.todo('Most of this machine_attributes stuff should be rewritten as table-driven and/or stoch');





describe('machine_name', () => {

  test('atom', () =>
    expect(() => { const _foo = sm`machine_name: bob; a->b;`; })
      .not.toThrow() );

  test('quoted string', () =>
    expect(() => { const _foo = sm`machine_name: "bo b"; a->b;`; })
      .not.toThrow() );

  test('retval correct', () =>
    expect(sm`machine_name: testval; a->b;`.machine_name() )
      .toBe('testval') );

});





describe('npm_name', () => {

  test('atom', () =>
    expect(() => { const _foo = sm`npm_name: mypackage; a->b;`; })
      .not.toThrow() );

  test('quoted string', () =>
    expect(() => { const _foo = sm`npm_name: "my-package"; a->b;`; })
      .not.toThrow() );

  test('retval correct', () =>
    expect(sm`npm_name: testval; a->b;`.npm_name() )
      .toBe('testval') );

  test('absent → undefined', () =>
    expect(sm`a->b;`.npm_name())
      .toBeUndefined() );

});



describe('machine_language', () => {

  const eachTest = (name, lang) => {

    test(`${name} machine_language with transclusion is correct for sm\`machine_language: ${lang}; a->b;\``, () =>
      expect( ((sm`machine_language: ${lang}; a->b;`).machine_language()) )
        .toBe( r639(lang) ) );

    test.todo('machine_attributes spec more available');

    // test(`${name} machine_language with transclusion is correct for sm\`machine_language: "${lang}"; a->b;\``, () =>
    //    t.is(r639(lang), ((sm`machine_language: "${lang}"; a->b;`).machine_language()) ) );

  };

  test(`Eng hand-written is correct without quotes`, () =>
    expect(((sm`machine_language: EnGlIsH; a->b;`).machine_language() ))
      .toBe('en') );

  test(`Eng hand-written is correct with quotes`, () =>
    expect(((sm`machine_language: "EnGlIsH"; a->b;`).machine_language() ))
      .toBe('en') );

  test(`Amharic hand-written is correct without quotes`, () =>
    expect(((sm`machine_language: አማርኛ; a->b;`).machine_language() ))
      .toBe('am') );

  test.todo('machine_attributes spec more available 2');

  // test(`Amharic hand-written is correct with quotes`, () =>
  //   t.is('am', ((sm`machine_language: "አማርኛ"; a->b;`).machine_language()) ) );

  eachTest('atom correct case', 'English');
  eachTest('atom lowercase',    'english');
  eachTest('atom mixedcase',    'eNGliSH');
  eachTest('amharic',           'አማርኛ');

});





describe('machine_author', () => {

  test('single atom', () =>
    expect( () => { const _foo = sm`machine_author: bob; a->b;`; })
      .not.toThrow() );

  test('single quoted string', () =>
    expect( () => { const _foo = sm`machine_author: "bo b"; a->b;`; })
      .not.toThrow() );

  test('atom list', () =>
    expect( () => { const _foo = sm`machine_author: [bob dobbs]; a->b;`; })
      .not.toThrow() );

  test('quoted string list', () =>
    expect( () => { const _foo = sm`machine_author: ["bo b" "do bbs"]; a->b;`; })
      .not.toThrow() );

  test('mixed list a/q', () =>
    expect( () => { const _foo = sm`machine_author: [bob "do bbs"]; a->b;`; })
      .not.toThrow() );

  test('mixed list q/a', () =>
    expect( () => { const _foo = sm`machine_author: ["bo b" dobbs]; a->b;`; })
      .not.toThrow() );


  test('single retval', () =>
    expect(sm`machine_author: testval; a->b;`.machine_author() )
      .toEqual(['testval']) );

  test('multiple retval', () =>
    expect(sm`machine_author: [bob david]; a->b;`.machine_author() )
      .toEqual(['bob','david']) );

});





describe('machine_contributor', () => {

  test('atom', () =>
    expect( () => { const _ = sm`machine_contributor: bob; a->b;`; })
      .not.toThrow() );

  test('quoted string', () =>
    expect( () => { const _ = sm`machine_contributor: "bo b"; a->b;`; })
      .not.toThrow() );

  test('atom list', () =>
    expect( () => { const _ = sm`machine_contributor: [bob dobbs]; a->b;`; })
      .not.toThrow() );

  test('quoted string list', () =>
    expect( () => { const _ = sm`machine_contributor: ["bo b" "do bbs"]; a->b;`; })
      .not.toThrow() );

  test('mixed list a/q', () =>
    expect( () => { const _ = sm`machine_contributor: [bob "do bbs"]; a->b;`; })
      .not.toThrow() );

  test('mixed list q/a', () =>
    expect( () => { const _ = sm`machine_contributor: ["bo b" dobbs]; a->b;`; })
      .not.toThrow() );


  test('single retval',   () =>
    expect(sm`machine_contributor: testval; a->b;`.machine_contributor() )
      .toEqual(["testval"]) );

  test('multiple retval', () =>
    expect(sm`machine_contributor: [bob david]; a->b;`.machine_contributor() )
      .toEqual(['bob','david']) );

});





describe('machine_comment', () => {

  test('atom', () =>
    expect( () => { const _foo = sm`machine_comment: bob; a->b;`; })
      .not.toThrow() );

  test('quoted string', () =>
    expect( () => { const _foo = sm`machine_comment: "bo b"; a->b;`; })
      .not.toThrow() );

  test('retval correct', () =>
    expect(sm`machine_comment: testval; a->b;`.machine_comment() )
      .toBe("testval") );

});





describe('machine_definition', () => {

  test('url', () =>
    expect( () => { const _foo = sm`machine_definition: http://google.com/ ; a->b;`; })
      .not.toThrow() );

  test('url botched', () =>
    expect( () => { const _foo = sm`machine_definition: "not a url"; a->b;`; })
      .toThrow() );

  test('retval correct', () =>
    expect(sm`machine_definition: http://google.com/ ; a->b;`.machine_definition() )
      .toBe("http://google.com/") );

});





describe('machine_version', () => {

  test('semver 0.0.0', () =>
    expect( () => { const _f = sm`machine_version: 0.0.0; a->b;`; })
      .not.toThrow() );

  test('semver 0.0.1', () =>
    expect( () => { const _f = sm`machine_version: 0.0.1; a->b;`; })
      .not.toThrow() );

  test('semver 0.1.0', () =>
    expect( () => { const _f = sm`machine_version: 0.1.0; a->b;`; })
      .not.toThrow() );

  test('semver 1.0.0', () =>
    expect( () => { const _f = sm`machine_version: 1.0.0; a->b;`; })
      .not.toThrow() );

  test('semver 1.0.1', () =>
    expect( () => { const _f = sm`machine_version: 1.0.1; a->b;`; })
      .not.toThrow() );

  test('semver 1.1.1', () =>
    expect( () => { const _f = sm`machine_version: 1.1.1; a->b;`; })
      .not.toThrow() );

  test('semver 2.0.0', () =>
    expect( () => { const _f = sm`machine_version: 2.0.0; a->b;`; })
      .not.toThrow() );


  test('semver notAS', () =>
    expect(() => { const _f = sm`machine_version: "Not a semver"; a->b;`; })
      .toThrow() );


  test('retval correct', () =>
    expect(sm`machine_version: 0.0.0; a->b;`.machine_version())
      .toEqual({full:"0.0.0", major:0, minor:0, patch:0}) );

});





describe('machine_license', () => {

  test('retval correct', () =>
    expect( sm`machine_license: testval; a->b;`.machine_license() )
      .toBe("testval") );


  describe('near', () => {

    test('Public domain', () =>
      expect( () => { const _ = sm`machine_license:Public domain; a->b;`; })
        .not.toThrow() );

    test('MIT', () =>
      expect( () => { const _ = sm`machine_license:MIT; a->b;`; })
        .not.toThrow() );

    test('BSD 2-clause', () =>
      expect( () => { const _ = sm`machine_license:BSD 2-clause; a->b;`; })
        .not.toThrow() );

    test('BSD 3-clause', () =>
      expect( () => { const _ = sm`machine_license:BSD 3-clause; a->b;`; })
        .not.toThrow() );

    test('Apache 2.0', () =>
      expect( () => { const _ = sm`machine_license:Apache 2.0; a->b;`; })
        .not.toThrow() );

    test('Mozilla 2.0', () =>
      expect( () => { const _ = sm`machine_license:Mozilla 2.0; a->b;`; })
        .not.toThrow() );

    test('GPL v2', () =>
      expect( () => { const _ = sm`machine_license:GPL v2; a->b;`; })
        .not.toThrow() );

    test('GPL v3', () =>
      expect( () => { const _ = sm`machine_license:GPL v3; a->b;`; })
        .not.toThrow() );

    test('LGPL v2.1', () =>
      expect( () => { const _ = sm`machine_license:LGPL v2.1; a->b;`; })
        .not.toThrow() );

    test('LGPL v3.0', () =>
      expect( () => { const _ = sm`machine_license:LGPL v3.0; a->b;`; })
        .not.toThrow() );

  });


  describe('spaced', () => {

    test('Public domain', () =>
      expect( () => { const _ = sm`machine_license: Public domain ; a->b;`; })
      .not.toThrow() );

    test('MIT', () =>
      expect( () => { const _ = sm`machine_license: MIT ; a->b;`; })
      .not.toThrow() );

    test('BSD 2-clause', () =>
      expect( () => { const _ = sm`machine_license: BSD 2-clause ; a->b;`; })
      .not.toThrow() );

    test('BSD 3-clause', () =>
      expect( () => { const _ = sm`machine_license: BSD 3-clause ; a->b;`; })
      .not.toThrow() );

    test('Apache 2.0', () =>
      expect( () => { const _ = sm`machine_license: Apache 2.0 ; a->b;`; })
      .not.toThrow() );

    test('Mozilla 2.0', () =>
      expect( () => { const _ = sm`machine_license: Mozilla 2.0 ; a->b;`; })
      .not.toThrow() );

    test('GPL v2', () =>
      expect( () => { const _ = sm`machine_license: GPL v2 ; a->b;`; })
      .not.toThrow() );

    test('GPL v3', () =>
      expect( () => { const _ = sm`machine_license: GPL v3 ; a->b;`; })
      .not.toThrow() );

    test('LGPL v2.1', () =>
      expect( () => { const _ = sm`machine_license: LGPL v2.1 ; a->b;`; })
      .not.toThrow() );

    test('LGPL v3.0', () =>
      expect( () => { const _ = sm`machine_license: LGPL v3.0 ; a->b;`; })
      .not.toThrow() );

  });


  test('single atom', () =>
    expect( () => { const _ = sm`machine_license: bob; a->b;`; })
      .not.toThrow() );

  test('single quoted string', () =>
    expect( () => { const _ = sm`machine_license: "bo b"; a->b;`; })
      .not.toThrow() );

});





describe('fsl_version', () => {

  test('semver 0.0.0', () =>
    expect( () => { const _f = sm`fsl_version: 0.0.0; a->b;`; })
      .not.toThrow() );

  test('semver 0.0.1', () =>
    expect( () => { const _f = sm`fsl_version: 0.0.1; a->b;`; })
      .not.toThrow() );

  test('semver 0.1.0', () =>
    expect( () => { const _f = sm`fsl_version: 0.1.0; a->b;`; })
      .not.toThrow() );

  test('semver 1.0.0', () =>
    expect( () => { const _f = sm`fsl_version: 1.0.0; a->b;`; })
      .not.toThrow() );

  test('semver 1.0.1', () =>
    expect( () => { const _f = sm`fsl_version: 1.0.1; a->b;`; })
      .not.toThrow() );

  test('semver 1.1.1', () =>
    expect( () => { const _f = sm`fsl_version: 1.1.1; a->b;`; })
      .not.toThrow() );

  test('semver 2.0.0', () =>
    expect( () => { const _f = sm`fsl_version: 2.0.0; a->b;`; })
      .not.toThrow() );


  test('semver notAS', () =>
    expect(() => { const _f = sm`fsl_version: "Not a semver"; a->b;`; })
      .toThrow() );


  test('retval correct', () =>
    expect(sm`fsl_version: 0.0.0; a->b;`.fsl_version())
      .toEqual({full:"0.0.0", major:0, minor:0, patch:0}) );

});




describe('failed_outputs', () => {

  test('absent → empty array', () =>
    expect( sm`a -> b;`.failed_outputs() )
      .toEqual([]) );

  test('single-state form → one-element array', () =>
    expect( sm`failed_outputs: dead; a -> b -> dead;`.failed_outputs() )
      .toEqual(['dead']) );

  test('list form → full array', () =>
    expect( sm`failed_outputs: [dead error]; a -> b -> dead -> error;`.failed_outputs() )
      .toEqual(['dead', 'error']) );

  test('is_failed_output true for declared failure state', () =>
    expect( sm`failed_outputs: dead; a -> b -> dead;`.is_failed_output('dead') )
      .toBe(true) );

  test('is_failed_output false for non-failure state', () =>
    expect( sm`failed_outputs: dead; a -> b -> dead;`.is_failed_output('a') )
      .toBe(false) );

  test('is_failed false when current state is not a failure state', () => {
    const m = sm`failed_outputs: dead; a -> b -> dead;`;
    expect( m.is_failed() )
      .toBe(false);
  });

  test('is_failed true after transitioning into a failure state', () => {
    const m = sm`failed_outputs: dead; a -> b -> dead;`;
    m.transition('b');
    m.transition('dead');
    expect( m.is_failed() )
      .toBe(true);
  });

  test('is_failed false after leaving a failure state', () => {
    const m = sm`failed_outputs: dead; a -> dead -> b;`;
    m.transition('dead');
    m.transition('b');
    expect( m.is_failed() )
      .toBe(false);
  });

});
