import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

// #754: barewords are Unicode identifiers. Symbol-bearing and leading-digit
// names must be quoted.

const parses  = (src: string) => expect(() => jssm.parse(src)).not.toThrow();
const rejects = (src: string, needle: RegExp) => expect(() => jssm.parse(src)).toThrow(needle);

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
      rejects(`${name} -> other;`, new RegExp(`\\${ch}`));
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
    it('a symbol-bearing member is rejected', () => {
      rejects('val mode : enum(a.b, c) default c; a -> b;', /quote/);
    });
  });

});
