/** Unescape the XML entities graphviz emits inside <text> content. @internal */
function xml_unescape(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Match one graphviz node group; capture [1] the group body. @internal */
// `[^>]+` rather than `[^>]*` before `\bclass`/`\bfill`: a zero-length run
// would put the `\b` between two word characters (`<gclass`, `<pathfill`),
// which can never match, so requiring one character is the same language.
const NODE_GROUP_RE = /<g[^>]+\bclass="node"[^>]*>([\s\S]*?)<\/g>/g;
const TEXT_RE_G     = /<text[^>]*>([\s\S]*?)<\/text>/g;
const SHAPE_FILL_RE = /(<(?:ellipse|polygon|path)\b[^>]+\bfill=")([^"]*)(")/;

/**
 *  The state key for one node group: the XML-unescaped content of *every* one
 *  of its `<text>` elements, joined by `\n`.  Graphviz splits a label that
 *  wraps across lines into one `<text>` per line, so reading only the first
 *  would key on a truncated string; joining the lines with `\n` reconstructs
 *  the machine's display text exactly (matching `state_svg_label_texts`).
 *  Returns `null` for a node group carrying no `<text>` element at all.
 *  @internal
 */
function node_label_text(body: string): string | null {
  const lines = [...body.matchAll(TEXT_RE_G)].map(m => xml_unescape(m[1]));
  return lines.length === 0 ? null : lines.join('\n');
}

/**
 *  Read each state's current fill color out of a graphviz-rendered machine
 *  SVG, keyed by state name.  States whose shape carries no `fill` attribute
 *  are omitted.
 *  @param svg - SVG markup from the jssm viz pipeline (`fsl_to_svg_string`).
 *  @example
 *  extract_state_fills(await fsl_to_svg_string('A -> B;'));  // Map { 'A' => '#…', 'B' => '#…' }
 *  @see patch_state_fill
 */
export function extract_state_fills(svg: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const group of svg.matchAll(NODE_GROUP_RE)) {
    const body  = group[1];
    const label = node_label_text(body);
    const shape = body.match(SHAPE_FILL_RE);
    if (shape !== null && label !== null && label !== '') {
      out.set(label, shape[2]);
    }
  }
  return out;
}

/**
 *  Return a copy of the SVG with the named state's first shape fill replaced.
 *  The unmatched-state case returns the input unchanged (walk truncation and
 *  render races surface as a missing highlight, never a throw).
 *  @param svg - SVG markup from the jssm viz pipeline.
 *  @param state - State name as written in FSL (unescaped).
 *  @param fill - Any SVG paint value, e.g. `'#ff9930'`.
 *  @example
 *  patch_state_fill(svg, 'Red', '#ff9930');  // Red's node now renders orange
 *  @see extract_state_fills
 */
export function patch_state_fill(svg: string, state: string, fill: string): string {
  let done = false;
  const out = svg.replace(NODE_GROUP_RE, (whole, body: string) => {
    if (done) { return whole; }
    const label = node_label_text(body);
    if (label === null) { return whole; }
    if (label !== state) { return whole; }
    // Function-form replacements: `fill` is caller-supplied and may itself
    // contain `$`-replacement patterns (e.g. '$&', '$1'). String-form
    // .replace() reinterprets those in the REPLACEMENT argument as special
    // tokens rather than literal text; a function's return value is always
    // inserted verbatim, so both replaces below use the function form.
    const patched_body = body.replace(SHAPE_FILL_RE, (_m, pre: string, _old: string, post: string) => `${pre}${fill}${post}`);
    if (patched_body === body) { return whole; }
    done = true;
    return whole.replace(body, () => patched_body);
  });
  return out;
}
