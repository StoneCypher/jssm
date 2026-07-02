/**
 * Parser-derived semantic spans for FSL: color values (with resolved hex),
 * state names, and shape-enum values. Returns `[]` if the document does not
 * parse. Editor-agnostic — adapters map spans to decorations or semantic
 * tokens. Logic is a verified port of the sketch's `semantic_overlay.mjs`.
 */

import { wrap_parse } from '../jssm_compiler.js';
import type { SemanticSpan } from './types.js';

/** Grammar-normalized color value shape (`#rrggbbaa`). */
const HEX8 = /^#[0-9a-f]{8}$/i;

/** AST keys that hold source locations, not child nodes to recurse into. */
const LOC_KEYS = new Set(['loc', 'value_loc', 'name_loc', 'from_loc', 'to_loc',
                          'r_action_loc', 'l_action_loc']);

/** State-declaration item keys whose value is an enum lacking a value-precise loc. */
const ENUM_VALUE_KEYS = new Set(['shape']);

/** Locate a value substring inside a node's full-statement `loc` span. The
 *  value always appears in its own declaration, so the search always hits. */
function valueSpanWithin(text: string, loc: { start: { offset: number }; end: { offset: number } },
                        value: string): { from: number; to: number } {
  const idx = text.slice(loc.start.offset, loc.end.offset).lastIndexOf(value);
  const from = loc.start.offset + idx;
  return { from, to: from + value.length };
}

/** Recursively collect semantic spans from a located AST node. */
function collect(node: unknown, text: string, out: SemanticSpan[]): void {
  if (Array.isArray(node)) { for (const c of node) { collect(c, text, out); } return; }
  if (!node || typeof node !== 'object') { return; }
  const n = node as Record<string, any>;

  if (n.value_loc && typeof n.value === 'string' && HEX8.test(n.value)) {
    out.push({ from: n.value_loc.start.offset, to: n.value_loc.end.offset, kind: 'color', value: n.value });
  }
  if (n.from_loc && typeof n.from === 'string') {
    out.push({ from: n.from_loc.start.offset, to: n.from_loc.end.offset, kind: 'state', value: n.from });
  }
  if (n.to_loc && typeof n.to === 'string') {
    out.push({ from: n.to_loc.start.offset, to: n.to_loc.end.offset, kind: 'state', value: n.to });
  }
  if (n.name_loc && typeof n.name === 'string') {
    out.push({ from: n.name_loc.start.offset, to: n.name_loc.end.offset, kind: 'state', value: n.name });
  }
  if (ENUM_VALUE_KEYS.has(n.key) && typeof n.value === 'string' && n.loc && !n.value_loc) {
    out.push({ ...valueSpanWithin(text, n.loc, n.value), kind: 'enum' });
  }

  for (const key of Object.keys(n)) {
    if (!LOC_KEYS.has(key)) { collect(n[key], text, out); }
  }
}

/**
 * Collect color / state / shape-enum semantic spans from `text`.
 *
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 */
export function fslSemanticSpans(text: string): SemanticSpan[] {
  let tree: unknown;
  try { tree = wrap_parse(text, { locations: true }); } catch { return []; }
  const out: SemanticSpan[] = [];
  collect(tree, text, out);
  return out;
}
