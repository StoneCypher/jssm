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

/** Host whose arrangement + theme the toolbar drives. */
interface HostTarget extends HTMLElement { layout: FslLayout; theme: 'light' | 'dark'; }

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

/* Feature-toggle icons — Solar (CC BY 4.0) bold-duotone, inlined as SVG. Both
   tones use currentColor (secondary paths carry a baked opacity), so each icon
   themes with its button's text color and pressed state. viewBox 24×24. */
const ICON_LINT = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 10a7 7 0 0 1 14 0v5a7 7 0 1 1-14 0z" opacity=".5"/><path fill="currentColor" d="M9.75 15.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75m.75-5.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5zm6.916-7.126a.75.75 0 1 0-.832-1.248l-2.786 1.857a7 7 0 0 1 1.674.687zm1.414 5.834a7 7 0 0 0-.477-1.402l.07-.033l1.798-.72a.75.75 0 1 1 .557 1.393l-1.797.72q-.075.03-.151.042M19 13.75h3a.75.75 0 0 0 0-1.5h-3zm-1.058 4.952q.369-.589.616-1.25a.8.8 0 0 1 .22.052l2 .8a.75.75 0 0 1-.556 1.393l-2-.8a.75.75 0 0 1-.28-.195m-12.5-1.25q.247.661.616 1.25a.75.75 0 0 1-.28.195l-2 .8a.75.75 0 1 1-.557-1.393l2-.8a.8.8 0 0 1 .22-.052M5 12.25H2a.75.75 0 0 0 0 1.5h3zm.648-5.194a7 7 0 0 0-.478 1.402a1 1 0 0 1-.15-.042l-1.798-.72a.75.75 0 0 1 .557-1.392l1.797.719q.038.014.072.033m2.88-3.136L6.584 2.624a.75.75 0 0 1 .832-1.248l2.786 1.857a7 7 0 0 0-1.674.687"/></svg>`;
const ICON_CHIPS = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 18a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/><path fill="currentColor" d="M10 6v12a4 4 0 0 1-8 0V6a4 4 0 1 1 8 0" opacity=".4"/><path fill="currentColor" d="m9.248 20.336l3.974-3.975l5.838-6.09a4.042 4.042 0 0 0-5.776-5.655L10 7.9V18c0 .872-.279 1.679-.752 2.336" opacity=".7"/><path fill="currentColor" d="m13.222 16.362l-3.974 3.974A4 4 0 0 1 6 22h11.9a4 4 0 1 0 0-8h-2.414z"/></svg>`;
const ICON_COMPLETE = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.845 3.845a2.883 2.883 0 0 0 0 4.077L5.432 9.51c.012-.014.555.503.568.49l4-4c.013-.013-.504-.556-.49-.568L7.922 3.845a2.883 2.883 0 0 0-4.077 0m1.288 11.462a.483.483 0 0 1 .9 0l.157.4a.48.48 0 0 0 .272.273l.398.157a.486.486 0 0 1 0 .903l-.398.158a.48.48 0 0 0-.272.273l-.157.4a.483.483 0 0 1-.9 0l-.157-.4a.48.48 0 0 0-.272-.273l-.398-.158a.486.486 0 0 1 0-.903l.398-.157a.48.48 0 0 0 .272-.274z" opacity=".5"/><path fill="currentColor" d="M19.967 9.13a.483.483 0 0 1 .9 0l.156.399c.05.125.148.224.273.273l.398.158a.486.486 0 0 1 0 .902l-.398.158a.5.5 0 0 0-.273.273l-.156.4a.483.483 0 0 1-.9 0l-.157-.4a.5.5 0 0 0-.272-.273l-.398-.158a.486.486 0 0 1 0-.902l.398-.158a.5.5 0 0 0 .272-.273z" opacity=".2"/><path fill="currentColor" d="M16.1 2.307a.483.483 0 0 1 .9 0l.43 1.095a.48.48 0 0 0 .272.274l1.091.432a.486.486 0 0 1 0 .903l-1.09.432a.5.5 0 0 0-.273.273L17 6.81a.483.483 0 0 1-.9 0l-.43-1.095a.5.5 0 0 0-.273-.273l-1.09-.432a.486.486 0 0 1 0-.903l1.09-.432a.5.5 0 0 0 .273-.274z" opacity=".7"/><path fill="currentColor" d="M10.568 6.49c-.012.014-.555-.503-.568-.49l-4 4c-.013.013.504.556.49.568l9.588 9.587a2.883 2.883 0 1 0 4.078-4.077z"/></svg>`;

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
    .tb.icon { width: 1.9rem; min-width: 1.9rem; padding: 0; }
    .tb .ico { width: 1.15rem; height: 1.15rem; display: block; }
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
    if (this._host !== null)   { this._host.theme = theme; }     // whole-suite palette
    if (this._editor !== null) { this._editor.theme = theme; }   // editor CM highlight swap
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
    const theme  = this._host?.theme ?? 'light';
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
          <button class="tb icon" aria-pressed=${on('noLint')}       aria-label="Lint" title="Lint — diagnostics" @click=${() => this._toggleFeature('noLint')}>${ICON_LINT}</button>
          <button class="tb icon" aria-pressed=${on('noOverlay')}    aria-label="Color chips" title="Colour chips — semantic overlay" @click=${() => this._toggleFeature('noOverlay')}>${ICON_CHIPS}</button>
          <button class="tb icon" aria-pressed=${on('noCompletion')} aria-label="Autocomplete" title="Autocomplete" @click=${() => this._toggleFeature('noCompletion')}>${ICON_COMPLETE}</button>
        </div>
        <slot></slot>
      </div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-toolbar': FslToolbar; }
}
