/**
 * @vitest-environment jsdom
 */

import { TextDecoder, TextEncoder } from 'node:util';

// jsdom does not expose TextDecoder / TextEncoder; @viz-js/viz (the WebAssembly
// Graphviz loader behind a real <fsl-viz> render) needs them. Copy the Node
// built-ins onto globalThis before any test renders.
beforeAll(() => {
  if (globalThis.TextDecoder === undefined) {
    (globalThis as any).TextDecoder = TextDecoder;
  }
  if (globalThis.TextEncoder === undefined) {
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
 *  @param fsl  FSL source to render.
 *  @returns    The connected element with a rendered SVG.
 */
async function renderViz(fsl: string): Promise<FslViz> {
  const el = document.createElement('fsl-viz') as FslViz;
  document.body.append(el);
  el.fsl = fsl;
  const ready = await eventually(() => (el.shadowRoot?.innerHTML ?? '').includes('<svg'));
  expect(ready).toBe(true);
  return el;
}


/**
 *  Finds a rendered `.node` / `.edge` group by its decoded Graphviz title.
 *  @param el        The rendered element.
 *  @param selector  `.node` or `.edge`.
 *  @param title     Decoded title to match (e.g. `'a'`, or `'a->b'`).
 *  @returns         The matching group, or `undefined`.
 */
function groupByTitle(el: FslViz, selector: string, title: string): Element | undefined {
  const container = el.shadowRoot!.querySelector('.container')!;
  return [...container.querySelectorAll(selector)].find(g => {
    const raw = g.querySelector('title')?.textContent ?? '';
    return raw.replaceAll('&#45;', '-').replaceAll('&gt;', '>') === title;
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
      el.remove();
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
      el.remove();
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
      el.remove();
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
      el.remove();
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
      el.remove();
    }

  });

  // fsl#1935 regression: dot generation slugs state names (slug_for:
  // lowercase, non-alphanumeric runs to '-', trim), so a machine declared as
  // `Red -> Green;` renders <title>red</title> / <title>green</title>.
  // highlightTrace must accept the display-form names the caller actually
  // has, matching them against the slugged titles — while names already in
  // slug form keep working unchanged.

  test('#1935: display-form names match their slugged titles (nodes and edges)', async () => {

    const el = await renderViz('Red -> Green; Red -> Blue;');

    try {
      el.highlightTrace(['Red', 'Green']);

      // The machine renders under slugged titles; sanity-check that premise
      // so this test cannot silently pass against raw titles.
      expect(groupByTitle(el, '.node', 'Red')).toBeUndefined();
      expect(groupByTitle(el, '.node', 'red')).toBeDefined();

      for (const slug of ['red', 'green']) {
        const node  = groupByTitle(el, '.node', slug)!;
        const shape = node.querySelector('polygon, ellipse, path') as SVGElement;
        expect(shape.style.stroke).toBe(CRIMSON);
        expect((node as SVGElement).style.opacity).toBe('');
      }

      const edge = groupByTitle(el, '.edge', 'red->green')!;
      expect((edge.querySelector('path') as SVGElement).style.stroke).toBe(CRIMSON);

      // Off-trace state and edge still fade.
      expect((groupByTitle(el, '.node', 'blue') as SVGElement).style.opacity).toBe('0.2');
      expect((groupByTitle(el, '.edge', 'red->blue') as SVGElement).style.opacity).toBe('0.2');
    } finally {
      el.remove();
    }

  });

  test('#1935: names with spaces match their hyphenated slugs', async () => {

    const el = await renderViz('"Wrong Pin" -> "Right Pin"; "Wrong Pin" -> "Alarm Bell";');

    try {
      el.highlightTrace(['Wrong Pin', 'Right Pin']);

      const wrong = groupByTitle(el, '.node', 'wrong-pin')!;
      const right = groupByTitle(el, '.node', 'right-pin')!;
      expect((wrong.querySelector('polygon, ellipse, path') as SVGElement).style.stroke).toBe(CRIMSON);
      expect((right.querySelector('polygon, ellipse, path') as SVGElement).style.stroke).toBe(CRIMSON);

      const edge = groupByTitle(el, '.edge', 'wrong-pin->right-pin')!;
      expect((edge.querySelector('path') as SVGElement).style.stroke).toBe(CRIMSON);

      expect((groupByTitle(el, '.node', 'alarm-bell') as SVGElement).style.opacity).toBe('0.2');
    } finally {
      el.remove();
    }

  });

  test('#1935: unicode names match their slugs (non-ascii characters collapse to hyphens)', async () => {

    // slug_for('Röd') === 'r-d', slug_for('Grön') === 'gr-n'.
    const el = await renderViz('Röd -> Grön;');

    try {
      el.highlightTrace(['Röd']);

      const rod = groupByTitle(el, '.node', 'r-d')!;
      expect((rod.querySelector('polygon, ellipse, path') as SVGElement).style.stroke).toBe(CRIMSON);
      expect((groupByTitle(el, '.node', 'gr-n') as SVGElement).style.opacity).toBe('0.2');
    } finally {
      el.remove();
    }

  });

  test('#1935: slug-form input keeps working, including against a display-form machine', async () => {

    const el = await renderViz('Red -> Green;');

    try {
      // The caller passes the slugs directly (the pre-fix workaround); the
      // fix must not break it.
      el.highlightTrace(['red', 'green']);

      const red  = groupByTitle(el, '.node', 'red')!;
      const edge = groupByTitle(el, '.edge', 'red->green')!;
      expect((red.querySelector('polygon, ellipse, path') as SVGElement).style.stroke).toBe(CRIMSON);
      expect((edge.querySelector('path') as SVGElement).style.stroke).toBe(CRIMSON);
    } finally {
      el.remove();
    }

  });

  test('#1935: a name whose slug is empty is harmless and matches nothing', async () => {

    const el = await renderViz('Red -> Green;');

    try {
      // slug_for('!!!') === '' — such names render under indexed node-N
      // titles, unpredictable from the name alone, so they simply don't
      // match. The rest of the trace still highlights.
      expect(() => el.highlightTrace(['!!!', 'Red'])).not.toThrow();

      const red = groupByTitle(el, '.node', 'red')!;
      expect((red.querySelector('polygon, ellipse, path') as SVGElement).style.stroke).toBe(CRIMSON);
      expect((groupByTitle(el, '.node', 'green') as SVGElement).style.opacity).toBe('0.2');
    } finally {
      el.remove();
    }

  });

  test('tolerates nodes and edges whose <title> is missing or empty', async () => {

    const el = await renderViz(FORK_FSL);

    try {
      const container = el.shadowRoot!.querySelector('.container')!;
      const nodes = [...container.querySelectorAll('.node')];
      const edges = [...container.querySelectorAll('.edge')];

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
      el.remove();
    }

  });

});
