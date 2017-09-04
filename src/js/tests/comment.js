
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('block strategies', async it => {

  const AtoB    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
        is_AB   = str => it(test, t => t.deepEqual(AtoB, jssm.parse(str))),

        ABCD    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": "c", "se": {"kind": "->","to": "d"}}],

        is_ABCD = str => it(test, t => t.deepEqual(ABCD, jssm.parse(str)));

  describe('empty block comments in left middle', async _it => {
    is_AB('a/**/->b;');
    is_AB('a /**/->b;');
    is_AB('a/**/ ->b;');
    is_AB('a /**/ ->b;');
    is_AB('a\n/**/->b;');
    is_AB('a/**/\n->b;');
    is_AB('a\n/**/\n->b;');
  });

  describe('empty block comments in right middle', async _it => {
    is_AB('a->/**/b;');
    is_AB('a-> /**/b;');
    is_AB('a->/**/ b;');
    is_AB('a-> /**/ b;');
    is_AB('a->\n/**/b;');
    is_AB('a->/**/\nb;');
    is_AB('a->\n/**/\nb;');
  });

  describe('non-empty block comments in left middle', async _it => {
    is_AB('a/* hello */->b;');
    is_AB('a /* hello */->b;');
    is_AB('a/* hello */ ->b;');
    is_AB('a /* hello */ ->b;');
    is_AB('a\n/* hello */ ->b;');
    is_AB('a/* hello */\n->b;');
    is_AB('a\n/* hello */\n->b;');
  });

  describe('empty block comments before', async _it => {
    is_AB('/**/a->b;');
    is_AB('/**/ a->b;');
  });

  describe('empty block comments inbetween', async _it => {
    is_ABCD('a->b;/**/c->d;');
    is_ABCD('a->b; /**/c->d;');
    is_ABCD('a->b;/**/ c->d;');
    is_ABCD('a->b; /**/ c->d;');
  });

  describe('empty block comments after / at end', async _it => {
    is_AB('a->b;/**/');
    is_AB('a->b; /**/');
  });

  describe('block commented code', async _it => {
    is_AB('a->b;/* c->d; */');
    is_AB('a->b;\n/*c -> d;*/\n');
    is_ABCD('a->b;/* e->f; */c->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;\n');
  });

});





describe('line strategies', async it => {

  const AtoB    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],
        is_AB   = str => it(test, t => t.deepEqual(AtoB, jssm.parse(str))),

        ABCD    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": "c", "se": {"kind": "->","to": "d"}}],

        is_ABCD = str => it(test, t => t.deepEqual(ABCD, jssm.parse(str)));

  describe('empty line comments at end', async _it => {
    is_AB('a->b;//');
    is_AB('a->b; //');
    is_AB('a->b;//\n');
    is_AB('a->b; //\n');
  });

  describe('non-empty line comments at end', async _it => {
    is_AB('a->b;// hello');
    is_AB('a->b; // hello');
    is_AB('a->b;// hello\n');
    is_AB('a->b; // hello\n');
  });

  describe('empty line comments at beginning', async _it => {
    is_AB('//\na->b;');
  });

  describe('non-empty line comments at beginning', async _it => {
    is_AB('// hello\na->b;');
  });

  describe('empty line comments inbetween', async _it => {
    is_ABCD('a->b;//\nc->d;');
  });

  describe('non-empty line comments inbetween', async _it => {
    is_ABCD('a->b;// hello\nc->d;');
  });

  describe('line commented code', async _it => {
    is_AB('a->b;// c->d;');
    is_AB('a->b;\n//c -> d;\n');
    is_ABCD('a->b;// e->f;\nc->d;');
    is_ABCD('a->b;\n//e -> f;\nc->d;');
  });

});
