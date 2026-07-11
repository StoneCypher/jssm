 

import { nth_matching_loc } from '../jssm_compiler';

const L = (o: number) => ({ start: { offset: o, line: 1, column: o + 1 }, end: { offset: o + 1, line: 1, column: o + 2 } });

describe('nth_matching_loc', () => {

  const tree = [
    { key: 'fsl_version', value: '1', loc: L(0) },
    { key: 'machine_name', value: 'a', loc: L(1) },
    { key: 'fsl_version', value: '2', loc: L(2) },
  ] as any;

  test('returns the nth match loc', () => {
    expect(nth_matching_loc(tree, n => n.key === 'fsl_version', 2)).toEqual(L(2));
  });

  test('returns the first match loc for n=1', () => {
    expect(nth_matching_loc(tree, n => n.key === 'machine_name', 1)).toEqual(L(1));
  });

  test('returns undefined when fewer than n matches', () => {
    expect(nth_matching_loc(tree, n => n.key === 'machine_name', 2)).toBeUndefined();
  });

  test('returns undefined (not throw) when matched node has no loc', () => {
    const noLoc = [{ key: 'fsl_version', value: '1' }] as any;
    expect(nth_matching_loc(noLoc, n => n.key === 'fsl_version', 1)).toBeUndefined();
  });

});
