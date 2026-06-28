// Minimal, dependency-free markdown renderer for <fsl-docs>. Renders the help
// subset to an HTML string; fsl code fences are tagged with data attributes so
// the component can wire a "load into editor" button.
/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export function parseFenceInfo(info) {
    var _a, _b;
    const m = /^(\S+)\s*(?:\{([^}]*)\})?/.exec(info.trim());
    const lang = (_a = m === null || m === void 0 ? void 0 : m[1]) !== null && _a !== void 0 ? _a : '';
    const attrs = {};
    for (const pair of ((_b = m === null || m === void 0 ? void 0 : m[2]) !== null && _b !== void 0 ? _b : '').split(',')) {
        const kv = pair.split(':');
        if (kv.length < 2) {
            continue;
        }
        const k = kv[0].trim();
        const raw = kv.slice(1).join(':').trim();
        if (k) {
            attrs[k] = raw === 'true' ? true : raw === 'false' ? false : raw;
        }
    }
    return { lang, attrs };
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
    return esc(s)
        .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
/** Render the supported markdown subset to an HTML string. */
export function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const fence = /^```(.*)$/.exec(line);
        if (fence) {
            const { lang, attrs } = parseFenceInfo(fence[1]);
            const buf = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) {
                buf.push(lines[i]);
                i++;
            }
            i++;
            const code = esc(buf.join('\n'));
            if (lang === 'fsl') {
                const teaches = attrs.teaches ? ` data-teaches="${esc(String(attrs.teaches))}"` : '';
                const run = attrs.run === true ? ' data-run="true"' : '';
                out.push(`<pre data-fsl-example${teaches}${run}><code>${code}</code></pre>`);
            }
            else {
                out.push(`<pre><code>${code}</code></pre>`);
            }
            continue;
        }
        const head = /^(#{1,3})\s+(.*)$/.exec(line);
        if (head) {
            out.push(`<h${head[1].length}>${inline(head[2])}</h${head[1].length}>`);
            i++;
            continue;
        }
        if (/^---+\s*$/.test(line)) {
            out.push('<hr>');
            i++;
            continue;
        }
        if (/^\s*[-*]\s+/.test(line)) {
            out.push('<ul>');
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
                i++;
            }
            out.push('</ul>');
            continue;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
            out.push('<ol>');
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
                i++;
            }
            out.push('</ol>');
            continue;
        }
        if (/^\s*$/.test(line)) {
            i++;
            continue;
        }
        const para = [];
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(lines[i])) {
            para.push(lines[i]);
            i++;
        }
        out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    return out.join('\n');
}
