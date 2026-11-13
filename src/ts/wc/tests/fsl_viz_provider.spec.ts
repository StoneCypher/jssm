// @vitest-environment jsdom
import '../fsl_instance_wc.define';
import '../fsl_viz_wc.define';
import { register_renderer, unregister_renderer } from '../../jssm_viz';
import type { VizRenderProvider } from '../../jssm_viz';

/** A registered renderer that stamps the machine's states, so a test can see it ran. */
const stamp: VizRenderProvider = {
  name   : 'wc stamp',
  render : context => `<svg data-registered="${context.machine.states().join(' ')}"></svg>`
};

afterEach(() => {
  document.body.replaceChildren();
  unregister_renderer(stamp.name);
});

/**
 * Attaches a chart that renders its own `fsl` source.
 * @param el The chart to attach.
 */
function mount_standalone(el: HTMLElementTagNameMap['fsl-viz']): void {
  el.fsl = 'a -> b;';
  document.body.append(el);
}

/**
 * Attaches a chart inside an `<fsl-instance>`, so it renders the host's machine.
 * @param el The chart to attach.
 */
function mount_bound(el: HTMLElementTagNameMap['fsl-viz']): void {
  const host = document.createElement('fsl-instance');
  host.fsl = 'a -> b;';
  host.append(el);
  document.body.append(host);
}

describe('chart rendering providers', () => {
  it('follows source selection and switches back when it is removed', async () => {
    const el = document.createElement('fsl-viz');
    el.fsl = 'graph_renderer: tonal; a -> b;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).not.toBeNull(); });
    el.fsl = 'graph_layout: neato; a -> b;';
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('svg')).not.toBeNull();
      expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).toBeNull();
    });
  });

  it('follows the bound machine source and respects an explicit provider override', async () => {
    const host = document.createElement('fsl-instance');
    host.fsl = 'graph_renderer: tonal; a -> b;';
    const el = document.createElement('fsl-viz');
    host.append(el);
    document.body.append(host);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).not.toBeNull(); });
    el.provider = 'graphviz';
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelector('svg')).not.toBeNull();
      expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).toBeNull();
    });
  });

  it('switches a standalone chart to tonal and updates its annotations', async () => {
    const el = document.createElement('fsl-viz');
    el.fsl = 'Idle -> Running;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('svg')).not.toBeNull(); });
    el.provider = 'tonal';
    el.tonal = { states: { Idle: { description: 'Waiting for work.' } } };
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).not.toBeNull(); });
    expect(el.shadowRoot?.textContent).toContain('Waiting for work.');
    el.tonal = { states: { Idle: { description: 'Ready to begin.' } } };
    await vi.waitFor(() => { expect(el.shadowRoot?.textContent).toContain('Ready to begin.'); });
    const svg = el.shadowRoot.querySelector('svg');
    el.highlightTrace(['Idle', 'Running']);
    expect(svg.querySelector('.edge')?.querySelector('path')?.getAttribute('style')).toContain('stroke');
    el.clearHighlights();
    expect(svg.querySelector('.edge')?.querySelector('path')?.getAttribute('style') || '').not.toContain('stroke:');
  });

  it('applies provider changes to a chart bound to an instance', async () => {
    const host = document.createElement('fsl-instance');
    host.fsl = "Idle 'start' -> Running;";
    const el = document.createElement('fsl-viz');
    host.append(el);
    document.body.append(host);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('svg')).not.toBeNull(); });
    el.provider = 'tonal';
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).not.toBeNull(); });
    expect(el.shadowRoot?.querySelectorAll('.node')).toHaveLength(2);
    host.machine.action('start');
    await el.updateComplete;
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelectorAll('.edge')).toHaveLength(1); });
  });

  it('discards an old provider result when selection changes during rendering', async () => {
    let finish: (value: string) => void;
    const render = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const slow: VizRenderProvider = { name: 'slow', render };
    const el = document.createElement('fsl-viz');
    el.provider = slow;
    el.fsl = 'a -> b;';
    document.body.append(el);
    await vi.waitFor(() => { expect(render).toHaveBeenCalled(); });
    el.provider = { name: 'fast', render: () => '<svg data-current="true"></svg>' };
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-current]')).not.toBeNull(); });
    finish('<svg data-stale="true"></svg>');
    await Promise.resolve();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('[data-stale]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[data-current]')).not.toBeNull();
  });

  it.each([
    ['a standalone chart', mount_standalone],
    ['a chart bound to an instance', mount_bound]
  ])('drops a failure from a superseded render in %s instead of reporting it', async (_label, mount) => {
    let fail: ((reason: Error) => void) | undefined;
    const slow: VizRenderProvider = { name: 'slow', render: () => new Promise<string>((_resolve, reject) => { fail = reject; }) };
    const el = document.createElement('fsl-viz');
    const error = vi.fn();
    el.addEventListener('viz-error', error);
    el.provider = slow;
    mount(el);
    await vi.waitFor(() => { expect(fail).toBeDefined(); });
    el.provider = { name: 'fast', render: () => '<svg data-current="true"></svg>' };
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-current]')).not.toBeNull(); });
    fail(new Error('stale failure'));
    await new Promise(resolve => { setTimeout(resolve, 0); });
    await el.updateComplete;
    expect(error).not.toHaveBeenCalled();
    expect(el.shadowRoot?.querySelector('[data-current]')).not.toBeNull();
  });

  it('reports provider failures through the chart error event', async () => {
    const el = document.createElement('fsl-viz');
    const error = vi.fn();
    el.addEventListener('viz-error', error);
    el.provider = { name: 'broken', render: () => { throw new Error('provider failed'); } };
    el.fsl = 'a -> b;';
    document.body.append(el);
    await vi.waitFor(() => { expect(error).toHaveBeenCalledTimes(1); });
    expect(error.mock.calls[0][0].detail.message).toBe('provider failed');
  });
});

describe('chart renderers chosen by registered name', () => {
  it('draws with a registered renderer that the FSL source names, with no chart property set', async () => {
    register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.fsl = 'graph_renderer: "wc stamp"; a -> b;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-registered="a b"]')).not.toBeNull(); });
  });

  it('draws with a registered renderer named by the provider attribute, over the source choice', async () => {
    register_renderer(stamp);
    const el = document.createElement('fsl-viz');
    el.setAttribute('provider', 'wc stamp');
    el.fsl = 'graph_renderer: tonal; x -> y;';
    document.body.append(el);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-registered="x y"]')).not.toBeNull(); });
    expect(el.shadowRoot?.querySelector('[data-render-provider="tonal"]')).toBeNull();
  });

  it('draws with a registered renderer for a chart bound to an instance whose source names it', async () => {
    register_renderer(stamp);
    const host = document.createElement('fsl-instance');
    host.fsl = 'graph_renderer: "wc stamp"; on -> off;';
    const el = document.createElement('fsl-viz');
    host.append(el);
    document.body.append(host);
    await vi.waitFor(() => { expect(el.shadowRoot?.querySelector('[data-registered="on off"]')).not.toBeNull(); });
  });

  it('reports an unregistered renderer name through the chart error event, listing the registered names', async () => {
    const el = document.createElement('fsl-viz');
    const error = vi.fn();
    el.addEventListener('viz-error', error);
    el.fsl = 'graph_renderer: nowhere; a -> b;';
    document.body.append(el);
    await vi.waitFor(() => { expect(error).toHaveBeenCalledTimes(1); });
    const { message } = error.mock.calls[0][0].detail;
    expect(message).toContain('Unknown renderer "nowhere"');
    expect(message).toContain('graphviz, tonal');
    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
  });
});
