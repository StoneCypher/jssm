// Unit tests for src/buildjs/decl_parity.cjs — the declaration-surface parity
// gate (fsl#1940). Tests cover the pure export-name extractor and the
// name-set differ (no filesystem); the full pair walk is exercised by the
// "declaration parity gate" CI step against the real built declarations.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dp = require('../decl_parity.cjs');

describe('extractExportNames', () => {

  test('reads a flat export list', () => {
    const names = dp.extractExportNames('export { alpha, beta, gamma };');
    expect([... names].sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  test('renames count by their public name', () => {
    const names = dp.extractExportNames('export { wrap_parse as parse, jssm_constants_d as constants };');
    expect(names.has('parse')).toBe(true);
    expect(names.has('constants')).toBe(true);
    expect(names.has('wrap_parse')).toBe(false);
  });

  test('type exports are included', () => {
    const names = dp.extractExportNames('export { a };\nexport type { FenceDescriptor, FenceDimension };');
    expect(names.has('FenceDescriptor')).toBe(true);
    expect(names.has('FenceDimension')).toBe(true);
    expect(names.size).toBe(3);
  });

  test('export declare entity forms are included', () => {
    const src = [
      'export declare function make(x: string): number;',
      'export declare class Machine<T> {}',
      'export declare const build_time: number;',
      'export interface Widget {}',
      'export declare abstract class Base {}',
    ].join('\n');
    const names = dp.extractExportNames(src);
    for (const n of ['make', 'Machine', 'build_time', 'Widget', 'Base']) {
      expect(names.has(n)).toBe(true);
    }
  });

  test('export statements inside doc comments are ignored', () => {
    const src = '/**\n * @example\n * export { phantom };\n */\nexport { real };';
    const names = dp.extractExportNames(src);
    expect(names.has('real')).toBe(true);
    expect(names.has('phantom')).toBe(false);
  });

  test('default, export=, and re-export stars are flagged as names', () => {
    expect(dp.extractExportNames('export default function () {}').has('default')).toBe(true);
    expect(dp.extractExportNames('export = thing;').has('export=')).toBe(true);
    expect(dp.extractExportNames("export * from './other';").has('*')).toBe(true);
  });

  test('multiline export lists parse', () => {
    const names = dp.extractExportNames('export {\n  one,\n  two as deux,\n};');
    expect([... names].sort()).toEqual(['deux', 'one']);
  });

});

describe('diffNameSets', () => {

  test('identical sets are parity', () => {
    const d = dp.diffNameSets(new Set(['a', 'b']), new Set(['b', 'a']), []);
    expect(d).toEqual({ only_cjs: [], only_esm: [] });
  });

  test('the fsl#1940 defect class is caught, sorted, both directions', () => {
    const cjs = new Set(['sm', 'from']);
    const esm = new Set(['sm', 'from', 'parse_fence_info', 'fsl_fence_lang']);
    const d = dp.diffNameSets(cjs, esm, []);
    expect(d.only_esm).toEqual(['fsl_fence_lang', 'parse_fence_info']);
    expect(d.only_cjs).toEqual([]);
    const rev = dp.diffNameSets(esm, cjs, []);
    expect(rev.only_cjs).toEqual(['fsl_fence_lang', 'parse_fence_info']);
  });

  test('allowlisted names are ignored in both directions', () => {
    const d = dp.diffNameSets(new Set(['a', 'cjs_only']), new Set(['a', 'esm_only']), ['cjs_only', 'esm_only']);
    expect(d).toEqual({ only_cjs: [], only_esm: [] });
  });

});

describe('gate wiring constants', () => {

  test('all three published declaration twins are gated', () => {
    const labels = dp.PAIRS.map((p: [string, string, string]) => p[0]).sort();
    expect(labels).toEqual(['jssm', 'jssm_cli', 'jssm_viz']);
  });

  test('the allowlist ships empty', () => {
    expect(Object.keys(dp.ALLOWLIST)).toEqual([]);
  });

});
