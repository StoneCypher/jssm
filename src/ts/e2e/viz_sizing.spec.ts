import { test, expect, type Page } from '@playwright/test';

/**
 * Real-browser e2e for the #1934 sizing contract: an auto-height `<fsl-viz>`
 * host under an external `max-height` cap must render its SVG *bounded and
 * aspect-preserved* within the host, rather than letting the SVG's fallback
 * (ratio-derived / intrinsic pt) size escape the cap unclipped.
 *
 * jsdom cannot do layout, so the wc spec only asserts the stylesheet carries
 * the max-bound rules (see `src/ts/wc/tests/fsl_viz_wc.spec.ts`); this spec
 * measures the actual boxes in Chromium. Two hosts are checked: one capped by
 * plain external `max-height`, one via the `--jssm-viz-max-height` seam.
 * @see ./fixtures/viz_sizing.html for the import-map serving contract.
 */

const CAP_PX = 240;

interface SizingBoxes {
  host             : { top: number; bottom: number; height: number };
  svg              : { top: number; bottom: number; height: number; width: number };
  intrinsic_height : number;
  has_viewbox      : boolean;
}

/** Measure the host and shadow svg boxes for one fixture element. */
async function boxes_of (page: Page, id: string): Promise<SizingBoxes> {
  return page.evaluate((el_id: string) => {
    const host = document.querySelector<HTMLElement>(`#${el_id}`);
    const svg  = host.shadowRoot.querySelector('svg');
    const h    = host.getBoundingClientRect();
    const s    = svg.getBoundingClientRect();
    return {
      host             : { top: h.top, bottom: h.bottom, height: h.height },
      svg              : { top: s.top, bottom: s.bottom, height: s.height, width: s.width },
      // Graphviz writes the layout's natural size into the height attribute
      // (e.g. "1116pt"); parseFloat suffices to prove the graph is taller
      // than the cap, which is what makes this test non-vacuous.
      // eslint-disable-next-line unicorn/prefer-number-coercion -- Number('1116pt') is NaN; parseFloat's unit-tolerant prefix parse is the point
      intrinsic_height : Number.parseFloat(svg.getAttribute('height') ?? '0'),
      has_viewbox      : svg.hasAttribute('viewBox'),
    };
  }, id);
}

for (const [id, mechanism] of [
  ['capped',     'external max-height on the host'],
  ['var-capped', 'the --jssm-viz-max-height custom property'],
] as const) {

  test(`#1934: auto-height host capped via ${mechanism} keeps the svg bounded`, async ({ page }) => {

    const uncaught: Error[] = [];
    page.on('pageerror', e => { uncaught.push(e); });

    await page.goto('/src/ts/e2e/fixtures/viz_sizing.html');
    await page.waitForFunction(() => (globalThis as unknown as { __fixture_ready?: boolean }).__fixture_ready);

    const m = await boxes_of(page, id);

    // Premise: the graph's natural layout is much taller than the cap —
    // otherwise nothing here would exercise the escape.
    expect(m.intrinsic_height).toBeGreaterThan(CAP_PX);

    // The host honours its cap.
    expect(m.host.height).toBeLessThanOrEqual(CAP_PX + 1);

    // The svg stays inside the host instead of escaping below it.
    expect(m.svg.height).toBeLessThanOrEqual(m.host.height + 1);
    expect(m.svg.top).toBeGreaterThanOrEqual(m.host.top - 1);
    expect(m.svg.bottom).toBeLessThanOrEqual(m.host.bottom + 1);

    // Aspect preservation basis: the viewBox (with Graphviz's default
    // preserveAspectRatio) letterboxes the drawing inside the capped viewport.
    expect(m.has_viewbox).toBe(true);

    expect(uncaught).toEqual([]);

  });

}
