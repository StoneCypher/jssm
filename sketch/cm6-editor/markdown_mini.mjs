// Minimal, dependency-free markdown renderer for the help-docs subset.
// Renders to an HTML *string* so it is testable under plain node.

/** Remove a leading `---\n…\n---` front-matter block, returning the body. */
export function stripFrontMatter(text) {
  const m = /^---\n[\s\S]*?\n---\n?/.exec(text);
  return m ? text.slice(m[0].length) : text;
}

/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export function parseFenceInfo(info) {
  const m = /^(\S+)\s*(?:\{([^}]*)\})?/.exec(info.trim()) || [];
  const lang = m[1] || '';
  const attrs = {};
  for (const pair of (m[2] || '').split(',')) {
    const kv = pair.split(':');
    if (kv.length < 2) continue;
    const k = kv[0].trim();
    let v = kv.slice(1).join(':').trim();
    if (v === 'true') v = true; else if (v === 'false') v = false;
    if (k) attrs[k] = v;
  }
  return { lang, attrs };
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
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

    // fenced code
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const { lang, attrs } = parseFenceInfo(fence[1]);
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // closing fence
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

    // headings
    const head = /^(#{1,3})\s+(.*)$/.exec(line);
    if (head) { const n = head[1].length; out.push(`<h${n}>${inline(head[2])}</h${n}>`); i++; continue; }

    // horizontal rule
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i++;
      }
      out.push('</ul>');
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++;
      }
      out.push('</ol>');
      continue;
    }

    // blank
    if (/^\s*$/.test(line)) { i++; continue; }

    // paragraph (collect until blank or next block)
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
