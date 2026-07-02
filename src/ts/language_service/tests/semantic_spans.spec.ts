import { describe, it, expect } from 'vitest';
import { fslSemanticSpans } from '../semantic_spans.js';

describe('fslSemanticSpans', () => {
  it('marks a color value span with the resolved hex', () => {
    const doc = 'state s : { color: crimson; };';
    const spans = fslSemanticSpans(doc);
    const color = spans.find(s => s.kind === 'color');
    expect(color).toBeDefined();
    expect(doc.slice(color!.from, color!.to)).toBe('crimson');
    expect(color!.value).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it('marks state names', () => {
    const doc = 'Cart -> Paid;';
    const states = fslSemanticSpans(doc)
      .filter(s => s.kind === 'state')
      .map(s => doc.slice(s.from, s.to));
    expect(states).toEqual(expect.arrayContaining(['Cart', 'Paid']));
  });

  it('carries the resolved name as value for a plain state name', () => {
    const doc = 'Cart -> Paid;';
    const cart = fslSemanticSpans(doc).find(s => s.kind === 'state' && doc.slice(s.from, s.to) === 'Cart');
    expect(cart).toBeDefined();
    expect(cart!.value).toBe('Cart');
  });

  it('carries the unquoted, unescaped name as value for a quoted state name', () => {
    const doc = 'a -> "b c";';
    const quoted = fslSemanticSpans(doc).find(s => s.kind === 'state' && s.value === 'b c');
    expect(quoted).toBeDefined();
    expect(doc.slice(quoted!.from, quoted!.to)).toBe('"b c"');
  });

  it('carries the full digit-leading name as value even though the stream tokenizer would split it', () => {
    const doc = '123abc -> b;';
    const digitLed = fslSemanticSpans(doc).find(s => s.kind === 'state' && doc.slice(s.from, s.to) === '123abc');
    expect(digitLed).toBeDefined();
    expect(digitLed!.value).toBe('123abc');
  });

  it('marks shape enum values', () => {
    const doc = 'state s : { shape: folder; };';
    const en = fslSemanticSpans(doc).find(s => s.kind === 'enum');
    expect(en).toBeDefined();
    expect(doc.slice(en!.from, en!.to)).toBe('folder');
  });

  it('returns [] when the document does not parse', () => {
    expect(fslSemanticSpans('state s : { color:')).toEqual([]);
  });
});
