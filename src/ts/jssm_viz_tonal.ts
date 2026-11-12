import type { VizRenderContext, VizRenderProvider } from './jssm_viz_provider.js';

/**
 * SVG shape data, compatible with Lucide's IconNode entries. Supported tags are
 * path, circle, ellipse, rect, line, polyline and polygon; attributes are validated.
 */
export type TonalIconNode = readonly [tag: string, attributes: Readonly<Record<string, string | number | undefined>>];

/** Library-neutral SVG data; no DOM, raw markup or external assets are required. */
export type TonalSvgIcon = ({ path: string | readonly string[] } | { nodes: readonly TonalIconNode[] }) & {
  /** Defaults to 0 0 24 24. Supply the library's native coordinate system. */
  viewBox?: string;
  /** Defaults to none; currentColor uses the state's text color. */
  fill?: string;
  /** Defaults to currentColor. Use none for solid icons. */
  stroke?: string;
  stroke_width?: number;
};

/** Built-in traffic signals, an emoji grapheme, or portable SVG icon-library data. */
export type TonalIcon = 'traffic-red' | 'traffic-yellow' | 'traffic-green' | 'traffic-off'
  | TonalSvgIcon | { emoji: string };

/** Optional explanatory content. These annotations never change the machine. */
export interface TonalStateContent {
  description?: string;
  /** Monospace prefix for the second line, such as the action name `Next`. */
  action?: string;
  detail?: string;
  icon?: TonalIcon;
}

/** Presentation settings for the tonal SVG provider. All dimensions are SVG points. */
export interface TonalRenderOptions {
  states?: Readonly<Record<string, TonalStateContent>>;
  background?: string;
  /** Override all edge-label colors; their weight and style still distinguish edge kinds. */
  action_color?: string;
  /** Multiplier for forced connection strokes and arrowheads; default 0.7. */
  forced_opacity?: number;
  /** Dark overlay over the node's own color; default 0.1. */
  header_shade?: number;
  /** Characters per body line before Graphviz measures it; default 24. Titles stay on one line. */
  wrap_columns?: number;
  /** Set for reproducible exports; use different prefixes for diagrams sharing a document. */
  id_prefix?: string;
}

type Point = [number, number];
interface DrawOp {
  op: string;
  points?: Point[];
  rect?: [number, number, number, number];
  pt?: Point;
  color?: string;
  text?: string;
  face?: string;
  size?: number;
  fontchar?: number;
  align?: string;
  width?: number;
}
interface LayoutObject {
  _gvid: number;
  name: string;
  id?: string;
  pos?: string;
  bb?: string;
  width?: string;
  height?: string;
  fillcolor?: string;
  fontcolor?: string;
  style?: string;
  shape?: string;
  jssm_shape?: string;
  nodes?: number[];
  _draw_?: DrawOp[];
  _ldraw_?: DrawOp[];
}
interface LayoutEdge {
  _gvid: number;
  tail: number;
  head: number;
  jssm_kind?: string;
  _draw_?: DrawOp[];
  _hdraw_?: DrawOp[];
  _tdraw_?: DrawOp[];
  _ldraw_?: DrawOp[];
}
interface Layout {
  bb: string;
  objects?: LayoutObject[];
  edges?: LayoutEdge[];
  _ldraw_?: DrawOp[];
}

/** Card title font size, in points; the header band is sized from it. */
const title_size = 22;

/** Header band height, in points: exactly 1.5em of the title size. */
const header_height = title_size * 1.5;

/**
 *  Sentinel table-cell background that marks the header band in the Graphviz
 *  label, so its measured bounds can be found again in the JSON layout.
 *  Never painted; chosen to be a color no real machine would declare.
 */
const header_marker = '#010203';

/** Sentinel table-cell background marking the icon slot, found the same way as {@link header_marker}. */
const icon_marker = '#020304';

/** Per-process render counter, used for unique SVG id prefixes when the caller gives no `id_prefix`. */
let render_sequence = 0;

/**
 *  Escapes text for an XML attribute or text node.
 *  @param value Untrusted text, such as a state name or annotation.
 *  @returns The text with `& < > " '` replaced by entities.
 *  @example xml('go<&')  // 'go&lt;&amp;'
 */
function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 *  Quotes text as a DOT string literal, escaping backslashes, quotes and newlines.
 *  @param value Text to place in a DOT attribute.
 *  @returns The double-quoted DOT literal.
 *  @example quoted('say "hi"')  // '"say \\"hi\\""'
 */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, String.raw`\"`).replace(/\r?\n/g, String.raw`\n`)}"`;
}

/**
 *  Validates an optional numeric appearance setting against an inclusive range.
 *  @param value    The caller's setting, or undefined to use the default.
 *  @param fallback The default used when `value` is undefined.
 *  @param min      Smallest accepted value.
 *  @param max      Largest accepted value.
 *  @returns `value`, or `fallback` when it was omitted.
 *  @throws {RangeError} when `value` is not finite or falls outside `[min, max]`.
 *  @example bounded(undefined, 0.7, 0, 1)  // 0.7
 */
function bounded(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) { return fallback; }
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`Tonal rendering value must be between ${min} and ${max}`);
  }
  return value;
}

/**
 *  Validates an optional color. Colors are presentation values, never CSS
 *  declarations or external paint servers, so only hex, named, rgb(a) and
 *  hsl(a) forms are accepted.
 *  @param value    The caller's color, or undefined to use the default.
 *  @param fallback The default used when `value` is undefined.
 *  @returns `value`, or `fallback` when it was omitted.
 *  @throws {TypeError} when `value` is any other form, such as `url(#x)`.
 *  @example color('#abc', '#fff')  // '#abc'
 */
function color(value: string | undefined, fallback: string): string {
  if (value === undefined) { return fallback; }
  if (/^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([\d.,%\s+-]+\))$/i.test(value)) { return value; }
  throw new TypeError(`Unsupported tonal color: ${value}`);
}

/**
 *  Word-wraps text to a column width, keeping explicit line breaks and
 *  splitting words longer than a whole line. Counts code points, not UTF-16 units.
 *  @param text    The text to wrap; `\n` starts a new paragraph.
 *  @param columns Maximum characters per line.
 *  @returns The wrapped lines.
 *  @example wrap('changes the light to green.', 12)  // ['changes the', 'light to', 'green.']
 */
function wrap(text: string, columns: number): string[] {
  return text.split(/\r?\n/).flatMap(paragraph => {
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) { continue; }
      const letters = [...word];
      if (line && [...line].length + letters.length + 1 > columns) { lines.push(line); line = ''; }
      while (letters.length > columns) {
        lines.push(letters.splice(0, columns).join(''));
      }
      const rest = letters.join('');
      if (rest) { line = line ? `${line} ${rest}` : rest; }
    }
    lines.push(line);
    return lines;
  });
}

/**
 *  Wraps already-escaped label markup in a Graphviz HTML-label `<FONT>` element.
 *  @param text Escaped Graphviz HTML-label content.
 *  @param size Point size.
 *  @param face Font family.
 *  @param fill Optional text color.
 *  @returns The `<FONT>` element.
 */
function font(text: string, size: number, face = 'Arial', fill?: string): string {
  return `<FONT FACE="${face}" POINT-SIZE="${size}"${fill ? ` COLOR="${xml(fill)}"` : ''}>${text}</FONT>`;
}

/**
 *  Wraps and escapes text as left-aligned Graphviz HTML-label lines.
 *  @param text    Untrusted body text.
 *  @param columns Maximum characters per line.
 *  @returns The escaped lines, each ending in a left-aligned `<BR/>`.
 *  @see wrap
 */
function html_lines(text: string, columns: number): string {
  return wrap(text, columns).map(xml).join('<BR ALIGN="LEFT"/>') + '<BR ALIGN="LEFT"/>';
}

/**
 *  Builds the Graphviz HTML label for one state card, so Graphviz measures the
 *  title, body and icon slot and routes edges around the real card size. The
 *  header and icon cells carry sentinel colors that {@link marker_bounds} finds later.
 *  @param label      The display label, including group-membership chips.
 *  @param content    Optional description, action, detail and icon for the card.
 *  @param columns    Body wrap width, in characters.
 *  @param text_color The state's text color; picks a legible action-name ink.
 *  @param octagon    Widens the title inset so text clears clipped corners.
 *  @returns The `<TABLE>` HTML label, without the enclosing `< >`.
 */
function card_label(label: string, content: TonalStateContent, columns: number, text_color: string, octagon = false): string {
  // Reserve a single 1.5em line, with horizontal padding independent of height.
  const inset = octagon ? 36 : 12;
  const title = xml(label.replace(/\r?\n/g, ' '));
  const heading = `<TR><TD ALIGN="LEFT" BGCOLOR="${header_marker}" CELLPADDING="0"><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR><TD WIDTH="${inset}">${font('&#160;', 1)}</TD><TD ALIGN="LEFT" VALIGN="MIDDLE" HEIGHT="${header_height}">${font(`<B>${title || '&#160;'}</B>`, title_size)}</TD><TD WIDTH="${inset}">${font('&#160;', 1)}</TD></TR></TABLE></TD></TR>`;
  const paragraphs: string[] = [];
  if (content.description) {
    paragraphs.push(`<TR><TD ALIGN="LEFT">${font(`<B>${html_lines(content.description, columns)}</B>`, 15)}</TD></TR>`);
  }
  if (content.action || content.detail) {
    const action = content.action ?? '';
    const detail = content.detail ?? '';
    const action_ink = /^(?:white|#fff(?:fff)?(?:ff)?)$/i.test(text_color) ? '#e6f1ff' : '#003366';
    const lines = [...action].length > columns
      ? [...wrap(action, columns).map(line => font(xml(line), 15, 'Courier New', action_ink)),
          ...wrap(detail, columns).map(line => font(xml(line), 15))]
      : wrap([action, detail].filter(Boolean).join(' '), columns).map((line, index) => {
        if (index === 0 && action && line.startsWith(action)) {
          return font(xml(action), 15, 'Courier New', action_ink) + font(xml(line.slice(action.length)).replace(/^ /, '&#160;'), 15);
        }
        return font(xml(line), 15);
      });
    paragraphs.push('<TR><TD ALIGN="LEFT">' + lines.join('<BR ALIGN="LEFT"/>') + '<BR ALIGN="LEFT"/></TD></TR>');
  }
  // Match the icon's left inset: 16pt body padding minus 3pt text-cell padding.
  const icon = content.icon ? `<TD WIDTH="60" HEIGHT="66" BGCOLOR="${icon_marker}">&#160;</TD><TD WIDTH="13">${font('&#160;', 1)}</TD>` : '';
  const body = paragraphs.length > 0 || content.icon
    ? `<TR><TD ALIGN="LEFT" CELLPADDING="16"><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR>${icon}<TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">${paragraphs.join('') || '<TR><TD>&#160;</TD></TR>'}</TABLE></TD></TR></TABLE></TD></TR>`
    : '';
  return `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">${heading}${body}</TABLE>`;
}

/**
 *  Formats a Graphviz point as SVG coordinates; Graphviz's y axis points up, SVG's down.
 *  @param p A Graphviz `[x, y]` point.
 *  @returns The `x,-y` SVG coordinate pair.
 *  @example point([3, 4])  // '3,-4'
 */
function point(p: Point): string { return `${p[0]},${-p[1]}`; }

/**
 *  Converts Graphviz xdot shape operations (polygons, polylines, splines,
 *  ellipses) to SVG elements; other operations are ignored.
 *  @param ops   The xdot drawing operations from the JSON layout.
 *  @param attrs Trusted SVG attributes added to every emitted element.
 *  @returns The SVG markup.
 */
function geometry(ops: DrawOp[] = [], attrs = ''): string {
  return ops.map(op => {
    const pts = op.points ?? [];
    switch (op.op) {
      case 'P': case 'p': {
        return `<polygon points="${pts.map(point).join(' ')}" ${attrs}/>`;
      }
      case 'L': {
        return `<polyline points="${pts.map(point).join(' ')}" ${attrs}/>`;
      }
      case 'b': case 'B': {
        if (pts.length < 4) { return ''; }
        return `<path d="M${point(pts[0])} C${pts.slice(1).map(point).join(' ')}" ${attrs}/>`;
      }
      case 'e': case 'E': {
        const [x, y, rx, ry] = op.rect;
        return `<ellipse cx="${x}" cy="${-y}" rx="${rx}" ry="${ry}" ${attrs}/>`;
      }
      default: {
        return '';
      }
    }
  }).join('');
}

/**
 *  Converts Graphviz xdot text operations to SVG `<text>`, tracking the font,
 *  color and bold/italic state the preceding operations set.
 *  @param ops            The xdot label operations.
 *  @param override_color Replaces every text color, as edge labels do.
 *  @param halo           Background-colored outline that keeps labels readable over curves.
 *  @param header         Header-band bounds and inset; title-sized text is
 *                        re-centered in it, since Graphviz may stretch spacer columns.
 *  @returns The SVG markup.
 */
function texts(ops: DrawOp[] = [], override_color?: string, halo?: string, header?: { bounds: number[]; inset: number }): string {
  let size = 15;
  let face = 'Arial';
  let fill = '#17212c';
  let flags = 0;
  return ops.map(op => {
    if (op.op === 'F') { size = op.size; face = op.face; }
    else if (op.op === 'c') { fill = op.color; }
    else if (op.op === 't') { flags = op.fontchar; }
    if (op.op !== 'T' || !op.text?.trim()) { return ''; }
    const anchor = op.align === 'l' ? 'start' : (op.align === 'r' ? 'end' : 'middle');
    const length = op.width > 0 ? ` textLength="${op.width}" lengthAdjust="spacingAndGlyphs"` : '';
    const heading = header && size === title_size;
    // Graphviz may stretch the spacer columns to match a wider body.
    const x = heading ? header.bounds[0] + header.inset : op.pt[0];
    const y = heading ? (header.bounds[1] + header.bounds[3]) / 2 : -op.pt[1];
    const centered = heading ? ' class="tonal-title" dominant-baseline="central"' : '';
    const italic = flags & 2 ? ' font-style="italic"' : '';
    const outline = halo ? ` stroke="${xml(halo)}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"` : '';
    return `<text x="${x}" y="${y}"${centered} text-anchor="${anchor}" font-family="${xml(face)}, sans-serif" font-size="${size}" font-weight="${flags & 1 ? 600 : 400}"${italic} fill="${xml(override_color ?? fill)}"${length}${outline}>${xml(op.text)}</text>`;
  }).join('');
}

type Bounds = [number, number, number, number];

/** Conservative text bounds in Graphviz coordinates, including italic overhang and halo. */
function text_bounds(ops: DrawOp[] = []): Bounds | undefined {
  let size = 15;
  const boxes: Bounds[] = [];
  for (const op of ops) {
    if (op.op === 'F') { size = op.size; }
    if (op.op !== 'T' || !op.text?.trim()) { continue; }
    const x = op.pt[0] - (op.align === 'l' ? 0 : (op.align === 'r' ? op.width : op.width / 2));
    boxes.push([x - 4, op.pt[1] - size * 0.3 - 4, x + op.width + 4, op.pt[1] + size * 0.9 + 4]);
  }
  return boxes.length > 0 ? [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])),
    Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))] : undefined;
}

/**
 *  Tests whether two axis-aligned boxes overlap; touching edges do not count.
 *  @param a A box as `[left, bottom, right, top]`.
 *  @param b A box as `[left, bottom, right, top]`.
 *  @returns True when their interiors intersect.
 *  @example overlaps([0, 0, 2, 2], [1, 1, 3, 3])  // true
 */
function overlaps(a: Bounds, b: Bounds): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

/** Flatten cubic splines for label clearance; the actual rendered routes stay untouched. */
function edge_segments(edge: LayoutEdge): [Point, Point][] {
  const segments: [Point, Point][] = [];
  const operations = edge._draw_ ?? [];
  for (const op of operations) {
    const points = op.points ?? [];
    if (op.op === 'L') {
      for (let i = 1; i < points.length; i++) { segments.push([points[i - 1], points[i]]); }
    } else if (op.op === 'b' || op.op === 'B') {
      for (let i = 0; i + 3 < points.length; i += 3) {
        let previous = points[i];
        for (let step = 1; step <= 20; step++) {
          const t = step / 20, u = 1 - t;
          const p = [0, 1].map(axis => u ** 3 * points[i][axis] + 3 * u * u * t * points[i + 1][axis]
            + 3 * u * t * t * points[i + 2][axis] + t ** 3 * points[i + 3][axis]) as Point;
          segments.push([previous, p]); previous = p;
        }
      }
    }
  }
  return segments;
}

/**
 *  Tests whether a line segment passes through a box (slab clipping).
 *  @param box     A box as `[left, bottom, right, top]`.
 *  @param segment The segment's two endpoints.
 *  @returns True when any part of the segment lies inside the box.
 *  @example crosses([0, 0, 2, 2], [[-1, 1], [3, 1]])  // true
 */
function crosses(box: Bounds, [a, b]: [Point, Point]): boolean {
  let low = 0, high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.000001) {
      if (a[axis] < box[axis] || a[axis] > box[axis + 2]) { return false; }
    } else {
      const t1 = (box[axis] - a[axis]) / delta, t2 = (box[axis + 2] - a[axis]) / delta;
      low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2));
      if (low > high) { return false; }
    }
  }
  return true;
}

/** Place labels beside their routes without feeding label dimensions back into layout. */
function place_edge_labels(layout: Layout): void {
  const nodes = (layout.objects ?? []).filter(obj => obj.pos);
  const boxes: Bounds[] = nodes.map(node => {
    const [x, y] = node.pos.split(',').map(Number);
    return [x - Number(node.width) * 36 - 6, y - Number(node.height) * 36 - 6,
      x + Number(node.width) * 36 + 6, y + Number(node.height) * 36 + 6];
  });
  const objects = layout.objects ?? [];
  for (const object of objects) {
    if (object.pos) { continue; }
    const bounds = text_bounds(object._ldraw_);
    if (bounds) { boxes.push(bounds); }
  }
  const graph_label = text_bounds(layout._ldraw_);
  if (graph_label) { boxes.push(graph_label); }
  const center = nodes.length > 0 ? [0, 1].map(axis => nodes.reduce((sum, node) =>
    sum + Number(node.pos.split(',')[axis]), 0) / nodes.length) as Point : [0, 0] as Point;
  const edges = (layout.edges ?? []).filter(edge => edge._draw_);
  const routes = new Map(edges.map(edge => [edge, edge_segments(edge)]));
  const all_segments = [...routes.values()].flat();
  const placed: Bounds[] = [];
  for (const edge of edges) {
    const bounds = text_bounds(edge._ldraw_);
    const segments = routes.get(edge);
    if (!bounds || segments.length === 0) { continue; }
    const lengths = segments.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    let remaining = lengths.reduce((sum, n) => sum + n, 0) / 2;
    let index = 0;
    while (index < lengths.length - 1 && remaining > lengths[index]) { remaining -= lengths[index++]; }
    const [a, b] = segments[index], length = lengths[index] || 1;
    const midpoint: Point = [a[0] + (b[0] - a[0]) * remaining / length, a[1] + (b[1] - a[1]) * remaining / length];
    const normal: Point = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    const direction = normal[0] * (midpoint[0] - center[0]) + normal[1] * (midpoint[1] - center[1]) < 0 ? -1 : 1;
    const w = bounds[2] - bounds[0], h = bounds[3] - bounds[1];
    const clearance = Math.abs(normal[0]) * w / 2 + Math.abs(normal[1]) * h / 2 + 6;
    const preferred: Point = [midpoint[0] + normal[0] * clearance * direction, midpoint[1] + normal[1] * clearance * direction];
    const initial: Bounds = [preferred[0] - w / 2, preferred[1] - h / 2, preferred[0] + w / 2, preferred[1] + h / 2];
    // Bound the search and retain every label even if a dense graph has no clear location.
    let best = bounds, best_score = Infinity;
    const opposite: Bounds = [midpoint[0] * 2 - initial[2], midpoint[1] * 2 - initial[3], midpoint[0] * 2 - initial[0], midpoint[1] * 2 - initial[1]];
    const search: Bounds = [Math.min(initial[0], opposite[0], bounds[0]) - 128,
      Math.min(initial[1], opposite[1], bounds[1]) - 128,
      Math.max(initial[2], opposite[2], bounds[2]) + 128,
      Math.max(initial[3], opposite[3], bounds[3]) + 128];
    const nearby = all_segments.filter(segment => crosses(search, segment));
    const candidates: Bounds[] = [initial, opposite, bounds];
    const own_segments = new Set(segments);
    for (let radius = 4; radius <= 128; radius += 4) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        candidates.push([initial[0] + dx * radius, initial[1] + dy * radius, initial[2] + dx * radius, initial[3] + dy * radius]);
      }
    }
    for (const candidate of candidates) {
      // Keep the visual association with the owning route: prefer the other side
      // before placing a label across a neighboring transition.
      const nearest: Point = [Math.max(candidate[0], Math.min(midpoint[0], candidate[2])),
        Math.max(candidate[1], Math.min(midpoint[1], candidate[3]))];
      const tether: Bounds = [Math.min(midpoint[0], nearest[0]), Math.min(midpoint[1], nearest[1]),
        Math.max(midpoint[0], nearest[0]), Math.max(midpoint[1], nearest[1])];
      const score = boxes.filter(box => overlaps(candidate, box)).length * 1_000_000
        + placed.filter(box => overlaps(candidate, box)).length * 100_000
        + nearby.filter(segment => crosses(candidate, segment)).length * 10_000
        + Number(nearby.some(segment => !own_segments.has(segment) && crosses(tether, segment))) * 1000
        + Math.hypot(candidate[0] - initial[0], candidate[1] - initial[1]);
      if (score < best_score) { best = candidate; best_score = score; }
      // eslint-disable-next-line unicorn/no-break-in-nested-loop -- zero is the lower bound for this label
      if (score === 0) { break; }
    }
    const dx = best[0] - bounds[0], dy = best[1] - bounds[1];
    const label_operations = edge._ldraw_ ?? [];
    for (const op of label_operations) {
      if (op.op === 'T') { op.pt = [op.pt[0] + dx, op.pt[1] + dy]; }
    }
    placed.push(best);
  }
}

/**
 *  Finds the SVG-space bounds of the label cell painted with a sentinel color.
 *  @param ops    A node's xdot label operations.
 *  @param marker The sentinel fill, {@link header_marker} or {@link icon_marker}.
 *  @returns `[left, top, right, bottom]`, or undefined when the card has no such cell.
 */
function marker_bounds(ops: DrawOp[] = [], marker: string): number[] | undefined {
  let fill = '';
  for (const op of ops) {
    if (op.op === 'C') { fill = op.color; }
    if (op.op === 'P' && fill === marker && op.points?.length) {
      const xs = op.points.map(p => p[0]);
      const ys = op.points.map(p => -p[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
  }
  return undefined;
}

/** Icon shape elements accepted from icon libraries: self-contained drawing primitives only. */
const icon_tags = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

/** Icon attributes accepted: geometry, transforms and paint, never events or references. */
const icon_attributes = new Set(['d', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform']);

/**
 *  Converts one validated icon shape record to an SVG element.
 *  @param node A `[tag, attributes]` record, as Lucide's IconNode supplies.
 *  @returns The escaped SVG element.
 *  @throws {TypeError} for an unsupported tag, an unsupported attribute, a
 *          non-finite number, or a fill/stroke that {@link color} rejects.
 *  @example icon_node(['circle', { cx: 12, cy: 12, r: 4 }])  // '<circle cx="12" cy="12" r="4"/>'
 */
function icon_node([tag, attributes]: TonalIconNode): string {
  if (!icon_tags.has(tag)) { throw new TypeError(`Unsupported tonal icon element: ${tag}`); }
  const attrs = Object.entries(attributes).flatMap(([name, value]) => {
    // Some libraries attach framework bookkeeping to their shape records.
    if (name === 'key' || value === undefined) { return []; }
    if (!icon_attributes.has(name)) { throw new TypeError(`Unsupported tonal icon attribute: ${name}`); }
    if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new TypeError(`Invalid tonal icon attribute: ${name}`);
    }
    const safe = name === 'fill' || name === 'stroke' ? color(String(value), 'none') : String(value);
    return [`${name}="${xml(safe)}"`];
  });
  return `<${tag} ${attrs.join(' ')}/>`;
}

/**
 *  Validates and normalizes an icon viewBox.
 *  @param value Four numbers separated by spaces or commas; defaults to Lucide's `0 0 24 24`.
 *  @returns The four numbers joined by spaces.
 *  @throws {TypeError} unless there are four finite numbers with positive width and height.
 *  @example icon_viewbox('0,0,512,512')  // '0 0 512 512'
 */
function icon_viewbox(value = '0 0 24 24'): string {
  const dimensions = value.trim().split(/[\s,]+/).map(Number);
  if (dimensions.length !== 4 || dimensions.some(n => !Number.isFinite(n)) || dimensions[2] <= 0 || dimensions[3] <= 0) {
    throw new TypeError('Tonal icon viewBox must contain four finite numbers with positive width and height');
  }
  return dimensions.join(' ');
}

/**
 *  Draws a card's icon centered in its measured slot: a built-in traffic
 *  signal, an emoji, or validated SVG icon data.
 *  @param icon   The icon annotation.
 *  @param bounds The icon slot from {@link marker_bounds}; nothing is drawn without one.
 *  @param fill   The state's text color, used as the icon's `currentColor`.
 *  @returns The SVG markup.
 *  @throws {TypeError} when SVG icon data fails validation.
 */
function icon_svg(icon: TonalIcon, bounds: number[], fill: string): string {
  if (!bounds) { return ''; }
  const [left, top, right, bottom] = bounds;
  const x = left + (right - left - 40) / 2;
  const y = top + (bottom - top - 62) / 2;
  if (typeof icon === 'object') {
    if ('emoji' in icon) {
      return `<text class="tonal-icon-emoji" x="${x + 20}" y="${y + 31}" text-anchor="middle" dominant-baseline="central" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="36" fill="${xml(fill)}">${xml(icon.emoji)}</text>`;
    }
    const shapes = 'nodes' in icon ? icon.nodes.map(icon_node).join('')
      : (typeof icon.path === 'string' ? [icon.path] : icon.path).map(d => icon_node(['path', { d }])).join('');
    return `<svg class="tonal-icon-svg" x="${x}" y="${y}" width="40" height="62" viewBox="${icon_viewbox(icon.viewBox)}" color="${xml(fill)}" fill="${xml(color(icon.fill, 'none'))}" stroke="${xml(color(icon.stroke, 'currentColor'))}" stroke-width="${bounded(icon.stroke_width, 1.5, 0, 100)}" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
  }
  const active = ['traffic-red', 'traffic-yellow', 'traffic-green'].indexOf(icon);
  const lights = ['#f34255', '#efbf24', '#27b778'];
  return `<g transform="translate(${x},${y})" stroke="${xml(fill)}" stroke-width="1.5" fill="none"><rect x="8" y="1" width="25" height="60" rx="5"/><path d="M8 9 H1 L8 17 M33 9 H40 L33 17 M8 29 H1 L8 37 M33 29 H40 L33 37 M8 49 H1 L8 57 M33 49 H40 L33 57"/>${lights.map((c, i) => `<circle cx="20.5" cy="${12 + i * 19}" r="7.2" fill="${i === active ? c : 'none'}"/>`).join('')}</g>`;
}

/** Compact octagons use the measured card bounds, with short 45-degree corners. */
function compact_outline(node: LayoutObject): Point[] | undefined {
  if (node.jssm_shape !== 'octagon') { return undefined; }
  const [x, y] = node.pos.split(',').map(Number);
  const w = Number(node.width) * 72;
  const h = Number(node.height) * 72;
  const cut = Math.min(32, w * 0.16, h * 0.25);
  const l = x - w / 2, r = x + w / 2, b = y - h / 2, t = y + h / 2;
  return [[l + cut, t], [r - cut, t], [r, t - cut], [r, b + cut],
    [r - cut, b], [l + cut, b], [l, b + cut], [l, t - cut]];
}

/** Extend a box-routed spline and its arrow to a clipped corner when necessary. */
function clip_compact_endpoint(edge: LayoutEdge, node: LayoutObject, head: boolean): void {
  const outline = compact_outline(node);
  const curve = edge._draw_?.find(op => op.op === 'b' || op.op === 'B')?.points;
  if (!outline || !curve || curve.length < 4) { return; }
  const index = head ? curve.length - 1 : 0;
  const handle = head ? index - 1 : 1;
  const end = curve[index];
  const dx = end[0] - curve[handle][0], dy = end[1] - curve[handle][1];
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) { return; }
  const direction: Point = [dx / length, dy / length];
  const arrow = (head ? edge._hdraw_ : edge._tdraw_) ?? [];
  const arrow_points = arrow.flatMap(op => op.points ?? []);
  // The point furthest along the tangent is the arrow's contact tip.
  const tip = arrow_points.reduce((best, p) =>
    p[0] * direction[0] + p[1] * direction[1] > best[0] * direction[0] + best[1] * direction[1] ? p : best, end);
  const cross = (a: Point, b: Point): number => a[0] * b[1] - a[1] * b[0];
  if (outline.every((a, i) => {
    const b = outline[(i + 1) % outline.length];
    return cross([b[0] - a[0], b[1] - a[1]], [tip[0] - a[0], tip[1] - a[1]]) <= 0.01;
  })) { return; }
  let distance = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const segment: Point = [b[0] - a[0], b[1] - a[1]];
    const offset: Point = [a[0] - tip[0], a[1] - tip[1]];
    const divisor = cross(direction, segment);
    if (Math.abs(divisor) < 1e-6) { continue; }
    const t = cross(offset, segment) / divisor;
    const u = cross(offset, direction) / divisor;
    if (t >= -0.1 && u >= 0 && u <= 1) { distance = Math.min(distance, Math.max(0, t)); }
  }
  // Preserve Graphviz's sub-point border spacing on unchanged straight sides.
  if (!Number.isFinite(distance) || distance <= 1.5) { return; }
  const shift = (p: Point): Point => [p[0] + direction[0] * distance, p[1] + direction[1] * distance];
  curve[index] = shift(end);
  curve[handle] = shift(curve[handle]);
  for (const op of arrow) {
    if (op.points) { op.points = op.points.map(shift); }
    if (op.rect) {
      const shifted = shift([op.rect[0], op.rect[1]]);
      op.rect = [shifted[0], shifted[1], op.rect[2], op.rect[3]];
    }
  }
}

/**
 * Detect source declarations without treating theme defaults as explicit borders.
 * The winning color still comes from style_for via Graphviz's resolved stroke.
 */
function has_declared_border(machine: VizRenderContext['machine'], name: string): boolean {
  const configs = [machine.standard_state_style, machine.state_declaration(name)];
  if (machine.state_has_hooks(name)) { configs.push(machine.hooked_state_style); }
  if (machine.state_is_terminal(name)) { configs.push(machine.terminal_state_style); }
  if (machine.is_start_state(name)) { configs.push(machine.start_state_style); }
  if (machine.is_end_state(name)) { configs.push(machine.end_state_style); }
  if (machine.state() === name) { configs.push(machine.active_state_style); }
  return configs.some(config => config?.borderColor !== undefined)
    || [...machine.groupsOf(name)].some(group => machine._group_metadata.get(group)?.borderColor !== undefined);
}

/** Graphviz resolves named fills to RGB(A); retain hue and alpha, darken by 18%. */
function tonal_border(fill: string): string {
  const rgb = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(fill);
  if (!rgb) { return fill; }
  const channels = [0, 2, 4].map(offset =>
    Math.round(Number.parseInt(rgb[1].slice(offset, offset + 2), 16) * 0.82).toString(16).padStart(2, '0'));
  return '#' + channels.join('') + (rgb[2] ?? '');
}

/**
 *  Draws one measured state as a tonal card: shadowed fill, header band,
 *  re-centered title, body text, icon and border.
 *  @param node            The node's Graphviz JSON layout object.
 *  @param content         The state's optional annotations.
 *  @param prefix          Document-local id prefix for clip paths and gradients.
 *  @param shade           Header overlay opacity, 0 to 1.
 *  @param declared_border True when the source declares a border color, which
 *                         then wins over the darkened-fill default.
 *  @returns The card's `<g class="node">` markup.
 */
function card(node: LayoutObject, content: TonalStateContent, prefix: string, shade: number, declared_border: boolean): string {
  const [x, y] = node.pos.split(',').map(Number);
  const w = Number(node.width) * 72;
  const h = Number(node.height) * 72;
  const left = x - w / 2;
  const top = -y - h / 2;
  const clip = `${prefix}-clip-${node._gvid}`;
  const gradient = `${prefix}-fill-${node._gvid}`;
  const outline = compact_outline(node);
  const shape: DrawOp[] = outline ? [{ op: 'P', points: outline }] : node._draw_;
  const header = marker_bounds(node._ldraw_, header_marker);
  const icon_bounds = marker_bounds(node._ldraw_, icon_marker);
  const fill = node._draw_?.find(op => op.op === 'C')?.color ?? node.fillcolor ?? '#d9e7f0';
  const ink = node.fontcolor || '#17212c';
  const border = declared_border ? node._draw_?.find(op => op.op === 'c')?.color ?? tonal_border(fill) : tonal_border(fill);
  const dash = node.style?.includes('dashed') ? ' stroke-dasharray="7 5"' : (node.style?.includes('dotted') ? ' stroke-dasharray="1 4"' : '');
  return `<g class="node" id="${prefix}-node-${xml(node.name)}"><title>${xml(node.name)}</title>
<defs><clipPath id="${clip}">${geometry(shape)}</clipPath><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity="0.12"/><stop offset="1" stop-color="black" stop-opacity="0.035"/></linearGradient></defs>
${geometry(shape, `fill="${xml(fill)}" filter="url(#${prefix}-shadow)"`)}
<g clip-path="url(#${clip})"><rect x="${left - 1}" y="${top - 1}" width="${w + 2}" height="${h + 2}" fill="url(#${gradient})"/>
${header ? `<rect class="tonal-header" x="${left - 1}" y="${header[1]}" width="${w + 2}" height="${header_height}" fill="black" opacity="${shade}"/>` : ''}
${texts(node._ldraw_, undefined, undefined, header ? { bounds: header, inset: outline ? 36 : 12 } : undefined)}${content.icon ? icon_svg(content.icon, icon_bounds, ink) : ''}</g>
${geometry(shape, `class="tonal-border" fill="none" stroke="${xml(border)}" stroke-width="1.2"${dash}`)}</g>`;
}

/** Draw the measured Graphviz geometry with tonal cards and restrained transition styling. */
async function render_tonal(context: VizRenderContext): Promise<string> {
  const { machine, options } = context;
  const opts = options.tonal ?? {};
  const background = color(opts.background, '#101827');
  const action_colors = {
    main: color(opts.action_color, '#b9dbff'),
    legal: color(opts.action_color, '#a9cfff'),
    forced: color(opts.action_color, '#91a6c2')
  };
  const opacity = bounded(opts.forced_opacity, 0.7, 0, 1);
  const shade = bounded(opts.header_shade, 0.1, 0, 1);
  const columns = Math.floor(bounded(opts.wrap_columns, 24, 8, 120));
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function -- document-local SVG definitions must not collide across separate chart instances
  const sequence = ++render_sequence;
  const prefix = opts.id_prefix ?? `jssm-tonal-${sequence}`;
  if (!/^[a-z][\w-]*$/i.test(prefix)) { throw new TypeError('Tonal id_prefix must be a valid SVG identifier'); }
  const content_for = (name: string): TonalStateContent =>
    Object.prototype.hasOwnProperty.call(opts.states ?? {}, name) ? opts.states[name] : {};
  const nodes = new Map<string, string>();
  for (const name of machine.states()) {
    const label = options.hide_state_labels ? '' : context.state_labels.get(name);
    const style = machine.style_for(name);
    const ink = style.textColor || '#17212c';
    const octagon = style.shape === 'octagon';
    const content = content_for(name);
    const table = card_label(label, content, columns, ink, octagon);
    nodes.set(name, `${octagon ? 'shape=box jssm_shape="octagon" ' : ''}label=<${table}> margin=0 height=0 fontname="Arial" fontcolor=${quoted(ink)} style=${quoted(`filled,rounded,${style.lineStyle || 'solid'}`)}`);
  }
  // Reserve the same label clearance everywhere, rather than distorting individual routes.
  const label_span = Math.max(61, ...machine.list_edges().flatMap(tr =>
    [tr.action ?? '', tr.probability === undefined ? '' : String(tr.probability)]
      .flatMap(text => text.split('\n').map(line => [...line].length * 9 + 40))));
  const horizontal = machine.flow() === 'left' || machine.flow() === 'right';
  const dot = context.to_dot({
    nodes,
    separate_edges: true,
    // External labels are placed after routing so their text cannot unbalance the graph.
    // Force placement even on dense graphs: a named action must never silently disappear.
    graph: `nodesep=${Math.min(label_span, 120) / 72}; ranksep=${horizontal ? Math.max(1.15, label_span / 72) : 1.15}; pad=0; outputorder=edgesfirst; forcelabels=true;`,
    edge: tr => {
      const label = [tr.action, tr.probability === undefined ? undefined : String(tr.probability)].filter(v => v !== undefined && v !== '').join('\n');
      const kind = tr.forced_only ? 'forced' : (tr.main_path ? 'main' : 'legal');
      const escaped = xml(label).replace(/\n/g, '<BR/>');
      const formatted = kind === 'main' ? `<B>${escaped}</B>` : (kind === 'forced' ? `<I>${escaped}</I>` : escaped);
      return `taillabel="" headlabel="" label="" xlabel=${label ? `<${formatted}>` : '""'} fontname="Courier New" fontsize=${kind === 'forced' ? 14 : 15} arrowsize=${kind === 'main' ? 0.9 : 0.8} jssm_kind=${quoted(kind)}`;
    }
  });
  const layout = JSON.parse(await context.render_dot(dot, 'json')) as Layout;
  if (typeof layout.bb !== 'string') { throw new TypeError('Tonal rendering requires Graphviz JSON layout output'); }
  const bb = layout.bb.split(',').map(Number);
  if (bb.length !== 4 || bb.some(v => !Number.isFinite(v))) { throw new TypeError('Invalid Graphviz layout bounds'); }
  const by_id = new Map((layout.objects ?? []).map(obj => [obj._gvid, obj]));
  const layout_edges = layout.edges ?? [];
  for (const edge of layout_edges) {
    clip_compact_endpoint(edge, by_id.get(edge.head), true);
    clip_compact_endpoint(edge, by_id.get(edge.tail), false);
  }
  place_edge_labels(layout);
  for (const edge of layout_edges) {
    const label = text_bounds(edge._ldraw_);
    if (label) { bb[0] = Math.min(bb[0], label[0]); bb[1] = Math.min(bb[1], label[1]); bb[2] = Math.max(bb[2], label[2]); bb[3] = Math.max(bb[3], label[3]); }
  }
  const pad = 36;
  const width = bb[2] - bb[0] + pad * 2;
  const height = bb[3] - bb[1] + pad * 2;
  const objects = layout.objects ?? [];
  const by_name = new Map([...context.state_ids].map(([name, id]) => [id, name]));
  const clusters = objects.filter(obj => obj.bb && !obj.pos).map(obj => `<g class="cluster"><title>${xml(obj.name)}</title>${geometry(obj._draw_, 'fill="none" stroke="#93adc9" stroke-opacity="0.3" stroke-width="1"')}${texts(obj._ldraw_, '#cbd7e5')}</g>`).join('');
  const labels: string[] = [];
  const edges = (layout.edges ?? []).map(edge => {
    // Invisible edges introduced by arrange ordering have no drawing operations.
    if (!edge._draw_) { return ''; }
    const kind = edge.jssm_kind === 'main' ? 'main' : (edge.jssm_kind === 'forced' ? 'forced' : 'legal');
    const forced = kind === 'forced';
    const stroke = forced ? '#a8b9d3' : '#ffffff';
    const stroke_width = kind === 'main' ? 2.5 : (forced ? 1.4 : 1.65);
    const title = `${by_id.get(edge.tail).name}->${by_id.get(edge.head).name}`;
    labels.push(`<g class="edge-label edge-label-${kind}" data-edge-id="${prefix}-edge-${edge._gvid}">${texts(edge._ldraw_, action_colors[kind], background)}</g>`);
    return `<g class="edge" data-transition-kind="${kind}" id="${prefix}-edge-${edge._gvid}"><title>${xml(title)}</title><g opacity="${forced ? opacity : 1}">${geometry(edge._draw_, `fill="none" stroke="${stroke}" stroke-width="${stroke_width}" stroke-linecap="round"${forced ? ' stroke-dasharray="5 6"' : ''}`)}${geometry(edge._hdraw_, `fill="${kind === 'main' ? stroke : background}" stroke="${stroke}" stroke-width="1.6"`)}${geometry(edge._tdraw_, `fill="${background}" stroke="${stroke}" stroke-width="1.6"`)}</g></g>`;
  }).join('');
  const cards = objects.filter(obj => by_name.has(obj.name)).map(obj => card(obj, content_for(by_name.get(obj.name)), prefix, shade, has_declared_border(machine, by_name.get(obj.name)))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" role="img" data-render-provider="tonal"><title>${xml(machine.machine_name() || 'State machine')}</title>
<defs><filter id="${prefix}-shadow" x="-30%" y="-40%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/></filter></defs>
<rect width="100%" height="100%" fill="${xml(background)}"/>
<g class="graph" transform="translate(${pad - bb[0]},${pad + bb[3]})">${clusters}${edges}${cards}<g class="edge-labels">${labels.join('')}</g>${texts(layout._ldraw_, '#e9f0f8')}</g></svg>`;
}

/** Opt-in SVG renderer with tonal state headers, annotations and a navy background. */
export const tonal_provider: VizRenderProvider = { name: 'tonal', render: render_tonal };
