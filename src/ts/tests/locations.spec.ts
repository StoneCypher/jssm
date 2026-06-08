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

describe('parser source locations — other top-level nodes', () => {

  test('named_list node carries a loc', () => {
    const src  = '&group: [a b c]; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].key).toBe('named_list');
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('&group:');
  });

  test('arrange declaration node carries a loc', () => {
    const src  = 'a -> b; arrange [a b];';
    const tree = jssm.parse(src, { locations: true });
    const node = tree.find(n => n.key === 'arrange_declaration');
    expect(node).toBeDefined();
    expect(node!.loc).toBeDefined();
    expect(slice(src, node!.loc!)).toContain('arrange [a b];');
  });

});

describe('parser source locations — config blocks', () => {

  test('graph_layout config node carries a loc', () => {
    const src  = 'graph_layout: dot; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('graph_layout: dot;');
  });

});

describe('parser source locations — state declarations', () => {

  test('state_declaration node carries a loc', () => {
    const src  = 'state alpha: { color: red; }; alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].key).toBe('state_declaration');
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('state alpha:');
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

describe('parser source locations — sub-spans', () => {

  test('state name sub-span pinpoints the name', () => {
    const src  = 'state alpha: { color: red; }; alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].name_loc).toBeDefined();
    expect(slice(src, tree[0].name_loc!)).toBe('alpha');
  });

  test('state name sub-span absent without locations', () => {
    const tree = jssm.parse('state alpha: { color: red; };');
    expect(tree[0].name_loc).toBeUndefined();
  });

  test('transition from/to sub-spans pinpoint the states', () => {
    const src  = 'alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].from_loc!)).toBe('alpha');
    expect(slice(src, tree[0].se!.to_loc!)).toBe('beta');
  });

});
