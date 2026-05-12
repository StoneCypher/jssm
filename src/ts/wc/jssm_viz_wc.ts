import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fsl_to_svg_string } from '../jssm_viz.js';

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

  /**
   * Lit lifecycle hook. Triggers an async SVG render whenever `fsl` or
   * `engine` change.
   *
   * @param changed - Map of changed reactive properties supplied by Lit.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('fsl') || changed.has('engine')) {
      this._renderSvg();
    }
  }

  /**
   * Render the current `fsl` source to an SVG string via the headless
   * `fsl_to_svg_string` pipeline. Updates `_svg` on success; emits a
   * `viz-error` `CustomEvent` on failure. Guards against stale results
   * when `fsl` changes mid-flight.
   *
   * @returns A promise that resolves once the render attempt has finished.
   */
  private async _renderSvg(): Promise<void> {
    const source = this.fsl;
    if (!source) {
      this._svg = '';
      return;
    }
    try {
      const result = await fsl_to_svg_string(source);
      // Guard against stale results: only commit if fsl has not changed since this render started.
      if (this.fsl === source) {
        this._svg = result;
      }
    } catch (e: any) {
      this._svg = '';
      this.dispatchEvent(new CustomEvent('viz-error', {
        detail   : { message: String(e?.message ?? e), location: e?.location },
        bubbles  : true,
        composed : true,
      }));
    }
  }

  /**
   * Lit render method. Injects the most recent SVG string into the shadow
   * tree via the `unsafeHTML` directive.
   *
   * SVG content originates from `@viz-js/viz` (Graphviz WASM), which emits
   * sanitized SVG. `unsafeHTML` is required because Lit's template-literal
   * interpolation otherwise escapes the markup as text. The directive name
   * makes the trust boundary explicit at the call site.
   *
   * @returns A Lit `TemplateResult` wrapping the SVG in a `.container` div.
   */
  render(): TemplateResult {
    return html`<div class="container">${unsafeHTML(this._svg)}</div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'jssm-viz': JssmViz;
  }
}
