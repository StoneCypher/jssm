
 

import * as jssm from '../jssm';





describe('block strategies', () => {

  const AtoB    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],

        is_AB   = str =>
                    // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                    test(str, () => expect(jssm.parse(str)).toEqual(AtoB) ),

        ABCD    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": "c", "se": {"kind": "->","to": "d"}}],

        is_ABCD = str =>
                    // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                    test(str, () => expect(jssm.parse(str)).toEqual(ABCD) );

  describe('empty block comments in left middle', () => {
    is_AB('a/**/->b;');
    is_AB('a /**/->b;');
    is_AB('a/**/ ->b;');
    is_AB('a /**/ ->b;');
    is_AB('a\n/**/->b;');
    is_AB('a/**/\n->b;');
    is_AB('a\n/**/\n->b;');
  });

  describe('empty block comments in right middle', () => {
    is_AB('a->/**/b;');
    is_AB('a-> /**/b;');
    is_AB('a->/**/ b;');
    is_AB('a-> /**/ b;');
    is_AB('a->\n/**/b;');
    is_AB('a->/**/\nb;');
    is_AB('a->\n/**/\nb;');
  });

  describe('non-empty block comments in left middle', () => {
    is_AB('a/* hello */->b;');
    is_AB('a /* hello */->b;');
    is_AB('a/* hello */ ->b;');
    is_AB('a /* hello */ ->b;');
    is_AB('a\n/* hello */ ->b;');
    is_AB('a/* hello */\n->b;');
    is_AB('a\n/* hello */\n->b;');
  });

  describe('empty block comments before', () => {
    is_AB('/**/a->b;');
    is_AB('/**/ a->b;');
  });

  describe('empty block comments inbetween', () => {
    is_ABCD('a->b;/**/c->d;');
    is_ABCD('a->b; /**/c->d;');
    is_ABCD('a->b;/**/ c->d;');
    is_ABCD('a->b; /**/ c->d;');
  });

  describe('empty block comments after / at end', () => {
    is_AB('a->b;/**/');
    is_AB('a->b; /**/');
  });

  describe('block commented code', () => {
    is_AB('a->b;/* c->d; */');
    is_AB('a->b;\n/*c -> d;*/\n');
    is_ABCD('a->b;/* e->f; */c->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;');
    is_ABCD('a->b;\n/*e -> f;*/\nc->d;\n');
  });

});





describe('line strategies', () => {

  const AtoB    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}],

        is_AB   = str =>
                    // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                    test(str, () => expect(jssm.parse(str)).toEqual(AtoB) ),

        ABCD    = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}},
                   {"key": "transition", "from": "c", "se": {"kind": "->","to": "d"}}],

        is_ABCD = str =>
                    // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                    test(str, () => expect(jssm.parse(str)).toEqual(ABCD) );

  describe('empty line comments at end', () => {
    is_AB('a->b;//');
    is_AB('a->b; //');
    is_AB('a->b;//\n');
    is_AB('a->b; //\n');
  });

  describe('non-empty line comments at end', () => {
    is_AB('a->b;// hello');
    is_AB('a->b; // hello');
    is_AB('a->b;// hello\n');
    is_AB('a->b; // hello\n');
  });

  describe('empty line comments at beginning', () => {
    is_AB('//\na->b;');
  });

  describe('non-empty line comments at beginning', () => {
    is_AB('// hello\na->b;');
  });

  describe('empty line comments inbetween', () => {
    is_ABCD('a->b;//\nc->d;');
  });

  describe('non-empty line comments inbetween', () => {
    is_ABCD('a->b;// hello\nc->d;');
  });

  describe('line commented code', () => {
    is_AB(  'a->b;// c->d;');
    is_AB(  'a->b;\n//c -> d;\n');
    is_ABCD('a->b;// e->f;\nc->d;');
    is_ABCD('a->b;\n//e -> f;\nc->d;');
  });

});





// Equivalence guards for the WS / comment grammar de-recursion (#676).  These
// lock the behaviors the rewrite must preserve; they pass identically on the
// old (recursive) and new (iterative) comment rules.
describe('comment equivalence guards (#676)', () => {

  const AtoB  = [{"key": "transition", "from": "a", "se": {"kind": "->","to": "b"}}];
  const is_AB = (str: string) =>
                  // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
                  test(JSON.stringify(str), () => expect(jssm.parse(str)).toEqual(AtoB));

  describe('block comment body spanning newlines', () => {
    is_AB('a->b;/* multi\nline\nbody */');
    is_AB('a->b;\n/* multi\nline */\n');
  });

  describe('unterminated block comment throws', () => {
    test('no closer at all', () => expect(() => jssm.parse('a->b;/* nope')).toThrow());
    test('trailing star, no slash', () => expect(() => jssm.parse('a->b;/* nope *')).toThrow());
  });

  describe('vertical tab stays inside a line comment (not a terminator)', () => {
    is_AB('a->b;// a\vb\n');
    is_AB('a->b;// a\vb');
  });

  describe('u2028 / u2029 terminate a line comment', () => {
    const U2028 = String.fromCharCode(0x20_28);
    const U2029 = String.fromCharCode(0x20_29);
    is_AB('// hello' + U2028 + 'a->b;');
    is_AB('// hello' + U2029 + 'a->b;');
  });

});
