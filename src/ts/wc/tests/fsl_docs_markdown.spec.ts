// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown, parseFenceInfo, tokenizeFsl, highlightFsl, FSL_KEYWORDS } from '../fsl_docs_markdown.js';

describe('fsl_docs_markdown', () => {
  it('renders headings, inline, lists', () => {
    const h = renderMarkdown('# T\n\nA **b** and `c` and [x](http://y).\n\n- one\n- two\n');
    expect(h).toMatch(/<h1>T<\/h1>/);
    expect(h).toMatch(/<strong>b<\/strong>/);
    expect(h).toMatch(/<code>c<\/code>/);
    expect(h).toMatch(/<a href="http:\/\/y">x<\/a>/);
    expect(h).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  });
  it('parses fence info', () => {
    expect(parseFenceInfo('fsl {teaches: t, run: true}')).toEqual({ lang: 'fsl', attrs: { teaches: 't', run: true } });
    expect(parseFenceInfo('js')).toEqual({ lang: 'js', attrs: {} });
  });
  it('marks fsl run fences with data attributes', () => {
    const f = renderMarkdown('```fsl {teaches: transitions, run: true}\na -> b;\n```\n');
    expect(f).toMatch(/data-fsl-example/);
    expect(f).toMatch(/data-run="true"/);
  });

  it('renders a non-fsl fence as a plain code block', () => {
    const f = renderMarkdown('```js\nconst x = 1;\n```\n');
    expect(f).toMatch(/<pre><code>const x = 1;<\/code><\/pre>/);
    expect(f).not.toMatch(/data-fsl-example/);
  });

  it('renders an untagged fsl fence without run/teaches attributes', () => {
    const f = renderMarkdown('```fsl\na -> b;\n```\n');
    expect(f).toMatch(/<pre data-fsl-example>/);
    expect(f).not.toMatch(/data-run/);
    expect(f).not.toMatch(/data-teaches/);
  });

  it('renders ordered lists, horizontal rules, and italics', () => {
    expect(renderMarkdown('1. a\n2. b\n')).toMatch(/<ol>\s*<li>a<\/li>\s*<li>b<\/li>\s*<\/ol>/);
    expect(renderMarkdown('text\n\n---\n\nmore\n')).toMatch(/<hr>/);
    expect(renderMarkdown('an *emphatic* word')).toMatch(/<em>emphatic<\/em>/);
  });

  it('escapes html and tolerates malformed fence info', () => {
    expect(renderMarkdown('a < b & c > d')).toMatch(/a &lt; b &amp; c &gt; d/);
    expect(parseFenceInfo('fsl {bare}')).toEqual({ lang: 'fsl', attrs: {} });
    expect(parseFenceInfo('fsl {run: false}')).toEqual({ lang: 'fsl', attrs: { run: false } });
    expect(parseFenceInfo('fsl {: x}')).toEqual({ lang: 'fsl', attrs: {} });   // empty key
    expect(parseFenceInfo('')).toEqual({ lang: '', attrs: {} });
  });
});

describe('fsl syntax highlighter', () => {
  const classesOf = (src: string) => tokenizeFsl(src).filter(t => t.cls).map(t => t.cls);

  it('tokenizes every fsl token class', () => {
    expect(classesOf('// note')).toContain('comment');
    expect(classesOf('/* block */')).toContain('comment');
    expect(classesOf('"a string"')).toContain('string');
    expect(classesOf("'an action'")).toContain('action');
    expect(classesOf('a -> b')).toContain('arrow');
    expect(classesOf('a → b')).toContain('arrow');      // unicode arrow
    expect(classesOf('Idle -> 70% Win')).toContain('number');
    expect(classesOf('fsl_version : 5.0.0')).toContain('number');
    expect(classesOf('state Go')).toContain('keyword');
  });

  it('leaves non-keyword identifiers and punctuation uncategorized', () => {
    const toks = tokenizeFsl('Red { ;');
    expect(toks.find(t => t.text === 'Red')?.cls).toBeNull();        // non-keyword identifier
    expect(toks.some(t => t.text === '{' && t.cls === null)).toBe(true);  // single-char fallback
  });

  it('highlightFsl wraps token runs and escapes their text', () => {
    const h = highlightFsl(`state Go : {};  // c`);
    expect(h).toMatch(/<span class="fsl-tok-keyword">state<\/span>/);
    expect(h).toMatch(/<span class="fsl-tok-comment">\/\/ c<\/span>/);
    const sh = highlightFsl('"a<b"');                  // esc applies inside a token
    expect(sh).toContain('fsl-tok-string');
    expect(sh).toContain('&lt;');
  });

  it('renders highlighted spans inside fsl fences', () => {
    const f = renderMarkdown('```fsl {run: true}\nstate Go : {};\n```\n');
    expect(f).toMatch(/fsl-tok-keyword/);
  });

  it('exposes the keyword set', () => {
    expect(FSL_KEYWORDS.has('transition')).toBe(true);
  });
});
