import { jsStringLiteralBody, toSymbol } from '../../cli/subcommands/codegen/emit-utils';

describe('jsStringLiteralBody', () => {

  it('escapes backslashes and single quotes', () => {
    expect(jsStringLiteralBody("it's a \\ thing")).toBe("it\\'s a \\\\ thing");
  });

  it('escapes newline, carriage return, and tab', () => {
    expect(jsStringLiteralBody('a\nb\rc\td')).toBe('a\\nb\\rc\\td');
  });

  it('escapes form feed, vertical tab, backspace, and NUL', () => {
    expect(jsStringLiteralBody('a\fb\vc\bd\0e')).toBe('a\\fb\\vc\\bd\\x00e');
  });

  it('leaves ordinary text untouched', () => {
    expect(jsStringLiteralBody('Green')).toBe('Green');
  });

  it('escapes a backslash before a quote so the two do not merge', () => {
    // A trailing backslash must be doubled before the closing quote is added,
    // otherwise the emitted literal would escape its own delimiter.
    expect(jsStringLiteralBody("end\\")).toBe("end\\\\");
  });

});

describe('toSymbol', () => {

  it('PascalCases a hyphenated label', () => {
    expect(toSymbol('traffic-light', 'Machine')).toBe('TrafficLight');
  });

  it('splits on spaces and other punctuation', () => {
    expect(toSymbol('two words.here', 'Machine')).toBe('TwoWordsHere');
  });

  it('prefixes a leading-digit result with M', () => {
    expect(toSymbol('2fa flow', 'Machine')).toBe('M2faFlow');
  });

  it('falls back when the label yields no word characters', () => {
    expect(toSymbol('!!!', 'Machine')).toBe('Machine');
  });

  it('falls back on an empty label', () => {
    expect(toSymbol('', 'Fallback')).toBe('Fallback');
  });

});
