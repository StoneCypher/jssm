import { readFileSync } from 'node:fs';
import { StringStream } from '@codemirror/language';
import { fslStreamParser, fsl, fslLanguage, fslHighlightStyle } from '../fsl_language';

/**
 * Classify a source fragment: run the FSL tokenizer over it and return the
 * type of the first non-null token, or `null` if none is produced.
 */
function classify(src: string): string | null {
  const stream = new StringStream(src, 4, 2);
  const state  = fslStreamParser.startState!(2);
  while (!stream.eol()) {
    const before = stream.pos;
    const type   = fslStreamParser.token(stream, state);
    if (stream.pos === before) { stream.next(); }
    if (type) { return type; }
  }
  return null;
}

/**
 * Tokenize a list of consecutive lines with one shared parser state (so
 * block-comment state carries across line boundaries), returning every
 * non-null token type in order.
 */
function tokenizeLines(lines: string[]): string[] {
  const types: string[] = [];
  const state = fslStreamParser.startState!(2);
  for (const line of lines) {
    const stream = new StringStream(line, 4, 2);
    while (!stream.eol()) {
      const before = stream.pos;
      const type   = fslStreamParser.token(stream, state);
      if (stream.pos === before) { stream.next(); }
      if (type) { types.push(type); }
    }
  }
  return types;
}

describe('FSL tokenizer — token classes', () => {

  it('classifies structural keywords', () => {
    expect(classify('state')).toBe('keyword');
    expect(classify('property')).toBe('keyword');
    expect(classify('graph')).toBe('keyword');
  });

  it('classifies config/property keys', () => {
    expect(classify('machine_name')).toBe('propertyName');
    expect(classify('linestyle')).toBe('propertyName');
  });

  it('classifies enumerated literals as atoms', () => {
    expect(classify('dot')).toBe('atom');
    expect(classify('rounded')).toBe('atom');
  });

  it('classifies unknown identifiers as variableName', () => {
    expect(classify('myCustomState')).toBe('variableName');
  });

  it('marks deprecated keys with the custom deprecated token', () => {
    expect(classify('graph_bg_color')).toBe('fslDeprecatedKeyword');
  });

  it('classifies strings and labels', () => {
    expect(classify('"hello"')).toBe('string');
    expect(classify("'go'")).toBe('labelName');
  });

  it('classifies ASCII and unicode arrows as operators', () => {
    expect(classify('->')).toBe('operator');
    expect(classify('<-=>')).toBe('operator');
    expect(classify('↔')).toBe('operator');
  });

  it('classifies comparators as operators', () => {
    expect(classify('>=')).toBe('operator');
  });

  it('classifies numbers', () => {
    expect(classify('42')).toBe('number');
    expect(classify('1.2.3')).toBe('number');
  });

  it('classifies &-prefixed group variables', () => {
    expect(classify('&group')).toBe('variableName.special');
  });

  it('classifies brackets and punctuation', () => {
    expect(classify('{')).toBe('bracket');
    expect(classify(';')).toBe('punctuation');
  });

  it('skips leading whitespace', () => {
    expect(classify('   state')).toBe('keyword');
  });

  it('returns null for an unmatched character', () => {
    expect(classify('`')).toBeNull();
  });

  it('ends an atom at a non-atom character', () => {
    expect(tokenizeLines(['state{'])).toEqual(['keyword', 'bracket']);
  });

  it('handles line comments', () => {
    expect(classify('// a comment')).toBe('comment');
  });

  it('handles a single-line block comment', () => {
    expect(classify('/* inline */')).toBe('comment');
  });

  it('carries block-comment state across lines', () => {
    // Line 1 emits two comment tokens ('/*' open, then the rest-of-line); line 2
    // is one comment; line 3 closes ('closes */') then tokenizes the code after.
    expect(tokenizeLines(['/* opens here', 'still comment', 'closes */ a -> b;']))
      .toEqual(['comment', 'comment', 'comment', 'comment', 'variableName', 'operator', 'variableName', 'punctuation']);
  });

});

describe('FSL language support exports', () => {

  it('fsl() returns a LanguageSupport wrapping the FSL language', () => {
    const support = fsl();
    expect(support.language).toBe(fslLanguage);
  });

  it('ships a highlight style for deprecated syntax', () => {
    expect(fslHighlightStyle).toBeDefined();
  });

});

describe('keyword vocabulary stays in sync with the grammar (drift guard)', () => {

  // Extract every `"<key>" WS? ":"` config key from the live PEG grammar.
  const pegText = readFileSync(new URL('../../fsl_parser.peg', import.meta.url), 'utf8');
  const keyRe = /"([a-z_][a-z0-9_]*)"\s*WS\?\s*":"/g;
  const grammarKeys = new Set<string>();
  for (let m = keyRe.exec(pegText); m !== null; m = keyRe.exec(pegText)) {
    grammarKeys.add(m[1]!);
  }

  it('finds a non-trivial set of grammar config keys', () => {
    expect(grammarKeys.size).toBeGreaterThan(20);
  });

  it('recognizes every grammar config key (none falls through to variableName)', () => {
    const missing: string[] = [];
    for (const key of grammarKeys) {
      const type = classify(key);
      if (type === null || type === 'variableName') {
        missing.push(`${key} -> ${String(type)}`);
      }
    }
    expect(missing, `tokenizer is missing grammar keys:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

});
