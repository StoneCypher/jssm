/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
 *
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */

/** A single renderable part of a fence block (stacks in listed order, first on top). */
export type FencePart =
  | 'image' | 'code' | 'dot' | 'editor'
  | 'actions' | 'info-panel' | 'toolbar' | 'title' | 'footer';

/** An image output format for the `image` part. */
export type FenceImageFormat = 'svg' | 'png' | 'jpeg' | 'gif';

/** The unit of a {@link FenceDimension} (`%` is represented as `'percent'`). */
export type FenceDimensionUnit = 'px' | 'percent';

/** A parsed `width=`/`height=` value with its unit. */
export interface FenceDimension { value: number; unit: FenceDimensionUnit; }

/** The fully-parsed, validated description of one FSL Markdown fence block. */
export interface FenceDescriptor {
  parts       : FencePart[];
  ide         : boolean;
  format      : FenceImageFormat;
  width       : FenceDimension | null;
  height      : FenceDimension | null;
  interactive : boolean;
  notes       : string[];
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
export function fsl_fence_lang(info: string): 'fsl' | 'jssm' | null {
  const first = info.trim().split(/\s+/)[0]?.toLowerCase();
  if (first === 'fsl')  { return 'fsl'; }
  if (first === 'jssm') { return 'jssm'; }
  return null;
}
