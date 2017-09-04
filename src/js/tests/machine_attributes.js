
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('machine_name', async it => {
  it('atom',          t => t.notThrows(() => { const _foo = sm`machine_name: bob;    a->b;`; }) );
  it('quoted string', t => t.notThrows(() => { const _foo = sm`machine_name: "bo b"; a->b;`; }) );
});





describe('machine_author', async it2 => {
  it2('single atom',          t => t.notThrows(() => { const _foo = sm`machine_author: bob;               a->b;`; }) );
  it2('single quoted string', t => t.notThrows(() => { const _foo = sm`machine_author: "bo b";            a->b;`; }) );
  it2('atom list',            t => t.notThrows(() => { const _foo = sm`machine_author: [bob dobbs];       a->b;`; }) );
  it2('quoted string list',   t => t.notThrows(() => { const _foo = sm`machine_author: ["bo b" "do bbs"]; a->b;`; }) );
  it2('mixed list a/q',       t => t.notThrows(() => { const _foo = sm`machine_author: [bob "do bbs"];    a->b;`; }) );
  it2('mixed list q/a',       t => t.notThrows(() => { const _foo = sm`machine_author: ["bo b" dobbs];    a->b;`; }) );
});





describe('machine_contributor', async it3 => {
  it3('atom',               t => t.notThrows(() => { const _ = sm`machine_contributor: bob;               a->b;`; }) );
  it3('quoted string',      t => t.notThrows(() => { const _ = sm`machine_contributor: "bo b";            a->b;`; }) );
  it3('atom list',          t => t.notThrows(() => { const _ = sm`machine_contributor: [bob dobbs];       a->b;`; }) );
  it3('quoted string list', t => t.notThrows(() => { const _ = sm`machine_contributor: ["bo b" "do bbs"]; a->b;`; }) );
  it3('mixed list a/q',     t => t.notThrows(() => { const _ = sm`machine_contributor: [bob "do bbs"];    a->b;`; }) );
  it3('mixed list q/a',     t => t.notThrows(() => { const _ = sm`machine_contributor: ["bo b" dobbs];    a->b;`; }) );
});





describe('machine_comment', async it4 => {
  it4('atom',          t => t.notThrows(() => { const _foo = sm`machine_comment: bob;    a->b;`; }) );
  it4('quoted string', t => t.notThrows(() => { const _foo = sm`machine_comment: "bo b"; a->b;`; }) );
});





describe('machine_definition', async it5 => {
  it5('url', t => t.notThrows(() => { const _foo = sm`machine_definition: http://google.com/ ; a->b;`; }) );
  it5('url', t => t.notThrows(() => { const _foo = sm`machine_definition: http://google.com/ ; a->b;`; }) );
});





describe('machine_version', async it6 => {
  it6('semver 0.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 0.0.0; a->b;`; }) );
  it6('semver 0.0.1', t => t.notThrows(() => { const _f = sm`machine_version: 0.0.1; a->b;`; }) );
  it6('semver 0.1.0', t => t.notThrows(() => { const _f = sm`machine_version: 0.1.0; a->b;`; }) );
  it6('semver 1.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 1.0.0; a->b;`; }) );
  it6('semver 1.0.1', t => t.notThrows(() => { const _f = sm`machine_version: 1.0.1; a->b;`; }) );
  it6('semver 1.1.1', t => t.notThrows(() => { const _f = sm`machine_version: 1.1.1; a->b;`; }) );
  it6('semver 2.0.0', t => t.notThrows(() => { const _f = sm`machine_version: 2.0.0; a->b;`; }) );
});





describe('machine_license', async oit => {

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
});
