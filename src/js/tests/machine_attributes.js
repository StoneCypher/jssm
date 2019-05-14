
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm,
      r639 = require('reduce-to-639-1').reduce;





describe('machine_name', async it => {

  it('atom',           t => t.notThrows(() => { const _foo = sm`machine_name: bob;    a->b;`; }) );
  it('quoted string',  t => t.notThrows(() => { const _foo = sm`machine_name: "bo b"; a->b;`; }) );

  it('retval correct', t => t.is("testval", sm`machine_name: testval; a->b;`.machine_name() ) );

});





describe('machine_language', async it => {

  const eachTest = (name, lang) => {

    it(`${name} machine_language with transclusion is correct for sm\`machine_language: ${lang}; a->b;\``, t =>
       t.is(r639(lang), ((sm`machine_language: ${lang}; a->b;`).machine_language()) ) );

    // it(`${name} machine_language with transclusion is correct for sm\`machine_language: "${lang}"; a->b;\``, t =>
    //    t.is(r639(lang), ((sm`machine_language: "${lang}"; a->b;`).machine_language()) ) );

  };

  it(`Eng hand-written is correct without quotes`, t =>
    t.is('en', ((sm`machine_language: EnGlIsH; a->b;`).machine_language()) ) );

  it(`Eng hand-written is correct with quotes`, t =>
    t.is('en', ((sm`machine_language: "EnGlIsH"; a->b;`).machine_language()) ) );

  it(`Amharic hand-written is correct without quotes`, t =>
    t.is('am', ((sm`machine_language: አማርኛ; a->b;`).machine_language()) ) );

  // it(`Amharic hand-written is correct with quotes`, t =>
  //   t.is('am', ((sm`machine_language: "አማርኛ"; a->b;`).machine_language()) ) );

  eachTest('atom correct case', 'English');
  eachTest('atom lowercase',    'english');
  eachTest('atom mixedcase',    'eNGliSH');
  eachTest('amharic',           'አማርኛ');

});





describe('machine_author', async it2 => {

  it2('single atom',          t => t.notThrows(() => { const _foo = sm`machine_author: bob;               a->b;`; }) );
  it2('single quoted string', t => t.notThrows(() => { const _foo = sm`machine_author: "bo b";            a->b;`; }) );
  it2('atom list',            t => t.notThrows(() => { const _foo = sm`machine_author: [bob dobbs];       a->b;`; }) );
  it2('quoted string list',   t => t.notThrows(() => { const _foo = sm`machine_author: ["bo b" "do bbs"]; a->b;`; }) );
  it2('mixed list a/q',       t => t.notThrows(() => { const _foo = sm`machine_author: [bob "do bbs"];    a->b;`; }) );
  it2('mixed list q/a',       t => t.notThrows(() => { const _foo = sm`machine_author: ["bo b" dobbs];    a->b;`; }) );

  it2('single retval',   t => t.deepEqual(["testval"], sm`machine_author: testval; a->b;`.machine_author() ) );
  it2('multiple retval', t => t.deepEqual(['bob','david'], sm`machine_author: [bob david]; a->b;`.machine_author() ) );

});





describe('machine_contributor', async it3 => {

  it3('atom',               t => t.notThrows(() => { const _ = sm`machine_contributor: bob;               a->b;`; }) );
  it3('quoted string',      t => t.notThrows(() => { const _ = sm`machine_contributor: "bo b";            a->b;`; }) );
  it3('atom list',          t => t.notThrows(() => { const _ = sm`machine_contributor: [bob dobbs];       a->b;`; }) );
  it3('quoted string list', t => t.notThrows(() => { const _ = sm`machine_contributor: ["bo b" "do bbs"]; a->b;`; }) );
  it3('mixed list a/q',     t => t.notThrows(() => { const _ = sm`machine_contributor: [bob "do bbs"];    a->b;`; }) );
  it3('mixed list q/a',     t => t.notThrows(() => { const _ = sm`machine_contributor: ["bo b" dobbs];    a->b;`; }) );

  it3('single retval',   t =>
    t.deepEqual(["testval"], sm`machine_contributor: testval; a->b;`.machine_contributor() ) );

  it3('multiple retval', t =>
    t.deepEqual(['bob','david'], sm`machine_contributor: [bob david]; a->b;`.machine_contributor() ) );

});





describe('machine_comment', async it4 => {

  it4('atom',          t => t.notThrows(() => { const _foo = sm`machine_comment: bob;    a->b;`; }) );
  it4('quoted string', t => t.notThrows(() => { const _foo = sm`machine_comment: "bo b"; a->b;`; }) );

  it4('retval correct', t => t.is("testval", sm`machine_comment: testval; a->b;`.machine_comment() ) );

});





describe('machine_definition', async it5 => {

  it5('url', t => t.notThrows(() => { const _foo = sm`machine_definition: http://google.com/ ; a->b;`; }) );
  it5('url', t => t.notThrows(() => { const _foo = sm`machine_definition: http://google.com/ ; a->b;`; }) );
  it5('url', t => t.throws(   () => { const _foo = sm`machine_definition: "not a url";         a->b;`; }) );

  it5('retval correct', t =>
    t.is("http://google.com/", sm`machine_definition: http://google.com/ ; a->b;`.machine_definition() ) );

});





describe('machine_version', async it6 => {

  it6('semver 0.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 0.0.0; a->b;`; }) );
  it6('semver 0.0.1', t => t.notThrows(() => { const _f = sm`machine_version: 0.0.1; a->b;`; }) );
  it6('semver 0.1.0', t => t.notThrows(() => { const _f = sm`machine_version: 0.1.0; a->b;`; }) );
  it6('semver 1.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 1.0.0; a->b;`; }) );
  it6('semver 1.0.1', t => t.notThrows(() => { const _f = sm`machine_version: 1.0.1; a->b;`; }) );
  it6('semver 1.1.1', t => t.notThrows(() => { const _f = sm`machine_version: 1.1.1; a->b;`; }) );
  it6('semver 2.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 2.0.0; a->b;`; }) );

  it6('semver notAS', t => t.throws(() => { const _f = sm`machine_version: "Not a semver"; a->b;`; }) );

  it6('retval correct', t =>
    t.deepEqual(
      {full:"0.0.0", major:0, minor:0, patch:0},
      sm`machine_version: 0.0.0; a->b;`.machine_version()
    )
  );


});





describe('machine_license', async oit => {

  oit('retval correct', t => t.is("testval", sm`machine_license: testval; a->b;`.machine_license() ) );

  describe('near', async it => {
    it('Public domain',        t => t.notThrows(() => { const _ = sm`machine_license:Public domain;     a->b;`; }) );
    it('MIT',                  t => t.notThrows(() => { const _ = sm`machine_license:MIT;               a->b;`; }) );
    it('BSD 2-clause',         t => t.notThrows(() => { const _ = sm`machine_license:BSD 2-clause;      a->b;`; }) );
    it('BSD 3-clause',         t => t.notThrows(() => { const _ = sm`machine_license:BSD 3-clause;      a->b;`; }) );
    it('Apache 2.0',           t => t.notThrows(() => { const _ = sm`machine_license:Apache 2.0;        a->b;`; }) );
    it('Mozilla 2.0',          t => t.notThrows(() => { const _ = sm`machine_license:Mozilla 2.0;       a->b;`; }) );
    it('GPL v2',               t => t.notThrows(() => { const _ = sm`machine_license:GPL v2;            a->b;`; }) );
    it('GPL v3',               t => t.notThrows(() => { const _ = sm`machine_license:GPL v3;            a->b;`; }) );
    it('LGPL v2.1',            t => t.notThrows(() => { const _ = sm`machine_license:LGPL v2.1;         a->b;`; }) );
    it('LGPL v3.0',            t => t.notThrows(() => { const _ = sm`machine_license:LGPL v3.0;         a->b;`; }) );
  });

  describe('spaced', async it => {
    it('Public domain',        t => t.notThrows(() => { const _ = sm`machine_license: Public domain ;   a->b;`; }) );
    it('MIT',                  t => t.notThrows(() => { const _ = sm`machine_license: MIT ;             a->b;`; }) );
    it('BSD 2-clause',         t => t.notThrows(() => { const _ = sm`machine_license: BSD 2-clause ;    a->b;`; }) );
    it('BSD 3-clause',         t => t.notThrows(() => { const _ = sm`machine_license: BSD 3-clause ;    a->b;`; }) );
    it('Apache 2.0',           t => t.notThrows(() => { const _ = sm`machine_license: Apache 2.0 ;      a->b;`; }) );
    it('Mozilla 2.0',          t => t.notThrows(() => { const _ = sm`machine_license: Mozilla 2.0 ;     a->b;`; }) );
    it('GPL v2',               t => t.notThrows(() => { const _ = sm`machine_license: GPL v2 ;          a->b;`; }) );
    it('GPL v3',               t => t.notThrows(() => { const _ = sm`machine_license: GPL v3 ;          a->b;`; }) );
    it('LGPL v2.1',            t => t.notThrows(() => { const _ = sm`machine_license: LGPL v2.1 ;       a->b;`; }) );
    it('LGPL v3.0',            t => t.notThrows(() => { const _ = sm`machine_license: LGPL v3.0 ;       a->b;`; }) );
  });

  oit('single atom',          t => t.notThrows(() => { const _ = sm`machine_license: bob;               a->b;`; }) );
  oit('single quoted string', t => t.notThrows(() => { const _ = sm`machine_license: "bo b";            a->b;`; }) );

});





describe('fsl_version', async it7 => {

  it7('semver 0.0.0', t => t.notThrows(() => { const _f = sm`fsl_version: 0.0.0; a->b;`; }) );
  it7('semver 0.0.1', t => t.notThrows(() => { const _f = sm`fsl_version: 0.0.1; a->b;`; }) );
  it7('semver 0.1.0', t => t.notThrows(() => { const _f = sm`fsl_version: 0.1.0; a->b;`; }) );
  it7('semver 1.0.0', t => t.notThrows(() => { const _f = sm`fsl_version: 1.0.0; a->b;`; }) );
  it7('semver 1.0.1', t => t.notThrows(() => { const _f = sm`fsl_version: 1.0.1; a->b;`; }) );
  it7('semver 1.1.1', t => t.notThrows(() => { const _f = sm`fsl_version: 1.1.1; a->b;`; }) );
  it7('semver 2.0.0', t => t.notThrows(() => { const _f = sm`fsl_version: 2.0.0; a->b;`; }) );

  it7('semver notAS', t => t.throws(() => { const _f = sm`fsl_version: "Not a semver"; a->b;`; }) );

  it7('retval correct', t =>
    t.deepEqual(
      {full:"0.0.0", major:0, minor:0, patch:0},
      sm`fsl_version: 0.0.0; a->b;`.fsl_version()
    )
  );

});
