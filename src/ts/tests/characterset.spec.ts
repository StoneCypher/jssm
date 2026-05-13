
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

  test('includes "+"', () =>
    expect(inRanges(jssm.state_name_chars, '+')).toBe(true) );

});





describe('state_name_first_chars exposure', () => {

  test('exports an array of ranges', () =>
    expect(Array.isArray(jssm.state_name_first_chars)).toBe(true) );

  test('includes "a"', () =>
    expect(inRanges(jssm.state_name_first_chars, 'a')).toBe(true) );

  test('includes "Z"', () =>
    expect(inRanges(jssm.state_name_first_chars, 'Z')).toBe(true) );

  test('includes "0"', () =>
    expect(inRanges(jssm.state_name_first_chars, '0')).toBe(true) );

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

  test('all_state_name_chars contains "+"', () =>
    expect(inRanges(machine.all_state_name_chars(), '+')).toBe(true) );

  test('all_state_name_first_chars excludes "+"', () =>
    expect(inRanges(machine.all_state_name_first_chars(), '+')).toBe(false) );

  test('all_action_label_chars contains space', () =>
    expect(inRanges(machine.all_action_label_chars(), ' ')).toBe(true) );

  test('all_action_label_chars excludes single-quote', () =>
    expect(inRanges(machine.all_action_label_chars(), "'")).toBe(false) );

});
