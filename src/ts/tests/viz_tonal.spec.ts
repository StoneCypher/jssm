// @vitest-environment jsdom
import { from } from '../jssm';
import {
  fsl_to_svg_string, machine_to_svg_string, fsl_to_svg_element, machine_to_svg_element,
  fsl_to_dot, tonal_provider
} from '../jssm_viz';
import type { VizRenderProvider, TonalIcon } from '../jssm_viz';

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
  it('retains escaped action text and zero probabilities in multiline labels', async () => {
    const doc = document_for(await fsl_to_svg_string("a 'go<&' 0% => b; b 'reset' 12.5% ~> a;", { provider: 'tonal' }));
    expect([...doc.querySelectorAll('.edge-label-main text')].map(label => label.textContent)).toEqual(['go<&', '0']);
    expect([...doc.querySelectorAll('.edge-label-forced text')].map(label => label.textContent)).toEqual(['reset', '12.5']);
    expect(doc.querySelectorAll('.edge')).toHaveLength(2);
  });

  it('distinguishes label kinds even with a shared custom color', async () => {
    const doc = document_for(await fsl_to_svg_string("a 'advance' => b; b 'choose' -> c; c 'reset' ~> a;", {
      provider: 'tonal', tonal: { action_color: '#abc', forced_opacity: 0 }
    }));
    const label = (kind: string) => doc.querySelector(`.edge-label-${kind} text`);
    const main = label('main'), legal = label('legal'), forced = label('forced');
    expect([main, legal, forced].every(el => el.getAttribute('fill') === '#abc')).toBe(true);
    expect(Number(main.getAttribute('font-weight'))).toBeGreaterThan(Number(legal.getAttribute('font-weight')));
    expect(forced.getAttribute('font-style')).toBe('italic');
    expect(legal.getAttribute('font-style')).toBeNull();
    expect(Number(forced.getAttribute('font-size'))).toBeLessThan(Number(legal.getAttribute('font-size')));
    expect(forced.closest('[opacity]')).toBeNull();
    const edges = [...doc.querySelectorAll<SVGGElement>('.edge')];
    const width = (kind: string) => Number(edges.find(edge => edge.dataset.transitionKind === kind).querySelector('path').getAttribute('stroke-width'));
    expect(width('main')).toBeGreaterThan(width('legal'));
    expect(width('legal')).toBeGreaterThan(width('forced'));
  });

  it('preserves mirrored traffic-light return curves with named actions', async () => {
    const source = traffic.replace('[Red Yellow Green] ~>', "[Red Yellow Green] 'Disable' ~>");
    const doc = document_for(await fsl_to_svg_string(source, { provider: 'tonal', tonal: { states: annotations } }));
    const red = [...doc.querySelectorAll('.node')].find(node => node.querySelector('title').textContent === 'red');
    const band = red.querySelector('.tonal-header');
    const center = Number(band.getAttribute('x')) + Number(band.getAttribute('width')) / 2;
    const controls = (title: string) => [...doc.querySelectorAll('.edge')]
      .find(edge => edge.querySelector('title').textContent === title).querySelector('path')
      .getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const left = controls('green->off'), right = controls('yellow->off');
    expect(left).toHaveLength(right.length);
    for (let i = 0; i < left.length; i += 2) {
      expect(Math.abs(left[i] + right[i] - center * 2)).toBeLessThan(2);
      expect(Math.abs(left[i + 1] - right[i + 1])).toBeLessThan(2);
    }
    expect(doc.querySelectorAll('.edge-labels text')).toHaveLength(7);
  });

  it('keeps traffic-light action ink clear of cards, other labels and its own curve', async () => {
    const doc = document_for(await fsl_to_svg_string(traffic.replace('[Red Yellow Green] ~>', "[Red Yellow Green] 'Disable' ~>"), {
      provider: 'tonal', tonal: { states: annotations }
    }));
    const cards = [...doc.querySelectorAll('.node g[clip-path] > rect')].map(rect => {
      const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y'));
      return [x, y, x + Number(rect.getAttribute('width')), y + Number(rect.getAttribute('height'))];
    });
    const placed: number[][] = [];
    for (const label of doc.querySelectorAll<SVGTextElement>('.edge-labels text')) {
      const size = Number(label.getAttribute('font-size')), width = Number(label.getAttribute('textLength'));
      const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y'));
      const left = x - (label.getAttribute('text-anchor') === 'start' ? 0 : width / 2);
      const box = [left, y - size * 0.85, left + width, y + size * 0.25];
      for (const obstacle of [...cards, ...placed]) {
        expect(box[0] < obstacle[2] && box[2] > obstacle[0] && box[1] < obstacle[3] && box[3] > obstacle[1]).toBe(false);
      }
      placed.push(box);
      const id = label.parentElement.dataset.edgeId;
      const coordinates = [...doc.querySelectorAll('.edge')].find(edge => edge.id === id).querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      for (let segment = 0; segment + 7 < coordinates.length; segment += 6) {
        for (let step = 0; step <= 40; step++) {
          const t = step / 40, u = 1 - t;
          const point = [0, 1].map(axis => u ** 3 * coordinates[segment + axis]
            + 3 * u * u * t * coordinates[segment + 2 + axis]
            + 3 * u * t * t * coordinates[segment + 4 + axis] + t ** 3 * coordinates[segment + 6 + axis]);
          expect(point[0] > box[0] && point[0] < box[2] && point[1] > box[1] && point[1] < box[3]).toBe(false);
        }
      }
    }
  });

  it.each(['dot', 'neato', 'circo'])('retains every parallel, opposite and self-loop action within %s export bounds', async engine => {
    const source = "a 'stay<&' -> a; a 'first' => b; a 'second' -> b; b 'return' ~> a; c 'a much longer disconnected action' -> d;";
    const svg = await fsl_to_svg_string(source, { provider: 'tonal', engine });
    const doc = document_for(svg);
    const [tx, ty] = doc.querySelector('.graph').getAttribute('transform').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const [width, height] = doc.documentElement.getAttribute('viewBox').split(' ').slice(2).map(Number);
    const labels = [...doc.querySelectorAll<SVGTextElement>('.edge-labels text')];
    expect(labels.map(label => label.textContent).sort((a, b) => a.localeCompare(b))).toEqual(['stay<&', 'first', 'second', 'return', 'a much longer disconnected action'].sort((a, b) => a.localeCompare(b)));
    for (const label of labels) {
      const x = Number(label.getAttribute('x')) + tx, y = Number(label.getAttribute('y')) + ty;
      const size = Number(label.getAttribute('font-size')), length = Number(label.getAttribute('textLength'));
      expect(x).toBeGreaterThan(0);
      expect(x + length).toBeLessThan(width);
      expect(y - size).toBeGreaterThan(0);
      expect(y + size * 0.3).toBeLessThan(height);
      expect([...doc.querySelectorAll('.edge')].some(edge => edge.id === label.parentElement.dataset.edgeId)).toBe(true);
    }
    expect(doc.querySelectorAll('.edge')).toHaveLength(5);
    expect(svg).not.toMatch(/NaN|undefined/);
  });


  it('keeps headers at 1.5em with centered titles and extra octagon clearance', async () => {
    const doc = document_for(await fsl_to_svg_string(traffic, { provider: 'tonal', tonal: { states: annotations } }));
    for (const node of doc.querySelectorAll('.node')) {
      const header = node.querySelector('.tonal-header');
      const title = node.querySelector('.tonal-title');
      const height = Number(header.getAttribute('height'));
      expect(height).toBe(Number(title.getAttribute('font-size')) * 1.5);
      expect(Number(title.getAttribute('y'))).toBeCloseTo(Number(header.getAttribute('y')) + height / 2, 2);
      expect(title.getAttribute('dominant-baseline')).toBe('central');
      const left = Number(header.getAttribute('x')) + 1;
      const inset = Number(title.getAttribute('x')) - left;
      expect(inset).toBeCloseTo(node.querySelector('title').textContent === 'off' ? 36 : 12, 1);
      const bottom = Number(header.getAttribute('y')) + height;
      const body = [...node.querySelectorAll('text')].filter(el => !el.classList.contains('tonal-title'));
      expect(body.every(el => Number(el.getAttribute('y')) > bottom)).toBe(true);
    }
  });

  it('measures long titles on one line while retaining body wrapping and group chips', async () => {
    const name = 'A state with a deliberately long name';
    const doc = document_for(await fsl_to_svg_string(`&group: ["${name}"]; "${name}" -> b;`, {
      provider: 'tonal', render_groups: 'chips', tonal: { wrap_columns: 8, states: { [name]: { description: 'Several words in the body' } } }
    }));
    const node = doc.querySelector('.node');
    expect(node.querySelectorAll('.tonal-title')).toHaveLength(1);
    expect(node.querySelector('.tonal-title').textContent).toContain(name);
    expect(node.querySelector('.tonal-title').textContent).toContain('[group]');
    const title = node.querySelector('.tonal-title');
    const band = node.querySelector('.tonal-header');
    expect(Number(title.getAttribute('x')) + Number(title.getAttribute('textLength')))
      .toBeLessThan(Number(band.getAttribute('x')) + Number(band.getAttribute('width')));
    expect(node.querySelectorAll('text').length).toBeGreaterThan(3);
  });

  it('renders every named forced action without dimming its label or inventing unnamed actions', async () => {
    const doc = document_for(await fsl_to_svg_string("a 'Disable' ~> b; b 'reset<&' ~> a; c ~> a;", { provider: 'tonal' }));
    expect(doc.querySelectorAll('[data-transition-kind="forced"]')).toHaveLength(3);
    expect(doc.querySelectorAll('[data-transition-kind="forced"] > g[opacity="0.7"]')).toHaveLength(3);
    const labels = [...doc.querySelectorAll('.edge-labels text')];
    expect(labels.map(el => el.textContent)).toEqual(['Disable', 'reset<&']);
    expect(labels.every(el => el.getAttribute('fill') === '#91a6c2' && !el.closest('[opacity]'))).toBe(true);
  });

  it('accepts emoji, Lucide-compatible shape records, and filled paths in library view boxes', async () => {
    // This is Lucide's public IconNode type; it must be assignable without casts.
    const nodes: [string, Record<string, string | number | undefined>][] = [
      ['circle', { cx: '12', cy: '12', r: '10', key: 'circle', opacity: undefined }],
      ['path', { d: 'm9 12 2 2 4-4', 'stroke-width': 2 }]
    ];
    const doc = document_for(await fsl_to_svg_string('graph_layout: tonal; Emoji -> Outline -> Solid;', {
      tonal: { states: {
        Emoji: { icon: { emoji: '👩🏽‍💻' } },
        Outline: { icon: { nodes } },
        Solid: { icon: { path: ['M0 0H512V512H0Z', 'M128 128H384V384H128Z'], viewBox: '0 0 512 512', fill: 'currentColor', stroke: 'none' } }
      } }
    }));
    expect(doc.querySelector('.tonal-icon-emoji').textContent).toBe('👩🏽‍💻');
    expect(doc.querySelector('.tonal-icon-emoji').getAttribute('font-family')).toContain('Segoe UI Emoji');
    const [outline, solid] = [...doc.querySelectorAll('.tonal-icon-svg')];
    expect(outline.querySelector('circle').getAttribute('r')).toBe('10');
    expect(outline.querySelector('[key]')).toBeNull();
    expect(outline.getAttribute('stroke')).toBe('currentColor');
    expect(solid.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(solid.getAttribute('fill')).toBe('currentColor');
    expect(solid.getAttribute('stroke')).toBe('none');
    expect(solid.querySelectorAll('path')).toHaveLength(2);
    expect(doc.querySelectorAll('.node')).toHaveLength(3);
  });

  it('escapes emoji and icon path text and rejects executable or externally referenced SVG data', async () => {
    const svg = await fsl_to_svg_string('a -> b;', { provider: 'tonal', tonal: { states: {
      a: { icon: { emoji: '<script>alert(1)</script>' } },
      b: { icon: { path: 'M0 0"/><script>alert(1)</script><path d="' } }
    } } });
    const doc = document_for(svg);
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('.tonal-icon-emoji').textContent).toBe('<script>alert(1)</script>');
    const invalid: TonalIcon[] = [
      { nodes: [['script', {}]] },
      { nodes: [['path', { d: 'M0 0', onload: 'alert(1)' }]] },
      { nodes: [['path', { d: 'M0 0', fill: 'url(https://example.com/paint)' }]] },
      { nodes: [['use', { href: 'https://example.com/icon.svg' }]] },
      { path: 'M0 0', viewBox: '0 0 0 24' },
      { path: 'M0 0', viewBox: '0 0 Infinity 24' },
      { path: 'M0 0', stroke: 'url(#external)' },
      { path: 'M0 0', stroke_width: -1 }
    ];
    for (const icon of invalid) {
      await expect(fsl_to_svg_string('a -> b;', { provider: 'tonal', tonal: { states: { a: { icon } } } })).rejects.toThrow();
    }
  });

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

  it('derives distinct default borders from named node fills', async () => {
    const doc = document_for(await fsl_to_svg_string(`graph_layout: tonal; a -> b;
      state a: {background-color: lightgreen;}; state b: {background-color: pink;};`));
    const borders = [...doc.querySelectorAll('.tonal-border')].map(el => el.getAttribute('stroke'));
    expect(borders).toEqual(['#76c376', '#d19da6']);
    expect(doc.querySelectorAll('.edge [stroke="#ffffff"]')).not.toHaveLength(0);
  });

  it.each([
    ['white', '#ffffff'], ['black', '#000000'], ['#33669980', '#33669980'], ['transparent', '#00000000']
  ])('preserves an explicit %s border and its alpha on a compact octagon', async (color, expected) => {
    const doc = document_for(await fsl_to_svg_string(`graph_layout: tonal; a -> b;
      state a: {shape: octagon; background-color: lightgreen; border-color: ${color}; linestyle: dashed;};`));
    const border = doc.querySelector('.tonal-border');
    expect(border.getAttribute('stroke')).toBe(expected);
    expect(border.getAttribute('stroke-opacity')).toBeNull();
    expect(border.getAttribute('stroke-dasharray')).toBe('7 5');
  });

  it.each([
    ['start_state: {border-color: orange;};', 'a', '#ffa500'],
    ['terminal_state: {border-color: purple;};', 'c', '#800080'],
    ['end_states: [b]; end_state: {border-color: blue;};', 'b', '#0000ff'],
    ['active_state: {border-color: lime;};', 'a', '#00ff00'],
    ['&group: [b]; state &group: {border-color: navy;};', 'b', '#000080'],
    ["on enter b do 'observe'; hooked_state: {border-color: red;};", 'b', '#ff0000']
  ])('detects a border declared only through %s', async (declaration, name, expected) => {
    const doc = document_for(await fsl_to_svg_string('graph_layout: tonal; a -> b -> c; ' + declaration));
    const node = [...doc.querySelectorAll('.node')].find(el => el.querySelector('title').textContent === name);
    expect(node.querySelector('.tonal-border').getAttribute('stroke')).toBe(expected);
  });

  it('respects declared borders throughout the style cascade and tracks the active state', async () => {
    const machine = from(`graph_layout: tonal;
      &group: [grouped overridden];
      root -> grouped -> overridden -> end;
      end_states: [end];
      state: {border-color: red;};
      state &group: {border-color: blue;};
      state overridden: {border-color: white;};
      end_state: {border-color: yellow;};
      active_state: {border-color: lime;};`);
    const borders = async () => {
      const doc = document_for(await machine_to_svg_string(machine));
      return Object.fromEntries([...doc.querySelectorAll('.node')].map(node =>
        [node.querySelector('title').textContent, node.querySelector('.tonal-border').getAttribute('stroke')]));
    };
    expect(await borders()).toEqual({ root: '#00ff00', grouped: '#0000ff', overridden: '#ffffff', end: '#ffff00' });
    machine.transition('grouped');
    expect(await borders()).toEqual({ root: '#ff0000', grouped: '#00ff00', overridden: '#ffffff', end: '#ffff00' });
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
    expect(doc.querySelectorAll('[data-transition-kind="forced"] > g[opacity="0.7"]')).toHaveLength(3);
    expect(doc.querySelector('.edge-labels')?.textContent).toContain('Enable');
    expect(doc.querySelectorAll('.edge-labels text')).toHaveLength(4);
    expect(doc.querySelectorAll('.node text[font-family^="Courier New"][fill="#003366"]')).toHaveLength(3);
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
    const titles = [...doc.querySelectorAll('.node > title')].map(el => el.textContent);
    expect(new Set(titles).size).toBe(3);
    expect(doc.querySelector('script, img, [onerror]')).toBeNull();
    expect(doc.documentElement.textContent).toContain('go<&');
    expect(doc.documentElement.textContent).toContain('<script>');
  });

  it('respects flow, explicit layout engines, shape and hidden state names', async () => {
    const vertical = document_for(await fsl_to_svg_string('a -> b;', { provider: 'tonal' }));
    const horizontal = document_for(await fsl_to_svg_string('flow: right; a -> b;', { provider: 'tonal' }));
    expect(horizontal.documentElement.getAttribute('viewBox')).not.toBe(vertical.documentElement.getAttribute('viewBox'));
    const shaped = document_for(await fsl_to_svg_string('a -> b; state a: {shape: ellipse;};', { provider: 'tonal', engine: 'circo' }));
    expect(shaped.querySelector('.node ellipse')).not.toBeNull();
    const hidden = document_for(await fsl_to_svg_string('Secret -> Other;', { provider: 'tonal', hide_state_labels: true }));
    expect([...hidden.querySelectorAll('.node text')].map(el => el.textContent).join('')).not.toContain('Secret');
  });

  it('supports opaque/transparent forced edges and validates appearance parameters', async () => {
    const doc = document_for(await fsl_to_svg_string('a ~> b;', {
      provider: 'tonal', tonal: { forced_opacity: 0, header_shade: 0.2, background: '#001122', action_color: '#ace' }
    }));
    expect(doc.querySelector('[data-transition-kind="forced"] > g')?.getAttribute('opacity')).toBe('0');
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
