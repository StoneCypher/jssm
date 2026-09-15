
import * as jssm from '../jssm';
const sm = jssm.sm;





type Range = { from: string, to: string };

const inRanges = (ranges: ReadonlyArray<Range>, ch: string): boolean =>
  ranges.some(r => ch >= r.from && ch <= r.to);





describe('state_name_chars exposure', () => {

  test('exports an array of ranges', () =>
    expect(Array.isArray(jssm.state_name_chars)).toBe(true) );

  test('includes "a"', () =>
    expect(inRanges(jssm.state_name_chars, 'a')).toBe(true) );

  test('includes "z"', () =>
    expect(inRanges(jssm.state_name_chars, 'z')).toBe(true) );

  test('includes "A"', () =>
    expect(inRanges(jssm.state_name_chars, 'A')).toBe(true) );

  test('includes "Z"', () =>
    expect(inRanges(jssm.state_name_chars, 'Z')).toBe(true) );

  test('includes "0"', () =>
    expect(inRanges(jssm.state_name_chars, '0')).toBe(true) );

  test('includes "9"', () =>
    expect(inRanges(jssm.state_name_chars, '9')).toBe(true) );

  test('no longer includes "+" (#754)', () =>
    expect(inRanges(jssm.state_name_chars, '+')).toBe(false) );

  test('includes "_"', () =>
    expect(inRanges(jssm.state_name_chars, '_')).toBe(true) );

});





describe('state_name_first_chars exposure', () => {

  test('exports an array of ranges', () =>
    expect(Array.isArray(jssm.state_name_first_chars)).toBe(true) );

  test('includes "a"', () =>
    expect(inRanges(jssm.state_name_first_chars, 'a')).toBe(true) );

  test('includes "Z"', () =>
    expect(inRanges(jssm.state_name_first_chars, 'Z')).toBe(true) );

  test('excludes "0" (#754: no leading digit)', () =>
    expect(inRanges(jssm.state_name_first_chars, '0')).toBe(false) );

  test('excludes "+"', () =>
    expect(inRanges(jssm.state_name_first_chars, '+')).toBe(false) );

  test('excludes "("', () =>
    expect(inRanges(jssm.state_name_first_chars, '(')).toBe(false) );

});





describe('action_label_chars exposure', () => {

  test('exports an array of ranges', () =>
    expect(Array.isArray(jssm.action_label_chars)).toBe(true) );

  test('includes space', () =>
    expect(inRanges(jssm.action_label_chars, ' ')).toBe(true) );

  test('includes "a"', () =>
    expect(inRanges(jssm.action_label_chars, 'a')).toBe(true) );

  test('includes "&"', () =>
    expect(inRanges(jssm.action_label_chars, '&')).toBe(true) );

  test('includes "("', () =>
    expect(inRanges(jssm.action_label_chars, '(')).toBe(true) );

  test('excludes single-quote', () =>
    expect(inRanges(jssm.action_label_chars, "'")).toBe(false) );

});





describe('Machine all_* characterset methods', () => {

  const machine = sm`a -> b;`;

  test('all_state_name_chars returns the exported constant', () =>
    expect(machine.all_state_name_chars()).toBe(jssm.state_name_chars) );

  test('all_state_name_first_chars returns the exported constant', () =>
    expect(machine.all_state_name_first_chars()).toBe(jssm.state_name_first_chars) );

  test('all_action_label_chars returns the exported constant', () =>
    expect(machine.all_action_label_chars()).toBe(jssm.action_label_chars) );

  test('all_state_name_chars no longer contains "+"', () =>
    expect(inRanges(machine.all_state_name_chars(), '+')).toBe(false) );

  test('all_state_name_chars contains "_" and digits', () => {
    expect(inRanges(machine.all_state_name_chars(), '_')).toBe(true);
    expect(inRanges(machine.all_state_name_chars(), '7')).toBe(true);
  });

  test('all_state_name_first_chars excludes digits', () =>
    expect(inRanges(machine.all_state_name_first_chars(), '7')).toBe(false) );

  test('all_action_label_chars contains space', () =>
    expect(inRanges(machine.all_action_label_chars(), ' ')).toBe(true) );

  test('all_action_label_chars excludes single-quote', () =>
    expect(inRanges(machine.all_action_label_chars(), "'")).toBe(false) );

});





describe('bareword predicates (#754)', () => {

  test('is_state_name_first_char accepts letters in any script and underscore', () => {
    for (const ch of ['a', 'Z', '_', 'é', 'ж', '字', '𝛼', 'Ⅻ']) {
      expect(jssm.is_state_name_first_char(ch)).toBe(true);
    }
  });

  test('is_state_name_first_char rejects digits, symbols, and marks', () => {
    for (const ch of ['0', '9', '.', '-', '+', '😀', '→', '́']) {
      expect(jssm.is_state_name_first_char(ch)).toBe(false);
    }
  });

  test('is_state_name_char additionally accepts digits, marks, and connector punctuation', () => {
    for (const ch of ['0', '9', '́', 'ा', '‿', '_', 'a', '字']) {
      expect(jssm.is_state_name_char(ch)).toBe(true);
    }
  });

  test('is_state_name_char rejects symbols and punctuation', () => {
    for (const ch of ['.', '-', '+', ',', '😀', '→', '(', ')']) {
      expect(jssm.is_state_name_char(ch)).toBe(false);
    }
  });

  test('predicates reject anything that is not exactly one code point', () => {
    expect(jssm.is_state_name_char('')).toBe(false);
    expect(jssm.is_state_name_char('ab')).toBe(false);
    expect(jssm.is_state_name_first_char('')).toBe(false);
  });

});
