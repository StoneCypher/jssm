/* eslint-disable max-len */

import * as jssm from '../jssm';
import type { FslSourceLocation, JssmStateDeclarationRule } from '../jssm_types';

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

  test('action-label sub-spans pinpoint the labels', () => {
    const src  = "a 'go' -> 'stop' b;";
    const tree = jssm.parse(src, { locations: true });
    // pre-arrow action → r_action; post-arrow action → l_action (existing convention)
    expect(slice(src, tree[0].se!.r_action_loc!)).toBe("'go'");
    expect(slice(src, tree[0].se!.l_action_loc!)).toBe("'stop'");
  });

});

describe('parser source locations — machine-attribute value sub-spans', () => {

  test('machine_name value sub-span', () => {
    const src  = 'machine_name: foo;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].value_loc!)).toBe('foo');
  });

  test('fsl_version value sub-span (SemVer)', () => {
    const src  = 'fsl_version: 1.2.3; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].value_loc!)).toBe('1.2.3');
  });

  test('machine_definition value sub-span (URL)', () => {
    const src  = 'machine_definition: https://example.com/x ; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].value_loc!)).toBe('https://example.com/x');
  });

  test('theme value sub-span (array-valued)', () => {
    const src  = 'theme: ocean; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].value_loc!)).toBe('ocean');
  });

  test('value sub-span absent without locations', () => {
    const tree = jssm.parse('machine_name: foo;');
    expect(tree[0].value_loc).toBeUndefined();
  });

});

describe('parser source locations — color value sub-spans', () => {

  test('state color value sub-span pinpoints the color token', () => {
    const src  = 'state alpha: { color: red; }; alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    const value = tree[0].value;
    const items: JssmStateDeclarationRule[] = Array.isArray(value) ? value : [];
    const colorItem = items.find(i => i.key === 'color');
    expect(colorItem).toBeDefined();
    expect(colorItem!.value_loc).toBeDefined();
    expect(slice(src, colorItem!.value_loc!)).toBe('red');
  });

  test('state color value_loc absent without locations', () => {
    const tree  = jssm.parse('state alpha: { color: red; };');
    const value = tree[0].value;
    const items: JssmStateDeclarationRule[] = Array.isArray(value) ? value : [];
    const colorItem = items.find(i => i.key === 'color');
    expect(colorItem && colorItem.value_loc).toBeUndefined();
  });

});

describe('parser source locations — located output minus loc equals default', () => {

  const stripLoc = (value: unknown): unknown => {
    if (Array.isArray(value)) { return value.map(stripLoc); }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === 'loc' || k.endsWith('_loc')) { continue; }
        out[k] = stripLoc(v);
      }
      return out;
    }
    return value;
  };

  const sources = [
    'a -> b;',
    'machine_name: foo; a -> b;',
    'state alpha: { color: red; }; alpha -> beta;',
    "a 'go' -> 'stop' b;",
    '&group: [a b c]; a -> b; arrange [a b];',
    'graph_layout: dot; a -> b;',
    'allow_islands: true; a -> b;',
    'failed_outputs: [x y]; a -> b;',
    'default_size: 100 200; a -> b;',
    'npm_name: foo; a -> b;'
  ];

  for (const src of sources) {
    test(`stripping loc reproduces default parse: ${src}`, () => {
      const located = jssm.parse(src, { locations: true });
      const plain   = jssm.parse(src);
      expect(stripLoc(located)).toEqual(plain);
    });
  }

});

describe('parser source locations — merged-in machine/config attributes', () => {

  const findKey = (src: string, key: string) => {
    const node = jssm.parse(src, { locations: true }).find(n => n.key === key);
    if (!node) { throw new Error(`no node with key ${key}`); }
    return node;
  };

  test('npm_name carries loc + value_loc', () => {
    const src  = 'npm_name: foo; a -> b;';
    const node = findKey(src, 'npm_name');
    expect(slice(src, node.loc!)).toContain('npm_name: foo;');
    expect(slice(src, node.value_loc!)).toBe('foo');
  });

  test('default_size carries loc + value_loc', () => {
    const src  = 'default_size: 100 200; a -> b;';
    const node = findKey(src, 'default_size');
    expect(node.loc).toBeDefined();
    expect(slice(src, node.value_loc!)).toContain('100');
  });

  test('allow_islands carries loc + value_loc', () => {
    const src  = 'allow_islands: with_start; a -> b;';
    const node = findKey(src, 'allow_islands');
    expect(node.loc).toBeDefined();
    expect(slice(src, node.value_loc!)).toBe('with_start');
  });

  test('failed_outputs carries loc + value_loc', () => {
    const src  = 'failed_outputs: [x y]; a -> b;';
    const node = findKey(src, 'failed_outputs');
    expect(node.loc).toBeDefined();
    expect(slice(src, node.value_loc!)).toContain('x');
  });

  test('new attributes carry no loc without the option', () => {
    const node = jssm.parse('npm_name: foo; a -> b;').find(n => n.key === 'npm_name');
    expect(node && node.loc).toBeUndefined();
  });

});
