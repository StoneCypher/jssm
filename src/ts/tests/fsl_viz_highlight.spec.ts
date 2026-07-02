/**
 * @vitest-environment jsdom
 */

import { TextDecoder, TextEncoder } from 'util';

// jsdom does not expose TextDecoder / TextEncoder; @viz-js/viz (the WebAssembly
// Graphviz loader behind a real <fsl-viz> render) needs them. Copy the Node
// built-ins onto globalThis before any test renders.
beforeAll(() => {
  if (typeof globalThis.TextDecoder === 'undefined') {
    (globalThis as any).TextDecoder = TextDecoder;
  }
  if (typeof globalThis.TextEncoder === 'undefined') {
    (globalThis as any).TextEncoder = TextEncoder;
  }
});

import '../wc/fsl_viz_wc.define';
import type { FslViz } from '../wc/fsl_viz_wc';




// Exercises the programmatic Graph Highlighter API (clearHighlights /
// highlightTrace) against a *real* graphviz SVG rendered into the shadow
// root, so assertions run over the exact <g class="node">/<g class="edge">
// + <title> structure Graphviz emits. Three states with a forked path:
//
//   a 'go' -> b;  b -> c;  a -> c;
//
// gives nodes a/b/c and edges a->b, b->c, a->c — enough to assert that an
// on-trace pair is highlighted while an off-trace node and two off-trace
// edges are faded.

const FORK_FSL = 'a -> b; b -> c; a -> c;';
const CRIMSON  = '#b71c1c';   // highlightTrace's documented default colour




/**
 *  Polls `predicate` every 25ms until it is true or the timeout elapses.
 *
 *  @param predicate   Checked repeatedly.
 *  @param timeout_ms  Hard cap before giving up.
 *  @returns           Whether the predicate became true in time.
 */
async function eventually(predicate: () => boolean, timeout_ms = 10_000): Promise<boolean> {
  const deadline = Date.now() + timeout_ms;
  while (Date.now() < deadline) {
    if (predicate()) { return true; }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  return predicate();
}


/**
 *  Creates a standalone `<fsl-viz>`, renders `fsl`, and resolves once the
 *  SVG is present in the shadow root. The caller owns teardown.
 *
 *  @param fsl  FSL source to render.
 *  @returns    The connected element with a rendered SVG.
 */
async function renderViz(fsl: string): Promise<FslViz> {
  const el = document.createElement('fsl-viz') as FslViz;
  document.body.appendChild(el);
  el.fsl = fsl;
  const ready = await eventually(() => (el.shadowRoot?.innerHTML ?? '').includes('<svg'));
  expect(ready).toBe(true);
  return el;
}


/**
 *  Finds a rendered `.node` / `.edge` group by its decoded Graphviz title.
 *
 *  @param el        The rendered element.
 *  @param selector  `.node` or `.edge`.
 *  @param title     Decoded title to match (e.g. `'a'`, or `'a->b'`).
 *  @returns         The matching group, or `undefined`.
 */
function groupByTitle(el: FslViz, selector: string, title: string): Element | undefined {
  const container = el.shadowRoot!.querySelector('.container')!;
  return Array.from(container.querySelectorAll(selector)).find(g => {
    const raw = g.querySelector('title')?.textContent ?? '';
    return raw.replace(/&#45;/g, '-').replace(/&gt;/g, '>') === title;
  });
}




describe('FslViz programmatic graph highlighter', () => {

  test('highlightTrace strokes the on-trace nodes/edges and fades the rest', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      el.highlightTrace(['a', 'b']);

      // On-trace nodes a, b: shapes stroked + label filled with the default colour.
      for (const name of ['a', 'b']) {
        const node = groupByTitle(el, '.node', name)!;
        const shape = node.querySelector('polygon, ellipse, path') as SVGElement;
        expect(shape.style.stroke).toBe(CRIMSON);
        const label = node.querySelector('text') as SVGElement | null;
        expect(label?.style.fill).toBe(CRIMSON);
        expect((node as SVGElement).style.opacity).toBe('');           // not faded
      }

      // On-trace edge a->b: stroked, with its arrowhead polygon filled.
      const edgeAB   = groupByTitle(el, '.edge', 'a->b')!;
      const edgePath = edgeAB.querySelector('path') as SVGElement;
      const edgeHead = edgeAB.querySelector('polygon') as SVGElement;
      expect(edgePath.style.stroke).toBe(CRIMSON);
      expect(edgeHead.style.stroke).toBe(CRIMSON);
      expect(edgeHead.style.fill).toBe(CRIMSON);

      // Off-trace node c and the two off-trace edges are faded.
      expect((groupByTitle(el, '.node', 'c') as SVGElement).style.opacity).toBe('0.2');
      expect((groupByTitle(el, '.edge', 'a->c') as SVGElement).style.opacity).toBe('0.2');
      expect((groupByTitle(el, '.edge', 'b->c') as SVGElement).style.opacity).toBe('0.2');
    } finally {
      document.body.removeChild(el);
    }

  });

  test('honours a custom colour and fadeOthers:false', async () => {

    const el = await renderViz(FORK_FSL);
    const green = '#2e7d32';

    try {
      el.highlightTrace(['a', 'b'], { color: green, fadeOthers: false });

      const shapeA = groupByTitle(el, '.node', 'a')!.querySelector('polygon, ellipse, path') as SVGElement;
      expect(shapeA.style.stroke).toBe(green);

      // fadeOthers:false leaves off-trace elements untouched (no opacity override).
      expect((groupByTitle(el, '.node', 'c') as SVGElement).style.opacity).toBe('');
      expect((groupByTitle(el, '.edge', 'b->c') as SVGElement).style.opacity).toBe('');
    } finally {
      document.body.removeChild(el);
    }

  });

  test('clearHighlights removes every inline override', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      el.highlightTrace(['a', 'b']);
      // Sanity: there is something to clear.
      const shapeA = groupByTitle(el, '.node', 'a')!.querySelector('polygon, ellipse, path') as SVGElement;
      expect(shapeA.style.stroke).toBe(CRIMSON);

      el.clearHighlights();

      expect(shapeA.style.stroke).toBe('');
      expect(shapeA.style.fill).toBe('');
      expect((groupByTitle(el, '.node', 'c') as SVGElement).style.opacity).toBe('');
      expect((groupByTitle(el, '.edge', 'a->b')!.querySelector('polygon') as SVGElement).style.fill).toBe('');
    } finally {
      document.body.removeChild(el);
    }

  });

  test('an empty trace is a no-op', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      el.highlightTrace([]);
      const shapeA = groupByTitle(el, '.node', 'a')!.querySelector('polygon, ellipse, path') as SVGElement;
      expect(shapeA.style.stroke).toBe('');
      expect((groupByTitle(el, '.node', 'c') as SVGElement).style.opacity).toBe('');
    } finally {
      document.body.removeChild(el);
    }

  });

  test('both methods no-op (without throwing) when the element is detached', () => {

    // A created-but-never-connected element has no shadow root yet.
    const el = document.createElement('fsl-viz') as FslViz;
    expect(el.shadowRoot).toBeNull();

    expect(() => el.highlightTrace(['a', 'b'])).not.toThrow();
    expect(() => el.clearHighlights()).not.toThrow();

  });

  test('both methods no-op when the rendered container is absent', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      // Drop the container the methods look for; they must bail cleanly.
      el.shadowRoot!.querySelector('.container')!.remove();
      expect(el.shadowRoot!.querySelector('.container')).toBeNull();

      expect(() => el.highlightTrace(['a', 'b'])).not.toThrow();
      expect(() => el.clearHighlights()).not.toThrow();
    } finally {
      document.body.removeChild(el);
    }

  });

  test('tolerates nodes and edges whose <title> is missing or empty', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      const container = el.shadowRoot!.querySelector('.container')!;
      const nodes = Array.from(container.querySelectorAll('.node'));
      const edges = Array.from(container.querySelectorAll('.edge'));

      // One node and one edge with the <title> element removed entirely
      // (the titleEl-is-null path), and another of each with an empty title
      // (the empty-textContent fallback). A title we cannot read simply
      // doesn't match the trace — highlightTrace must not throw.
      nodes[0].querySelector('title')!.remove();
      edges[0].querySelector('title')!.remove();
      nodes[1].querySelector('title')!.textContent = '';
      edges[1].querySelector('title')!.textContent = '';

      expect(() => el.highlightTrace(['a', 'b'])).not.toThrow();
    } finally {
      document.body.removeChild(el);
    }

  });

});
