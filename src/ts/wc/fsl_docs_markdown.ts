// Minimal, dependency-free markdown renderer for <fsl-docs>. Renders the help
// subset to an HTML string; fsl code fences are tagged with data attributes so
// the component can wire a "load into editor" button.

/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export function parseFenceInfo(info: string): { lang: string; attrs: Record<string, string | boolean> } {
  // Two-step scan (first token, then an optional immediately-following {...}
  // block) rather than one regex, so no quantifier ambiguity exists between
  // the token and the brace block (regexp/no-super-linear-backtracking).
  const trimmed = info.trim();
  const lang = /^\S+/.exec(trimmed)?.[0] ?? '';
  const braced = /^\{([^}]*)\}/.exec(trimmed.slice(lang.length).trimStart());
  const attrs: Record<string, string | boolean> = {};
  const pairs = (braced?.[1] ?? '').split(',');
  for (const pair of pairs) {
    const kv = pair.split(':');
    if (kv.length < 2) { continue; }
    const k = kv[0].trim();
    const raw = kv.slice(1).join(':').trim();
    if (k) { attrs[k] = raw === 'true' ? true : (raw === 'false' ? false : raw); }
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
 * Attribute keys whose value is a color, mirroring the editor's `COLOR_KEYS`
 * (language_service). The value token following one of these (plus its `:`) is
 * tagged `color` and rendered with a swatch, matching the editor overlay.
 */
export const FSL_COLOR_KEYS = new Set([
  'color', 'text-color', 'background-color', 'border-color', 'edge-color',
]);

/** A token's class is one of these, or `null` for uncategorized runs. */
export type FslTokenClass =
  'comment' | 'string' | 'action' | 'arrow' | 'number' | 'keyword' | 'key' | 'color';

/** A single highlighted run: its class (or `null`) and the source text. */
export interface FslToken { cls: FslTokenClass | null; text: string; }

/** Whether `text` is a bare FSL identifier (so it can be an attribute key). */
const isIdentifier = (text: string): boolean => /^[A-Z_][\w-]*$/i.test(text);

/**
 * Retro-tag the identifier token immediately preceding a `:` as an attribute
 * `key` (skipping whitespace runs; keywords keep their class). Returns whether
 * that key is a color key, i.e. whether the next value token should be tagged
 * `color`. Extracted from the `tokenizeFsl` scanner loop.
 * @param toks - The token list built so far; mutated in place.
 * @returns `true` when the tagged key is one of {@link FSL_COLOR_KEYS}.
 * @see tokenizeFsl
 */
function tagKeyBeforeColon(toks: FslToken[]): boolean {
  for (let j = toks.length - 1; j >= 0; j--) {
    if (/^\s+$/.test(toks[j].text)) { continue; }      // skip whitespace before the colon
    if (toks[j].cls === null && isIdentifier(toks[j].text)) {
      toks[j].cls = 'key';
      if (FSL_COLOR_KEYS.has(toks[j].text)) { return true; }
    }
    break;                                             // only the immediately-preceding token
  }
  return false;
}

/**
 * Tokenize FSL source into `{cls, text}` runs for syntax highlighting. A pure,
 * regex-driven scanner — never parses, so it cannot throw on malformed input.
 * `cls` is null for uncategorized text (punctuation, identifiers, whitespace).
 *
 * Beyond the lexical classes it tracks one bit of structural context: an
 * identifier immediately before a `:` is retro-tagged `key` (an attribute key,
 * unless it is already a `keyword`), and the value token after a color key's
 * colon — or any hex literal — is tagged `color`. The context never spans a
 * `;`, so a value can't leak past its statement.
 * @example
 *   tokenizeFsl('s : { background-color: pink; }')
 *     .filter(t => t.cls).map(t => [t.cls, t.text]);
 *   // includes ['key','background-color'] and ['color','pink']
 */
export function tokenizeFsl(src: string): FslToken[] {
  const toks: FslToken[] = [];
  let p = 0;
  let expectColorValue = false;   // the next value token is the value of a color key
  while (p < src.length) {
    const rest = src.slice(p);
    let m: RegExpExecArray | null;
    if ((m = /^\/\/[^\n]*/.exec(rest)) ?? (m = /^\/\*[\s\S]*?\*\//.exec(rest))) { toks.push({ cls: 'comment', text: m[0] }); }
    else if ((m = /^"[^"]*"/.exec(rest)))                { toks.push({ cls: 'string',  text: m[0] }); }
    else if ((m = /^'[^']*'/.exec(rest)))                { toks.push({ cls: 'action',  text: m[0] }); }
    else if ((m = /^(?:<?[-=~]+>|[←→↔⇒⇐⇔↦])/.exec(rest))) { toks.push({ cls: 'arrow',   text: m[0] }); }
    else if ((m = /^#[0-9A-F]{3,8}\b/i.exec(rest)))    { toks.push({ cls: 'color', text: m[0] }); expectColorValue = false; }
    else if ((m = /^\d+(?:\.\d+)*%?/.exec(rest)))        { toks.push({ cls: 'number',  text: m[0] }); }
    else if ((m = /^[A-Z_][\w-]*/i.exec(rest))) {
      const id = m[0];
      const cls: FslTokenClass | null = FSL_KEYWORDS.has(id) ? 'keyword' : (expectColorValue ? 'color' : null);
      expectColorValue = false;   // any identifier consumes the pending value slot
      toks.push({ cls, text: id });
    }
    else {
      const ch = src[p];
      if (ch === ':') {
        if (tagKeyBeforeColon(toks)) { expectColorValue = true; }
      } else if (ch === ';') {
        expectColorValue = false;                            // a value can't cross a statement end
      }
      toks.push({ cls: null, text: ch });
    }
    p += m ? m[0].length : 1;
  }
  return toks;
}

/**
 * Highlight FSL source to an HTML string of `<span class="fsl-tok-…">` runs.
 * A `color` token is preceded by an inline `<span class="fsl-swatch">` whose
 * background is the literal color text (a CSS-valid named color or hex), giving
 * the docs the same swatch the editor overlay shows. Color text is a hex or
 * identifier run, so it is a safe `background:` value.
 */
export function highlightFsl(src: string): string {
  return tokenizeFsl(src)
    .map(t => {
      if (!t.cls) { return esc(t.text); }
      if (t.cls === 'color') {
        return `<span class="fsl-tok-color"><span class="fsl-swatch" style="background:${esc(t.text)}"></span>${esc(t.text)}</span>`;
      }
      return `<span class="fsl-tok-${t.cls}">${esc(t.text)}</span>`;
    })
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
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
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
    // `(\S.*|)` (not `.*`) so the heading-text capture cannot trade characters
    // with the preceding `\s+` (regexp/no-super-linear-backtracking); the empty
    // alternative keeps the group defined for text-free headings, as before.
    const head = /^(#{1,3})\s+(\S.*|)$/.exec(line);
    if (head) { out.push(`<h${head[1].length}>${inline(head[2])}</h${head[1].length}>`); i++; continue; }
    if (/^-{3,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
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
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(?:#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|-{3,}\s*$)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
