/**
 * Context-aware, editor-agnostic FSL completions. Value suggestions after a
 * `key:`, key suggestions at a statement start (top-level vs inside a `{ }`
 * block, by brace depth). Adapters convert {@link CompletionItem}s to their own
 * completion type. Value vocab is jssm's own (`gviz_shapes`, `named_colors`,
 * `FslDirections`), so it cannot drift from the renderer.
 */
import { gviz_shapes, named_colors } from '../jssm_constants.js';
import { FslDirections } from '../jssm_types.js';
/** Keys whose value is a color (offered the full SVG color list). */
const COLOR_KEYS = new Set(['color', 'text-color', 'background-color', 'border-color', 'edge-color']);
/** Small value enumerations, keyed by property. Mirrors `fsl_parser.peg`. */
const SMALL_VALUE_ENUMS = {
    corners: ['regular', 'rounded', 'lined'],
    'line-style': ['solid', 'dotted', 'dashed'],
    linestyle: ['solid', 'dotted', 'dashed'],
    flow: [...FslDirections],
    graph_layout: ['dot', 'circo', 'fdp', 'neato', 'twopi'],
    theme: ['default', 'ocean', 'modern', 'plain', 'bold'],
    hooks: ['open', 'closed'],
    allows_override: ['true', 'false', 'undefined'],
    allow_islands: ['with_start', 'true', 'false'],
    machine_license: ['MIT', 'BSD 2-clause', 'BSD 3-clause', 'Apache 2.0', 'Mozilla 2.0',
        'Public domain', 'GPL v2', 'GPL v3', 'LGPL v2.1', 'LGPL v3.0'],
};
/** Statement starters legal at the top level (machine attrs + config + structural). */
const TOP_LEVEL_KEYS = [
    'machine_name', 'machine_version', 'machine_author', 'machine_contributor',
    'machine_comment', 'machine_definition', 'machine_reference', 'machine_license',
    'machine_language', 'npm_name', 'fsl_version',
    'theme', 'flow', 'graph_layout', 'default_size', 'dot_preamble', 'hooks',
    'start_states', 'end_states', 'failed_outputs', 'allows_override', 'allow_islands',
    'graph', 'state', 'start_state', 'end_state', 'active_state', 'terminal_state',
    'hooked_state', 'transition',
    'property', 'arrange', 'arrange-start', 'arrange-end', 'on',
];
/** Keys legal inside a `{ }` style block (per-state styling + edge desc items). */
const BLOCK_KEYS = [
    'label', 'color', 'text-color', 'background-color', 'border-color',
    'shape', 'corners', 'line-style', 'image', 'url', 'property',
    'edge-color', 'arc_label', 'head_label', 'tail_label',
];
const item = (label, kind, detail) => detail === undefined ? { label, kind } : { label, kind, detail };
const enumItems = (vals) => vals.map(v => item(v, 'value-enum'));
/** Values for a given key, or null if the key takes no enumerable value. */
function valueItemsFor(key) {
    if (COLOR_KEYS.has(key)) {
        return named_colors.map((c) => item(c, 'value-color', c));
    }
    if (key === 'shape') {
        return gviz_shapes.map((s) => item(s, 'value-shape'));
    }
    const small = SMALL_VALUE_ENUMS[key];
    return small ? enumItems(small) : null;
}
/**
 * Completions for the caret at `offset` in `text`.
 * @example
 *   fslCompletions('state x : { color: ', 19)[0].kind;  // => 'value-color'
 */
export function fslCompletions(text, offset) {
    var _a;
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const before = text.slice(lineStart, offset);
    // VALUE position: `<key> : <typed>`
    const valueMatch = /([A-Z_][\w-]*)\s*:\s*[\w-]*$/i.exec(before);
    if (valueMatch) {
        return (_a = valueItemsFor(valueMatch[1])) !== null && _a !== void 0 ? _a : [];
    }
    // KEY position: line start (or after `{`/`;`), then an optional partial word.
    const keyMatch = /(?:^|[{;])\s*(?:[A-Z_][\w-]*)?$/i.exec(before);
    if (keyMatch) {
        const pre = text.slice(0, offset);
        const depth = (pre.match(/\{/g) || []).length - (pre.match(/\}/g) || []).length;
        const keys = depth > 0 ? BLOCK_KEYS : TOP_LEVEL_KEYS;
        return keys.map(k => item(k, 'key'));
    }
    return [];
}
