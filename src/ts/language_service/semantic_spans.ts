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
                          'r_action_loc', 'l_action_loc', 'value_locs',
                          'subject_loc', '__loc']);

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

  // group declarations (`&G : [a b c];` / `&G : a;`): every plain member is a
  // state reference. The grammar supplies value_locs parallel to value, so
  // positions come from the parser, never from text search. Nest/spread
  // entries (`&child` / `...&child`) are group references, not states, and
  // the group's own NAME is deliberately not a state span either.
  if (n.key === 'named_list') {
    const members = Array.isArray(n.value) ? n.value : [n.value];
    members.forEach((member: unknown, i: number) => {
      const m    = member as string | { kind: string; name: string };
      const name = typeof m === 'string' ? m
                 : m.kind === 'state'    ? m.name
                 : null;
      if (name !== null) {
        const at = n.value_locs[i];
        out.push({ from: at.start.offset, to: at.end.offset, kind: 'state', value: name });
      }
    });
  }

  // hook declarations (`on enter x do 'act';`): a plain-label subject is a
  // state reference and carries a grammar-supplied subject_loc. Group-ref
  // subjects (`on exit &G …`) are group references, not states — no
  // subject_loc, no span.
  if (n.key === 'hook_decl' && n.subject_loc) {
    out.push({ from: n.subject_loc.start.offset, to: n.subject_loc.end.offset, kind: 'state', value: n.subject });
  }

  for (const key of Object.keys(n)) {
    if (!LOC_KEYS.has(key)) { collect(n[key], text, out); }
  }
}

/**
 * Collect color / state / shape-enum semantic spans from `text`. State spans
 * cover transition endpoints, state-declaration subjects, group-list members
 * (`&G : [a b c];` — but not the group's own name, nor `&`/`...&` nested
 * group references), and plain-label hook subjects (`on enter x do 'act';` —
 * but not `&group` subjects). Every state span's `value` is the parser's
 * resolved name (unquoted, unescaped), while `from`/`to` cover the source
 * spelling including any quotes.
 *
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 *
 * @example
 *   fslSemanticSpans('&G : [a b];\na -> b;')
 *     .filter(s => s.kind === 'state').length;   // => 4 (two members + two endpoints)
 */
export function fslSemanticSpans(text: string): SemanticSpan[] {
  let tree: unknown;
  try { tree = wrap_parse(text, { locations: true }); } catch { return []; }
  const out: SemanticSpan[] = [];
  collect(tree, text, out);
  return out;
}
