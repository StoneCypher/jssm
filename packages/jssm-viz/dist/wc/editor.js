import { css, LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ViewPlugin, Decoration, EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, keymap } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { LanguageSupport, StreamLanguage, HighlightStyle, syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { linter, lintKeymap } from '@codemirror/lint';
import { tags, Tag } from '@lezer/highlight';
import { fslSemanticSpans, fslCompletions, fslDiagnostics } from 'jssm';

/**
 * CodeMirror 6 language support for FSL (the source language of jssm
 * finite-state machines), exposed at the `jssm/cm6` subpath.
 *
 * Built on `StreamLanguage` (token-stream based, not a Lezer tree grammar) —
 * a deliberate v1 choice (see `notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`):
 * the tokenizer never blocks on the parser, so a failing parse never kills
 * highlighting. The companion linter (driven by `fsl_parser.parse()`) supplies
 * error squiggles separately.
 *
 * The keyword vocabulary is reconciled against the live grammar
 * (`src/ts/fsl_parser.peg`) and guarded by `fsl_language.spec.ts`, which
 * extracts the grammar's config keys and fails if any is not recognized here —
 * so the highlighter cannot silently drift out of date the way the original
 * `sketch/cm6-lang-fsl` did.
 */
/**
 * Tag modifier marking FSL syntax that still parses but is deprecated (e.g.
 * the flat `graph_bg_color` key, superseded by the `graph: {}` block). Applied
 * to a base tag — `fslDeprecated(tags.propertyName)` — and rendered distinctly
 * by {@link fslHighlightStyle} (struck through) so editors can flag stale
 * syntax. StreamLanguage expresses this through its `tokenTable`; see
 * {@link fslStreamParser}.
 */
const fslDeprecated = Tag.defineModifier('fslDeprecated');
/**
 * Structural / declaration keywords — block openers and the `property`
 * declaration keyword. Highlighted as `keyword`.
 */
const STRUCTURAL_KEYWORDS = new Set([
    'state', 'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state',
    'action', 'transition', 'validation', 'configuration', 'graph', 'editor', 'hooks',
    'property', 'required', 'default',
]);
/**
 * Configuration / property / style keys (the left side of a `key: value;`
 * config line). Highlighted as `propertyName`. Reconciled against the
 * `"<key>" WS? ":"` rules in `fsl_parser.peg` and guarded by the drift test.
 */
const PROPERTY_KEYWORDS = new Set([
    // machine metadata
    'machine_name', 'machine_version', 'machine_author', 'machine_license',
    'machine_comment', 'machine_contributor', 'machine_definition',
    'machine_language', 'machine_reference', 'npm_name', 'fsl_version',
    // graph / layout
    'graph_layout', 'start_states', 'end_states', 'failed_outputs',
    'allows_override', 'allow_islands', 'edge_color', 'theme', 'flow',
    'dot_preamble', 'default_size',
    // per-element style keys
    'label', 'color', 'shape', 'corners', 'linestyle', 'image', 'url',
    // hyphenated style keys (read as a single compound token by the tokenizer)
    'background-color', 'text-color', 'border-color', 'edge-color', 'line-style',
    // editor: {} block keys (fsl#1334)
    'stochastic_run_count', 'panels',
]);
/**
 * Keys that still parse but are deprecated. Highlighted with the
 * {@link fslDeprecated} modifier so editors can visibly flag them.
 */
const DEPRECATED_KEYWORDS = new Set([
    'graph_bg_color', // superseded by the `graph: {}` block
]);
/**
 * Enumerated literal values (layout engines, corner/line styles, directions,
 * booleans, theme names). Highlighted as `atom`.
 */
const ENUM_KEYWORDS = new Set([
    'true', 'false', 'none', 'default', 'modern', 'ocean', 'bold',
    'dot', 'circo', 'fdp', 'neato', 'twopi',
    'up', 'right', 'down', 'left',
    'solid', 'dotted', 'dashed',
    'regular', 'rounded', 'lined',
    'MIT',
]);
/** Custom token-type string emitted for deprecated keywords; mapped in `tokenTable`. */
const DEPRECATED_TOKEN = 'fslDeprecatedKeyword';
const ARROWS = /^(?:<-=>|<-~>|<=->|<=~>|<~->|<~=>|<->|<=>|<~>|->|<-|=>|<=|~>|<~|[↔←→⇔⇐⇒↮↚↛])/;
const COMPARATORS = /^(?:>=|<=|>|<)/;
// Mirrors the grammar's AtomFirstLetter / AtomLetter rules (fsl_parser.peg:263-267).
// The high-unicode tail is the range U+0080..U+FFFF (escaped below). The
// original sketch anchored the range at the comma, wrongly swallowing { } ; : |.
const ATOM_START = /[\w.!$^*?,\u{80}-\u{FFFF}]/u;
const ATOM_BODY = /[\w.+^()*&$#@!?,\u{80}-\u{FFFF}]/u;
/**
 * The StreamLanguage tokenizer for FSL. Classifies each token into a standard
 * CodeMirror highlight name, or {@link DEPRECATED_TOKEN} (mapped through
 * `tokenTable` to `fslDeprecated(tags.propertyName)`).
 */
const fslStreamParser = {
    name: 'fsl',
    startState: () => ({ inBlockComment: false }),
    token(stream, state) {
        if (state.inBlockComment) {
            while (!stream.eol()) {
                if (stream.match('*/')) {
                    state.inBlockComment = false;
                    return 'comment';
                }
                stream.next();
            }
            return 'comment';
        }
        if (stream.eatSpace()) {
            return null;
        }
        if (stream.match('//')) {
            stream.skipToEnd();
            return 'comment';
        }
        if (stream.match('/*')) {
            state.inBlockComment = true;
            return 'comment';
        }
        if (stream.match(/^"(?:\\.|[^"\\])*"?/)) {
            return 'string';
        }
        if (stream.match(/^'(?:\\.|[^'\\])*'?/)) {
            return 'labelName';
        }
        if (stream.match(ARROWS)) {
            return 'operator';
        }
        if (stream.match(COMPARATORS)) {
            return 'operator';
        }
        if (stream.match(/^\d+(?:\.\d+)*/)) {
            return 'number';
        }
        if (stream.match(/^&[A-Z_]\w*/i)) {
            return 'variableName.special';
        }
        // Invariant: the loop guards `!eol` and `eatSpace()` returned false above,
        // so a non-space character is present and `peek()` is defined here.
        const ch = stream.peek();
        if (ATOM_START.test(ch)) {
            let tok = '';
            let next = stream.peek();
            while (next !== undefined) {
                // An interior hyphen (between word chars) joins a compound key like
                // `background-color`; a trailing one (before `>` of `->`, or at EOL)
                // does not. `slice` yields '' past the end, so no nullish branch.
                const interior_hyphen = next === '-' && ATOM_BODY.test(stream.string.slice(stream.pos + 1, stream.pos + 2));
                if (ATOM_BODY.test(next) || interior_hyphen) {
                    tok += stream.next();
                }
                else {
                    break;
                }
                next = stream.peek();
            }
            if (DEPRECATED_KEYWORDS.has(tok)) {
                return DEPRECATED_TOKEN;
            }
            if (STRUCTURAL_KEYWORDS.has(tok)) {
                return 'keyword';
            }
            if (PROPERTY_KEYWORDS.has(tok)) {
                return 'propertyName';
            }
            if (ENUM_KEYWORDS.has(tok)) {
                return 'atom';
            }
            return 'variableName';
        }
        if (stream.match(/^[[\]{}()]/)) {
            return 'bracket';
        }
        if (stream.match(/^[;:,|]/)) {
            return 'punctuation';
        }
        stream.next();
        return null;
    },
    tokenTable: {
        [DEPRECATED_TOKEN]: fslDeprecated(tags.propertyName),
    },
    languageData: {
        commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    },
};
/**
 * CodeMirror 6 `Language` for FSL. Most consumers use {@link fsl} instead.
 */
const fslLanguage = StreamLanguage.define(fslStreamParser);
/**
 * Recommended highlight style. Beyond the editor theme's own keyword/string/etc.
 * rules, this renders {@link fslDeprecated} tokens struck-through and dimmed, so
 * deprecated FSL syntax is visible at a glance. Include it alongside your theme;
 * a bare theme without it simply won't distinguish deprecated keywords.
 */
HighlightStyle.define([
    { tag: fslDeprecated(tags.propertyName), textDecoration: 'line-through', opacity: '0.6' },
]);
/**
 * CodeMirror 6 `LanguageSupport` for FSL. Drop into an editor's `extensions`.
 * @returns A `LanguageSupport` extension for FSL highlighting.
 * @example
 *   import { EditorView, basicSetup } from 'codemirror';
 *   import { fsl } from 'jssm/cm6';
 *   new EditorView({ doc: "a 'go' -> b;", parent: document.body,
 *                    extensions: [ basicSetup, fsl() ] });
 */
function fsl() {
    return new LanguageSupport(fslLanguage);
}

/**
 * CodeMirror adapters over the editor-agnostic FSL language service. Each
 * factory turns the neutral service output (`fslDiagnostics`, `fslCompletions`,
 * `fslSemanticSpans`) into a CodeMirror extension. The pure mapping functions
 * are exported alongside the extensions so they can be unit-tested directly.
 */
// ---- diagnostics -----------------------------------------------------------
/** Map FSL diagnostics to CodeMirror diagnostics, clamped to the document. */
function fslToCmDiagnostics(text, docLength) {
    return fslDiagnostics(text).map(d => ({
        from: Math.min(d.range.from, docLength),
        to: Math.min(Math.max(d.range.to, d.range.from + 1), docLength),
        severity: d.severity,
        message: d.message,
    }));
}
/** Linter source: diagnostics for the view's current document. */
function fslLintSource(view) {
    return fslToCmDiagnostics(view.state.doc.toString(), view.state.doc.length);
}
/** Lint extension wiring `fslLintSource` into `@codemirror/lint`. */
function fslLintExtension() { return linter(fslLintSource); }
// ---- completion ------------------------------------------------------------
/** Map a service completion kind to a CodeMirror completion `type`. */
function cmType(kind) { return kind === 'key' ? 'property' : 'enum'; }
/** Completion source: context-aware FSL completions at the caret. */
function fslCompletionSource(context) {
    const line = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);
    const typed = /([\w-]*)$/.exec(before)[1];
    const items = fslCompletions(context.state.doc.toString(), context.pos);
    if (items.length === 0) {
        return null;
    }
    return {
        from: context.pos - typed.length,
        options: items.map(i => ({ label: i.label, type: cmType(i.kind), detail: i.detail })),
        validFor: /^[\w-]*$/,
    };
}
/** Autocomplete extension overriding sources with `fslCompletionSource`. */
function fslCompletionExtension() { return autocompletion({ override: [fslCompletionSource] }); }
// ---- semantic overlay ------------------------------------------------------
/** Build the decoration set (color / state / enum marks) for `text`. */
function buildFslDecorations(text) {
    const decos = fslSemanticSpans(text)
        .sort((a, b) => a.from - b.from)
        .map(s => Decoration.mark({
        class: `fsl-${s.kind}`,
        // chip styling is color-span-specific: a color span's value is a CSS
        // color for the --fsl-chip swatch. State spans also carry a value (the
        // AST-resolved state name) but a name is not a paint — gating on kind,
        // not value presence, keeps chips off state/enum marks.
        attributes: s.kind === 'color' ? { title: s.value, style: `--fsl-chip:${s.value}` } : {},
    }).range(s.from, s.to));
    return Decoration.set(decos, true);
}
/** Overlay extension: a view plugin that rebuilds decorations on doc change. */
function fslOverlayExtension() {
    return ViewPlugin.fromClass(class {
        constructor(view) { this.decorations = buildFslDecorations(view.state.doc.toString()); }
        update(u) { if (u.docChanged) {
            this.decorations = buildFslDecorations(u.state.doc.toString());
        } }
    }, { decorations: v => v.decorations });
}

/**
 * Light and dark CodeMirror themes for `fsl-editor`, as extension bundles for a
 * `Compartment` swap. Chrome colors read the shared `--_fsl-*` appearance tokens
 * (so the editor white-labels with the rest of the suite); the dark highlight
 * style maps the FSL stream tokenizer's tags to a palette that reads on a dark
 * background. Ported from the verified sketch editor theme.
 */
const lightChrome = EditorView.theme({
    '&': { backgroundColor: 'var(--_fsl-surface, #ffffff)', color: 'var(--_fsl-text, #222222)' },
    '.cm-gutters': { background: 'var(--_fsl-surface, #fafafa)', color: 'var(--_fsl-muted, #9aa0a6)', borderRight: '1px solid var(--_fsl-border, #eee)' },
    '.cm-activeLine': { backgroundColor: 'rgba(91,157,255,0.06)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--_fsl-text, #222)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--_fsl-accent, #5b9dff) 28%, transparent)' },
}, { dark: false });
const darkChrome = EditorView.theme({
    '&': { backgroundColor: 'var(--_fsl-surface, #1e1e22)', color: 'var(--_fsl-text, #d6d6d6)' },
    '.cm-gutters': { background: 'var(--_fsl-surface, #1a1a1e)', color: 'var(--_fsl-muted, #5a5f66)', borderRight: '1px solid var(--_fsl-border, #2a2a2e)' },
    '.cm-activeLine': { backgroundColor: 'rgba(130,170,255,0.08)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--_fsl-text, #d6d6d6)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--_fsl-accent, #82aaff) 32%, transparent)' },
}, { dark: true });
const darkHighlight = HighlightStyle.define([
    { tag: tags.keyword, color: '#c792ea' },
    { tag: tags.propertyName, color: '#82aaff' },
    { tag: [tags.string, tags.labelName], color: '#c3e88d' },
    { tag: tags.comment, color: '#5f7e97', fontStyle: 'italic' },
    { tag: [tags.atom, tags.bool], color: '#f78c6c' },
    { tag: tags.number, color: '#f78c6c' },
    { tag: tags.operator, color: '#89ddff' },
    { tag: tags.variableName, color: '#d6d6d6' },
    { tag: tags.special(tags.variableName), color: '#addb67' },
    { tag: [tags.punctuation, tags.separator], color: '#89ddff' },
    { tag: [tags.bracket, tags.squareBracket, tags.brace, tags.paren], color: '#c5c9d0' },
]);
/** Light editor theme bundle (token-fed chrome + default highlight style). */
const lightEditorTheme = [
    lightChrome,
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];
/** Dark editor theme bundle (token-fed chrome + dark highlight, default fallback). */
const darkEditorTheme = [
    darkChrome,
    syntaxHighlighting(darkHighlight),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];

/**
 * Shared FSL appearance contract — the `--fsl-*` design-token vocabulary.
 *
 * Components include this in `static styles` and consume the **private**
 * `--_fsl-*` vars, which resolve: embedder's public `--fsl-*` token →
 * `[theme="dark"]` default → built-in light fallback. White-label by setting
 * `--fsl-*` on any ancestor (custom properties inherit through shadow DOM);
 * flip the built-in default with the host's `theme="dark"` attribute.
 *
 * Companion conventions (declared per-component): expose structural elements as
 * `::part(...)` (e.g. `part="toolbar"`, `"gutter"`, `"editor"`) and forward
 * child parts with `exportparts`; chrome components carry brand slots
 * (`<slot name="brand">` / `"logo">`).
 */
const fslTokens = css `
  :host {
    --_fsl-surface: var(--fsl-color-surface, #ffffff);
    --_fsl-text:    var(--fsl-color-text,    #222222);
    --_fsl-accent:  var(--fsl-color-accent,  #5b9dff);
    --_fsl-border:  var(--fsl-color-border,  #e5e5e5);
    --_fsl-muted:   var(--fsl-color-muted,   #9aa0a6);
    --_fsl-font:      var(--fsl-font,      system-ui, -apple-system, "Segoe UI", sans-serif);
    --_fsl-font-mono: var(--fsl-font-mono, ui-monospace, Consolas, monospace);
    --_fsl-radius:  var(--fsl-radius, 6px);
    --_fsl-space-1: var(--fsl-space-1, 4px);
    --_fsl-space-2: var(--fsl-space-2, 8px);
    --_fsl-space-3: var(--fsl-space-3, 12px);
    --_fsl-space-4: var(--fsl-space-4, 16px);
  }
  :host([theme="dark"]) {
    --_fsl-surface: var(--fsl-color-surface, #1e1e22);
    --_fsl-text:    var(--fsl-color-text,    #d6d6d6);
    --_fsl-accent:  var(--fsl-color-accent,  #82aaff);
    --_fsl-border:  var(--fsl-color-border,  #2a2a2e);
    --_fsl-muted:   var(--fsl-color-muted,   #5a5f66);
  }
`;

/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */
/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` or `jssm-<suffix>`
 * (case-insensitive).
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`, `"jssm-viz"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>`.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');   // true
 * wc_suffix_matches('jssm-viz', 'viz');  // true
 * wc_suffix_matches('div', 'viz');       // false
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>` or `jssm-<suffix>`, or `null` if none exists.
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 * @see wc_suffix_matches
 */
function closest_wc(el, suffix) {
    return el.closest(`fsl-${suffix}, jssm-${suffix}`);
}

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
class FslEditor extends LitElement {
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

export { FslEditor };
