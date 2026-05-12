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
