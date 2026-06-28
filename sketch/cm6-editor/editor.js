import {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter,
  highlightActiveLine, drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";

// The bundled es6 build is self-contained (deps like reduce-to-639-1 are
// inlined), so the browser can load parse + compile without importmap
// entries for jssm's node dependencies.  The per-module dist/es6/*.js files
// carry bare imports and are NOT browser-loadable on their own.
import { parse, compile, gviz_shapes, named_colors, FslDirections } from "../../dist/jssm.es6.mjs";
import { diagnosticsFor }         from "./diagnostics.mjs";
import { fslSemanticOverlay }     from "./semantic_overlay.mjs";
import { fslCompletions }         from "./completion.mjs";
import { lightEditorTheme, darkEditorTheme } from "./editor_theme.mjs";
import { setupLayoutControl }     from "./layout.mjs";
import { makeSplitter }           from "./splitter.mjs";
import { fsl }                    from "../cm6-lang-fsl/index.js";
import "../../dist/cdn/viz.js";   // side-effect: registers <fsl-viz>, renders via @viz-js/viz (WASM)

const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  highlightActiveLine(),
  keymap.of([
    ...completionKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ]),
];

// Grammar-driven, context-aware completion (keys + values). Vocab for values
// comes from jssm's own exports so it can't drift from the renderer.
const fslAutocomplete = autocompletion({
  override: [ fslCompletions({ shapes: gviz_shapes, colors: named_colors, directions: FslDirections }) ],
  activateOnTyping: true,
});

const statusEl = document.getElementById("status");
const vizEl    = document.getElementById("viz-el");

const fslLinter = linter((view) => {
  const text = view.state.doc.toString();
  const { ok, status, diagnostics } = diagnosticsFor(text, parse, compile);

  statusEl.textContent   = status;
  statusEl.dataset.state = ok ? "ok" : "err";

  // Re-render the diagram only on a clean machine; a broken edit leaves the
  // last good render in place rather than blanking the pane.
  if (ok) { vizEl.fsl = text; }

  return diagnostics.map(d => ({
    from     : Math.min(d.from, text.length),
    to       : Math.min(Math.max(d.to, d.from + 1), text.length),
    severity : d.severity,
    message  : d.message,
  }));
});

// Theme-independent chrome (font + sizing); colors come from the compartment.
const baseTheme = EditorView.theme({
  "&":            { height: "100%", fontSize: "14px" },
  ".cm-scroller": { fontFamily: "ui-monospace, Consolas, monospace" },
});

// Light/dark editor colors live in a compartment so the toolbar can swap them
// without rebuilding the editor. Page chrome is themed via the `data-theme`
// attribute + CSS variables; both are driven together by `applyTheme` below.
const THEME_KEY = "fsl-sketch-theme";
const themeCompartment = new Compartment();
const editorThemeFor = (name) => (name === "dark" ? darkEditorTheme : lightEditorTheme);
let currentTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = currentTheme;

const sample = await fetch("./sample.fsl").then((r) => r.text());

// Exposed for live inspection / sketch debugging (e.g. dispatching docs).
window.view = new EditorView({
  doc: sample,
  parent: document.getElementById("editor"),
  extensions: [
    basicSetup,
    fsl(),
    fslSemanticOverlay(parse),
    fslAutocomplete,
    fslLinter,
    lintGutter(),
    baseTheme,
    themeCompartment.of(editorThemeFor(currentTheme)),
  ],
});

// Initial diagram render (the linter only fires on subsequent edits).
vizEl.fsl = sample;

/**
 * Make the rendered SVG scale to fill its pane (centered, aspect ratio kept).
 *
 * The SVG lives inside <fsl-viz>'s shadow root, which light-DOM CSS cannot
 * reach, so a constructable stylesheet is appended to the shadow root's
 * `adoptedStyleSheets`. Graphviz emits a `viewBox` with the default
 * `xMidYMid meet`, so sizing the SVG to 100% of the container scales the graph
 * to fit while preserving its aspect ratio and centering it; the pane's 2em
 * padding stays as the minimum gutter around it.
 *
 * The graph's own backdrop is a `<polygon>` that is the sole direct child of
 * `<g class="graph">` (jssm's default theme fills it `#eeeeee`). Recoloring
 * just that polygon to `var(--graph-bg)` — the `>` combinator excludes node/edge
 * polygons, nested deeper — keeps the backdrop seamless with the pane and
 * follows the light/dark theme (CSS custom properties inherit into shadow DOM).
 */
async function fitVizSvgToPane(el) {
  await customElements.whenDefined("fsl-viz");
  try { await el.updateComplete; } catch { /* not a Lit element / already ready */ }
  const root = el.shadowRoot;
  if (!root) { return; }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    ".container{display:flex;align-items:center;justify-content:center;width:100%;height:100%;}" +
    ".container svg{width:100%;height:100%;display:block;}" +
    ".container svg g.graph > polygon{fill:var(--graph-bg,#ddd);}"
  );
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

fitVizSvgToPane(vizEl);

/**
 * Keep edge (action) labels painted above all edges.
 *
 * SVG paint order is document order, so a later edge's line draws over an
 * earlier edge's label. Graphviz nests each label as `<text>` inside its own
 * `<g class="edge">`; moving every such text into a layer that is the last
 * child of `<g class="graph">` makes all labels paint on top of all edges.
 * Label coordinates are absolute within the graph transform, so relocating the
 * node doesn't move it. A MutationObserver re-applies this after each render;
 * once lifted the texts no longer match `g.edge > text`, so it doesn't loop.
 */
function keepEdgeLabelsOnTop(el) {
  const root = el.shadowRoot;
  if (!root) { return; }
  const SVGNS = "http://www.w3.org/2000/svg";

  const lift = () => {
    const graph  = root.querySelector("svg g.graph");
    const strays = graph ? graph.querySelectorAll("g.edge > text") : [];
    if (!graph || !strays.length) { return; }
    let layer = graph.querySelector(":scope > g.edge-label-layer");
    if (!layer) {
      layer = document.createElementNS(SVGNS, "g");
      layer.setAttribute("class", "edge-label-layer");
    }
    graph.appendChild(layer);                       // keep it last → paints on top
    strays.forEach((t) => layer.appendChild(t));    // appendChild moves the node
  };

  new MutationObserver(lift).observe(root, { childList: true, subtree: true });
  lift();
}

keepEdgeLabelsOnTop(vizEl);

// ---- Toolbar: theme toggle + help ------------------------------------------

const btnTheme = document.getElementById("btn-theme");
const btnHelp  = document.getElementById("btn-help");

/**
 * Apply a theme everywhere at once: the page chrome (`data-theme` + CSS vars),
 * the editor colors (compartment), the toolbar button's pressed state and icon,
 * and the saved preference.
 *
 * @param name `"light"` or `"dark"`.
 */
function applyTheme(name) {
  currentTheme = name;
  document.documentElement.dataset.theme = name;
  localStorage.setItem(THEME_KEY, name);
  window.view.dispatch({ effects: themeCompartment.reconfigure(editorThemeFor(name)) });

  const dark = name === "dark";
  btnTheme.setAttribute("aria-pressed", String(dark));
  btnTheme.title = dark ? "Switch to light mode" : "Switch to dark mode";
  btnTheme.querySelector(".i-sun").style.display  = dark ? "block" : "none";
  btnTheme.querySelector(".i-moon").style.display = dark ? "none" : "block";
}

btnTheme.addEventListener("click", () => applyTheme(currentTheme === "dark" ? "light" : "dark"));
applyTheme(currentTheme);   // sync button icon/pressed state to the restored preference

// ---- Docs panel: a real third pane, with its own resize --------------------

const shell      = document.getElementById("shell");
const workbench  = document.getElementById("workbench");
const docsPanel  = document.getElementById("docs");
const docsGutter = document.getElementById("docs-gutter");
const docsClose  = document.getElementById("docs-close");

const DOCS_KEY = "fsl-sketch-docs";
const savedDocs = (() => { try { return JSON.parse(localStorage.getItem(DOCS_KEY)) || {}; } catch { return {}; } })();
let docsRatio = typeof savedDocs.ratio === "number" ? savedDocs.ratio : 0.24;

const persistDocs   = (open) => localStorage.setItem(DOCS_KEY, JSON.stringify({ open, ratio: docsRatio }));
const applyDocsWidth = () => { docsPanel.style.flex = `0 0 ${(docsRatio * 100).toFixed(3)}%`; };

/** Show or hide the docs panel; drives the Help button's pressed state, and
 *  re-measures the editor since the workbench width changes. */
function setDocsOpen(open) {
  shell.dataset.docs = open ? "open" : "closed";
  btnHelp.setAttribute("aria-expanded", String(open));
  if (open) { applyDocsWidth(); }
  persistDocs(open);
  window.view.requestMeasure();
}

// The docs panel is right-docked, so the splitter measures from the right edge
// (`invert`). Double-clicking the gutter resets the width; resizing is persisted.
makeSplitter({
  container: shell, leadPane: docsPanel, otherPane: workbench, gutter: docsGutter,
  axis: "x", invert: true, min: 0.14, max: 0.6, resetTo: 0.24,
  onResize: (r) => { docsRatio = r; persistDocs(shell.dataset.docs === "open"); window.view.requestMeasure(); },
});

setDocsOpen(savedDocs.open === true);   // restore last open/closed state

btnHelp.addEventListener("click", () => setDocsOpen(shell.dataset.docs !== "open"));
docsClose.addEventListener("click", () => setDocsOpen(false));

// ---- View layout (pulldown: 7 modes) ---------------------------------------
// Re-measure the editor after each change so CodeMirror re-lays-out once its
// container has resized (e.g. coming back from a hidden/tabbed state).
setupLayoutControl({ onChange: () => window.view.requestMeasure() });
