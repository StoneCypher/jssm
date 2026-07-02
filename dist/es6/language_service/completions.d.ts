/**
 * Context-aware, editor-agnostic FSL completions. Value suggestions after a
 * `key:`, key suggestions at a statement start (top-level vs inside a `{ }`
 * block, by brace depth). Adapters convert {@link CompletionItem}s to their own
 * completion type. Value vocab is jssm's own (`gviz_shapes`, `named_colors`,
 * `FslDirections`), so it cannot drift from the renderer.
 */
import type { CompletionItem } from './types.js';
/**
 * Completions for the caret at `offset` in `text`.
 *
 * @example
 *   fslCompletions('state x : { color: ', 19)[0].kind;  // => 'value-color'
 */
export declare function fslCompletions(text: string, offset: number): CompletionItem[];
