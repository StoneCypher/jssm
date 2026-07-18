var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
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
    constructor() {
        super(...arguments);
        /** FSL source text (two-way: reflects user edits, applies external writes). */
        this.fsl = '';
        /** When true, the document is read-only (selection still allowed). */
        this.readonly = false;
        /** Color theme; reflected so it also drives the `--fsl-*` token defaults. */
        this.theme = 'light';
        /** Disable the diagnostics/lint underlines. */
        this.noLint = false;
        /** Disable the semantic overlay (color chips, state/enum marks). */
        this.noOverlay = false;
        /** Disable context-aware autocompletion. */
        this.noCompletion = false;
        this._view = null;
        this._themeC = new Compartment();
        this._lintC = new Compartment();
        this._overlayC = new Compartment();
        this._completionC = new Compartment();
        this._readonlyC = new Compartment();
        /** True while a programmatic doc write is in flight, to suppress the echo. */
        this._applyingProp = false;
        /** Write-back listener for a bound parent host, or null when standalone. */
        this._onChange = null;
    }
    /** The theme bundle for the current `theme` value. */
    _themeExt() { return this.theme === 'dark' ? darkEditorTheme : lightEditorTheme; }
    /** The underlying CodeMirror view, or null before first render / after disconnect. */
    get view() { return this._view; }
    /**
     * Dual-mode: when nested inside a `<fsl-instance>`, seed the editor from the
     * host's FSL and write edits back to it (the host rebuilds its machine — see
     * #1387). Standalone (no host ancestor) leaves the editor self-contained.
     */
    connectedCallback() {
        super.connectedCallback();
        const host = closest_wc(this, 'instance');
        if (!host) {
            return;
        }
        if (host.fsl) {
            this.fsl = host.fsl;
        }
        const handler = (e) => { host.fsl = e.detail.fsl; };
        this._onChange = handler;
        this.addEventListener('change', handler);
    }
    /**
     * Mount the CodeMirror view once the shadow DOM exists. Each toggleable
     * feature is seeded into its own {@link Compartment} from the matching
     * property, so later property changes reconfigure just that slice.
     */
    firstUpdated() {
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
                    keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap]),
                    this._themeC.of(this._themeExt()),
                    this._lintC.of(this.noLint ? [] : fslLintExtension()),
                    this._overlayC.of(this.noOverlay ? [] : fslOverlayExtension()),
                    this._completionC.of(this.noCompletion ? [] : fslCompletionExtension()),
                    this._readonlyC.of(EditorState.readOnly.of(this.readonly)),
                    EditorView.updateListener.of(u => { if (u.docChanged) {
                        this._onDocChanged();
                    } }),
                ],
            }),
            parent,
        });
    }
    /** Reflect a genuine user edit back to the `fsl` property + `change` event. */
    _onDocChanged() {
        if (this._applyingProp) {
            return;
        }
        const text = this._view.state.doc.toString();
        this.fsl = text;
        this.dispatchEvent(new CustomEvent('change', {
            detail: { fsl: text }, bubbles: true, composed: true,
        }));
    }
    /**
     * Map reactive-property changes onto CodeMirror: sync the document, and
     * reconfigure each feature's compartment when its toggle flips.
     */
    willUpdate(changed) {
        if (!this._view) {
            return;
        }
        if (changed.has('fsl')) {
            this._syncDoc();
        }
        if (changed.has('theme')) {
            this._view.dispatch({ effects: this._themeC.reconfigure(this._themeExt()) });
        }
        if (changed.has('noLint')) {
            this._view.dispatch({ effects: this._lintC.reconfigure(this.noLint ? [] : fslLintExtension()) });
        }
        if (changed.has('noOverlay')) {
            this._view.dispatch({ effects: this._overlayC.reconfigure(this.noOverlay ? [] : fslOverlayExtension()) });
        }
        if (changed.has('noCompletion')) {
            this._view.dispatch({ effects: this._completionC.reconfigure(this.noCompletion ? [] : fslCompletionExtension()) });
        }
        if (changed.has('readonly')) {
            this._view.dispatch({ effects: this._readonlyC.reconfigure(EditorState.readOnly.of(this.readonly)) });
        }
    }
    /** Apply an external `fsl` write to the document, guarding the echo. */
    _syncDoc() {
        const cur = this._view.state.doc.toString();
        if (cur === this.fsl) {
            return;
        }
        this._applyingProp = true;
        this._view.dispatch({ changes: { from: 0, to: cur.length, insert: this.fsl } });
        this._applyingProp = false;
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._onChange) {
            this.removeEventListener('change', this._onChange);
            this._onChange = null;
        }
        if (this._view) {
            this._view.destroy();
            this._view = null;
        }
    }
    render() { return html `<div part="editor" class="editor"></div>`; }
}
FslEditor.styles = css `
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
__decorate([
    property({ type: String })
], FslEditor.prototype, "fsl", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], FslEditor.prototype, "readonly", void 0);
__decorate([
    property({ type: String, reflect: true })
], FslEditor.prototype, "theme", void 0);
__decorate([
    property({ type: Boolean, attribute: 'no-lint' })
], FslEditor.prototype, "noLint", void 0);
__decorate([
    property({ type: Boolean, attribute: 'no-overlay' })
], FslEditor.prototype, "noOverlay", void 0);
__decorate([
    property({ type: Boolean, attribute: 'no-completion' })
], FslEditor.prototype, "noCompletion", void 0);
