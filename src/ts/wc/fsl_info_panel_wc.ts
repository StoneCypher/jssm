import { LitElement, html, css, TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import type { Machine } from '../jssm.js';
import { closest_wc } from './wc_tag_helpers.js';
import { fslTokens } from './fsl_tokens.js';

/**
 * Structural shape used to detect a parent `<fsl-instance>` (or, while the
 * deprecated alias survives, `<jssm-instance>`) host without importing the
 * instance module — same duck-typed approach `<fsl-viz>` uses.
 */
export interface JssmInstanceHost extends HTMLElement {
  readonly machine: Machine<unknown>;
}

/**
 * The most recent transition observed on the host machine, captured from the
 * `transition` event detail.  `null` until the first transition fires.
 */
export interface LastTransition {
  from   : string;
  to     : string;
  action : string;
}

/**
 * Read-only state-inspector web component for a parent `<fsl-instance>`.
 *
 * Slotted into the host's `info-panel` slot (or nested anywhere inside it), it
 * displays the machine's current state, the most recent transition
 * (`from → to via action`), the currently-legal exit actions, and the
 * terminal / complete flags. Every field refreshes on each `transition`
 * event.
 *
 * Display-only: it never drives the machine. It binds by walking up to the
 * host via {@link closest_wc} (which matches both the canonical `fsl-instance`
 * and the deprecated `jssm-instance` host tags), so it works under either.
 * @element fsl-info-panel
 * @cssproperty [--fsl-info-panel-gap=0.25rem] - Vertical gap between rows.
 */
export class FslInfoPanel extends LitElement {

  static styles = css`
    :host { display: block; }
    .info, .placeholder {
      padding: 0.5rem 0.7rem; font: 0.8rem var(--_fsl-font-mono);
      color: var(--_fsl-text); background: var(--_fsl-surface);
    }
    .info { display: grid; gap: var(--fsl-info-panel-gap, 0.25rem); }
    .row { display: flex; gap: 0.5rem; }
    .label { font-weight: 600; color: var(--_fsl-muted); }
    .placeholder { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;

  /**
   * Parent host reference, set in `connectedCallback` when one is found.
   * Cleared on disconnect so a stale deferred subscription cannot fire.
   */
  private _host: JssmInstanceHost | null = null;

  /** Unsubscribe callback from the host machine's `transition` subscription. */
  private _sub: (() => void) | null = null;

  /** Current state name; `null` until the panel has bound to a host machine. */
  @state() private _current: string | null = null;

  /** Space-separated legal exit actions for the current state. */
  @state() private _actions: string = '';

  /** Whether the current state has no exits. */
  @state() private _terminal: boolean = false;

  /** Whether the current state is a `complete` state. */
  @state() private _complete: boolean = false;

  /** Most recent transition, or `null` before the first one. */
  @state() private _last: LastTransition | null = null;

  /**
   * Web Components lifecycle hook. Finds the parent host via {@link closest_wc}
   * and, once `<fsl-instance>` has upgraded, subscribes to its machine's
   * `transition` events and paints the initial snapshot. With no host, it
   * leaves `_current` null so {@link render} shows the placeholder.
   */
  connectedCallback(): void {
    super.connectedCallback();

    const host = closest_wc(this, 'instance') as JssmInstanceHost | null;
    if (host === null) {
      return;   // no host: render() shows the placeholder
    }
    this._host = host;

    void customElements.whenDefined('fsl-instance').then(() => {
      // Disconnection between scheduling and resolution is legal.
      if (this._host !== host) {
        return;
      }
      this._sub = host.machine.on('transition', (detail: unknown) => {
        // The transition event detail carries `StateType = string` endpoints;
        // `action` is undefined for pure transitions, rendered as 'undefined'
        // by String() (longstanding display behavior, preserved).
        const d = detail as { from: string; to: string; action: string | undefined };
        this._last = {
          from   : d.from,
          to     : d.to,
          // eslint-disable-next-line unicorn/no-useless-coercion -- action is `string | undefined`, not string: String() renders an actionless transition as 'undefined', the shipped display behavior
          action : String(d.action),
        };
        this._refresh(host);
      });
      this._refresh(host);   // initial snapshot
      return;
    });
  }

  /**
   * Web Components lifecycle hook. Releases the machine subscription and clears
   * the host reference. The last-painted snapshot is intentionally retained so
   * a detached panel keeps showing its final state rather than blanking.
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
   * Read the current machine snapshot into the reactive fields, triggering a
   * re-render. Called once on bind and again on every transition. The bound
   * host is passed in by the caller (which already holds a non-null reference),
   * so no re-null-check is needed here.
   * @param host - The bound parent host whose machine to snapshot.
   */
  private _refresh(host: JssmInstanceHost): void {
    const m = host.machine;
    this._current  = m.state();
    this._actions  = m.list_exit_actions().map(String).join(' ');
    this._terminal = m.is_terminal();
    this._complete = m.is_complete();
  }

  /**
   * Lit render method. Shows a placeholder until the panel has bound to a host
   * machine; thereafter a labeled grid of the live snapshot.
   * @returns A Lit `TemplateResult` for the panel.
   */
  render(): TemplateResult {
    if (this._current === null) {
      return html`<div class="placeholder">no fsl-instance host</div>`;
    }
    const last = this._last;
    return html`
      <div class="info">
        <div class="row"><span class="label">state</span><span class="state">${this._current}</span></div>
        <div class="row"><span class="label">actions</span><span class="actions">${this._actions === '' ? 'none' : this._actions}</span></div>
        <div class="row"><span class="label">last</span><span class="last">${last === null ? '—' : `${last.from} → ${last.to} via ${last.action}`}</span></div>
        <div class="row"><span class="label">terminal</span><span class="terminal">${String(this._terminal)}</span></div>
        <div class="row"><span class="label">complete</span><span class="complete">${String(this._complete)}</span></div>
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'fsl-info-panel': FslInfoPanel;
  }
}
