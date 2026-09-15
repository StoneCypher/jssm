import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const gate = require('../verify_side_effects.cjs');
const { SIDE_EFFECT_RULES, globToRegExp, globMatches, findEffectful, classifyDeclaration, judgePackage, runGate } = gate;

// Pure-logic coverage: the glob dialect, the effectful-file classifier, the
// per-package verdict, and the orchestration around an injected fake pack seam.
// No npm, no filesystem pack.

describe('globToRegExp', () => {
  it('anchors the whole package-relative path', () => {
    expect(globToRegExp('./dist/jssm.iife.js').test('dist/jssm.iife.js')).toBe(true);
    expect(globToRegExp('./dist/jssm.iife.js').test('x/dist/jssm.iife.js')).toBe(false);
  });
  it('treats a leading ./ as decoration', () => {
    expect(globToRegExp('./dist/a.js').source).toBe(globToRegExp('dist/a.js').source);
  });
  it('stops a single * at a separator', () => {
    const re = globToRegExp('./dist/wc/*.define.js');
    expect(re.test('dist/wc/viz.define.js')).toBe(true);
    expect(re.test('dist/wc/deep/viz.define.js')).toBe(false);
  });
  it('lets ** cross separators', () => {
    const re = globToRegExp('./dist/cdn/**');
    expect(re.test('dist/cdn/viz.js')).toBe(true);
    expect(re.test('dist/cdn/nested/deep/viz.js')).toBe(true);
  });
  it('lets **/ match zero directories', () => {
    const re = globToRegExp('**/x.js');
    expect(re.test('x.js')).toBe(true);
    expect(re.test('a/b/x.js')).toBe(true);
  });
  it('escapes regex metacharacters in literal segments', () => {
    expect(globToRegExp('a+b.js').test('a+b.js')).toBe(true);
    expect(globToRegExp('a+b.js').test('aab.js')).toBe(false);
  });
});

describe('globMatches', () => {
  it('matches a separator-bearing pattern against the full path only', () => {
    expect(globMatches('./dist/cdn/**', 'dist/cdn/viz.js')).toBe(true);
    expect(globMatches('./dist/cdn/**', 'other/cdn/viz.js')).toBe(false);
  });
  it('matches a bare pattern against the basename anywhere', () => {
    expect(globMatches('*.define.js', 'dist/wc/viz.define.js')).toBe(true);
    expect(globMatches('*.define.js', 'viz.define.js')).toBe(true);
    expect(globMatches('*.define.js', 'dist/wc/viz.js')).toBe(false);
  });
});

describe('findEffectful', () => {
  it('is empty for a pure package', () => {
    expect(findEffectful(['dist/jssm.mjs', 'dist/jssm.d.ts', 'README.md'])).toEqual([]);
  });
  it('flags a custom-element registration file (the jssm-viz failure mode)', () => {
    const bad = findEffectful(['dist/jssm_viz.mjs', 'dist/wc/viz.define.js']);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ path: 'dist/wc/viz.define.js', id: 'wc-define' });
  });
  it('flags cdn bundles and iife globals', () => {
    const ids = findEffectful(['dist/cdn/viz.js', 'dist/jssm.iife.js', 'dist/jssm.mjs']).map((e: { id: string }) => e.id);
    expect(ids).toEqual(['cdn', 'iife']);
  });
  it('does not flag a plain module that merely lives beside them', () => {
    expect(findEffectful(['dist/wc/viz.js'])).toEqual([]);
  });
  it('every rule has a distinct id and a reason', () => {
    const ids = SIDE_EFFECT_RULES.map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SIDE_EFFECT_RULES.every((r: { why: string }) => r.why.length > 0)).toBe(true);
  });
});

describe('classifyDeclaration', () => {
  it('names all four states', () => {
    expect(classifyDeclaration(undefined)).toBe('unset');
    expect(classifyDeclaration(false)).toBe('pure');
    expect(classifyDeclaration(true)).toBe('pessimistic');
    expect(classifyDeclaration(['./a.js'])).toBe('whitelist');
  });
});

describe('judgePackage', () => {
  it('passes a pure package that declares false', () => {
    expect(judgePackage(false, ['dist/jssm.mjs', 'README.md'])).toMatchObject({ ok: true, problems: [], notes: [] });
  });

  it('fails false-with-effects, naming the file a bundler could delete', () => {
    const { ok, problems } = judgePackage(false, ['dist/wc/viz.define.js']);
    expect(ok).toBe(false);
    expect(problems[0]).toMatchObject({ code: 'false-with-effects', path: 'dist/wc/viz.define.js' });
  });

  it('fails an effectful package that declares nothing at all', () => {
    const { ok, problems } = judgePackage(undefined, ['dist/cdn/viz.js']);
    expect(ok).toBe(false);
    expect(problems[0].code).toBe('undeclared-effects');
  });

  it('fails a whitelist that misses one effectful file', () => {
    const { ok, problems } = judgePackage(['./dist/cdn/**'], ['dist/cdn/viz.js', 'dist/wc/viz.define.js']);
    expect(ok).toBe(false);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ code: 'unlisted-effect', path: 'dist/wc/viz.define.js' });
  });

  it('passes the real jssm-viz whitelist against the files it ships', () => {
    const { ok, problems } = judgePackage(
      ['./dist/wc/*.define.js', './dist/cdn/**'],
      ['dist/jssm_viz.mjs', 'dist/wc/viz.js', 'dist/wc/viz.define.js', 'dist/wc/editor.define.js', 'dist/cdn/instance.js'],
    );
    expect(ok).toBe(true);
    expect(problems).toEqual([]);
  });

  it('passes the real jssm-iife whitelist', () => {
    expect(judgePackage(['./dist/jssm.iife.js'], ['dist/jssm.iife.js', 'README.md']).ok).toBe(true);
  });

  it('allows the pessimistic declaration to cover anything', () => {
    expect(judgePackage(true, ['dist/wc/viz.define.js', 'dist/cdn/x.js']).ok).toBe(true);
  });

  it('advises, without failing, when a pure package has simply not said so', () => {
    const { ok, problems, notes } = judgePackage(undefined, ['dist/fence.js', 'README.md']);
    expect(ok).toBe(true);
    expect(problems).toEqual([]);
    expect(notes[0].code).toBe('undeclared-pure');
  });

  it('advises on a stale whitelist pattern that matches nothing shipped', () => {
    const { ok, notes } = judgePackage(['./dist/cdn/**'], ['dist/jssm.mjs']);
    expect(ok).toBe(true);
    expect(notes.some((n: { code: string }) => n.code === 'stale-pattern')).toBe(true);
  });

  it('does not advise undeclared-pure for a package that declared false', () => {
    expect(judgePackage(false, ['dist/jssm.mjs']).notes).toEqual([]);
  });
});

describe('runGate', () => {
  // discoverPackageDirs/readFileSync are real, so drive it against this repo's
  // own root manifest with a fake pack seam.
  const require2 = createRequire(import.meta.url);
  const path = require2('node:path');
  const root = path.join(__dirname, '..', '..', '..');

  it('passes when every package agrees with what it ships', () => {
    const { ok, violations } = runGate([root], () => ['dist/jssm.mjs', 'README.md']);
    expect(ok).toBe(true);
    expect(violations).toEqual([]);
  });

  it('fails and names the package when a declaration licenses deleting a registration', () => {
    const { ok, violations, lines } = runGate([root], () => ['dist/wc/viz.define.js']);
    expect(ok).toBe(false);
    expect(violations[0]).toMatchObject({ pkg: 'jssm', path: 'dist/wc/viz.define.js', code: 'false-with-effects' });
    expect(lines.some((l: string) => /FAIL/.test(l))).toBe(true);
  });
});
