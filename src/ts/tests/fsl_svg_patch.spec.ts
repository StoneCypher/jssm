import { describe, it, expect } from 'vitest';
import { fsl_to_svg_string } from '../jssm_viz.js';
import { extract_state_fills, patch_state_fill } from '../fsl_svg_patch.js';

describe('extract_state_fills / patch_state_fill', () => {

  it('finds every state of a real render, each with a fill', async () => {
    const svg = await fsl_to_svg_string('A -> B; B -> C;');
    const fills = extract_state_fills(svg);
    expect([...fills.keys()].sort()).toEqual(['A', 'B', 'C']);
    for (const fill of fills.values()) { expect(fill).toMatch(/^(#|none|rgb|url|[a-z])/); }
  });

  it('patches exactly one state, visible on re-extract, leaving others alone', async () => {
    const svg     = await fsl_to_svg_string('A -> B;');
    const before  = extract_state_fills(svg);
    const patched = patch_state_fill(svg, 'B', '#ff9930');
    const after   = extract_state_fills(patched);
    expect(after.get('B')).toBe('#ff9930');
    expect(after.get('A')).toBe(before.get('A'));

    // Regression: SHAPE_FILL_RE must not widen to match text-element fills.
    // Extract the text element's fill from both to verify it remains unchanged.
    const textFillRe = /<text[^>]*\bfill="([^"]*)"/;
    const beforeFill = textFillRe.exec(svg)?.[1];
    const afterFill = textFillRe.exec(patched)?.[1];
    expect(afterFill).toBe(beforeFill);
  });

  it('handles state names needing XML escaping', async () => {
    const svg = await fsl_to_svg_string('"a<b" -> C;');
    const fills = extract_state_fills(svg);
    expect(fills.has('a<b')).toBe(true);
    const patched = patch_state_fill(svg, 'a<b', '#123456');
    expect(extract_state_fills(patched).get('a<b')).toBe('#123456');
  });

  it('unescapes ampersand and other XML entities in state names', async () => {
    // Attempt real render with ampersand-bearing name (try order: double-quoted, single-quoted, plain).
    // Graphviz parses &-bearing identifiers when double-quoted; renders them escaped in <text>.
    let svg = await fsl_to_svg_string('"a&b" -> C;');
    const fills = extract_state_fills(svg);
    // Should find the unescaped name 'a&b' (graphviz renders it as &amp; in text content)
    expect(fills.has('a&b')).toBe(true);
    const patched = patch_state_fill(svg, 'a&b', '#654321');
    const after = extract_state_fills(patched);
    expect(after.get('a&b')).toBe('#654321');
  });

  // Regression: jssm lowercases dot node ids and disambiguates collisions with
  // -2 suffixes, so 'AA -> aa;' renders <title>aa</title> and <title>aa-2</title>.
  // Titles therefore CANNOT recover state names — keying must come from <text>
  // label content. Do not "simplify" extraction back to titles.
  it('distinguishes states whose names collide under lowercasing (title keying would fail)', async () => {
    const svg   = await fsl_to_svg_string('AA -> aa;');
    const fills = extract_state_fills(svg);
    expect([...fills.keys()].sort()).toEqual(['AA', 'aa']);
    const patched = patch_state_fill(svg, 'AA', '#00ff00');
    const after   = extract_state_fills(patched);
    expect(after.get('AA')).toBe('#00ff00');
    expect(after.get('aa')).toBe(fills.get('aa'));
  });

  it('returns the svg unchanged when the state does not exist', async () => {
    const svg = await fsl_to_svg_string('A -> B;');
    expect(patch_state_fill(svg, 'Nope', '#fff')).toBe(svg);
  });

  // The following tests use small hand-authored SVG fragments, not real
  // renders: they exercise malformed-input guard branches that valid
  // graphviz output cannot produce, but which the public API (any string)
  // can. Authorized deviation from the real-renders-only rule for exactly
  // this guard-clause purpose — everything behavioral above uses real renders.
  it('extracts empty text content by filtering it out', () => {
    const svg = `<g id="node1" class="node"><title>a</title><polygon fill="#fff"/><text></text></g>`;
    const fills = extract_state_fills(svg);
    expect(fills.size).toBe(0);
  });

  it('skips nodes missing required elements', () => {
    const svg = `<g id="node1" class="node"><title>a</title></g><g id="node2" class="node"><title>b</title><polygon fill="#ff0000"/><text>B</text></g>`;
    const fills = extract_state_fills(svg);
    expect([...fills.keys()]).toEqual(['B']);
  });

  it('does not patch when shape has no fill attribute', () => {
    const svg = `<g id="node1" class="node"><title>a</title><polygon stroke="black"/><text>A</text></g>`;
    const result = patch_state_fill(svg, 'A', '#abc');
    expect(result).toBe(svg);
  });

  it('patch returns unchanged when node is missing text', () => {
    const svg = `<g id="node1" class="node"><title>a</title><polygon fill="#fff"/></g>`;
    const result = patch_state_fill(svg, 'A', '#abc');
    expect(result).toBe(svg);
  });

});
