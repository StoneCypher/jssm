import { LitElement, html, css, TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import type { Machine } from '../jssm.js';
import { closest_wc } from './wc_tag_helpers.js';

/**
 * Structural shape used to detect a parent `<fsl-instance>` (or the deprecated
 * `<jssm-instance>`) host without importing the instance module.
 */
export interface JssmInstanceHost extends HTMLElement {
  readonly machine: Machine<unknown>;
}

/**
 * Read-only panel that displays the parent machine's **resolved FSL
 * properties** for the current state — the values produced by the full
 * override chain (machine `property … default …` → per-state
 * `state X: { property … }`), as returned by `machine.props()`. Refreshes on
 * every transition, so consumers can watch a property's effective value change
 * as the machine moves between states.
 *
 * Binds to the host via {@link closest_wc} (matching both `fsl-instance` and
 * the deprecated `jssm-instance`). Display-only; never drives the machine.
 *
 * v1 shows the FSL `property` bag (`machine.props()`). The render-time visual
 * style resolution (shape/color used by `<fsl-viz>`) is a separate viz-pipeline
 * concern and is not surfaced here.
 *
 * @element fsl-effective-properties
 * @cssproperty [--fsl-effective-properties-gap=0.25rem] - Gap between rows.
 */
export class FslEffectiveProperties extends LitElement {

  static styles = css`
    :host { display: block; }
    .props { display: grid; gap: var(--fsl-effective-properties-gap, 0.25rem); }
    .row { display: flex; gap: 0.5rem; }
    .name { font-weight: 600; opacity: 0.7; }
    .placeholder { opacity: 0.6; font-style: italic; }
  `;

  /** Parent host reference; cleared on disconnect. */
  private _host: JssmInstanceHost | null = null;

  /** Unsubscribe callback from the host machine's `transition` subscription. */
  private _sub: (() => void) | null = null;

  /**
   * Resolved property entries (`[name, stringified value]`) for the current
   * state, or `null` before the panel has bound to a host machine.
   */
  @state() private _entries: Array<[string, string]> | null = null;

  /**
   * Web Components lifecycle hook. Binds to the parent host once
   * `<fsl-instance>` has upgraded, then paints the initial property snapshot
   * and refreshes on each transition. With no host, leaves `_entries` null so
   * {@link render} shows the placeholder.
   */
  connectedCallback(): void {
    super.connectedCallback();

    const host = closest_wc(this, 'instance') as JssmInstanceHost | null;
    if (host === null) {
      return;
    }
    this._host = host;

    void customElements.whenDefined('fsl-instance').then(() => {
      if (this._host !== host) {
        return;
      }
      this._sub = host.machine.on('transition', () => this._refresh(host));
      this._refresh(host);   // initial snapshot
    });
  }

  /**
   * Web Components lifecycle hook. Releases the subscription and clears the
   * host reference, retaining the last-painted snapshot so a detached panel
   * keeps showing its final values.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._sub !== null) {
      this._sub();
      this._sub = null;
    }
    this._host = null;
  }

  /**
   * Read the resolved property bag (`machine.props()`) into reactive entries,
   * triggering a re-render.
   *
   * @param host - The bound parent host whose machine to snapshot.
   */
  private _refresh(host: JssmInstanceHost): void {
    const bag = host.machine.props() as Record<string, unknown>;
    this._entries = Object.entries(bag).map(([k, v]) => [k, String(v)] as [string, string]);
  }

  /**
   * Lit render method. Placeholder until bound; an empty-state message when the
   * machine declares no properties; otherwise a name → value grid.
   *
   * @returns A Lit `TemplateResult` for the panel.
   */
  render(): TemplateResult {
    if (this._entries === null) {
      return html`<div class="placeholder">no fsl-instance host</div>`;
    }
    if (this._entries.length === 0) {
      return html`<div class="placeholder">no properties declared</div>`;
    }
    return html`
      <div class="props">
        ${this._entries.map(([name, value]) => html`
          <div class="row">
            <span class="name">${name}</span><span class="value">${value}</span>
          </div>
        `)}
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'fsl-effective-properties': FslEffectiveProperties;
  }
}
