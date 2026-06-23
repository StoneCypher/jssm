/**
 *  The FSL Markdown fence convention parser — pure, host-agnostic logic that
 *  turns a fenced-code-block info string into a {@link FenceDescriptor}.  Hosts
 *  (a VS Code preview plugin, a static-site generator, …) each interpret the
 *  descriptor according to their capabilities.
 *
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */
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
export function fsl_fence_lang(info) {
    var _a;
    const first = (_a = info.trim().split(/\s+/)[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (first === 'fsl') {
        return 'fsl';
    }
    if (first === 'jssm') {
        return 'jssm';
    }
    return null;
}
const PART_TOKENS = new Set([
    'image', 'code', 'dot', 'editor',
    'actions', 'info-panel', 'toolbar', 'title', 'footer'
]);
function is_part(token) {
    return PART_TOKENS.has(token);
}
const FORMAT_TOKENS = new Set(['svg', 'png', 'jpeg', 'gif']);
function is_format(token) {
    return FORMAT_TOKENS.has(token);
}
/** Parts whose presence promotes the whole block to a live, interactive instance. */
const INTERACTIVE_PARTS = new Set(['editor', 'actions', 'toolbar', 'info-panel']);
/**
 *  Parse a dimension value like `300`, `120px`, or `100%` into a
 *  {@link FenceDimension}.  A bare number is pixels.
 *
 *  @param raw The value portion of a `width=`/`height=` token.
 *  @returns The parsed dimension, or `null` if malformed.
 *
 *  @example parse_dimension('300')  // => { value: 300, unit: 'px' }
 *  @example parse_dimension('100%') // => { value: 100, unit: 'percent' }
 *  @example parse_dimension('xyz')  // => null
 */
function parse_dimension(raw) {
    const m = /^(\d+)(px|%)?$/.exec(raw);
    if (!m) {
        return null;
    }
    return { value: parseInt(m[1], 10), unit: m[2] === '%' ? 'percent' : 'px' };
}
/** The curated full layout the `ide` macro expands to, in render order. */
const IDE_LAYOUT = ['title', 'image', 'actions', 'info-panel', 'toolbar', 'editor', 'footer'];
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
export function parse_fence_info(info) {
    const tokens = info.trim().split(/\s+/).filter(Boolean);
    const args = tokens.slice(1).map(t => t.toLowerCase());
    const parts = [];
    const notes = [];
    let format = 'svg';
    let format_set = false;
    let width = null;
    let height = null;
    let ide = false;
    for (const arg of args) {
        if (arg === 'ide') {
            ide = true;
            continue;
        }
        if (is_part(arg)) {
            if (parts.includes(arg)) {
                notes.push(`duplicate token "${arg}" ignored`);
            }
            else {
                parts.push(arg);
            }
            continue;
        }
        if (is_format(arg)) {
            if (format_set) {
                notes.push(`format "${format}" overridden by "${arg}"`);
            }
            format = arg;
            format_set = true;
            if (!parts.includes('image')) {
                parts.push('image');
            }
            continue;
        }
        if (arg.startsWith('width=') || arg.startsWith('height=')) {
            const eq = arg.indexOf('=');
            const key = arg.slice(0, eq);
            const raw = arg.slice(eq + 1);
            const dim = parse_dimension(raw);
            if (dim === null) {
                notes.push(`invalid ${key} value "${raw}" ignored`);
            }
            else if (key === 'width') {
                width = dim;
            }
            else {
                height = dim;
            }
            continue;
        }
        notes.push(`unknown token "${arg}" ignored`);
    }
    if (ide) {
        if (parts.length > 0) {
            notes.push('ide overrides individual part tokens');
        }
        parts.length = 0;
        parts.push(...IDE_LAYOUT);
    }
    if (parts.length === 0) {
        parts.push('image', 'code');
    }
    const interactive = ide || parts.some(p => INTERACTIVE_PARTS.has(p));
    if (interactive && format !== 'svg') {
        notes.push(`raster format "${format}" overridden to svg for an interactive block`);
        format = 'svg';
    }
    return {
        parts,
        ide,
        format,
        width,
        height,
        interactive,
        notes
    };
}
