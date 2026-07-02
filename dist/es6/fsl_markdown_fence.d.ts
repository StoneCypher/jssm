/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
 *
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */
/** A single renderable part of a fence block (stacks in listed order, first on top). */
export declare type FencePart = 'image' | 'code' | 'dot' | 'editor' | 'actions' | 'info-panel' | 'toolbar' | 'title' | 'footer';
/** An image output format for the `image` part. */
export declare type FenceImageFormat = 'svg' | 'png' | 'jpeg' | 'gif';
/** The unit of a {@link FenceDimension} (`%` is represented as `'percent'`). */
export declare type FenceDimensionUnit = 'px' | 'percent';
/** A parsed `width=`/`height=` value with its unit. */
export interface FenceDimension {
    value: number;
    unit: FenceDimensionUnit;
}
/** The fully-parsed, validated description of one FSL Markdown fence block. */
export interface FenceDescriptor {
    parts: FencePart[];
    ide: boolean;
    format: FenceImageFormat;
    width: FenceDimension | null;
    height: FenceDimension | null;
    interactive: boolean;
    notes: string[];
}
/**
 *  Canonical fence language for an info string, or `null` if the block is not
 *  an FSL fence.  Reads only the first whitespace-delimited token,
 *  case-insensitively.
 *
 *  @param info The full fence info string (everything after the opening fence).
 *  @returns `'fsl'` or `'jssm'` for our fences; `null` otherwise.
 *
 *  @example fsl_fence_lang('fsl image code') // => 'fsl'
 *  @example fsl_fence_lang('JSSM')           // => 'jssm'
 *  @example fsl_fence_lang('mermaid')        // => null
 */
export declare function fsl_fence_lang(info: string): 'fsl' | 'jssm' | null;
/**
 *  Parse a fence info string into a {@link FenceDescriptor}.  The first token is
 *  the (already-validated) language and is ignored; remaining tokens are
 *  classified as parts, image formats, the `ide` macro, or `width`/`height`
 *  options.  Unrecognized or conflicting tokens are dropped and recorded in
 *  `notes` rather than throwing, so a host can render forward-compatibly.
 *
 *  @param info The full fence info string, e.g. `'fsl image code width=300'`.
 *  @returns The validated descriptor; `notes` lists anything ignored or overridden.
 *
 *  @example parse_fence_info('fsl').parts // => ['image', 'code']
 *  @example parse_fence_info('fsl code image').parts // => ['code', 'image']
 */
export declare function parse_fence_info(info: string): FenceDescriptor;
