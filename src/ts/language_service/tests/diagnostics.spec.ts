import { describe, it, expect } from 'vitest';
import { fslDiagnostics } from '../diagnostics.js';

describe('fslDiagnostics', () => {
  it('returns no diagnostics for a machine that parses and compiles', () => {
    expect(fslDiagnostics('a -> b;')).toEqual([]);
  });

  it('reports a parse error with a located range', () => {
    const out = fslDiagnostics('a -> ;');           // missing target
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].range.to).toBeGreaterThan(out[0].range.from);
    expect(typeof out[0].message).toBe('string');
  });

  it('reports a compile error (e.g. unknown machine rule) with a range', () => {
    const out = fslDiagnostics('a -> b;\nhooks: closed;');  // parses, fails compile
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].range.from).toBeGreaterThanOrEqual(0);
  });

  it('returns an array (never throws) for empty input', () => {
    expect(Array.isArray(fslDiagnostics(''))).toBe(true);
  });

  it('reports a construction-time error (required property missing on a state)', () => {
    // Parses AND compiles, but the Machine constructor rejects it: `color` is
    // required yet `Off` never defines it. The editor must surface this, not
    // call the machine valid.
    const fsl = [
      'property color required;',
      "Off 'Enable' -> Red;",
      'state Red : { property: color "red"; };',
    ].join('\n');
    const out = fslDiagnostics(fsl);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].message).toMatch(/required property/i);
    expect(out[0].range.to).toBeGreaterThan(out[0].range.from);
  });

  it('returns no diagnostics when every required property is satisfied', () => {
    const fsl = [
      'property color required;',
      "Off 'Enable' -> Red;",
      'state Off : { property: color "off"; };',
      'state Red : { property: color "red"; };',
    ].join('\n');
    expect(fslDiagnostics(fsl)).toEqual([]);
  });
});
