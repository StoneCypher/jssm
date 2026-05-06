// cookbook-highlight.jsx — tokenize plain code strings into colored spans for
// the cookbook. Authors write: { kind: 'fsl', code: "<source>" } and the
// tokenizer assigns colors. Falls back gracefully on unknown languages.
//
// Token kinds (match CookbookCode.jsx CB_SYN):
//   s   — state name (fsl)            #5fbeb1 (teal)
//   k   — keyword / quoted action     #c4ae5a (ochre)
//   a   — arrow glyph                 #5fbeb1
//   i   — identifier                  #c9cfde
//   p   — punctuation                 #c9cfde
//   n   — number / literal            #c294c2 (mauve)
//   cm  — comment                     dim
//   err — refusal/red comment         #c294c2
//   ok  — accepted/green comment      #5fbeb1

// Languages we recognize as a "kind" badge in the code header:
const KNOWN_LANGS = ['fsl', 'jssm', 'ts', 'tsx', 'js', 'jsx', 'react', 'vitest', 'jest', 'shell', 'bash', 'json', 'yaml', 'toml', 'html', 'css'];

// Reserved words across the JS/TS family.
const JS_KEYWORDS = new Set([
  'const','let','var','function','return','if','else','for','while','do','break',
  'continue','switch','case','default','new','class','extends','typeof','instanceof',
  'import','from','export','as','async','await','try','catch','finally','throw',
  'true','false','null','undefined','this','super','in','of','void','yield',
]);

// FSL-only keywords that should render in the "k" colour.
const FSL_KEYWORDS = new Set(['state','start_state','end_state','machine_name']);

// Build coloured spans from a source string.
function highlightCode(code, lang) {
  const out = [];
  let i = 0;
  const push = (t, v) => { if (v.length) out.push([t, v]); };

  // Treat fsl, jssm, ts, tsx, js, jsx, react, vitest, jest as JS-flavour;
  // shell/json/yaml/toml fall back to plain.
  const flavour = (() => {
    if (!lang) return 'js';
    if (['fsl'].includes(lang)) return 'fsl';
    if (['shell','bash'].includes(lang)) return 'shell';
    if (['json'].includes(lang)) return 'json';
    if (['yaml','toml'].includes(lang)) return 'plain';
    return 'js';
  })();

  if (flavour === 'shell') return shellTokens(code);
  if (flavour === 'json')  return jsonTokens(code);
  if (flavour === 'plain') return [['p', code]];

  // ---- fsl & js share comments, strings, arrows, idents, punct, numbers ----
  while (i < code.length) {
    const ch = code[i];
    const rest = code.slice(i);

    // newline
    if (ch === '\n') { out.push(['br','']); i++; continue; }

    // line comment
    if (ch === '/' && code[i+1] === '/') {
      const nl = code.indexOf('\n', i);
      const end = nl === -1 ? code.length : nl;
      const body = code.slice(i, end);
      // Heuristic: comments containing the words "no", "refused", "error", "fail"
      // glow mauve; comments containing "ok" glow teal.
      const lower = body.toLowerCase();
      let kind = 'cm';
      if (/(\brefus|\bno\b|\bfail|\berror|\bcannot|\binvalid|\bbad)/i.test(lower)) kind = 'err';
      else if (/\bok\b|✓|→ ok|accepted/i.test(lower)) kind = 'ok';
      push(kind, body);
      i = end;
      continue;
    }

    // block comment
    if (ch === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      // emit possibly multi-line — split on newlines so layout is preserved
      const body = code.slice(i, stop);
      let last = 0;
      for (let j = 0; j < body.length; j++) {
        if (body[j] === '\n') {
          push('cm', body.slice(last, j));
          out.push(['br','']);
          last = j + 1;
        }
      }
      if (last < body.length) push('cm', body.slice(last));
      i = stop;
      continue;
    }

    // strings: ' " ` (template literals captured as one block; arrows inside still parse below since
    // we want to colour fsl-in-template the same as fsl. Treat ' and " as full strings.)
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j += 2; else j++;
      }
      const stop = Math.min(j + 1, code.length);
      push('k', code.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === '`') {
      // Template literal — colour the backticks as punctuation; tokenize inside as we go.
      // For fsl-inside-template, our identifier/keyword logic still produces good colours
      // for state names since they look like identifiers. The closing backtick is found
      // and consumed at its position.
      push('p', '`');
      i++;
      while (i < code.length && code[i] !== '`') {
        // Recurse-ish: handle a small subset inline.
        const c = code[i];
        if (c === '\n') { out.push(['br','']); i++; continue; }
        if (c === '/' && code[i+1] === '/') {
          const nl = code.indexOf('\n', i);
          const end = nl === -1 ? code.length : nl;
          push('cm', code.slice(i, end)); i = end; continue;
        }
        if (c === '→' || (c === '-' && code[i+1] === '>')) {
          push('a', c === '→' ? '→' : '->');
          i += (c === '→' ? 1 : 2); continue;
        }
        if (c === "'" || c === '"') {
          const q = c; let j = i + 1;
          while (j < code.length && code[j] !== q) { if (code[j] === '\\') j += 2; else j++; }
          push('k', code.slice(i, j + 1)); i = j + 1; continue;
        }
        if (/[A-Za-z_]/.test(c)) {
          let j = i + 1;
          while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
          // identifiers in fsl bodies = state names → colour as 's'
          push(flavour === 'fsl' ? 's' : 'i', code.slice(i, j));
          i = j; continue;
        }
        if (/[0-9]/.test(c)) {
          let j = i + 1;
          while (j < code.length && /[0-9.]/.test(code[j])) j++;
          push('n', code.slice(i, j)); i = j; continue;
        }
        push('p', c); i++;
      }
      if (i < code.length) { push('p', '`'); i++; }
      continue;
    }

    // arrow
    if (ch === '→') { push('a', '→'); i++; continue; }
    if (ch === '-' && code[i+1] === '>') { push('a', '->'); i += 2; continue; }

    // number
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[0-9.eE_]/.test(code[j])) j++;
      push('n', code.slice(i, j));
      i = j; continue;
    }

    // identifier / keyword
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let kind = 'i';
      if (JS_KEYWORDS.has(word)) kind = 'k';
      else if (flavour === 'fsl' && FSL_KEYWORDS.has(word)) kind = 'k';
      push(kind, word);
      i = j; continue;
    }

    // punctuation / whitespace — emit one char with 'p' colour (whitespace too,
    // so layout is preserved exactly).
    push('p', ch);
    i++;
  }

  return out;
}

// Shell highlighter: prompts, flags, strings.
function shellTokens(code) {
  const out = [];
  for (const line of code.split('\n')) {
    if (line.startsWith('$ ') || line.startsWith('# ')) {
      out.push(['cm', line.slice(0, 2)]);
      out.push(['i', line.slice(2)]);
    } else {
      out.push(['cm', line]);
    }
    out.push(['br','']);
  }
  if (out.length) out.pop(); // trailing br
  return out;
}

// JSON highlighter: keys, strings, numbers, literals.
function jsonTokens(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '\n') { out.push(['br','']); i++; continue; }
    if (ch === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j += 2; else j++; }
      // Look ahead for ':' to colour as key
      let k = j + 1;
      while (k < code.length && /\s/.test(code[k])) k++;
      const isKey = code[k] === ':';
      out.push([isKey ? 'i' : 'k', code.slice(i, j + 1)]);
      i = j + 1; continue;
    }
    if (/[0-9-]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[0-9.eE+-]/.test(code[j])) j++;
      out.push(['n', code.slice(i, j)]); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      out.push(['k', code.slice(i, j)]); i = j; continue;
    }
    out.push(['p', ch]); i++;
  }
  return out;
}

window.highlightCode = highlightCode;
window.KNOWN_LANGS = KNOWN_LANGS;
