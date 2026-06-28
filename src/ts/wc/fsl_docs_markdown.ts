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

/** Structural / attribute keywords highlighted in fsl code fences. */
export const FSL_KEYWORDS = new Set([
  'state', 'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state',
  'transition', 'graph', 'on', 'enter', 'exit', 'do', 'arrange', 'arrange-start', 'arrange-end',
  'machine_name', 'machine_author', 'machine_license', 'machine_version', 'machine_comment',
  'fsl_version', 'flow', 'graph_layout', 'allow_islands', 'allows_override', 'required',
  'true', 'false', 'null', 'undefined',
]);

/**
 * Tokenize FSL source into `{cls, text}` runs for syntax highlighting. A pure,
 * regex-driven scanner — never parses, so it cannot throw on malformed input.
 * `cls` is null for uncategorized text (punctuation, identifiers, whitespace).
 */
export function tokenizeFsl(src: string): Array<{ cls: string | null; text: string }> {
  const toks: Array<{ cls: string | null; text: string }> = [];
  let p = 0;
  while (p < src.length) {
    const rest = src.slice(p);
    let m: RegExpExecArray | null;
    if ((m = /^\/\/[^\n]*/.exec(rest)))                  { toks.push({ cls: 'comment', text: m[0] }); }
    else if ((m = /^\/\*[\s\S]*?\*\//.exec(rest)))       { toks.push({ cls: 'comment', text: m[0] }); }
    else if ((m = /^"[^"]*"/.exec(rest)))                { toks.push({ cls: 'string',  text: m[0] }); }
    else if ((m = /^'[^']*'/.exec(rest)))                { toks.push({ cls: 'action',  text: m[0] }); }
    else if ((m = /^(?:<?[-=~]+>|[←→↔⇒⇐⇔↦])/.exec(rest))) { toks.push({ cls: 'arrow',   text: m[0] }); }
    else if ((m = /^\d+(?:\.\d+)*%?/.exec(rest)))        { toks.push({ cls: 'number',  text: m[0] }); }
    else if ((m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(rest))) { toks.push({ cls: FSL_KEYWORDS.has(m[0]) ? 'keyword' : null, text: m[0] }); }
    else                                                 { toks.push({ cls: null, text: src[p] }); }
    p += m ? m[0].length : 1;
  }
  return toks;
}

/** Highlight FSL source to an HTML string of `<span class="fsl-tok-…">` runs. */
export function highlightFsl(src: string): string {
  return tokenizeFsl(src)
    .map(t => (t.cls ? `<span class="fsl-tok-${t.cls}">${esc(t.text)}</span>` : esc(t.text)))
    .join('');
}

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
      const raw = buf.join('\n');
      if (lang === 'fsl') {
        const teaches = attrs.teaches ? ` data-teaches="${esc(String(attrs.teaches))}"` : '';
        const run = attrs.run === true ? ' data-run="true"' : '';
        out.push(`<pre data-fsl-example${teaches}${run}><code>${highlightFsl(raw)}</code></pre>`);
      } else {
        out.push(`<pre><code>${esc(raw)}</code></pre>`);
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
