/* eslint-disable max-len */

import * as jssm from '../jssm';
import type { FslSourceLocation } from '../jssm_types';

const slice = (src: string, loc: FslSourceLocation) =>
  src.slice(loc.start.offset, loc.end.offset);

describe('parser source locations — opt-in contract', () => {

  test('default parse attaches no loc', () => {
    const tree = jssm.parse('a -> b;');
    expect(tree[0].loc).toBeUndefined();
  });

  test('empty options attaches no loc', () => {
    const tree = jssm.parse('a -> b;', {});
    expect(tree[0].loc).toBeUndefined();
  });

  test('existing equality output is unchanged under default parse', () => {
    expect(jssm.parse('a -> b;')).toEqual(
      [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }]
    );
  });

});

describe('parser source locations — transitions', () => {

  test('transition node carries a loc starting at the source', () => {
    const src  = 'a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(tree[0].loc!.start.offset).toBe(0);
    expect(slice(src, tree[0].loc!)).toContain('a -> b');
  });

});

describe('parser source locations — machine attributes', () => {

  test('machine_name node carries a loc spanning the statement', () => {
    const src  = 'machine_name: foo;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('machine_name: foo;');
  });

  test('fsl_version node carries a loc', () => {
    const src  = 'fsl_version: 1.2.3; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('fsl_version: 1.2.3;');
  });

});
