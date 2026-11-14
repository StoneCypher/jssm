// @vitest-environment jsdom
import * as define_module from '../fsl_viz_wc.define';
import * as class_module from '../fsl_viz_wc';
import * as viz from '../../jssm_viz';
import type { VizRenderProvider } from '../fsl_viz_wc.define';

//  The CDN build (`jssm-viz/cdn/viz`) is this define module bundled with a
//  private copy of jssm-viz, so a page that only has the CDN module can reach
//  the registry solely through these exports.  These specs check that the
//  exports ARE the registry the element renders through: a renderer
//  registered here must be what `provider` and FSL `graph_renderer` select.

const { register_renderer, unregister_renderer, renderer_names, renderer_for, graphviz_provider } = define_module;

/** A renderer that stamps the machine's states, so a test can see it drew. */
const stamp: VizRenderProvider = {
  name   : 'define stamp',
  render : context => `<svg data-define-stamp="${context.machine.states().join(' ')}"></svg>`
};

afterEach(() => {
  document.body.replaceChildren();
  unregister_renderer(stamp.name);
});

describe('the <fsl-viz> define module exports the renderer registry', () => {

  it('hands out jssm-viz\'s own registry, not a copy, from the define module', () => {
    expect(define_module.register_renderer).toBe(viz.register_renderer);
    expect(define_module.unregister_renderer).toBe(viz.unregister_renderer);
    expect(define_module.renderer_names).toBe(viz.renderer_names);
    expect(define_module.renderer_for).toBe(viz.renderer_for);
    expect(define_module.graphviz_provider).toBe(viz.graphviz_provider);
  });

  it('hands out jssm-viz\'s own registry, not a copy, from the class module', () => {
    expect(class_module.register_renderer).toBe(viz.register_renderer);
    expect(class_module.unregister_renderer).toBe(viz.unregister_renderer);
    expect(class_module.renderer_names).toBe(viz.renderer_names);
    expect(class_module.renderer_for).toBe(viz.renderer_for);
    expect(class_module.graphviz_provider).toBe(viz.graphviz_provider);
  });

  it('registers into the registry jssm-viz reads, and unregisters from it', () => {
    register_renderer(stamp);
    expect(viz.renderer_names()).toContain(stamp.name);
    expect(viz.renderer_for(stamp.name)).toBe(stamp);
    expect(unregister_renderer(stamp.name)).toBe(true);
    expect(viz.renderer_for(stamp.name)).toBeUndefined();
  });

  it('sees renderers registered through jssm-viz, and exposes the built-in graphviz renderer', () => {
    viz.register_renderer(stamp);
    expect(renderer_names()).toEqual(['graphviz', 'tonal', stamp.name]);
    expect(renderer_for(stamp.name)).toBe(stamp);
    expect(renderer_for('graphviz')).toBe(graphviz_provider);
  });

  it('refuses a built-in name, as jssm-viz does', () => {
    expect(() => { register_renderer({ name: 'tonal', render: () => '<svg></svg>' }); }).toThrow(/built-in/);
  });

});

describe('a renderer registered through the define module draws an <fsl-viz>', () => {

  it('when the provider attribute names it', async () => {
    register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.setAttribute('provider', stamp.name);
    el.fsl = 'Idle -> Busy;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-define-stamp="Idle Busy"]')).not.toBeNull(); });
  });

  it('when the FSL source names it with graph_renderer', async () => {
    register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.fsl = 'graph_renderer: "define stamp"; up -> down;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-define-stamp="up down"]')).not.toBeNull(); });
  });

  it('stops drawing with it once it is unregistered through the define module', async () => {
    register_renderer(stamp);
    unregister_renderer(stamp.name);
    const el = document.createElement('fsl-viz');
    const error = vi.fn();
    el.addEventListener('viz-error', error);
    el.fsl = 'graph_renderer: "define stamp"; up -> down;';
    document.body.append(el);
    await vi.waitFor(() => { expect(error).toHaveBeenCalledTimes(1); });
    expect(error.mock.calls[0][0].detail.message).toContain('Unknown renderer "define stamp"');
    expect(el.shadowRoot?.querySelector('[data-define-stamp]')).toBeNull();
  });

});
