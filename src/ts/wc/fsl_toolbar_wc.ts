import { LitElement, html, css, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';
import type { FslLayout } from './fsl_instance_wc.js';

/** Editor surface the toolbar drives (theme + feature toggles). */
interface EditorTarget extends HTMLElement {
  theme: 'light' | 'dark';
  noLint: boolean;
  noOverlay: boolean;
  noCompletion: boolean;
}

/** Host whose arrangement the toolbar drives. */
interface HostTarget extends HTMLElement { layout: FslLayout; }

/** The View-menu entries, in the sketch's order. */
const LAYOUTS: ReadonlyArray<{ value: FslLayout; label: string }> = [
  { value: 'auto',   label: 'Auto · by aspect ratio' },
  { value: 'lr',     label: 'Side by side · editor left' },
  { value: 'rl',     label: 'Side by side · editor right' },
  { value: 'tb',     label: 'Top & bottom · editor top' },
  { value: 'bt',     label: 'Top & bottom · editor bottom' },
  { value: 'editor', label: 'Just editor' },
  { value: 'viewer', label: 'Just viewer' },
  { value: 'tabs',   label: 'Tabbed' },
];

/**
 * `<fsl-toolbar>` — a Win32-style control bar for a parent `<fsl-instance>` and
 * its `<fsl-editor>`. Provides a light/dark theme toggle and the lint / overlay
 * / completion feature toggles (driving the editor), and a View menu of the
 * full layout set (driving the host). Standalone (no host/editor found) the
 * controls render inert. A trailing slot carries extra buttons.
 *
 * @element fsl-toolbar
 * @csspart toolbar - The bar container.
 * @slot - Trailing custom controls.
 */
export class FslToolbar extends LitElement {

  static styles = css`
    :host { display: block; }
    .toolbar {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.4rem 0.5rem; background: var(--_fsl-surface);
      border-bottom: 1px solid var(--_fsl-border); font: 0.8rem var(--_fsl-font);
    }
    .grp { display: inline-flex; position: relative; }
    .grp .tb { margin-left: -1px; } .grp .tb:first-child { margin-left: 0; }
    .tb {
      min-width: 2rem; height: 1.9rem; padding: 0 0.5rem; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
      border: 1px solid var(--_fsl-border); background: var(--_fsl-surface); color: var(--_fsl-text);
      font: 600 0.8rem var(--_fsl-font);
    }
    .tb:hover { background: color-mix(in srgb, var(--_fsl-text) 8%, var(--_fsl-surface)); }
    .tb[aria-pressed="true"], .tb[aria-expanded="true"] {
      background: var(--_fsl-accent); color: #06101f; box-shadow: inset 0 1px 2px rgba(0,0,0,0.28);
    }
    .menu {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 20; min-width: 210px;
      background: var(--_fsl-surface); border: 1px solid var(--_fsl-border); border-radius: 6px;
      padding: 5px; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .menu button {
      display: flex; align-items: center; width: 100%; box-sizing: border-box;
      background: none; border: 0; border-radius: 4px; padding: 6px 9px; gap: 8px;
      color: var(--_fsl-text); cursor: pointer; text-align: left; font: 0.82rem var(--_fsl-font);
    }
    .menu button:hover { background: color-mix(in srgb, var(--_fsl-text) 12%, transparent); }
    .menu button[aria-checked="true"] { font-weight: 700; }
    .menu button[aria-checked="true"]::after { content: "✓"; margin-left: auto; color: var(--_fsl-accent); }
    .label { color: var(--_fsl-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; }
    .spacer { flex: 1; }
    ${fslTokens}
  `;

  @state() private _menuOpen = false;
  private _host: HostTarget | null = null;
  private _editor: EditorTarget | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as HostTarget | null;
    this._host = host;
    this._editor = host === null ? null : host.querySelector<EditorTarget>('fsl-editor');
  }

  private _setTheme(theme: 'light' | 'dark'): void {
    if (this._editor !== null) { this._editor.theme = theme; }
    this.requestUpdate();
  }

  private _toggleFeature(prop: 'noLint' | 'noOverlay' | 'noCompletion'): void {
    if (this._editor !== null) { this._editor[prop] = !this._editor[prop]; }
    this.requestUpdate();
  }

  private _setLayout(layout: FslLayout): void {
    if (this._host !== null) { this._host.layout = layout; }
    this._menuOpen = false;
  }

  private _toggleMenu(): void { this._menuOpen = !this._menuOpen; }

  render(): TemplateResult {
    const theme  = this._editor?.theme ?? 'light';
    const layout = this._host?.layout ?? '';
    const on = (prop: 'noLint' | 'noOverlay' | 'noCompletion'): boolean => !(this._editor?.[prop] ?? false);

    return html`
      <div class="toolbar" part="toolbar" role="toolbar" aria-label="Editor controls">
        <span class="label">theme</span>
        <div class="grp">
          <button class="tb" aria-pressed=${theme === 'light'} title="Light" @click=${() => this._setTheme('light')}>☀</button>
          <button class="tb" aria-pressed=${theme === 'dark'}  title="Dark"  @click=${() => this._setTheme('dark')}>☾</button>
        </div>
        <span class="label">view</span>
        <div class="grp">
          <button class="tb" aria-haspopup="true" aria-expanded=${this._menuOpen} @click=${this._toggleMenu}>▥ View ▾</button>
          ${this._menuOpen ? html`
            <div class="menu" role="menu">
              ${LAYOUTS.map(o => html`
                <button role="menuitemradio" aria-checked=${layout === o.value} @click=${() => this._setLayout(o.value)}>${o.label}</button>`)}
            </div>` : ''}
        </div>
        <span class="spacer"></span>
        <span class="label">features</span>
        <div class="grp">
          <button class="tb" aria-pressed=${on('noLint')}       @click=${() => this._toggleFeature('noLint')}>Lint</button>
          <button class="tb" aria-pressed=${on('noOverlay')}    @click=${() => this._toggleFeature('noOverlay')}>Chips</button>
          <button class="tb" aria-pressed=${on('noCompletion')} @click=${() => this._toggleFeature('noCompletion')}>Complete</button>
        </div>
        <slot></slot>
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-toolbar': FslToolbar; }
}
