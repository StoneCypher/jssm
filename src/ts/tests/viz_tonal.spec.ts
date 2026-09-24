// @vitest-environment jsdom
import { from } from '../jssm';
import {
  fsl_to_svg_string, machine_to_svg_string, fsl_to_svg_element, machine_to_svg_element,
  fsl_to_dot, tonal_provider
} from '../jssm_viz';
import type { VizRenderProvider } from '../jssm_viz';

const traffic = `
machine_name: "Traffic light";
flow: down;
arrange [Green Yellow];
Off 'Enable' -> Red;
Red 'Next' => Green 'Next' => Yellow 'Next' => Red;
[Red Yellow Green] ~> Off;
state Red: {background-color: pink; corners: rounded;};
state Green: {background-color: lightgreen; corners: rounded;};
state Yellow: {background-color: lightyellow; corners: rounded;};
state Off: {background-color: steelblue; text-color: white; shape: octagon; linestyle: dashed;};
`;

const annotations = {
  Off: { description: 'Signal is disabled.', action: 'Enable', detail: 'starts the cycle at red.', icon: 'traffic-off' as const },
  Red: { description: 'Traffic must stop.', action: 'Next', detail: 'changes the light to green.', icon: 'traffic-red' as const },
  Green: { description: 'Traffic may proceed.', action: 'Next', detail: 'changes the light to yellow.', icon: 'traffic-green' as const },
  Yellow: { description: 'Prepare to stop.', action: 'Next', detail: 'changes the light to red.', icon: 'traffic-yellow' as const }
};

function document_for(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
}

function card_size(node: Element): number[] {
  const rect = node.querySelector(':scope g[clip-path] > rect');
  return [Number(rect.getAttribute('width')), Number(rect.getAttribute('height'))];
}

function polygon_points(el: Element): number[][] {
  return el.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
}

describe('tonal SVG provider', () => {
  it('selects tonal from FSL through every SVG entry point without a provider option', async () => {
    const source = 'graph_layout: tonal; a => b;';
    const machine = from(source);
    const opts = { tonal: { id_prefix: 'source-selected' } };
    const svg = await fsl_to_svg_string(source, opts);
    expect(document_for(svg).querySelector<SVGSVGElement>('svg').dataset.renderProvider).toBe('tonal');
    expect(await machine_to_svg_string(machine, opts)).toBe(svg);
    const source_element = await fsl_to_svg_element(source);
    const machine_element = await machine_to_svg_element(machine);
    expect(source_element.dataset.renderProvider).toBe('tonal');
    expect(machine_element.dataset.renderProvider).toBe('tonal');
    expect(fsl_to_dot(source)).toBe(fsl_to_dot('a => b;'));
  });

  it('allows an explicit provider to override tonal selected in the source', async () => {
    const standard = await fsl_to_svg_string('a -> b;');
    expect(await fsl_to_svg_string('graph_layout: tonal; a -> b;', { provider: 'graphviz' })).toBe(standard);
  });

  it('allows geometry overrides without losing the source-selected tonal appearance', async () => {
    const opts = { engine: 'circo', tonal: { id_prefix: 'source-geometry' } };
    const svg = await fsl_to_svg_string('graph_layout: tonal; a -> b -> c -> a;', opts);
    expect(svg).toBe(await fsl_to_svg_string('graph_layout: circo; a -> b -> c -> a;', { ...opts, provider: 'tonal' }));
    expect(document_for(svg).querySelector<SVGSVGElement>('svg').dataset.renderProvider).toBe('tonal');
  });

  it('keeps existing source-selected Graphviz layouts working', async () => {
    expect(await fsl_to_svg_string('graph_layout: neato; a -> b;'))
      .toBe(await fsl_to_svg_string('a -> b;', { engine: 'neato' }));
  });

  it('bounds an octagon like a card instead of expanding it around the label', async () => {
    const content = { description: 'Signal is disabled.', action: 'Enable', detail: 'starts the cycle at red.', icon: 'traffic-off' as const };
    const doc = document_for(await fsl_to_svg_string('graph_layout: tonal; Off -> Box; state Off: {shape: octagon;};', {
      tonal: { states: { Off: content, Box: content } }
    }));
    const nodes = [...doc.querySelectorAll('.node')];
    const octagon = nodes.find(node => node.querySelector('title')?.textContent === 'off');
    const box = nodes.find(node => node.querySelector('title')?.textContent === 'box');
    const [w, h] = card_size(octagon), [box_w, box_h] = card_size(box);
    expect(w).toBeLessThanOrEqual(box_w + 12);
    expect(h).toBeLessThanOrEqual(box_h + 14);
    expect(octagon.querySelector(':scope > polygon[stroke]')?.getAttribute('points')?.split(' ')).toHaveLength(8);
  });

  it.each(['up', 'right', 'down', 'left'])('meets compact octagons with arrows and self-loops flowing %s', async flow => {
    const source = `graph_layout: tonal; flow: ${flow}; a -> b; b => c; c ~> a; a 'stay' -> a;
      state a: {shape: octagon;}; state b: {shape: octagon;}; state c: {shape: octagon;};`;
    const doc = document_for(await fsl_to_svg_string(source));
    const outlines = new Map([...doc.querySelectorAll('.node')].map(node =>
      [node.querySelector('title').textContent, polygon_points(node.querySelector(':scope > polygon[stroke]'))]));
    for (const edge of doc.querySelectorAll('.edge')) {
      const target = edge.querySelector('title').textContent.split('->', 2)[1];
      const outline = outlines.get(target);
      const arrow = polygon_points(edge.querySelector('polygon'));
      const distances = arrow.flatMap(p => outline.map((a, i) => {
        const b = outline[(i + 1) % outline.length];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      }));
      expect(Math.min(...distances)).toBeLessThan(2);
    }
    expect(doc.querySelectorAll('.edge')).toHaveLength(4);
  });

  it('renders all four annotated cards and every directed transition', async () => {
    const svg = await fsl_to_svg_string(traffic, { provider: 'tonal', tonal: { states: annotations } });
    const doc = document_for(svg);
    expect(doc.querySelectorAll('.node')).toHaveLength(4);
    expect(doc.querySelectorAll('.tonal-header')).toHaveLength(4);
    expect(doc.querySelectorAll('.edge')).toHaveLength(7);
    expect(doc.querySelectorAll('[data-transition-kind="main"]')).toHaveLength(3);
    expect(doc.querySelectorAll('[data-transition-kind="legal"]')).toHaveLength(1);
    expect(doc.querySelectorAll('[data-transition-kind="forced"]')).toHaveLength(3);
    expect(doc.querySelectorAll(':scope [data-transition-kind="forced"] > g[opacity="0.7"]')).toHaveLength(3);
    expect(doc.querySelector('.edge-labels')?.textContent).toContain('Enable');
    expect(doc.querySelectorAll(':scope .edge-labels text[fill="#a9cfff"]')).toHaveLength(4);
    expect(doc.querySelectorAll(':scope .node text[font-family^="Courier New"][fill="#003366"]')).toHaveLength(3);
    expect(doc.documentElement.textContent).toContain('Traffic may proceed.');
    expect(doc.querySelectorAll('circle')).toHaveLength(12);
    expect(svg).not.toMatch(/NaN|undefined/);
  });

  it('keeps Graphviz as the default and keeps DOT export independent of appearance', async () => {
    const original = await fsl_to_svg_string('a -> b;');
    expect(await fsl_to_svg_string('a -> b;', { provider: 'graphviz' })).toBe(original);
    expect(fsl_to_dot(traffic, { provider: 'tonal' })).toBe(fsl_to_dot(traffic));
  });

  it('supports machine, source, string and element entry points', async () => {
    const opts = { provider: tonal_provider, tonal: { id_prefix: 'fixture' } };
    const source = await fsl_to_svg_string('a => b;', opts);
    expect(await machine_to_svg_string(from('a => b;'), opts)).toBe(source);
    const source_element = await fsl_to_svg_element('a => b;', opts);
    expect(source_element.dataset.renderProvider).toBe('tonal');
    const machine_element = await machine_to_svg_element(from('a => b;'), opts);
    expect(machine_element.dataset.renderProvider).toBe('tonal');
  });

  it('renders self-loops, parallel actions and disconnected states without losing edges', async () => {
    const source = `a 'stay' -> a; a 'one' -> b; a 'two' -> b; b ~> a; c -> d;`;
    const doc = document_for(await fsl_to_svg_string(source, { provider: 'tonal' }));
    expect(doc.querySelectorAll('.node')).toHaveLength(4);
    expect(doc.querySelectorAll('.edge')).toHaveLength(5);
    expect(doc.querySelector('.edge-labels')?.textContent).toContain('stay');
    expect(doc.querySelector('.edge-labels')?.textContent).toContain('one');
    expect(doc.querySelector('.edge-labels')?.textContent).toContain('two');
  });

  it('retains clusters and group chips through the shared layout pipeline', async () => {
    const source = '&group: [a b]; a -> b -> c;';
    const clustered = document_for(await fsl_to_svg_string(source, { provider: 'tonal' }));
    expect(clustered.querySelectorAll('.cluster')).toHaveLength(1);
    const chips = document_for(await fsl_to_svg_string(source, { provider: 'tonal', render_groups: 'chips' }));
    expect(chips.querySelectorAll('.cluster')).toHaveLength(0);
    expect(chips.documentElement.textContent).toContain('[group]');
    const off = document_for(await fsl_to_svg_string(source, { provider: 'tonal', render_groups: 'off' }));
    expect(off.documentElement.textContent).not.toContain('[group]');
  });

  it('keeps colliding state slugs distinct and escapes labels, actions and annotations', async () => {
    const source = `"A B" 'go<&' -> "A-B"; "A-B" -> "<script>";`;
    const doc = document_for(await fsl_to_svg_string(source, {
      provider: 'tonal', tonal: { states: { 'A B': { description: '<img src=x onerror=alert(1)>', icon: { path: 'M2 2 L22 22' } } } }
    }));
    const titles = [...doc.querySelectorAll(':scope .node > title')].map(el => el.textContent);
    expect(new Set(titles).size).toBe(3);
    expect(doc.querySelector(':scope script, img, [onerror]')).toBeNull();
    expect(doc.documentElement.textContent).toContain('go<&');
    expect(doc.documentElement.textContent).toContain('<script>');
  });

  it('respects flow, explicit layout engines, shape and hidden state names', async () => {
    const vertical = document_for(await fsl_to_svg_string('a -> b;', { provider: 'tonal' }));
    const horizontal = document_for(await fsl_to_svg_string('flow: right; a -> b;', { provider: 'tonal' }));
    expect(horizontal.documentElement.getAttribute('viewBox')).not.toBe(vertical.documentElement.getAttribute('viewBox'));
    const shaped = document_for(await fsl_to_svg_string('a -> b; state a: {shape: ellipse;};', { provider: 'tonal', engine: 'circo' }));
    expect(shaped.querySelector(':scope .node ellipse')).not.toBeNull();
    const hidden = document_for(await fsl_to_svg_string('Secret -> Other;', { provider: 'tonal', hide_state_labels: true }));
    expect([...hidden.querySelectorAll(':scope .node text')].map(el => el.textContent).join('')).not.toContain('Secret');
  });

  it('supports opaque/transparent forced edges and validates appearance parameters', async () => {
    const doc = document_for(await fsl_to_svg_string('a ~> b;', {
      provider: 'tonal', tonal: { forced_opacity: 0, header_shade: 0.2, background: '#001122', action_color: '#ace' }
    }));
    expect(doc.querySelector(':scope [data-transition-kind="forced"] > g')?.getAttribute('opacity')).toBe('0');
    expect(doc.querySelector('.tonal-header')?.getAttribute('opacity')).toBe('0.2');
    await expect(fsl_to_svg_string('a -> b;', { provider: 'tonal', tonal: { forced_opacity: 2 } })).rejects.toThrow(RangeError);
    await expect(fsl_to_svg_string('a -> b;', { provider: 'tonal', tonal: { background: 'url(https://example.com)' } })).rejects.toThrow(TypeError);
    await expect(fsl_to_svg_string('a -> b;', { provider: 'tonal', tonal: { id_prefix: 'bad" id' } })).rejects.toThrow(TypeError);
    await expect(fsl_to_svg_string('a -> b;', { provider: 'unknown' as 'tonal' })).rejects.toThrow('Unknown SVG rendering provider');
  });

  it('supports application providers with shared machine and layout services', async () => {
    const render = vi.fn(async context => {
      expect(context.machine.states()).toEqual(['a', 'b']);
      expect(context.state_ids.get('a')).toBe('a');
      const dot = context.to_dot({ nodes: new Map([['a', 'width=4']]), separate_edges: true });
      expect(dot).toContain('width=4');
      return context.render_dot(dot, 'svg');
    });
    const provider: VizRenderProvider = { name: 'application', render };
    const doc = document_for(await fsl_to_svg_string('a -> b;', { provider }));
    expect(doc.querySelectorAll('.node')).toHaveLength(2);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
