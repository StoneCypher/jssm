import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

// #754: barewords are Unicode identifiers. Symbol-bearing and leading-digit
// names must be quoted.

const parses  = (src: string) => expect(() => jssm.parse(src)).not.toThrow();
const rejects = (src: string, needle: RegExp) => expect(() => jssm.parse(src)).toThrow(needle);

// #754 review (final wave): a proper regex-escape, not the naive
// backslash-prefix the original needles used (which happened to work only
// because every tested character was already a single-char metacharacter).
// `names_char` asserts the actual claim a trailing-bad-char rejection makes
// — that its message contains a `contains "X"` clause naming the exact
// offending character — rather than a bare escaped-character pattern that
// could coincidentally match elsewhere in the message text (e.g. inside the
// quoted full-name suggestion).
const escape_for_regex = (ch: string): string => ch.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const names_char       = (ch: string): RegExp => new RegExp(`contains "${escape_for_regex(ch)}"`);

describe('bareword charset (#754)', () => {

  describe('accepted barewords', () => {
    it.each([
      'a', 'A', '_', 'a1', 'a_b', 'état', 'состояние', '状態', 'שלום', 'Ⅻ',
      'नमस्ते',   // Devanagari with combining vowel signs (Mc/Mn continuation)
      '𝛼𝛽',      // astral letters (surrogate pairs)
    ])('%s parses as a state name', (name) => {
      parses(`${name} -> other;`);
      const m = jssm.sm`${name} -> other;`;
      expect(m.has_state(name)).toBe(true);
    });
  });

  describe('rejected barewords', () => {
    it.each([
      ['in-progress', '-'],
      ['node.start',  '.'],
      ['a+b',         '+'],
      ['a&b',         '&'],
      ['a#b',         '#'],
      ['a@b',         '@'],
      ['a$b',         '$'],
      ['a^b',         '^'],
      ['a*b',         '*'],
      ['a!b',         '!'],
      ['a?b',         '?'],
      ['a,b',         ','],
    ])('%s is rejected naming %s and suggesting quotes', (name, ch) => {
      rejects(`${name} -> other;`, names_char(ch));
      rejects(`${name} -> other;`, /quote/);
    });

    it.each(['😀', '→', '★', '⌂'])('symbol %s is rejected as a bareword', (name) => {
      rejects(`${name} -> other;`, /quote/);
    });

    it.each(['1st', '2nd', '0', '99bottles'])('leading digit %s is rejected as a bareword', (name) => {
      rejects(`${name} -> other;`, /quote/);
      rejects(`other -> ${name};`, /quote/);
    });
  });

  describe('quoted forms still work', () => {
    it.each(['in-progress', 'node.start', '1st', '😀', 'a b'])('"%s" parses when quoted', (name) => {
      const m = jssm.sm`"${name}" -> other;`;
      expect(m.has_state(name)).toBe(true);
    });
  });

  describe('arrows written without spaces still parse', () => {
    it('a->b is two barewords and an arrow, not a rejected bareword', () => {
      const m = jssm.sm`a->b;`;
      expect(m.has_state('a')).toBe(true);
      expect(m.has_state('b')).toBe(true);
    });
    it('a<->b parses', () => {
      parses('a<->b;');
    });
  });

  describe('enum members follow the bareword classes', () => {
    it('unicode letter members parse', () => {
      parses('val mode : enum(tag, état, 状態) default tag; a -> b;');
    });
    it('multiple members separated by commas all parse', () => {
      parses('val mode : enum(a, b, c) default b; a -> b;');
    });
    it('a symbol-bearing member is rejected', () => {
      rejects('val mode : enum(a.b, c) default c; a -> b;', /quote/);
    });
    it('a symbol-bearing member names the offending character', () => {
      rejects('val mode : enum(a.b, c) default c; a -> b;', names_char('.'));
    });
    it('a digit-leading member is rejected with the jssm#759 wording', () => {
      rejects('val mode : enum(a, 1b) default a; a -> b;', /must not begin with a digit/);
      rejects('val mode : enum(a, 1b) default a; a -> b;', /quote/);
    });
  });

  // #754 review round 1: the "quote it" advice a rejection gives is only
  // true if a quoted name actually parses in that same position. These
  // prove it does, and that the resulting machine sees the quoted name.
  describe('quoted names remain usable where a bareword now fails', () => {
    it('a quoted enum member parses and is visible on the machine', () => {
      const m = jssm.from('val mode : enum("in-progress", c) default "in-progress"; a -> b;');
      expect(m.val('mode')).toBe('in-progress');
    });
    it('a quoted per-state property name parses and is visible on the machine', () => {
      const m = jssm.from('property "a.b"; a -> b; state b: { property: "a.b" 3; };');
      m.go('b');
      expect(m.prop('a.b')).toBe(3);
    });
  });

  // #754 review round 1: 5.x accepted a leading ASCII symbol/punctuation
  // character in a bareword (".foo", "-foo", "?x"); #754's identifier rule
  // rejects it, so the migration message must still fire there rather than
  // falling through to pegjs's generic expectation-list error.
  describe('a bad leading ASCII character is rejected in either position', () => {
    it.each([
      ['.foo', '.'],
      ['-foo', '-'],
      ['?x',   '?'],
    ])('%s is rejected as a source, naming %s and suggesting quotes', (name, ch) => {
      rejects(`${name} -> other;`, names_char(ch));
      rejects(`${name} -> other;`, /quote/);
    });
    it.each([
      ['.foo', '.'],
      ['-foo', '-'],
      ['?x',   '?'],
    ])('%s is rejected as a target, naming %s and suggesting quotes', (name, ch) => {
      rejects(`other -> ${name};`, names_char(ch));
      rejects(`other -> ${name};`, /quote/);
    });
    it('a Cycle target ("-1") still parses, not caught by the new leading-char rule', () => {
      parses('a -> -1;');
    });
    it('a Stripe target ("+|2") still parses, not caught by the new leading-char rule', () => {
      parses('a -> +|2;');
    });
  });

});
