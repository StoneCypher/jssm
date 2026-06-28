// Minimal, dependency-free markdown renderer for <fsl-docs>. Renders the help
// subset to an HTML string; fsl code fences are tagged with data attributes so
// the component can wire a "load into editor" button.

/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export function parseFenceInfo(info: string): { lang: string; attrs: Record<string, string | boolean> } {
  const m = /^(\S+)\s*(?:\{([^}]*)\})?/.exec(info.trim());
  const lang = m?.[1] ?? '';
  const attrs: Record<string, string | boolean> = {};
  for (const pair of (m?.[2] ?? '').split(',')) {
    const kv = pair.split(':');
    if (kv.length < 2) { continue; }
    const k = kv[0].trim();
    const raw = kv.slice(1).join(':').trim();
    if (k) { attrs[k] = raw === 'true' ? true : raw === 'false' ? false : raw; }
  }
  return { lang, attrs };
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, (_m, c: string) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Render the supported markdown subset to an HTML string. */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const { lang, attrs } = parseFenceInfo(fence[1]);
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      const code = esc(buf.join('\n'));
      if (lang === 'fsl') {
        const teaches = attrs.teaches ? ` data-teaches="${esc(String(attrs.teaches))}"` : '';
        const run = attrs.run === true ? ' data-run="true"' : '';
        out.push(`<pre data-fsl-example${teaches}${run}><code>${code}</code></pre>`);
      } else {
        out.push(`<pre><code>${code}</code></pre>`);
      }
      continue;
    }
    const head = /^(#{1,3})\s+(.*)$/.exec(line);
    if (head) { out.push(`<h${head[1].length}>${inline(head[2])}</h${head[1].length}>`); i++; continue; }
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i++; }
      out.push('</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++; }
      out.push('</ol>'); continue;
    }
    if (/^\s*$/.test(line)) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
