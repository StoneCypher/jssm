/**
 * Parser-derived semantic spans for FSL: color values (with resolved hex),
 * state names, and shape-enum values. Returns `[]` if the document does not
 * parse. Editor-agnostic — adapters map spans to decorations or semantic
 * tokens. Logic is a verified port of the sketch's `semantic_overlay.mjs`.
 */
import type { SemanticSpan } from './types.js';
/**
 * Collect color / state / shape-enum semantic spans from `text`.
 *
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 */
export declare function fslSemanticSpans(text: string): SemanticSpan[];
