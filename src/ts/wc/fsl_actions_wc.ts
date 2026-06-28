import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** One edge of the machine, as returned by `machine.list_edges()`. */
interface MachineEdge { from: unknown; to: unknown; main_path: boolean; forced_only: boolean; }

/** Host whose machine the actions panel reads and drives. */
interface ActionsHost extends HTMLElement {
  machine: {
    state(): unknown;
    list_exit_actions(): string[];
    list_edges(): MachineEdge[];
  };
  do(action: string): boolean;
  transition(state: string): boolean;
  force_transition(state: string): boolean;
}

/** Host events that can change which actions / transitions are currently legal. */
const ACTION_EVENTS = ['fsl-transition', 'fsl-machine-rebuilt'] as const;

/**
 * `<fsl-actions>` — interactive controls derived from a parent `<fsl-instance>`'s
 * machine. Renders a button for every currently-legal named **action** and, split
 * into three groups, every reachable transition target by edge kind: **main**
 * (`=>`) first, plain **transitions** (`->`) next, and **forced** (`~>`) last.
 * Legal targets fire with `transition`, forced-only ones with `force_transition`.
 * Re-derives on the host's transition / rebuild events; only firable controls
 * appear, and each group is omitted when empty, so a self-loop-only state shows
 * just its actions and a terminal state shows `no actions available`. Standalone
 * (no host ancestor) renders empty.
 *
 * @element fsl-actions
 * @csspart actions - The container.
 *
 * @example
 * // For `A 'x' -> B; A 'y' => C; A ~> D;` while in A:
 * //   Actions:      [ x ] [ y ]
 * //   Main:         [ → C ]
 * //   Transitions:  [ → B ]
 * //   Forced:       [ → D ]
 */
export class FslActions extends LitElement {

  static styles = css`
    :host { display: block; }
    .actions {
      display: flex; flex-direction: column; gap: 0.7rem;
      padding: 0.55rem 0.65rem; background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 0.8rem var(--_fsl-font);
    }
    .group { display: flex; flex-direction: column; gap: 0.3rem; }
    .label {
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--_fsl-muted);
    }
    button {
      text-align: left; padding: 0.4rem 0.6rem; cursor: pointer; border-radius: 4px;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface);
      color: var(--_fsl-text); font: 600 0.8rem var(--_fsl-font);
    }
    button:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;

  @state() private _actions: string[] = [];
  @state() private _main: string[] = [];
  @state() private _regular: string[] = [];
  @state() private _forced: string[] = [];
  private _host: ActionsHost | null = null;
  private _unbind: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as ActionsHost | null;
    this._host = host;
    if (host === null) { return; }
    const sync = (): void => { this._derive(host); };
    for (const ev of ACTION_EVENTS) { host.addEventListener(ev, sync); }
    this._unbind = (): void => { for (const ev of ACTION_EVENTS) { host.removeEventListener(ev, sync); } };
    this._derive(host);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unbind !== null) { this._unbind(); this._unbind = null; }
  }

  /** Recompute the legal actions and the three transition groups from the host. */
  private _derive(host: ActionsHost): void {
    const current = host.machine.state();
    this._actions = host.machine.list_exit_actions();
    const main = new Set<string>(), regular = new Set<string>(), forced = new Set<string>();
    for (const e of host.machine.list_edges()) {
      if (e.from !== current || e.to === current) { continue; }   // only non-self exits from here
      const to = String(e.to);
      if (e.main_path)        { main.add(to); }
      else if (e.forced_only) { forced.add(to); }
      else                    { regular.add(to); }
    }
    this._main = [...main];
    this._regular = [...regular];
    this._forced = [...forced];
  }

  /** A transition group, or `''` when empty. Forced targets fire via force. */
  private _group(host: ActionsHost, label: string, targets: string[], forced: boolean): TemplateResult | string {
    if (targets.length === 0) { return ''; }
    return html`
      <div class="group">
        <div class="label">${label}</div>
        ${targets.map(to => html`
          <button class="trn" @click=${() => { if (forced) { host.force_transition(to); } else { host.transition(to); } }}>→ ${to}</button>`)}
      </div>`;
  }

  render(): TemplateResult {
    const host = this._host;
    if (host === null) {
      return html`<div class="actions" part="actions"><span class="empty">no machine</span></div>`;
    }
    if (this._actions.length === 0 && this._main.length === 0
        && this._regular.length === 0 && this._forced.length === 0) {
      return html`<div class="actions" part="actions"><span class="empty">no actions available</span></div>`;
    }
    return html`
      <div class="actions" part="actions">
        ${this._actions.length === 0 ? '' : html`
          <div class="group">
            <div class="label">Actions</div>
            ${this._actions.map(a => html`
              <button class="act" @click=${() => host.do(a)}>${a}</button>`)}
          </div>`}
        ${this._group(host, 'Main', this._main, false)}
        ${this._group(host, 'Transitions', this._regular, false)}
        ${this._group(host, 'Forced', this._forced, true)}
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-actions': FslActions; }
}
