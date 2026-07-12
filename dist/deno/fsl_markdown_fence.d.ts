/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */
/** A single renderable part of a fence block (stacks in listed order, first on top). */
export type FencePart = 'image' | 'code' | 'dot' | 'editor' | 'actions' | 'info-panel' | 'toolbar' | 'title' | 'footer';
/** An image output format for the `image` part. */
export type FenceImageFormat = 'svg' | 'png' | 'jpeg' | 'gif';
/** The unit of a {@link FenceDimension} (`%` is represented as `'percent'`). */
export type FenceDimensionUnit = 'px' | 'percent';
/** A parsed `width=`/`height=` value with its unit. */
export interface FenceDimension {
    value: number;
    unit: FenceDimensionUnit;
}
/**
 *  The fully-parsed, validated description of one FSL Markdown fence block.
 *
 *  Sizing semantics: `width`/`height` (from `width=`/`height=` tokens) are
 *  *exact* dimensions — the host renders the block at that size.
 *  `max_width`/`max_height` (from `max-width=`/`max-height=` tokens) are
 *  *upper bounds* on natural sizing — the block renders at its natural size
 *  but is capped on that axis.  When both an exact and a max token are given
 *  for the same axis, the exact dimension wins and the cap is moot.  All four
 *  are `null` when their token is absent.
 */
export interface FenceDescriptor {
    parts: FencePart[];
    ide: boolean;
    format: FenceImageFormat;
    width: FenceDimension | null;
    height: FenceDimension | null;
    max_width: FenceDimension | null;
    max_height: FenceDimension | null;
    interactive: boolean;
    notes: string[];
}
/**
 *  Canonical fence language for an info string, or `null` if the block is not
 *  an FSL fence.  Reads only the first whitespace-delimited token,
 *  case-insensitively.
 *  @param info The full fence info string (everything after the opening fence).
 *  @returns `'fsl'` or `'jssm'` for our fences; `null` otherwise.
 *  @example fsl_fence_lang('fsl image code') // => 'fsl'
 *  @example fsl_fence_lang('JSSM')           // => 'jssm'
 *  @example fsl_fence_lang('mermaid')        // => null
 */
export declare function fsl_fence_lang(info: string): 'fsl' | 'jssm' | null;
/**
 *  Parse a fence info string into a {@link FenceDescriptor}.  The first token is
 *  the (already-validated) language and is ignored; remaining tokens are
 *  classified as parts, image formats, the `ide` macro, or the dimension
 *  options `width`/`height` (exact size) and `max-width`/`max-height`
 *  (upper bounds on natural size — see {@link FenceDescriptor} for the
 *  precedence rule when both appear on one axis).  All four dimension tokens
 *  share one value syntax: a bare number (pixels), `<n>px`, or `<n>%`.
 *  Unrecognized or conflicting tokens are dropped and recorded in
 *  `notes` rather than throwing, so a host can render forward-compatibly.
 *  @param info The full fence info string, e.g. `'fsl image code width=300'`.
 *  @returns The validated descriptor; `notes` lists anything ignored or overridden.
 *  @example parse_fence_info('fsl').parts // => ['image', 'code']
 *  @example parse_fence_info('fsl code image').parts // => ['code', 'image']
 *  @example parse_fence_info('fsl image max-width=300 max-height=50%').max_width // => { value: 300, unit: 'px' }
 */
export declare function parse_fence_info(info: string): FenceDescriptor;
