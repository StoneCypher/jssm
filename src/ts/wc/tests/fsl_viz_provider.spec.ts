// @vitest-environment jsdom
import '../fsl_instance_wc.define';
import '../fsl_viz_wc.define';
import type { VizRenderProvider } from '../../jssm_viz';

afterEach(() => { document.body.replaceChildren(); });

describe('chart rendering providers', () => {
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
    expect(svg.querySelector(':scope .edge path')?.getAttribute('style')).toContain('stroke');
    el.clearHighlights();
    expect(svg.querySelector(':scope .edge path')?.getAttribute('style') || '').not.toContain('stroke:');
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
