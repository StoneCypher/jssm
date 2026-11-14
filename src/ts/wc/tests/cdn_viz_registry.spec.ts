// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { VizRenderProvider, RegisterRendererOptions } from '../../jssm_viz';

//  Loads the BUILT, self-contained CDN module that `jssm-viz/cdn/viz` maps to
//  and drives it the way a page with no bundler would: import the module,
//  register a renderer through its exports, then draw an <fsl-viz> that the
//  same module defined.  The CDN file inlines its own copy of jssm-viz, so
//  this only passes if the exported registry is the one its element reads.

/** The shape of the CDN module's registry exports, as a page sees them. */
type CdnVizModule = {
  register_renderer   : (provider: VizRenderProvider, options?: RegisterRendererOptions) => void,
  unregister_renderer : (name: string) => boolean,
  renderer_names      : () => string[],
  renderer_for        : (name: string) => VizRenderProvider | undefined,
  graphviz_provider   : VizRenderProvider,
  FslViz              : CustomElementConstructor
};

const cdn_path = resolve(__dirname, '../../../../packages/jssm-viz/dist/cdn/viz.js');

/** A renderer that stamps the machine's states, so a test can see it drew. */
const stamp: VizRenderProvider = {
  name   : 'cdn stamp',
  render : context => `<svg data-cdn-stamp="${context.machine.states().join(' ')}"></svg>`
};

/**
 * Loads the built CDN module.  ES modules are cached, so every call returns
 * the same module instance, and so the same registry and element.
 * @returns The CDN module's exports.
 * @throws {Error} when the bundle has not been built (run `npm run make`).
 */
async function load_cdn(): Promise<CdnVizModule> {
  if (!existsSync(cdn_path)) { throw new Error(`build ${cdn_path} first (npm run make)`); }
  return await import(cdn_path) as CdnVizModule;
}

afterEach(async () => {
  document.body.replaceChildren();
  const cdn = await load_cdn();
  cdn.unregister_renderer(stamp.name);
});

describe('jssm-viz/cdn/viz exports its renderer registry', () => {

  it('exports the registry functions and the graphviz renderer beside FslViz', async () => {
    const cdn = await load_cdn();
    expect(typeof cdn.register_renderer).toBe('function');
    expect(typeof cdn.unregister_renderer).toBe('function');
    expect(typeof cdn.renderer_names).toBe('function');
    expect(typeof cdn.renderer_for).toBe('function');
    expect(cdn.graphviz_provider.name).toBe('graphviz');
    expect(customElements.get('fsl-viz')).toBe(cdn.FslViz);
  });

  it('starts with the built-ins and keeps what is registered, in order', async () => {
    const cdn = await load_cdn();
    expect(cdn.renderer_names()).toEqual(['graphviz', 'tonal']);
    cdn.register_renderer(stamp);
    expect(cdn.renderer_names()).toEqual(['graphviz', 'tonal', stamp.name]);
    expect(cdn.renderer_for(stamp.name)).toBe(stamp);
    expect(cdn.renderer_for('graphviz')).toBe(cdn.graphviz_provider);
  });

});

describe('a renderer registered through jssm-viz/cdn/viz draws that module\'s <fsl-viz>', () => {

  it('when the provider attribute names it', async () => {
    const cdn = await load_cdn();
    cdn.register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.setAttribute('provider', stamp.name);
    el.setAttribute('fsl', 'Idle -> Busy;');
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-cdn-stamp="Idle Busy"]')).not.toBeNull(); });
  });

  it('when the FSL source names it with graph_renderer', async () => {
    const cdn = await load_cdn();
    cdn.register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.setAttribute('fsl', 'graph_renderer: "cdn stamp"; up -> down;');
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-cdn-stamp="up down"]')).not.toBeNull(); });
  });

  it('reports the name as unknown once it is unregistered through the module', async () => {
    const cdn = await load_cdn();
    cdn.register_renderer(stamp);
    expect(cdn.unregister_renderer(stamp.name)).toBe(true);
    const el = document.createElement('fsl-viz');
    const error = vi.fn();
    el.addEventListener('viz-error', error);
    el.setAttribute('fsl', 'graph_renderer: "cdn stamp"; up -> down;');
    document.body.append(el);
    await vi.waitFor(() => { expect(error).toHaveBeenCalledTimes(1); });
    expect((error.mock.calls[0][0] as CustomEvent<{ message: string }>).detail.message).toContain('Unknown renderer "cdn stamp"');
  });

});
