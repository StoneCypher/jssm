import { LitElement, html, css, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

/**
 * Web component that renders a jssm machine as inline SVG.
 *
 * @element jssm-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export class JssmViz extends LitElement {

  static styles = css`
    :host {
      display: block;
      min-height: var(--jssm-viz-min-height, 100px);
    }
    .container {
      width: 100%;
      height: 100%;
    }
  `;

  /** FSL source to render. */
  @property({ type: String }) fsl = '';

  /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
  @property({ type: String }) engine: string | undefined = undefined;

  @state() private _svg: string = '';

  render(): TemplateResult {
    return html`<div class="container"></div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'jssm-viz': JssmViz;
  }
}
