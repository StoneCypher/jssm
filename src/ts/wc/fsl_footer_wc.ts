import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** One edge of the machine, as returned by `machine.list_edges()`. */
interface FooterEdge { from: unknown; action?: unknown; }

/** Host whose state + machine the footer summarizes. */
interface FooterHost extends HTMLElement {
  machine: { list_edges(): FooterEdge[] };
}

/** `<n> word`, with a regular plural `s` unless `n === 1`. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * `<fsl-footer>` — a status bar for a parent `<fsl-instance>`.
 *
 * Shows the current state with both **local** counts (actions firable from
 * here + transitions out of here) and **global** machine counts: distinct
 * action *names*, **action-starts** (action-bearing edges — each place an
 * action fires from), and total transitions. Plus terminal/complete badges.
 *
 * Local counts track transitions by observing the host's reflected
 * `current-state` / `legal-actions` attributes; the global counts refresh on
 * `fsl-machine-rebuilt`, so the footer survives a live rebuild (#1387). A
 * default slot carries embedder status. Standalone (no `<fsl-instance>`
 * ancestor) it renders just the slot.
 *
 * @element fsl-footer
 * @csspart bar - The footer bar container.
 * @slot - Trailing custom status, right-aligned.
 */
export class FslFooter extends LitElement {

  static styles = css`
    :host { display: block; }
    .bar {
      display: flex; align-items: center; gap: 0.6rem;
      font: 12px var(--_fsl-font-mono); color: var(--_fsl-muted);
      padding: 0.3rem 0.7rem; background: var(--_fsl-surface);
      border-top: 1px solid var(--_fsl-border);
    }
    .state { color: var(--_fsl-text); font-weight: 600; }
    .badge { padding: 0 0.4rem; border-radius: 3px; background: var(--_fsl-accent); color: #06101f; font-weight: 600; }
    .spacer { flex: 1; }
    ${fslTokens}
  `;

  @state() private _state = '';
  @state() private _actions = 0;        // local: actions firable from the current state
  @state() private _transitions = 0;    // local: transitions out of the current state
  @state() private _terminal = false;
  @state() private _complete = false;
  @state() private _gActions = 0;       // global: distinct action names
  @state() private _gStarts = 0;        // global: action-starts (action-bearing edges)
  @state() private _gTransitions = 0;   // global: total transitions (all edges)

  private _observer: MutationObserver | null = null;
  private _host: FooterHost | null = null;
  private readonly _onRebuilt = (): void => { this._syncMachine(); };

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as FooterHost | null;
    this._host = host;
    if (host === null) { return; }
    const sync = (): void => {
      this._state = host.getAttribute('current-state') ?? '';
      const la = (host.getAttribute('legal-actions') ?? '').trim();
      this._actions = la === '' ? 0 : la.split(/\s+/).length;
      this._terminal = host.hasAttribute('terminal');
      this._complete = host.hasAttribute('complete');
      this._syncMachine();
    };
    this._observer = new MutationObserver(sync);
    this._observer.observe(host, {
      attributes: true,
      attributeFilter: ['current-state', 'legal-actions', 'terminal', 'complete'],
    });
    host.addEventListener('fsl-machine-rebuilt', this._onRebuilt);
    sync();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._observer !== null) { this._observer.disconnect(); this._observer = null; }
    if (this._host !== null) { this._host.removeEventListener('fsl-machine-rebuilt', this._onRebuilt); this._host = null; }
  }

  /** Recompute the machine-derived counts: local transitions out of the current
   *  state, and the global action / action-start / transition totals. Only
   *  called while a host is attached, so `_host` is non-null here. */
  private _syncMachine(): void {
    const host = this._host!;
    const current = host.getAttribute('current-state') ?? '';
    const edges = host.machine.list_edges();
    this._transitions = edges.filter(e => String(e.from) === current).length;
    const actionEdges = edges.filter(e => typeof e.action === 'string');
    this._gStarts = actionEdges.length;
    this._gActions = new Set(actionEdges.map(e => e.action)).size;
    this._gTransitions = edges.length;
  }

  render(): TemplateResult {
    return html`
      <div class="bar" part="bar">
        <span>${this._state ? html`<span class="state">${this._state}</span>, ` : ''}${plural(this._actions, 'action')}, ${plural(this._transitions, 'transition')}; globally ${plural(this._gActions, 'action')}, ${plural(this._gStarts, 'start')}, ${plural(this._gTransitions, 'transition')}</span>
        ${this._terminal ? html`<span class="badge">terminal</span>` : ''}
        ${this._complete ? html`<span class="badge">complete</span>` : ''}
        <span class="spacer"></span>
        <slot></slot>
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-footer': FslFooter; }
}
