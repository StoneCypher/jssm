
/**
 *  Regression tests for grammar bugs surfaced by the cataloguing pass
 *  in `notes/fsl-grammar-reference.md`.  Each describe block locks in
 *  the fix for one specific bug so it can't silently come back.
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as jssm from '../jssm';





const peg_source = (): string =>
  fs.readFileSync(path.join(__dirname, '..', 'fsl_parser.peg'), 'utf8');





describe('grammar regression / bug 1 — OctalDigit accepts [0-7]', () => {

  test('0o0 parses to 0', () => {
    const ast = jssm.parse('property foo default 0o0; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(0);
  });

  test('0o7 parses to 7', () => {
    const ast = jssm.parse('property foo default 0o7; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(7);
  });

  test('0o17 parses to 15 (decimal)', () => {
    const ast = jssm.parse('property foo default 0o17; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(15);
  });

  test('0o27 parses to 23 (decimal) — the canonical regression case', () => {
    const ast = jssm.parse('property foo default 0o27; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(23);
  });

  test('0o77 parses to 63 (decimal)', () => {
    const ast = jssm.parse('property foo default 0o77; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(63);
  });

  test('0o8 still rejected (8 is not a valid octal digit)', () => {
    expect(() => jssm.parse('property foo default 0o8; a -> b;')).toThrow();
  });

  test('0o9 still rejected (9 is not a valid octal digit)', () => {
    expect(() => jssm.parse('property foo default 0o9; a -> b;')).toThrow();
  });

  test('uppercase 0O27 still parses (prefix is case-insensitive)', () => {
    const ast = jssm.parse('property foo default 0O27; a -> b;') as any[];
    const prop = ast.find(n => n.key === 'property_definition');
    expect(prop.default_value).toBe(23);
  });

});





describe('grammar regression / bug 2 — machine_reference is wired', () => {

  test('parses without throwing (single label)', () => {
    expect(() => jssm.parse('machine_reference: foo; a->b;')).not.toThrow();
  });

  test('produces correct AST node (single label)', () => {
    const ast = jssm.parse('machine_reference: foo; a->b;') as any[];
    expect(ast).toContainEqual({ key: 'machine_reference', value: 'foo' });
  });

  test('label-list form parses', () => {
    expect(() => jssm.parse('machine_reference: [a b c]; a->b;')).not.toThrow();
  });

  test('label-list AST has array value', () => {
    const ast = jssm.parse('machine_reference: [a b c]; a->b;') as any[];
    const node = ast.find(n => n.key === 'machine_reference');
    expect(node).toBeDefined();
    expect(node.value).toEqual(['a', 'b', 'c']);
  });

  test('quoted-string label parses', () => {
    expect(() => jssm.parse('machine_reference: "foo bar"; a->b;')).not.toThrow();
  });

  test('full machine creation succeeds (runtime was already wired)', () => {
    expect(() => jssm.from('machine_reference: foo; a->b;')).not.toThrow();
  });

});





describe('grammar regression / bug 3 — dead Whitespace rule removed', () => {

  test('the orphan `Whitespace` rule no longer appears in the grammar source', () => {
    const peg = peg_source();
    // Match a top-level rule definition: `Whitespace` at column 0 followed
    // by an `=` on a continuation line.  Avoids matching the live `WS`
    // rule or any incidental occurrence of the word "whitespace".
    expect(peg).not.toMatch(/^Whitespace\s*\n\s*=/m);
  });

  test('the live WS rule is still present (sanity check)', () => {
    expect(peg_source()).toMatch(/^WS\b/m);
  });

});





describe('grammar regression / bug 4 — SdStateLabel display name corrected', () => {

  test('SdStateLabel rule advertises "label" in error messages', () => {
    expect(peg_source()).toMatch(/^SdStateLabel\s+"label"/m);
  });

  test('SdStateLabel does NOT mistakenly advertise "color"', () => {
    expect(peg_source()).not.toMatch(/^SdStateLabel\s+"color"/m);
  });

  test('SdStateColor still legitimately advertises "color" (sanity check)', () => {
    expect(peg_source()).toMatch(/^SdStateColor\s+"color"/m);
  });

});
