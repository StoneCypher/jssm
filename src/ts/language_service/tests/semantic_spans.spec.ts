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
