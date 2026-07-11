import { LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { EditorView } from '@codemirror/view';
/** Shape of the `change` `CustomEvent.detail`: the editor's current FSL text. */
export interface FslEditorChangeDetail {
    fsl: string;
}
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
export declare class FslEditor extends LitElement {
    static styles: import("lit").CSSResult;
    /** FSL source text (two-way: reflects user edits, applies external writes). */
    fsl: string;
    /** When true, the document is read-only (selection still allowed). */
    readonly: boolean;
    /** Color theme; reflected so it also drives the `--fsl-*` token defaults. */
    theme: 'light' | 'dark';
    /** Disable the diagnostics/lint underlines. */
    noLint: boolean;
    /** Disable the semantic overlay (color chips, state/enum marks). */
    noOverlay: boolean;
    /** Disable context-aware autocompletion. */
    noCompletion: boolean;
    private _view;
    private readonly _themeC;
    private readonly _lintC;
    private readonly _overlayC;
    private readonly _completionC;
    private readonly _readonlyC;
    /** True while a programmatic doc write is in flight, to suppress the echo. */
    private _applyingProp;
    /** Write-back listener for a bound parent host, or null when standalone. */
    private _onChange;
    /** The theme bundle for the current `theme` value. */
    private _themeExt;
    /** The underlying CodeMirror view, or null before first render / after disconnect. */
    get view(): EditorView | null;
    /**
     * Dual-mode: when nested inside a `<fsl-instance>`, seed the editor from the
     * host's FSL and write edits back to it (the host rebuilds its machine — see
     * #1387). Standalone (no host ancestor) leaves the editor self-contained.
     */
    connectedCallback(): void;
    /**
     * Mount the CodeMirror view once the shadow DOM exists. Each toggleable
     * feature is seeded into its own {@link Compartment} from the matching
     * property, so later property changes reconfigure just that slice.
     */
    protected firstUpdated(): void;
    /** Reflect a genuine user edit back to the `fsl` property + `change` event. */
    private _onDocChanged;
    /**
     * Map reactive-property changes onto CodeMirror: sync the document, and
     * reconfigure each feature's compartment when its toggle flips.
     */
    protected willUpdate(changed: PropertyValues<this>): void;
    /** Apply an external `fsl` write to the document, guarding the echo. */
    private _syncDoc;
    disconnectedCallback(): void;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-editor': FslEditor;
    }
}
