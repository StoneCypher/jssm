import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** Host whose machine the actions panel reads and drives. */
interface ActionsHost extends HTMLElement {
  machine: {
    state(): unknown;
    states(): unknown[];
    list_exit_actions(): string[];
    valid_transition(s: unknown): boolean;
    valid_force_transition(s: unknown): boolean;
  };
  do(action: string): boolean;
  transition(state: string): boolean;
  force_transition(state: string): boolean;
}

/** Host events that can change which actions / transitions are currently legal. */
const ACTION_EVENTS = ['fsl-transition', 'fsl-machine-rebuilt'] as const;

/** A transition target reachable from the current state. */
export interface LegalTransition {
  /** The destination state name. */
  to: string;
  /** True when the only edge to it is forced (not a legal transition). */
  forced: boolean;
}

/**
 * `<fsl-actions>` — interactive controls derived from a parent `<fsl-instance>`'s
 * machine. Renders a button for every currently-legal named **action** and every
 * reachable **transition** target (legal ones fired with `transition`, forced-only
 * ones with `force_transition`), re-deriving on the host's transition / rebuild
 * events. Only what is firable from the active state is shown, so the controls
 * change as the machine moves; a state with no exits shows `no actions available`.
 * Standalone (no host ancestor) renders empty.
 *
 * @element fsl-actions
 * @csspart actions - The container.
 *
 * @example
 * // For `Off 'Enable' -> Red; [Red ...] ~> Off;`, while in Off:
 * //   Actions:    [ Enable ]
 * //   Transitions:[ → Red ]
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
    .trn.forced { font-style: italic; }
    .trn.forced::after {
      content: " · forced"; font-weight: 400; font-style: normal;
      font-size: 0.72rem; color: var(--_fsl-muted);
    }
    .empty { color: var(--_fsl-muted); font-style: italic; }
    ${fslTokens}
  `;

  @state() private _actions: string[] = [];
  @state() private _transitions: LegalTransition[] = [];
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

  /** Recompute the legal actions + transitions from the host's machine. */
  private _derive(host: ActionsHost): void {
    const current = host.machine.state();
    this._actions = host.machine.list_exit_actions();
    this._transitions = host.machine.states()
      .filter(s => s !== current && host.machine.valid_force_transition(s))
      .map(s => ({ to: String(s), forced: !host.machine.valid_transition(s) }));
  }

  render(): TemplateResult {
    const host = this._host;
    if (host === null) {
      return html`<div class="actions" part="actions"><span class="empty">no machine</span></div>`;
    }
    if (this._actions.length === 0 && this._transitions.length === 0) {
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
        ${this._transitions.length === 0 ? '' : html`
          <div class="group">
            <div class="label">Transitions</div>
            ${this._transitions.map(t => html`
              <button class="trn ${t.forced ? 'forced' : ''}"
                      @click=${() => { if (t.forced) { host.force_transition(t.to); } else { host.transition(t.to); } }}>
                → ${t.to}</button>`)}
          </div>`}
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-actions': FslActions; }
}
