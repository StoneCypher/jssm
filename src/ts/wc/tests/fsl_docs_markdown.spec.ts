// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown, parseFenceInfo } from '../fsl_docs_markdown.js';

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
});
