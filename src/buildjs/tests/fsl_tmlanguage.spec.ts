// Tests for src/buildjs/build_fsl_tmlanguage.cjs — the FSL TextMate grammar
// generator. Two guarantees, both behavioral (no golden snapshots):
//
//   1. Coverage: every arrow spelling and every `key:` config/style word in
//      the real peg (src/ts/fsl_parser.peg) is present in the generated
//      grammar. If the parser grows a token the grammar lacks, this fails —
//      the anti-drift guard, run locally against the checked-in peg.
//   2. Freshness: the committed dist/grammars/fsl.tmLanguage.json is exactly
//      what the generator emits, so the artifact can't go stale vs the source.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const G = require('../build_fsl_tmlanguage.cjs');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
const peg      = readFileSync(join(repoRoot, 'src', 'ts', 'fsl_parser.peg'), 'utf8');
const grammarJson = G.serializeGrammar();

// FSL arrow glyphs: ASCII < > = ~ - and the nine Unicode arrows.
const ARROW_CHARS = '<>=~\\-\\u2190\\u2192\\u21D0\\u21D2\\u2194\\u21D4\\u219A\\u219B\\u21AE';

// keys the grammar intentionally does not scope as key: value (coloured
// structurally elsewhere, or a value rather than a key).
const KEY_ALLOWLIST = new Set(['default']);

/** Arrow spellings quoted in the peg's arrow-rule region (only). */
function pegArrowSpellings(): Set<string> {
  const start  = peg.indexOf('ForwardLightArrow');
  const stop   = peg.indexOf('\nBoolean');
  const region = peg.slice(start, stop);
  const re     = new RegExp(`"([${ARROW_CHARS}]+)"`, 'g');
  const out    = new Set<string>();
  for (const m of region.matchAll(re)) {
    const s = m[1];
    if (s.length === 1 && /[<>=~-]/.test(s)) continue; // bare ASCII operator, not an arrow
    out.add(s);
  }
  return out;
}

/** `"word" WS? ":"` config/attribute/style keys declared in the peg. */
function pegConfigKeys(): Set<string> {
  const re  = /"([a-z][a-z0-9_-]*)"\s+WS\?\s+":"/g;
  const out = new Set<string>();
  for (const m of peg.matchAll(re)) out.add(m[1]);
  return out;
}

describe('fsl.tmLanguage generator', () => {
  test('covers every arrow spelling in the peg (all 42)', () => {
    const spellings = pegArrowSpellings();
    expect(spellings.size).toBe(42);
    for (const a of spellings) {
      expect(grammarJson.includes(a), `arrow spelling ${a} missing from grammar`).toBe(true);
    }
  });

  test('covers every config/style key in the peg', () => {
    for (const k of pegConfigKeys()) {
      if (KEY_ALLOWLIST.has(k)) continue;
      const wordRe = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      expect(wordRe.test(grammarJson), `config/style key ${k} missing from grammar`).toBe(true);
    }
  });

  test('committed dist artifact matches the generator (not stale)', () => {
    const committed = readFileSync(
      join(repoRoot, 'dist', 'grammars', 'fsl.tmLanguage.json'), 'utf8');
    expect(committed).toBe(grammarJson);
  });

  test('grammar is well-formed with scope source.fsl', () => {
    const g = G.buildGrammar();
    expect(g.scopeName).toBe('source.fsl');
    expect(g.fileTypes).toContain('fsl');
    expect(Array.isArray(g.patterns)).toBe(true);
  });

  test('every pattern regex compiles', () => {
    // The grammar's patterns are authored in JS-compatible regex; TextMate runs
    // them under Oniguruma, but a JS compile check still catches a malformed
    // pattern (unbalanced group, bad escape) before it ships.
    const compile = (re: string) => expect(() => new RegExp(re), re).not.toThrow();
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        for (const key of ['match', 'begin', 'end']) if (n[key]) compile(n[key]);
        if (n.patterns) walk(n.patterns);
      }
    };
    walk(G.buildGrammar().patterns);
  });
});
