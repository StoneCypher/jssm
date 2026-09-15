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

  it('does not mark a digit-leading bareword as a state — it is a rejected (#754) parse error', () => {
    const runs = highlight_fsl_runs('123abc -> b;');
    // The CM6 stream tokenizer still splits '123abc' into a `number` token
    // ('123') and a `variableName` token ('abc'), but since 6.0 (#754) a
    // digit-leading bareword no longer parses, so `fslSemanticSpans` returns
    // no spans for this source and neither fragment gets the semantic state
    // class or an AST-resolved `state` value.
    const fragments = runs.filter(r => r.text === '123' || r.text === 'abc');
    expect(fragments).toHaveLength(2);
    for (const r of fragments) {
      expect(r.state).toBeUndefined();
      expect(r.classes).not.toContain('fsl-sem-state');
    }
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

  it('matches a quoted state name with an internal space against state_colors by its unquoted, unescaped value', () => {
    const html = highlight_fsl_html('a -> "b c";', {
      state_colors: new Map([['b c', '#112233']]),
    });
    expect(html).toContain('data-state="b c"');
    expect(html).toContain('style="color:#112233"');
  });

});
