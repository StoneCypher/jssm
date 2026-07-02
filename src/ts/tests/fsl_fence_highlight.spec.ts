import { describe, it, expect } from 'vitest';
import { highlight_fsl_runs, highlight_fsl_html } from '../fsl_fence_highlight.js';

describe('highlight_fsl_runs', () => {

  it('concatenated run text reproduces the source exactly', () => {
    const src = 'Red => Green;\nGreen -> Red;';
    const runs = highlight_fsl_runs(src);
    expect(runs.map(r => r.text).join('')).toBe(src);
  });

  it('marks state names with the semantic state class and carries the name', () => {
    const runs = highlight_fsl_runs('Red -> Green;');
    const red = runs.find(r => r.state === 'Red');
    expect(red).toBeDefined();
    expect(red!.classes).toContain('fsl-sem-state');
  });

  it('gives keywords a token class', () => {
    const runs = highlight_fsl_runs('machine_name: "demo";\na -> b;');
    expect(runs.some(r => r.classes.includes('fsl-tok-'))).toBe(true);
  });

});

describe('highlight_fsl_html', () => {

  it('escapes HTML and wraps classed runs in spans', () => {
    // A quoted state name (`Label = Atom / String` in the grammar) is the only
    // syntactically valid place raw `<`/`>` can appear in FSL source, so it
    // doubles as the HTML-escaping fixture: 'a' is a plain-atom state, and
    // `"<b>"` is a quoted-string state whose text still contains `<b>` verbatim
    // before escaping.
    const html = highlight_fsl_html('a -> "<b>";');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('fsl-sem-state');
  });

  it('applies inline state colors when provided', () => {
    const html = highlight_fsl_html('Red -> Green;', {
      state_colors: new Map([['Red', '#aa0000']]),
    });
    expect(html).toContain('style="color:#aa0000"');
    expect(html).toContain('data-state="Red"');
  });

  it('omits inline styles when inline_colors is false', () => {
    const html = highlight_fsl_html('Red -> Green;', {
      state_colors: new Map([['Red', '#aa0000']]),
      inline_colors: false,
    });
    expect(html).not.toContain('style=');
    expect(html).toContain('data-state="Red"');
  });

});
