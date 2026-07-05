/**
 *  The descriptor interpreter for the FSL Markdown fence convention: turns a
 *  parsed {@link FenceDescriptor} plus FSL source into static HTML, and walks
 *  a whole Markdown document replacing every `fsl`/`jssm` fence in place.
 *  This is the integration point for the five pieces built ahead of it — the
 *  fence-info parser, the viz pipeline, the rasterizer, the SVG fill
 *  extractor, and the editor-parity highlighter.
 *
 *  @see notes/superpowers/specs/2026-06-23-fsl-markdown-fence-convention-design.md
 */

import { sm, parse_fence_info, fsl_fence_lang } from './jssm.js';
import type { FenceDescriptor, FenceDimension } from './jssm.js';
import { fsl_to_svg_string, fsl_to_dot, state_svg_label_texts } from './jssm_viz.js';
import { rasterize, rasterizeRgba }              from './cli/subcommands/render/rasterize.js';
import { extract_state_fills, patch_state_fill } from './fsl_svg_patch.js';
import { highlight_fsl_html }   from './fsl_fence_highlight.js';
import { plan_walk }            from './fsl_walk.js';
import { encode_gif }           from './fsl_gif.js';
import type { GifFrame }        from './fsl_gif.js';

/** Options shared by the static fence renderers. */
export interface FenceRenderOptions {
  /** Inline state colors in code spans (default true).  @see highlight_fsl_html */
  inline_colors? : boolean;
}

/** Serialize a parsed dimension to CSS, '' when unset. @internal */
function dim_css(d: FenceDimension | null): string {
  return d === null ? '' : `${d.value}${d.unit === 'percent' ? '%' : 'px'}`;
}

/** Escape text for HTML body and attribute contexts. @internal */
function escape_html(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** The spec §4.9 error box: message plus still-readable source. @internal */
function error_box(source: string, message: string): string {
  return `<div class="fsl-error-box"><strong>FSL error</strong>`
       + `<pre>${escape_html(message)}</pre>`
       + `<pre class="fsl-fence-source"><code>${escape_html(source)}</code></pre></div>`;
}

/** Note comment, invisible but inspectable. @internal */
const note_comment = (note: string): string => `<!-- fsl-fence: ${escape_html(note)} -->`;

/**
 *  Remap an SVG-label-keyed fill map (as produced by
 *  {@link extract_state_fills} from a rendered SVG) to be keyed by state NAME
 *  instead. Graphviz labels each node with its full rendered label text —
 *  display text, plus any group chips, plus any multi-line wrap — while
 *  `highlight_fsl_html`'s `state_colors` option is keyed by the state's own
 *  name (the code highlighter's semantic spans carry names, not labels).
 *  Without this remap, any state whose label diverges from its name silently
 *  fails to carry its diagram color to its code span.
 *
 *  Both sides of the join derive the SVG label text from the same source:
 *  `label_texts` comes from {@link state_svg_label_texts} (the viz's own label
 *  builder) and `fills`'s keys are read straight off the SVG, so group chips
 *  and multi-line labels are handled without either side drifting.
 *
 *  @param label_texts - State name → its rendered SVG label text, from
 *  `state_svg_label_texts`.
 *  @param fills - SVG-label-keyed fills, from `extract_state_fills`.
 *  @returns Fills re-keyed by state name; states with no matching fill are omitted.
 *
 *  @internal
 */
function state_colors_by_name(
  label_texts : ReadonlyMap<string, string>,
  fills       : ReadonlyMap<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [state, label] of label_texts) {
    const fill = fills.get(label);
    if (fill !== undefined) { out.set(state, fill); }
  }
  return out;
}

/** Parts that exist only interactively; static hosts note-and-skip them. @internal */
const INTERACTIVE_PARTS: ReadonlySet<string> = new Set(['editor', 'actions', 'info-panel', 'toolbar']);

/**
 *  Render one FSL markdown fence to static HTML per the fence convention:
 *  parts stack top-down in the order written, sized by width/height, with
 *  editor-parity code highlighting whose state names carry the diagram's own
 *  node colors.  Invalid FSL renders a visible error box — this function
 *  never throws for bad machine source.
 *
 *  @param source - The FSL machine source (fence body).
 *  @param info - The fence info string (e.g. `'fsl image code width=300'`).
 *  @param opts.inline_colors - Whether code spans carry inline diagram colors (default true).
 *  @returns The rendered `<div class="fsl-fence">…</div>` markup.
 *
 *  @example
 *  await render_fence_html('Red => Green => Red;', 'fsl');
 *  // '<div class="fsl-fence" …><svg…/svg><pre class="fsl-code">…</pre></div>'
 */
export async function render_fence_html(
  source : string,
  info   : string,
  opts   : FenceRenderOptions = {},
): Promise<string> {

  const desc = parse_fence_info(info);

  let machine: ReturnType<typeof sm>;
  try {
    machine = sm`${source}`;
  } catch (e) {
    // Every `throw` reachable from `sm()` — the PEG grammar in fsl_parser.ts
    // (peg$SyntaxError subclasses Error), jssm_compiler.ts, and jssm.ts —
    // constructs an Error subclass (JssmError/TypeError/RangeError/Error);
    // none of them throw a bare value. A non-Error `e` is therefore
    // unreachable through this call, audited across every throw site in
    // src/ts.
    /* v8 ignore next */
    const message = e instanceof Error ? e.message : String(e);
    return wrap(desc, [error_box(source, message)]);
  }

  const svg          = await fsl_to_svg_string(source);
  const fills        = extract_state_fills(svg);
  const state_colors = state_colors_by_name(state_svg_label_texts(machine), fills);
  const chunks: string[] = desc.notes.map(note_comment);

  for (const part of desc.parts) {
    if (INTERACTIVE_PARTS.has(part)) {
      chunks.push(note_comment(`${part} is interactive; omitted in static rendering`));
      continue;
    }
    if (part === 'image') { chunks.push(await image_html(source, svg, desc)); continue; }
    if (part === 'code') {
      chunks.push(`<pre class="fsl-code"><code>${
        highlight_fsl_html(source, { state_colors, inline_colors: opts.inline_colors })
      }</code></pre>`);
      continue;
    }
    if (part === 'dot') {
      chunks.push(`<pre class="fsl-dot"><code>${escape_html(fsl_to_dot(source))}</code></pre>`);
      continue;
    }
    if (part === 'title') {
      const name = machine.machine_name() ?? 'FSL machine';
      chunks.push(`<div class="fsl-title">${escape_html(name)}</div>`);
      continue;
    }
    // footer
    chunks.push('<div class="fsl-footer"></div>');
  }

  return wrap(desc, chunks);

}

/** The sized wrapper div. @internal */
function wrap(desc: FenceDescriptor, chunks: string[]): string {
  const styles = [
    dim_css(desc.width)  !== '' ? `width:${dim_css(desc.width)}`   : '',
    dim_css(desc.height) !== '' ? `height:${dim_css(desc.height)}` : '',
  ].filter(Boolean).join(';');
  const style_attr = styles === '' ? '' : ` style="${styles}"`;
  return `<div class="fsl-fence"${style_attr}>${chunks.join('')}</div>`;
}

/** Render the image part in the descriptor's format. @internal */
async function image_html(source: string, svg: string, desc: FenceDescriptor): Promise<string> {
  if (desc.format === 'svg') { return svg; }
  if (desc.format === 'gif') {
    const gif_bytes = await render_fence_gif(source, {});
    const gif_b64 = (typeof Buffer !== 'undefined')
      ? Buffer.from(gif_bytes).toString('base64')
      : btoa(String.fromCharCode(...gif_bytes));
    return `<img class="fsl-image" src="data:image/gif;base64,${gif_b64}" alt="FSL state machine walk"/>`;
  }
  const bytes = await rasterize(svg, desc.format, {});
  const b64 = (typeof Buffer !== 'undefined')
    ? Buffer.from(bytes).toString('base64')
    : btoa(String.fromCharCode(...bytes));
  return `<img class="fsl-image" src="data:image/${desc.format};base64,${b64}" alt="FSL state machine"/>`;
}

/**
 *  Replace every fsl/jssm fenced code block in a Markdown string with its
 *  rendered static HTML; all other content passes through byte-identical.
 *  Each fence is isolated — a broken machine becomes its own error box and
 *  the rest of the document still renders.  Backtick fences of length ≥3
 *  are recognized; tilde fences are out of scope (v1, spec §9).
 *
 *  @param markdown - The full Markdown document source.
 *  @param opts.inline_colors - Whether code spans carry inline diagram colors (default true).
 *  @returns The document with every `fsl`/`jssm` fence replaced by rendered HTML.
 *
 *  @example
 *  await transform_markdown('# Doc\n\n```fsl\na -> b;\n```\n');
 *  // '# Doc\n\n<div class="fsl-fence">…</div>\n'
 */
export async function transform_markdown(
  markdown : string,
  opts     : FenceRenderOptions = {},
): Promise<string> {

  const lines = markdown.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const open = lines[i]!.match(/^(`{3,})(.*)$/);
    if (open === null) { out.push(lines[i]!); i += 1; continue; }

    const ticks = open[1]!;
    const info  = open[2]!.trim();
    const body: string[] = [];
    let j = i + 1;
    const close_re = new RegExp('^`{' + ticks.length + ',}\\s*$');
    while (j < lines.length && !close_re.test(lines[j]!)) { body.push(lines[j]!); j += 1; }

    if (fsl_fence_lang(info) === null) {
      // not ours: pass the whole block through untouched (including close fence if any)
      out.push(...lines.slice(i, Math.min(j + 1, lines.length)));
    } else {
      out.push(await render_fence_html(body.join('\n'), info, opts));
    }
    i = j + 1;
  }

  return out.join('\n');

}

/** Options for {@link render_fence_gif}. */
export interface GifRenderOptions {
  /** Per-frame delay, centiseconds.  Default 70 (~0.7s). */
  delay_cs?       : number;
  /** Netscape loop count; 0 = forever (default). */
  loop?           : number;
  /** Walk-length ceiling; longer walks truncate.  Default 64. */
  max_frames?     : number;
  /** Raster zoom percentage; 100 = 3× natural (the CLI raster convention). Default 100. */
  scale?          : number;
  /** Fill painted on the walked state each frame.  Default '#ff9930'. */
  highlight_fill? : string;
}

/**
 *  Render an FSL machine as a looping animated GIF that walks its states:
 *  main-path (`=>`) states in order when a main path exists, else an
 *  every-edge tour.  Graphviz lays the machine out ONCE; each frame patches
 *  one state's fill in the SVG string and rasterizes — identical geometry
 *  across frames, no layout jitter.
 *
 *  @param source - The FSL machine source.
 *  @param opts.delay_cs - Per-frame delay in centiseconds (default 70).
 *  @param opts.loop - Netscape loop count, 0 = forever (default 0).
 *  @param opts.max_frames - Walk-length ceiling; longer walks truncate (default 64).
 *  @param opts.scale - Raster zoom percentage, 100 = 3× natural size (default 100).
 *  @param opts.highlight_fill - Fill painted on the walked state (default '#ff9930').
 *  @returns The encoded GIF89a bytes.
 *
 *  @throws {JssmError} on invalid FSL (programmatic callers want exceptions;
 *  the HTML renderers catch and box instead).
 *
 *  @example
 *  const gif = await render_fence_gif('Red => Green => Yellow => Red;');
 *  // Uint8Array starting "GIF89a", three frames, looping forever
 *
 *  @see plan_walk
 *  @see encode_gif
 */
export async function render_fence_gif(
  source : string,
  opts   : GifRenderOptions = {},
): Promise<Uint8Array> {

  const machine    = sm`${source}`;                    // throws JssmError on bad source
  const max_frames = opts.max_frames ?? 64;
  const walk       = plan_walk(machine).slice(0, max_frames);

  const base_svg    = await fsl_to_svg_string(source);
  const highlight   = opts.highlight_fill ?? '#ff9930';
  const scale       = opts.scale ?? 100;
  const label_texts = state_svg_label_texts(machine);

  const frames: GifFrame[] = [];
  for (const state of walk) {
    // base_svg's nodes are labeled with their full SVG label text (display
    // text + any group chips + any multi-line wrap), not the walk's state
    // NAME — patch by the shared derivation or a labeled/chipped/wrapped
    // state's frame silently no-ops. `walk` is drawn from the machine's own
    // states, so every entry has a label_texts key.
    const patched = patch_state_fill(base_svg, label_texts.get(state)!, highlight);
    const raster  = await rasterizeRgba(patched, { scale });
    frames.push({ rgba: raster.rgba, width: raster.width, height: raster.height });
  }

  return encode_gif(frames, { delay_cs: opts.delay_cs ?? 70, loop: opts.loop ?? 0 });

}
