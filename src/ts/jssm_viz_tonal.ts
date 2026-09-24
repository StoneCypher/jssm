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

const title_size = 22;
const header_height = title_size * 1.5;
const header_marker = '#010203';
const icon_marker = '#020304';
let render_sequence = 0;

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function quoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, String.raw`\"`).replace(/\r?\n/g, String.raw`\n`)}"`;
}

function bounded(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) { return fallback; }
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`Tonal rendering value must be between ${min} and ${max}`);
  }
  return value;
}

// Colors are presentation values, never CSS declarations or external paint servers.
function color(value: string | undefined, fallback: string): string {
  if (value === undefined) { return fallback; }
  if (/^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([\d.,%\s+-]+\))$/i.test(value)) { return value; }
  throw new TypeError(`Unsupported tonal color: ${value}`);
}

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

function font(text: string, size: number, face = 'Arial', fill?: string): string {
  return `<FONT FACE="${face}" POINT-SIZE="${size}"${fill ? ` COLOR="${xml(fill)}"` : ''}>${text}</FONT>`;
}

function html_lines(text: string, columns: number): string {
  return wrap(text, columns).map(xml).join('<BR ALIGN="LEFT"/>') + '<BR ALIGN="LEFT"/>';
}

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
  const icon = content.icon ? `<TD WIDTH="60" HEIGHT="66" BGCOLOR="${icon_marker}">&#160;</TD>` : '';
  const body = paragraphs.length > 0 || content.icon
    ? `<TR><TD ALIGN="LEFT" CELLPADDING="16"><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR>${icon}<TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">${paragraphs.join('') || '<TR><TD>&#160;</TD></TR>'}</TABLE></TD></TR></TABLE></TD></TR>`
    : '';
  return `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">${heading}${body}</TABLE>`;
}

function point(p: Point): string { return `${p[0]},${-p[1]}`; }

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
    const outline = halo ? ` stroke="${xml(halo)}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"` : '';
    return `<text x="${x}" y="${y}"${centered} text-anchor="${anchor}" font-family="${xml(face)}, sans-serif" font-size="${size}" font-weight="${flags & 1 ? 600 : 400}" fill="${xml(override_color ?? fill)}"${length}${outline}>${xml(op.text)}</text>`;
  }).join('');
}

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

// Only self-contained drawing primitives are accepted from icon libraries.
const icon_tags = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const icon_attributes = new Set(['d', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform']);

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

function icon_viewbox(value = '0 0 24 24'): string {
  const dimensions = value.trim().split(/[\s,]+/).map(Number);
  if (dimensions.length !== 4 || dimensions.some(n => !Number.isFinite(n)) || dimensions[2] <= 0 || dimensions[3] <= 0) {
    throw new TypeError('Tonal icon viewBox must contain four finite numbers with positive width and height');
  }
  return dimensions.join(' ');
}

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
  const action_color = color(opts.action_color, '#a9cfff');
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
  const dot = context.to_dot({
    nodes,
    separate_edges: true,
    graph: 'nodesep=0.85; ranksep=0.9; pad=0; outputorder=edgesfirst;',
    edge: tr => {
      const label = [tr.action, tr.probability === undefined ? undefined : String(tr.probability)].filter(v => v !== undefined && v !== '').join('\n');
      return `taillabel="" headlabel="" label=${quoted(label)} fontname="Courier New" fontsize=15 arrowsize=0.8 jssm_kind=${quoted(tr.forced_only ? 'forced' : (tr.main_path ? 'main' : 'legal'))}`;
    }
  });
  const layout = JSON.parse(await context.render_dot(dot, 'json')) as Layout;
  if (typeof layout.bb !== 'string') { throw new TypeError('Tonal rendering requires Graphviz JSON layout output'); }
  const bb = layout.bb.split(',').map(Number);
  if (bb.length !== 4 || bb.some(v => !Number.isFinite(v))) { throw new TypeError('Invalid Graphviz layout bounds'); }
  const pad = 36;
  const width = bb[2] - bb[0] + pad * 2;
  const height = bb[3] - bb[1] + pad * 2;
  const objects = layout.objects ?? [];
  const by_id = new Map(objects.map(obj => [obj._gvid, obj]));
  const by_name = new Map([...context.state_ids].map(([name, id]) => [id, name]));
  const clusters = objects.filter(obj => obj.bb && !obj.pos).map(obj => `<g class="cluster"><title>${xml(obj.name)}</title>${geometry(obj._draw_, 'fill="none" stroke="#93adc9" stroke-opacity="0.3" stroke-width="1"')}${texts(obj._ldraw_, '#cbd7e5')}</g>`).join('');
  const labels: string[] = [];
  const edges = (layout.edges ?? []).map(edge => {
    // Invisible edges introduced by arrange ordering have no drawing operations.
    if (!edge._draw_) { return ''; }
    clip_compact_endpoint(edge, by_id.get(edge.head), true);
    clip_compact_endpoint(edge, by_id.get(edge.tail), false);
    const kind = edge.jssm_kind ?? 'legal';
    const forced = kind === 'forced';
    const stroke = forced ? '#a8b9d3' : '#ffffff';
    const title = `${by_id.get(edge.tail).name}->${by_id.get(edge.head).name}`;
    labels.push(texts(edge._ldraw_, action_color, background));
    return `<g class="edge" data-transition-kind="${kind}" id="${prefix}-edge-${edge._gvid}"><title>${xml(title)}</title><g opacity="${forced ? opacity : 1}">${geometry(edge._draw_, `fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"${forced ? ' stroke-dasharray="5 6"' : ''}`)}${geometry(edge._hdraw_, `fill="${kind === 'main' ? stroke : background}" stroke="${stroke}" stroke-width="1.6"`)}${geometry(edge._tdraw_, `fill="${background}" stroke="${stroke}" stroke-width="1.6"`)}</g></g>`;
  }).join('');
  const cards = objects.filter(obj => by_name.has(obj.name)).map(obj => card(obj, content_for(by_name.get(obj.name)), prefix, shade, has_declared_border(machine, by_name.get(obj.name)))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" role="img" data-render-provider="tonal"><title>${xml(machine.machine_name() || 'State machine')}</title>
<defs><filter id="${prefix}-shadow" x="-30%" y="-40%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/></filter></defs>
<rect width="100%" height="100%" fill="${xml(background)}"/>
<g class="graph" transform="translate(${pad - bb[0]},${pad + bb[3]})">${clusters}${edges}${cards}<g class="edge-labels">${labels.join('')}</g>${texts(layout._ldraw_, '#e9f0f8')}</g></svg>`;
}

/** Opt-in SVG renderer with tonal state headers, annotations and a navy background. */
export const tonal_provider: VizRenderProvider = { name: 'tonal', render: render_tonal };
