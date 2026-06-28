/**
 * Context-aware autocompletion for FSL, for the sketch editor.
 *
 * A single CodeMirror `CompletionSource` that offers either **keys** or
 * **values**, depending on where the cursor sits:
 *
 *   - In **value** position (`<key>: <caret>`), it offers the legal values for
 *     that key — shapes after `shape:`, SVG color names (with a swatch preview)
 *     after any `*color:`, layout engines after `graph_layout:`, and so on.
 *   - In **key** position (start of a statement), it offers the legal keys for
 *     the current scope — machine attributes / config / structural starters at
 *     top level, or per-state style keys when the caret is inside a `{ }` block.
 *
 * Value vocabularies that the library exposes — shapes, color names, flow
 * directions — are passed in from jssm's own exports (`gviz_shapes`,
 * `named_colors`, `FslDirections`), so they cannot drift from the renderer.
 * The remaining small enumerations and the key lists are curated here to match
 * `src/ts/fsl_parser.peg`; ideally those would also be grammar-exported to drop
 * the hand-maintenance.
 */

/** Keys whose value is a color (offered the full SVG color list + a swatch). */
const COLOR_KEYS = new Set(["color", "text-color", "background-color", "border-color", "edge-color"]);

/**
 * Small value enumerations, keyed by the property they belong to. Mirrors the
 * corresponding rules in `fsl_parser.peg` (Corners, LineStyle, GvizLayout,
 * Theme, Direction, OverrideT, IslandsT, HookDefinition, license list).
 */
const SMALL_VALUE_ENUMS = {
  corners:         ["regular", "rounded", "lined"],
  "line-style":    ["solid", "dotted", "dashed"],
  linestyle:       ["solid", "dotted", "dashed"],
  flow:            ["up", "right", "down", "left"],
  graph_layout:    ["dot", "circo", "fdp", "neato", "twopi"],
  theme:           ["default", "ocean", "modern", "plain", "bold"],
  hooks:           ["open", "closed"],
  allows_override: ["true", "false", "undefined"],
  allow_islands:   ["with_start", "true", "false"],
  machine_license: ["MIT", "BSD 2-clause", "BSD 3-clause", "Apache 2.0", "Mozilla 2.0",
                    "Public domain", "GPL v2", "GPL v3", "LGPL v2.1", "LGPL v3.0"],
};

/** Statement starters legal at the top level (machine attrs + config + structural). */
const TOP_LEVEL_KEYS = [
  "machine_name", "machine_version", "machine_author", "machine_contributor",
  "machine_comment", "machine_definition", "machine_reference", "machine_license",
  "machine_language", "npm_name", "fsl_version",
  "theme", "flow", "graph_layout", "default_size", "dot_preamble", "hooks",
  "start_states", "end_states", "failed_outputs", "allows_override", "allow_islands",
  "graph", "state", "start_state", "end_state", "active_state", "terminal_state",
  "hooked_state", "transition",
  "property", "arrange", "arrange-start", "arrange-end", "on",
];

/** Keys legal inside a `{ }` style block (per-state styling + edge desc items). */
const BLOCK_KEYS = [
  "label", "color", "text-color", "background-color", "border-color",
  "shape", "corners", "line-style", "image", "url", "property",
  "edge-color", "arc_label", "head_label", "tail_label",
];

/** A color preview node for the completion info panel (SVG names are valid CSS colors). */
function swatchNode(name) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;gap:8px;";
  const box = document.createElement("span");
  box.style.cssText =
    `display:inline-block;width:14px;height:14px;border:1px solid rgba(0,0,0,.4);` +
    `border-radius:2px;background:${name};`;
  const label = document.createElement("span");
  label.textContent = name;
  wrap.append(box, label);
  return wrap;
}

const asOptions = (labels, type) => labels.map(label => ({ label, type }));

/**
 * Build the FSL `CompletionSource`.
 *
 * @param vocab.shapes     Valid Graphviz shape names (jssm `gviz_shapes`).
 * @param vocab.colors     Valid SVG color names (jssm `named_colors`).
 * @param vocab.directions Valid flow directions (jssm `FslDirections`).
 * @returns A CodeMirror completion source for use in `autocompletion({ override })`.
 *
 * @example
 *   import { autocompletion } from "@codemirror/autocomplete";
 *   import { gviz_shapes, named_colors, FslDirections } from "../../dist/jssm.es6.mjs";
 *   const ext = autocompletion({ override: [ fslCompletions({
 *     shapes: gviz_shapes, colors: named_colors, directions: FslDirections }) ] });
 */
export function fslCompletions({ shapes, colors, directions }) {
  const shapeOptions = asOptions(shapes, "shape");
  const colorOptions = colors.map(name => ({ label: name, type: "color", info: () => swatchNode(name) }));
  const dirOptions   = asOptions(directions, "enum");
  const smallEnums   = Object.fromEntries(
    Object.entries(SMALL_VALUE_ENUMS).map(([k, v]) => [k, asOptions(v, "enum")])
  );
  // flow/direction prefer the library-sourced direction list.
  smallEnums.flow = dirOptions;

  const topKeyOptions   = asOptions(TOP_LEVEL_KEYS, "property");
  const blockKeyOptions = asOptions(BLOCK_KEYS, "property");

  const valueOptionsFor = (key) =>
    COLOR_KEYS.has(key) ? colorOptions :
    key === "shape"     ? shapeOptions :
    smallEnums[key]     || null;

  return (context) => {
    const line   = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);

    // VALUE position: `<key> : <typed>`
    const valueMatch = /([A-Za-z_][\w-]*)\s*:\s*([\w-]*)$/.exec(before);
    if (valueMatch) {
      const options = valueOptionsFor(valueMatch[1]);
      if (!options) { return null; }
      const typed = valueMatch[2];
      return { from: context.pos - typed.length, options, validFor: /^[\w-]*$/ };
    }

    // KEY position: statement start — line start, or just after a `{`/`;` on the
    // same line — then an optional partial word.
    const keyMatch = /(?:^|[{;])\s*([A-Za-z_][\w-]*)?$/.exec(before);
    if (keyMatch) {
      const typed = keyMatch[1] || "";
      if (!context.explicit && typed.length === 0) { return null; }   // don't pop on a blank line unless asked
      const pre   = context.state.doc.sliceString(0, context.pos);
      const depth = (pre.match(/{/g) || []).length - (pre.match(/}/g) || []).length;
      const options = depth > 0 ? blockKeyOptions : topKeyOptions;
      return { from: context.pos - typed.length, options, validFor: /^[\w-]*$/ };
    }

    return null;
  };
}
