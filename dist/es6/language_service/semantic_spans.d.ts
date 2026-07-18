/**
 * Parser-derived semantic spans for FSL: color values (with resolved hex),
 * state names, and shape-enum values. Returns `[]` if the document does not
 * parse. Editor-agnostic — adapters map spans to decorations or semantic
 * tokens. Logic is a verified port of the sketch's `semantic_overlay.mjs`.
 */
import type { SemanticSpan } from './types.js';
/**
 * Collect color / state / shape-enum semantic spans from `text`. State spans
 * cover transition endpoints, state-declaration subjects, group-list members
 * (`&G : [a b c];` — but not the group's own name, nor `&`/`...&` nested
 * group references), and plain-label hook subjects (`on enter x do 'act';` —
 * but not `&group` subjects). Every state span's `value` is the parser's
 * resolved name (unquoted, unescaped), while `from`/`to` cover the source
 * spelling including any quotes.
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 * @example
 *   fslSemanticSpans('&G : [a b];\na -> b;')
 *     .filter(s => s.kind === 'state').length;   // => 4 (two members + two endpoints)
 */
export declare function fslSemanticSpans(text: string): SemanticSpan[];
