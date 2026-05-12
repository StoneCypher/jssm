/**
 * @jest-environment jsdom
 */

import '../jssm_viz_wc.define';
import { JssmViz } from '../jssm_viz_wc';

describe('JssmViz registration', () => {

  it('registers the jssm-viz tag', () => {
    expect(customElements.get('jssm-viz')).toBe(JssmViz);
  });

  it('creates an element with createElement', () => {
    const el = document.createElement('jssm-viz');
    expect(el).toBeInstanceOf(JssmViz);
  });

});

describe('JssmViz rendering', () => {

  it('renders an SVG containing both state names when fsl is set', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    el.fsl = 'Off -> On;';
    await (el as any).updateComplete;
    // The component performs async rendering after updateComplete; flush microtasks.
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('Off');
    expect(tree_html).toContain('On');

    document.body.removeChild(el);
  });

  it('fires viz-error when fsl fails to parse', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    const errorEvent: Promise<CustomEvent> = new Promise(resolve => {
      el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });

    el.fsl = 'this is not valid fsl !!!';

    const evt = await errorEvent;
    expect(evt.type).toBe('viz-error');
    expect(typeof evt.detail.message).toBe('string');
    expect(evt.detail.message.length).toBeGreaterThan(0);
    expect(evt.bubbles).toBe(true);
    expect(evt.composed).toBe(true);

    document.body.removeChild(el);
  });

});
