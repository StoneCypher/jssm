const header_marker = '#010203';
const icon_marker = '#020304';
let render_sequence = 0;
function xml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function quoted(value) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, String.raw `\"`).replace(/\r?\n/g, String.raw `\n`)}"`;
}
function bounded(value, fallback, min, max) {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new RangeError(`Tonal rendering value must be between ${min} and ${max}`);
    }
    return value;
}
// Colors are presentation values, never CSS declarations or external paint servers.
function color(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    if (/^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([\d.,%\s+-]+\))$/i.test(value)) {
        return value;
    }
    throw new TypeError(`Unsupported tonal color: ${value}`);
}
function wrap(text, columns) {
    return text.split(/\r?\n/).flatMap(paragraph => {
        const lines = [];
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
            if (!word) {
                continue;
            }
            const letters = [...word];
            if (line && [...line].length + letters.length + 1 > columns) {
                lines.push(line);
                line = '';
            }
            while (letters.length > columns) {
                lines.push(letters.splice(0, columns).join(''));
            }
            const rest = letters.join('');
            if (rest) {
                line = line ? `${line} ${rest}` : rest;
            }
        }
        lines.push(line);
        return lines;
    });
}
function font(text, size, face = 'Arial', fill) {
    return `<FONT FACE="${face}" POINT-SIZE="${size}"${fill ? ` COLOR="${xml(fill)}"` : ''}>${text}</FONT>`;
}
function html_lines(text, columns) {
    return wrap(text, columns).map(xml).join('<BR ALIGN="LEFT"/>') + '<BR ALIGN="LEFT"/>';
}
function card_label(label, content, columns, text_color) {
    var _a, _b;
    const heading = `<TR><TD ALIGN="LEFT" BGCOLOR="${header_marker}" CELLPADDING="12">${font(`<B>${html_lines(label, columns)}</B>`, 22)}</TD></TR>`;
    const paragraphs = [];
    if (content.description) {
        paragraphs.push(`<TR><TD ALIGN="LEFT">${font(`<B>${html_lines(content.description, columns)}</B>`, 15)}</TD></TR>`);
    }
    if (content.action || content.detail) {
        const action = (_a = content.action) !== null && _a !== void 0 ? _a : '';
        const detail = (_b = content.detail) !== null && _b !== void 0 ? _b : '';
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
function point(p) { return `${p[0]},${-p[1]}`; }
function geometry(ops = [], attrs = '') {
    return ops.map(op => {
        var _a;
        const pts = (_a = op.points) !== null && _a !== void 0 ? _a : [];
        switch (op.op) {
            case 'P':
            case 'p': {
                return `<polygon points="${pts.map(point).join(' ')}" ${attrs}/>`;
            }
            case 'L': {
                return `<polyline points="${pts.map(point).join(' ')}" ${attrs}/>`;
            }
            case 'b':
            case 'B': {
                if (pts.length < 4) {
                    return '';
                }
                return `<path d="M${point(pts[0])} C${pts.slice(1).map(point).join(' ')}" ${attrs}/>`;
            }
            case 'e':
            case 'E': {
                const [x, y, rx, ry] = op.rect;
                return `<ellipse cx="${x}" cy="${-y}" rx="${rx}" ry="${ry}" ${attrs}/>`;
            }
            default: {
                return '';
            }
        }
    }).join('');
}
function texts(ops = [], override_color, halo) {
    let size = 15;
    let face = 'Arial';
    let fill = '#17212c';
    let flags = 0;
    return ops.map(op => {
        var _a;
        if (op.op === 'F') {
            size = op.size;
            face = op.face;
        }
        else if (op.op === 'c') {
            fill = op.color;
        }
        else if (op.op === 't') {
            flags = op.fontchar;
        }
        if (op.op !== 'T' || !((_a = op.text) === null || _a === void 0 ? void 0 : _a.trim())) {
            return '';
        }
        const anchor = op.align === 'l' ? 'start' : (op.align === 'r' ? 'end' : 'middle');
        const length = op.width > 0 ? ` textLength="${op.width}" lengthAdjust="spacingAndGlyphs"` : '';
        const outline = halo ? ` stroke="${xml(halo)}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"` : '';
        return `<text x="${op.pt[0]}" y="${-op.pt[1]}" text-anchor="${anchor}" font-family="${xml(face)}, sans-serif" font-size="${size}" font-weight="${flags & 1 ? 600 : 400}" fill="${xml(override_color !== null && override_color !== void 0 ? override_color : fill)}"${length}${outline}>${xml(op.text)}</text>`;
    }).join('');
}
function marker_bounds(ops = [], marker) {
    var _a;
    let fill = '';
    for (const op of ops) {
        if (op.op === 'C') {
            fill = op.color;
        }
        if (op.op === 'P' && fill === marker && ((_a = op.points) === null || _a === void 0 ? void 0 : _a.length)) {
            const xs = op.points.map(p => p[0]);
            const ys = op.points.map(p => -p[1]);
            return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        }
    }
    return undefined;
}
function icon_svg(icon, bounds, fill) {
    if (!bounds) {
        return '';
    }
    const [left, top, right, bottom] = bounds;
    const x = left + (right - left - 40) / 2;
    const y = top + (bottom - top - 62) / 2;
    if (typeof icon === 'object') {
        return `<svg x="${x}" y="${y}" width="40" height="62" viewBox="0 0 24 24" fill="none" stroke="${xml(fill)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${xml(icon.path)}"/></svg>`;
    }
    const active = ['traffic-red', 'traffic-yellow', 'traffic-green'].indexOf(icon);
    const lights = ['#f34255', '#efbf24', '#27b778'];
    return `<g transform="translate(${x},${y})" stroke="${xml(fill)}" stroke-width="1.5" fill="none"><rect x="8" y="1" width="25" height="60" rx="5"/><path d="M8 9 H1 L8 17 M33 9 H40 L33 17 M8 29 H1 L8 37 M33 29 H40 L33 37 M8 49 H1 L8 57 M33 49 H40 L33 57"/>${lights.map((c, i) => `<circle cx="20.5" cy="${12 + i * 19}" r="7.2" fill="${i === active ? c : 'none'}"/>`).join('')}</g>`;
}
function card(node, content, prefix, shade) {
    var _a, _b, _c, _d, _e, _f;
    const [x, y] = node.pos.split(',').map(Number);
    const w = Number(node.width) * 72;
    const h = Number(node.height) * 72;
    const left = x - w / 2;
    const top = -y - h / 2;
    const clip = `${prefix}-clip-${node._gvid}`;
    const gradient = `${prefix}-fill-${node._gvid}`;
    const header = marker_bounds(node._ldraw_, header_marker);
    const icon_bounds = marker_bounds(node._ldraw_, icon_marker);
    const fill = (_d = (_c = (_b = (_a = node._draw_) === null || _a === void 0 ? void 0 : _a.find(op => op.op === 'C')) === null || _b === void 0 ? void 0 : _b.color) !== null && _c !== void 0 ? _c : node.fillcolor) !== null && _d !== void 0 ? _d : '#d9e7f0';
    const ink = node.fontcolor || '#17212c';
    const dash = ((_e = node.style) === null || _e === void 0 ? void 0 : _e.includes('dashed')) ? ' stroke-dasharray="7 5"' : (((_f = node.style) === null || _f === void 0 ? void 0 : _f.includes('dotted')) ? ' stroke-dasharray="1 4"' : '');
    return `<g class="node" id="${prefix}-node-${xml(node.name)}"><title>${xml(node.name)}</title>
<defs><clipPath id="${clip}">${geometry(node._draw_)}</clipPath><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity="0.12"/><stop offset="1" stop-color="black" stop-opacity="0.035"/></linearGradient></defs>
${geometry(node._draw_, `fill="${xml(fill)}" filter="url(#${prefix}-shadow)"`)}
<g clip-path="url(#${clip})"><rect x="${left - 1}" y="${top - 1}" width="${w + 2}" height="${h + 2}" fill="url(#${gradient})"/>
${header ? `<rect class="tonal-header" x="${left - 1}" y="${top - 1}" width="${w + 2}" height="${header[3] - top + 1}" fill="black" opacity="${shade}"/>` : ''}
${texts(node._ldraw_)}${content.icon ? icon_svg(content.icon, icon_bounds, ink) : ''}</g>
${geometry(node._draw_, `fill="none" stroke="white" stroke-opacity="0.65" stroke-width="1.2"${dash}`)}</g>`;
}
/** Draw the measured Graphviz geometry with tonal cards and restrained transition styling. */
async function render_tonal(context) {
    var _a, _b, _c, _d;
    const { machine, options } = context;
    const opts = (_a = options.tonal) !== null && _a !== void 0 ? _a : {};
    const background = color(opts.background, '#101827');
    const action_color = color(opts.action_color, '#a9cfff');
    const opacity = bounded(opts.forced_opacity, 0.7, 0, 1);
    const shade = bounded(opts.header_shade, 0.1, 0, 1);
    const columns = Math.floor(bounded(opts.wrap_columns, 24, 8, 120));
    // eslint-disable-next-line unicorn/no-top-level-assignment-in-function -- document-local SVG definitions must not collide across separate chart instances
    const sequence = ++render_sequence;
    const prefix = (_b = opts.id_prefix) !== null && _b !== void 0 ? _b : `jssm-tonal-${sequence}`;
    if (!/^[a-z][\w-]*$/i.test(prefix)) {
        throw new TypeError('Tonal id_prefix must be a valid SVG identifier');
    }
    const content_for = (name) => { var _a; return Object.prototype.hasOwnProperty.call((_a = opts.states) !== null && _a !== void 0 ? _a : {}, name) ? opts.states[name] : {}; };
    const nodes = new Map();
    for (const name of machine.states()) {
        const label = options.hide_state_labels ? '' : context.state_labels.get(name);
        const ink = machine.style_for(name).textColor || '#17212c';
        const content = content_for(name);
        const table = card_label(label, content, columns, ink);
        nodes.set(name, `label=<${table}> margin=0 fontname="Arial" fontcolor=${quoted(ink)} style=${quoted(`filled,rounded,${machine.style_for(name).lineStyle || 'solid'}`)}`);
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
    const layout = JSON.parse(await context.render_dot(dot, 'json'));
    if (typeof layout.bb !== 'string') {
        throw new TypeError('Tonal rendering requires Graphviz JSON layout output');
    }
    const bb = layout.bb.split(',').map(Number);
    if (bb.length !== 4 || bb.some(v => !Number.isFinite(v))) {
        throw new TypeError('Invalid Graphviz layout bounds');
    }
    const pad = 36;
    const width = bb[2] - bb[0] + pad * 2;
    const height = bb[3] - bb[1] + pad * 2;
    const objects = (_c = layout.objects) !== null && _c !== void 0 ? _c : [];
    const by_id = new Map(objects.map(obj => [obj._gvid, obj]));
    const by_name = new Map([...context.state_ids].map(([name, id]) => [id, name]));
    const clusters = objects.filter(obj => obj.bb && !obj.pos).map(obj => `<g class="cluster"><title>${xml(obj.name)}</title>${geometry(obj._draw_, 'fill="none" stroke="#93adc9" stroke-opacity="0.3" stroke-width="1"')}${texts(obj._ldraw_, '#cbd7e5')}</g>`).join('');
    const labels = [];
    const edges = ((_d = layout.edges) !== null && _d !== void 0 ? _d : []).map(edge => {
        var _a;
        // Invisible edges introduced by arrange ordering have no drawing operations.
        if (!edge._draw_) {
            return '';
        }
        const kind = (_a = edge.jssm_kind) !== null && _a !== void 0 ? _a : 'legal';
        const forced = kind === 'forced';
        const stroke = forced ? '#a8b9d3' : '#ffffff';
        const title = `${by_id.get(edge.tail).name}->${by_id.get(edge.head).name}`;
        labels.push(texts(edge._ldraw_, action_color, background));
        return `<g class="edge" data-transition-kind="${kind}" id="${prefix}-edge-${edge._gvid}"><title>${xml(title)}</title><g opacity="${forced ? opacity : 1}">${geometry(edge._draw_, `fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"${forced ? ' stroke-dasharray="5 6"' : ''}`)}${geometry(edge._hdraw_, `fill="${kind === 'main' ? stroke : background}" stroke="${stroke}" stroke-width="1.6"`)}${geometry(edge._tdraw_, `fill="${background}" stroke="${stroke}" stroke-width="1.6"`)}</g></g>`;
    }).join('');
    const cards = objects.filter(obj => by_name.has(obj.name)).map(obj => card(obj, content_for(by_name.get(obj.name)), prefix, shade)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" role="img" data-render-provider="tonal"><title>${xml(machine.machine_name() || 'State machine')}</title>
<defs><filter id="${prefix}-shadow" x="-30%" y="-40%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/></filter></defs>
<rect width="100%" height="100%" fill="${xml(background)}"/>
<g class="graph" transform="translate(${pad - bb[0]},${pad + bb[3]})">${clusters}${edges}${cards}<g class="edge-labels">${labels.join('')}</g>${texts(layout._ldraw_, '#e9f0f8')}</g></svg>`;
}
/** Opt-in SVG renderer with tonal state headers, annotations and a navy background. */
export const tonal_provider = { name: 'tonal', render: render_tonal };
