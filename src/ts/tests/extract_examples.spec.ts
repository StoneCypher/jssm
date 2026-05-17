import { describe, it, expect } from 'vitest';
const { extractExamples } = require('../../buildjs/extract_examples.cjs');

describe('extractExamples', () => {

  it('extracts an example from a function docblock', () => {
    const src = [
      '/**',
      ' * Adds two numbers.',
      ' * @example',
      ' * add(2, 3);  // => 5',
      ' */',
      'export function add(a: number, b: number) { return a + b; }'
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');

    expect(got).toHaveLength(1);
    expect(got[0].symbol).toBe('add');
    expect(got[0].body).toBe('add(2, 3);  // => 5');
  });

  it('extracts the example from a const docblock and reports its 1-based line', () => {
    const src = [
      '/**',                       // line 1
      ' * A constant.',            // line 2
      ' * @example',               // line 3
      ' * FOO;  // => 7',          // line 4
      ' */',                       // line 5
      'export const FOO = 7;'      // line 6
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');

    expect(got).toHaveLength(1);
    expect(got[0].symbol).toBe('FOO');
    expect(got[0].line).toBe(3);
  });

  it('extracts multiple @example tags from one docblock', () => {
    const src = [
      '/**',
      ' * @example',
      ' * f(1);  // => 1',
      ' * @example',
      ' * f(2);  // => 2',
      ' */',
      'export function f(n: number) { return n; }'
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');
    expect(got).toHaveLength(2);
    expect(got[0].body).toBe('f(1);  // => 1');
    expect(got[1].body).toBe('f(2);  // => 2');
  });

  it('returns an empty array when there are no examples', () => {
    expect(extractExamples('export const X = 1;', 'demo.ts')).toEqual([]);
  });

});

const { rewriteImportSpecifier } = require('../../buildjs/extract_examples.cjs');

describe('rewriteImportSpecifier', () => {

  it('maps bare "jssm" to the relative source module', () => {
    expect(rewriteImportSpecifier('jssm', 'jssm.ts')).toBe('../../jssm');
  });

  it('maps "jssm/viz" to the viz source module', () => {
    expect(rewriteImportSpecifier('jssm/viz', 'jssm.ts')).toBe('../../jssm_viz');
  });

  it('resolves a relative specifier against the defining module', () => {
    expect(rewriteImportSpecifier('./jssm_constants', 'jssm_constants.ts'))
      .toBe('../../jssm_constants');
  });

  it('leaves an unrelated third-party specifier untouched', () => {
    expect(rewriteImportSpecifier('vitest', 'jssm.ts')).toBe('vitest');
  });

});

const { rewriteOutputComments } = require('../../buildjs/extract_examples.cjs');

describe('rewriteOutputComments', () => {

  it('converts an EXPR; // => VALUE line into an assertion', () => {
    expect(rewriteOutputComments("m.state();  // => 'a'"))
      .toBe("expect(m.state()).toStrictEqual('a');");
  });

  it('tolerates a missing trailing semicolon', () => {
    expect(rewriteOutputComments('add(2, 3)  // => 5'))
      .toBe('expect(add(2, 3)).toStrictEqual(5);');
  });

  it('leaves a setup line without a marker unchanged', () => {
    expect(rewriteOutputComments('const m = sm`a -> b;`;'))
      .toBe('const m = sm`a -> b;`;');
  });

});
