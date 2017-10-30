
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('block strategies', async _it => {

  const AtoB    = [{"key": "transition", "from": {key: "transition", value: "a"}, "se": {"kind": "->","to": "b"}}],
        is_AB   = (str, it) => it(test, t => t.deepEqual(AtoB, jssm.parse(str))),

        ABCD    = [{"key": "transition", "from": {key: "transition", value: "a"}, "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": {key: "transition", value: "c"}, "se": {"kind": "->","to": "d"}}],

        is_ABCD = (str, it) => it(test, t => t.deepEqual(ABCD, jssm.parse(str)));

  describe('empty block comments in left middle', async it => {
    is_AB('a/**/->b;',     it);
    is_AB('a /**/->b;',    it);
    is_AB('a/**/ ->b;',    it);
    is_AB('a /**/ ->b;',   it);
    is_AB('a\n/**/->b;',   it);
    is_AB('a/**/\n->b;',   it);
    is_AB('a\n/**/\n->b;', it);
  });

  describe('empty block comments in right middle', async it => {
    is_AB('a->/**/b;',     it);
    is_AB('a-> /**/b;',    it);
    is_AB('a->/**/ b;',    it);
    is_AB('a-> /**/ b;',   it);
    is_AB('a->\n/**/b;',   it);
    is_AB('a->/**/\nb;',   it);
    is_AB('a->\n/**/\nb;', it);
  });

  describe('non-empty block comments in left middle', async it => {
    is_AB('a/* hello */->b;',     it);
    is_AB('a /* hello */->b;',    it);
    is_AB('a/* hello */ ->b;',    it);
    is_AB('a /* hello */ ->b;',   it);
    is_AB('a\n/* hello */ ->b;',  it);
    is_AB('a/* hello */\n->b;',   it);
    is_AB('a\n/* hello */\n->b;', it);
  });

  describe('empty block comments before', async it => {
    is_AB('/**/a->b;',  it);
    is_AB('/**/ a->b;', it);
  });

  describe('empty block comments inbetween', async it => {
    is_ABCD('a->b;/**/c->d;',   it);
    is_ABCD('a->b; /**/c->d;',  it);
    is_ABCD('a->b;/**/ c->d;',  it);
    is_ABCD('a->b; /**/ c->d;', it);
  });

  describe('empty block comments after / at end', async it => {
    is_AB('a->b;/**/',  it);
    is_AB('a->b; /**/', it);
  });

  describe('block commented code', async it => {
    is_AB('a->b;/* c->d; */',              it);
    is_AB('a->b;\n/*c -> d;*/\n',          it);
    is_ABCD('a->b;/* e->f; */c->d;',       it);
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;',   it);
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;\n', it);
  });

});





describe('line strategies', async _it => {

  const AtoB    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
        is_AB   = (it, str) => it(test, t => t.deepEqual(AtoB, jssm.parse(str))),

        ABCD    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": "c", "se": {"kind": "->","to": "d"}}],

        is_ABCD = (it, str) => it(test, t => t.deepEqual(ABCD, jssm.parse(str)));

  describe('empty line comments at end', async it => {
    is_AB(it, 'a->b;//');
    is_AB(it, 'a->b; //');
    is_AB(it, 'a->b;//\n');
    is_AB(it, 'a->b; //\n');
  });

  describe('non-empty line comments at end', async it => {
    is_AB(it, 'a->b;// hello');
    is_AB(it, 'a->b; // hello');
    is_AB(it, 'a->b;// hello\n');
    is_AB(it, 'a->b; // hello\n');
  });

  describe('empty line comments at beginning', async it => {
    is_AB(it, '//\na->b;');
  });

  describe('non-empty line comments at beginning', async it => {
    is_AB(it, '// hello\na->b;');
  });

  describe('empty line comments inbetween', async it => {
    is_ABCD(it, 'a->b;//\nc->d;');
  });

  describe('non-empty line comments inbetween', async it => {
    is_ABCD(it, 'a->b;// hello\nc->d;');
  });

  describe('line commented code', async it => {
    is_AB(it,   'a->b;// c->d;');
    is_AB(it,   'a->b;\n//c -> d;\n');
    is_ABCD(it, 'a->b;// e->f;\nc->d;');
    is_ABCD(it, 'a->b;\n//e -> f;\nc->d;');
  });

});
