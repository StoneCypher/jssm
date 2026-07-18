/**
 * AST-driven semantic overlay for the FSL sketch editor.
 *
 * The base `StreamLanguage` highlighter is context-free: it classifies each
 * atom purely by keyword-set membership, so it cannot tell a color value from a
 * state name from a shape enum once they leave the keyword tables. This overlay
 * closes those gaps by leaning on the *real* PEG grammar rather than
 * re-encoding it: it runs `parse(text, { locations: true })` — the same parse
 * the linter performs — walks the located AST, and decorates spans by the role
 * the grammar assigned them. No parallel keyword tables are maintained, so
 * nothing here can drift from the grammar.
 *
 * Three roles are upgraded, each a case the flat tokenizer gets wrong:
 *
 *   - **Color values** get an inline swatch chip in the resolved color. The
 *     value text itself is left to the base layer (so a color name keeps its
 *     ordinary token color and pale colors stay legible). Identified by the
 *     grammar's value-precise `value_loc` plus its normalized `#rrggbbaa` shape.
 *   - **State names** get a distinct mark. The tokenizer renders every bare
 *     identifier as `variableName`; the AST knows which atoms are actually
 *     states (transition endpoints and `state` declaration subjects) via
 *     `from_loc` / `to_loc` / `name_loc`.
 *   - **Shape values** (e.g. `shape: folder;`) get an enum mark. Shape names
 *     live in no keyword set, so the tokenizer leaves them as `variableName`;
 *     the grammar knows the value of a `shape:` item is a shape enum.
 *
 * When the document does not parse — e.g. mid-edit — the overlay yields
 * `Decoration.none` and the base stream highlighter carries highlighting until
 * the next clean parse.
 */

import { StateField }                         from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";

/** Matches the grammar's normalized color value: `#rrggbbaa`. */
const HEX8 = /^#[0-9a-f]{8}$/i;

/** AST keys whose values are source locations, not child nodes to recurse into. */
const LOC_KEYS = new Set(["loc", "value_loc", "name_loc", "from_loc", "to_loc", "r_action_loc", "l_action_loc"]);

/** State-declaration item keys whose value is an enum the tokenizer can't place. */
const ENUM_VALUE_KEYS = new Set(["shape"]);

const STATE_STYLE = "color:#5b3da8;font-weight:600;";        // states: indigo
const ENUM_STYLE  = "color:#b8860b;font-style:italic;";      // enums: goldenrod / atom-like

/**
 * Inline color chip rendered immediately before a color value. Shows the
 * resolved color as a small filled square; carries the hex as its tooltip.
 */
class SwatchWidget extends WidgetType {
  constructor(hex) { super(); this.hex = hex; }
  eq(other) { return other.hex === this.hex; }
  toDOM() {
    const box = document.createElement("span");
    box.className   = "fsl-swatch";
    box.title       = this.hex;
    box.style.cssText =
      "display:inline-block;width:0.72em;height:0.72em;margin-right:0.35em;" +
      "border:1px solid rgba(0,0,0,0.35);border-radius:2px;vertical-align:baseline;" +
      `background:${this.hex};`;
    return box;
  }
  ignoreEvent() { return true; }
}

/**
 * Locate a value substring inside a node's full-statement `loc` span. Used for
 * enum values (e.g. shapes) that the grammar does not give a value-precise
 * `value_loc`. The value appears once, after the key, so a last-occurrence
 * search within the statement slice is unambiguous.
 *
 * @returns `{ from, to }` document offsets, or `null` if not found.
 */
function valueSpanWithin(text, loc, value) {
  const slice = text.slice(loc.start.offset, loc.end.offset);
  const idx   = slice.lastIndexOf(value);
  if (idx < 0) { return null; }
  const from = loc.start.offset + idx;
  return { from, to: from + value.length };
}

/**
 * Walk an FSL AST, pushing `{ kind, ... }` decoration descriptors onto `out`.
 * `kind` is one of `'color'` (chip), `'state'`, or `'enum'`.
 *
 * @param node Any AST fragment (array, object, or leaf).
 * @param text The full document text (for enum value-span lookup).
 * @param out  Accumulator.
 */
function collect(node, text, out) {
  if (Array.isArray(node)) {
    for (const child of node) { collect(child, text, out); }
    return;
  }
  if (!node || typeof node !== "object") { return; }

  // Color value -> swatch chip (value text left untouched).
  if (node.value_loc && typeof node.value === "string" && HEX8.test(node.value)) {
    out.push({ kind: "color", at: node.value_loc.start.offset, hex: node.value });
  }

  // State names -> distinct mark (transition endpoints + declaration subjects).
  if (node.from_loc && typeof node.from === "string") {
    out.push({ kind: "state", from: node.from_loc.start.offset, to: node.from_loc.end.offset });
  }
  if (node.to_loc && typeof node.to === "string") {
    out.push({ kind: "state", from: node.to_loc.start.offset, to: node.to_loc.end.offset });
  }
  if (node.name_loc && typeof node.name === "string") {
    out.push({ kind: "state", from: node.name_loc.start.offset, to: node.name_loc.end.offset });
  }

  // Enum values without a value-precise loc (e.g. shapes) -> computed span.
  if (ENUM_VALUE_KEYS.has(node.key) && typeof node.value === "string" && node.loc && !node.value_loc) {
    const span = valueSpanWithin(text, node.loc, node.value);
    if (span) { out.push({ kind: "enum", from: span.from, to: span.to }); }
  }

  for (const key of Object.keys(node)) {
    if (!LOC_KEYS.has(key)) { collect(node[key], text, out); }
  }
}

/**
 * Build the decoration set for the current document. Returns `Decoration.none`
 * on any parse failure so highlighting degrades to the base stream layer.
 */
function buildDecorations(state, parse) {
  const text = state.doc.toString();

  let tree;
  try { tree = parse(text, { locations: true }); }
  catch { return Decoration.none; }

  const len  = state.doc.length;
  const hits = [];
  collect(tree, text, hits);

  const decorations = [];
  for (const h of hits) {
    if (h.kind === "color") {
      if (h.at <= len) {
        decorations.push(Decoration.widget({ widget: new SwatchWidget(h.hex), side: -1 }).range(h.at));
      }
    } else if (h.from < h.to && h.to <= len) {
      const style = h.kind === "state" ? STATE_STYLE : ENUM_STYLE;
      decorations.push(Decoration.mark({ class: `fsl-${h.kind}`, attributes: { style } }).range(h.from, h.to));
    }
  }

  return Decoration.set(decorations, /* sort */ true);
}

/**
 * A CodeMirror 6 extension that upgrades FSL highlighting from the parser:
 * color swatch chips, state-name marks, and shape-enum marks. Driven by the
 * PEG parse, not a keyword table.
 *
 * @param parse The FSL `parse(text, options)` function (located output).
 * @returns A `StateField` extension; drop it into the editor's `extensions`.
 *
 * @example
 *   import { parse } from "../../dist/jssm.es6.mjs";
 *   new EditorView({ extensions: [ basicSetup, fsl(), fslSemanticOverlay(parse) ] });
 */
export function fslSemanticOverlay(parse) {
  return StateField.define({
    create: (state)    => buildDecorations(state, parse),
    update: (deco, tr) => (tr.docChanged ? buildDecorations(tr.state, parse) : deco),
    provide: (field)   => EditorView.decorations.from(field),
  });
}
