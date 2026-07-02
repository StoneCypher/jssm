/** Unescape the XML entities graphviz emits inside <title> text. @internal */
function xml_unescape(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Match one graphviz node group; capture [1] the group body. @internal */
const NODE_GROUP_RE = /<g[^>]*\bclass="node"[^>]*>([\s\S]*?)<\/g>/g;
const TITLE_RE      = /<title>([\s\S]*?)<\/title>/;
const TEXT_RE       = /<text[^>]*>([\s\S]*?)<\/text>/;
const SHAPE_FILL_RE = /(<(?:ellipse|polygon|path)\b[^>]*\bfill=")([^"]*)(")/;

/**
 *  Read each state's current fill color out of a graphviz-rendered machine
 *  SVG, keyed by state name.  States whose shape carries no `fill` attribute
 *  are omitted.
 *
 *  @param svg - SVG markup from the jssm viz pipeline (`fsl_to_svg_string`).
 *
 *  @example
 *  extract_state_fills(await fsl_to_svg_string('A -> B;'));  // Map { 'A' => '#…', 'B' => '#…' }
 *
 *  @see patch_state_fill
 */
export function extract_state_fills(svg: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const group of svg.matchAll(NODE_GROUP_RE)) {
    const body  = group[1]!;
    const title = body.match(TITLE_RE);
    const text  = body.match(TEXT_RE);
    const shape = body.match(SHAPE_FILL_RE);
    if (title !== null && shape !== null && text !== null) {
      const state_name = xml_unescape(text[1]!);
      if (state_name) {
        out.set(state_name, shape[2]!);
      }
    }
  }
  return out;
}

/**
 *  Return a copy of the SVG with the named state's first shape fill replaced.
 *  The unmatched-state case returns the input unchanged (walk truncation and
 *  render races surface as a missing highlight, never a throw).
 *
 *  @param svg - SVG markup from the jssm viz pipeline.
 *  @param state - State name as written in FSL (unescaped).
 *  @param fill - Any SVG paint value, e.g. `'#ff9930'`.
 *
 *  @example
 *  patch_state_fill(svg, 'Red', '#ff9930');  // Red's node now renders orange
 *
 *  @see extract_state_fills
 */
export function patch_state_fill(svg: string, state: string, fill: string): string {
  let done = false;
  const out = svg.replace(NODE_GROUP_RE, (whole, body: string) => {
    if (done) { return whole; }
    const title = body.match(TITLE_RE);
    const text  = body.match(TEXT_RE);
    if (title === null || text === null) { return whole; }
    if (xml_unescape(text[1]!) !== state) { return whole; }
    const patched_body = body.replace(SHAPE_FILL_RE, `$1${fill}$3`);
    if (patched_body === body) { return whole; }
    done = true;
    return whole.replace(body, patched_body);
  });
  return out;
}
