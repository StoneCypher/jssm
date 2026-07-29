/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
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

/**
 *  The fully-parsed, validated description of one FSL Markdown fence block.
 *
 *  Sizing semantics: `width`/`height` (from `width=`/`height=` tokens) are
 *  exact* dimensions — the host renders the block at that size.
 *  `max_width`/`max_height` (from `max-width=`/`max-height=` tokens) are
 *  upper bounds* on natural sizing — the block renders at its natural size
 *  but is capped on that axis.  When both an exact and a max token are given
 *  for the same axis, the exact dimension wins and the cap is moot.  All four
 *  are `null` when their token is absent.
 */
export interface FenceDescriptor {
  parts       : FencePart[];
  ide         : boolean;
  format      : FenceImageFormat;
  width       : FenceDimension | null;
  height      : FenceDimension | null;
  max_width   : FenceDimension | null;
  max_height  : FenceDimension | null;
  interactive : boolean;
  notes       : string[];
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
export function fsl_fence_lang(info: string): 'fsl' | 'jssm' | null {
  const first = info.trim().split(/\s+/, 1)[0]?.toLowerCase();
  if (first === 'fsl')  { return 'fsl'; }
  if (first === 'jssm') { return 'jssm'; }
  return null;
}

const PART_TOKENS: ReadonlySet<FencePart> = new Set<FencePart>([
  'image', 'code', 'dot', 'editor',
  'actions', 'info-panel', 'toolbar', 'title', 'footer'
]);

function is_part(token: string): token is FencePart {
  return (PART_TOKENS as ReadonlySet<string>).has(token);
}

const FORMAT_TOKENS: ReadonlySet<FenceImageFormat> =
  new Set<FenceImageFormat>(['svg', 'png', 'jpeg', 'gif']);

function is_format(token: string): token is FenceImageFormat {
  return (FORMAT_TOKENS as ReadonlySet<string>).has(token);
}

/** Parts whose presence promotes the whole block to a live, interactive instance. */
const INTERACTIVE_PARTS: ReadonlySet<FencePart> =
  new Set<FencePart>(['editor', 'actions', 'toolbar', 'info-panel']);

/**
 *  Parse a dimension value like `300`, `120px`, or `100%` into a
 *  {@link FenceDimension}.  A bare number is pixels.
 *  @param raw The value portion of a `width=`/`height=`/`max-width=`/`max-height=` token.
 *  @returns The parsed dimension, or `null` if malformed.
 *  @example parse_dimension('300')  // => { value: 300, unit: 'px' }
 *  @example parse_dimension('100%') // => { value: 100, unit: 'percent' }
 *  @example parse_dimension('xyz')  // => null
 */
function parse_dimension(raw: string): FenceDimension | null {
  const m = /^(\d+)(px|%)?$/.exec(raw);
  if (!m) { return null; }
  return { value: Number(m[1]), unit: m[2] === '%' ? 'percent' : 'px' };
}

/** The curated full layout the `ide` macro expands to, in render order. */
const IDE_LAYOUT: readonly FencePart[] =
  ['title', 'image', 'actions', 'info-panel', 'toolbar', 'editor', 'footer'];

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
export function parse_fence_info(info: string): FenceDescriptor {
  const tokens = info.trim().split(/\s+/).filter(Boolean);
  const args   = tokens.slice(1).map(t => t.toLowerCase());

  const parts : FencePart[] = [];
  const notes : string[]    = [];

  let format     : FenceImageFormat = 'svg';
  let format_set = false;
  let ide        = false;

  // the four dimension tokens share one assignment path, keyed by token name
  const dims : Record<'width' | 'height' | 'max-width' | 'max-height', FenceDimension | null> = {
    'width'      : null,
    'height'     : null,
    'max-width'  : null,
    'max-height' : null,
  };

  for (const arg of args) {
    if (arg === 'ide') { ide = true; continue; }
    if (is_part(arg)) {
      if (parts.includes(arg)) { notes.push(`duplicate token "${arg}" ignored`); }
      else                     { parts.push(arg); }
      continue;
    }
    if (is_format(arg)) {
      if (format_set) { notes.push(`format "${format}" overridden by "${arg}"`); }
      format     = arg;
      format_set = true;
      if (!parts.includes('image')) { parts.push('image'); }
      continue;
    }
    if (arg.startsWith('width=') || arg.startsWith('height=') || arg.startsWith('max-width=') || arg.startsWith('max-height=')) {
      const eq  = arg.indexOf('=');
      const key = arg.slice(0, eq) as 'width' | 'height' | 'max-width' | 'max-height';
      const raw = arg.slice(eq + 1);
      const dim = parse_dimension(raw);
      if (dim === null) { notes.push(`invalid ${key} value "${raw}" ignored`); }
      else              { dims[key] = dim; }
      continue;
    }
    notes.push(`unknown token "${arg}" ignored`);
  }

  if (ide) {
    if (parts.length > 0) { notes.push('ide overrides individual part tokens'); }
    parts.length = 0;
    parts.push(...IDE_LAYOUT);
  }

  if (parts.length === 0) { parts.push('image', 'code'); }

  const interactive = ide || parts.some(p => INTERACTIVE_PARTS.has(p));

  if (interactive && format !== 'svg') {
    notes.push(`raster format "${format}" overridden to svg for an interactive block`);
    format = 'svg';
  }

  return {
    parts,
    ide,
    format,
    width      : dims.width,
    height     : dims.height,
    max_width  : dims['max-width'],
    max_height : dims['max-height'],
    interactive,
    notes
  };
}
