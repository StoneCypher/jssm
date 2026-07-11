// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { reorder_svg_layers } from '../svg_layers.js';

const GRAPHVIZ_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><g class="graph">' +
  '<title>G</title>' +
  '<polygon fill="white" points="0,0 0,100 100,100 100,0"/>' +
  '<g class="node"><title>a</title><ellipse cx="50" cy="20" rx="10" ry="10"/></g>' +
  '<g class="edge"><title>a-&gt;b</title><path d="M0,0L10,10"/><text x="5" y="5">go</text></g>' +
  '</g></svg>';

const childTags = (svg: string): string[] => {
  const graph = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('g.graph')!;
  return [...graph.children].map(k => {
    const cls = k.getAttribute('class');
    return cls ? `${k.tagName.toLowerCase()}.${cls}` : k.tagName.toLowerCase();
  });
};

describe('reorder_svg_layers', () => {

  it('stacks background → edges → nodes → action labels (labels hoisted to the top)', () => {
    const out = reorder_svg_layers(GRAPHVIZ_SVG);
    const tags = childTags(out);

    // the edge label is hoisted out of the edge group to the very top
    expect(tags.at(-1)).toBe('text');
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    expect(doc.querySelector(':scope g.edge > text')).toBeNull();      // no longer inside the edge
    expect(doc.querySelector(':scope g.graph > text')!.textContent).toBe('go');

    // back-to-front order
    const i = (t: string): number => tags.indexOf(t);
    expect(i('polygon')).toBeLessThan(i('g.edge'));
    expect(i('g.edge')).toBeLessThan(i('g.node'));
    expect(i('g.node')).toBeLessThan(tags.lastIndexOf('text'));
  });

  it('leaves non-graphviz SVG untouched', () => {
    const plain = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    expect(reorder_svg_layers(plain)).toBe(plain);
  });

  it('handles a graph with no background polygon', () => {
    const noBg =
      '<svg xmlns="http://www.w3.org/2000/svg"><g class="graph">' +
      '<g class="node"><title>a</title></g>' +
      '<g class="edge"><path d="M0,0"/><text>x</text></g>' +
      '</g></svg>';
    const tags = childTags(reorder_svg_layers(noBg));
    expect(tags.at(-1)).toBe('text');               // label still on top
    expect(tags).not.toContain('polygon');
  });

});
