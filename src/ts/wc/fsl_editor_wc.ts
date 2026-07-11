import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { completionKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { fsl } from '../cm6/fsl_language.js';
import { fslLintExtension, fslCompletionExtension, fslOverlayExtension } from './editor/cm_adapters.js';
import { lightEditorTheme, darkEditorTheme } from './editor/cm_theme.js';
import { fslTokens } from './fsl_tokens.js';
import { closest_wc } from './wc_tag_helpers.js';

/** Shape of the `change` `CustomEvent.detail`: the editor's current FSL text. */
export interface FslEditorChangeDetail { fsl: string; }

/** Minimal shape of a parent `<fsl-instance>` host the editor drives in dual mode. */
interface FslEditorHost extends HTMLElement { fsl: string; }

/**
 * `<fsl-editor>` — a CodeMirror-based FSL editor web component.
 *
 * Batteries-included: FSL highlighting (`jssm/cm6`), linting, a semantic
 * overlay (color chips / state & enum marks), and context-aware completion —
 * each toggleable via a `no-*` attribute. Light/dark via the reflected `theme`
 * attribute (which also drives the `--fsl-*` token defaults). White-labeled
 * through the shared appearance contract. Emits `change` on user edits.
 * @element fsl-editor
 * @fires {CustomEvent<FslEditorChangeDetail>} change - On every user edit (not on programmatic `fsl` writes).
 * @csspart editor - The CodeMirror editor container.
 */
export class FslEditor extends LitElement {

  static styles = css`
    :host { display: block; min-height: var(--fsl-editor-min-height, 8em); }
    .editor, .cm-editor { height: 100%; }
    .cm-editor { font-family: var(--_fsl-font-mono); border-radius: var(--_fsl-radius); }
    /* Semantic overlay marks (added by the overlay view plugin). */
    .fsl-color::before {
      content: ''; display: inline-block; width: 0.78em; height: 0.78em;
      margin-right: 0.28em; vertical-align: middle; border-radius: 2px;
      border: 1px solid var(--_fsl-border); background: var(--fsl-chip, transparent);
    }
    /* State names (transition endpoints + declaration subjects) and shape/enum
       values, marked from the parsed AST. Token-overridable, theme-aware so the
       marks stay legible on both the light and dark editor chrome. */
    .fsl-state { color: var(--fsl-color-state, #5b3da8); font-weight: 600; }
    .fsl-enum  { color: var(--fsl-color-enum,  #b8860b); font-style: italic; }
    :host([theme="dark"]) .fsl-state { color: var(--fsl-color-state, #c792ea); }
    :host([theme="dark"]) .fsl-enum  { color: var(--fsl-color-enum,  #e0a96d); }
    ${fslTokens}
  `;

  /** FSL source text (two-way: reflects user edits, applies external writes). */
  @property({ type: String }) fsl = '';

  /** When true, the document is read-only (selection still allowed). */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** Color theme; reflected so it also drives the `--fsl-*` token defaults. */
  @property({ type: String, reflect: true }) theme: 'light' | 'dark' = 'light';

  /** Disable the diagnostics/lint underlines. */
  @property({ type: Boolean, attribute: 'no-lint' }) noLint = false;

  /** Disable the semantic overlay (color chips, state/enum marks). */
  @property({ type: Boolean, attribute: 'no-overlay' }) noOverlay = false;

  /** Disable context-aware autocompletion. */
  @property({ type: Boolean, attribute: 'no-completion' }) noCompletion = false;

  private _view: EditorView | null = null;
  private readonly _themeC      = new Compartment();
  private readonly _lintC       = new Compartment();
  private readonly _overlayC    = new Compartment();
  private readonly _completionC = new Compartment();
  private readonly _readonlyC   = new Compartment();
  /** True while a programmatic doc write is in flight, to suppress the echo. */
  private _applyingProp = false;
  /** Write-back listener for a bound parent host, or null when standalone. */
  private _onChange: ((e: Event) => void) | null = null;

  /** The theme bundle for the current `theme` value. */
  private _themeExt() { return this.theme === 'dark' ? darkEditorTheme : lightEditorTheme; }

  /** The underlying CodeMirror view, or null before first render / after disconnect. */
  get view(): EditorView | null { return this._view; }

  /**
   * Dual-mode: when nested inside a `<fsl-instance>`, seed the editor from the
   * host's FSL and write edits back to it (the host rebuilds its machine — see
   * #1387). Standalone (no host ancestor) leaves the editor self-contained.
   */
  connectedCallback(): void {
    super.connectedCallback();
    const host = closest_wc(this, 'instance') as FslEditorHost | null;
    if (!host) { return; }
    if (host.fsl) { this.fsl = host.fsl; }
    const handler = (e: Event): void => { host.fsl = (e as CustomEvent<FslEditorChangeDetail>).detail.fsl; };
    this._onChange = handler;
    this.addEventListener('change', handler);
  }

  /**
   * Mount the CodeMirror view once the shadow DOM exists. Each toggleable
   * feature is seeded into its own {@link Compartment} from the matching
   * property, so later property changes reconfigure just that slice.
   */
  protected firstUpdated(): void {
    const parent = this.renderRoot.querySelector('[part="editor"]');
    this._view = new EditorView({
      state: EditorState.create({
        doc: this.fsl,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          EditorState.allowMultipleSelections.of(true),
          fsl(),
          history(),
          keymap.of([ ...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap ]),
          this._themeC.of(this._themeExt()),
          this._lintC.of(this.noLint ? [] : fslLintExtension()),
          this._overlayC.of(this.noOverlay ? [] : fslOverlayExtension()),
          this._completionC.of(this.noCompletion ? [] : fslCompletionExtension()),
          this._readonlyC.of(EditorState.readOnly.of(this.readonly)),
          EditorView.updateListener.of(u => { if (u.docChanged) { this._onDocChanged(); } }),
        ],
      }),
      parent,
    });
  }

  /** Reflect a genuine user edit back to the `fsl` property + `change` event. */
  private _onDocChanged(): void {
    if (this._applyingProp) { return; }
    const text = this._view.state.doc.toString();
    this.fsl = text;
    this.dispatchEvent(new CustomEvent<FslEditorChangeDetail>('change', {
      detail: { fsl: text }, bubbles: true, composed: true,
    }));
  }

  /**
   * Map reactive-property changes onto CodeMirror: sync the document, and
   * reconfigure each feature's compartment when its toggle flips.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (!this._view) { return; }
    if (changed.has('fsl'))          { this._syncDoc(); }
    if (changed.has('theme'))        { this._view.dispatch({ effects: this._themeC.reconfigure(this._themeExt()) }); }
    if (changed.has('noLint'))       { this._view.dispatch({ effects: this._lintC.reconfigure(this.noLint ? [] : fslLintExtension()) }); }
    if (changed.has('noOverlay'))    { this._view.dispatch({ effects: this._overlayC.reconfigure(this.noOverlay ? [] : fslOverlayExtension()) }); }
    if (changed.has('noCompletion')) { this._view.dispatch({ effects: this._completionC.reconfigure(this.noCompletion ? [] : fslCompletionExtension()) }); }
    if (changed.has('readonly'))     { this._view.dispatch({ effects: this._readonlyC.reconfigure(EditorState.readOnly.of(this.readonly)) }); }
  }

  /** Apply an external `fsl` write to the document, guarding the echo. */
  private _syncDoc(): void {
    const cur = this._view.state.doc.toString();
    if (cur === this.fsl) { return; }
    this._applyingProp = true;
    this._view.dispatch({ changes: { from: 0, to: cur.length, insert: this.fsl } });
    this._applyingProp = false;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._onChange) { this.removeEventListener('change', this._onChange); this._onChange = null; }
    if (this._view) { this._view.destroy(); this._view = null; }
  }

  render(): TemplateResult { return html`<div part="editor" class="editor"></div>`; }

}

declare global {
  interface HTMLElementTagNameMap { 'fsl-editor': FslEditor; }
}
