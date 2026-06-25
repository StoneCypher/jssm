import { describe, it, expect } from 'vitest';
import { fslCompletions } from '../completions.js';

const labels = (items: { label: string }[]) => items.map(i => i.label);

describe('fslCompletions', () => {
  it('offers shape values after `shape:`', () => {
    const doc = 'state x : { shape: ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('folder');
    expect(out.every(i => i.kind === 'value-shape')).toBe(true);
  });

  it('offers SVG color names after a color key', () => {
    const doc = 'state x : { color: ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('Crimson');
    expect(out[0].kind).toBe('value-color');
  });

  it('offers a small enum after `flow:`', () => {
    const doc = 'flow: ';
    expect(labels(fslCompletions(doc, doc.length))).toEqual(
      expect.arrayContaining(['up', 'right', 'down', 'left']));
  });

  it('offers top-level keys at the start of a line', () => {
    const doc = 'mac';
    expect(labels(fslCompletions(doc, doc.length))).toContain('machine_name');
  });

  it('offers in-block style keys inside a brace block', () => {
    const doc = 'state x {\n  ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('color');
    expect(out.every(i => i.kind === 'key')).toBe(true);
  });

  it('returns nothing for a key with no enumerable value', () => {
    const doc = 'machine_name: ';
    expect(fslCompletions(doc, doc.length)).toEqual([]);
  });
});
