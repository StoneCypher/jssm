import { describe, it, expect } from 'vitest';
const { extractExamples } = require('../../buildjs/extract_examples.cjs');

describe('extractExamples', () => {

  it('extracts an example from a function docblock', () => {
    const src = [
      '/**',
      ' * Adds two numbers.',
      ' * @example',
      ' * add(2, 3);  // => 5',
      ' */',
      'export function add(a: number, b: number) { return a + b; }'
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');

    expect(got).toHaveLength(1);
    expect(got[0].symbol).toBe('add');
    expect(got[0].body).toBe('add(2, 3);  // => 5');
  });

  it('extracts the example from a const docblock and reports its 1-based line', () => {
    const src = [
      '/**',                       // line 1
      ' * A constant.',            // line 2
      ' * @example',               // line 3
      ' * FOO;  // => 7',          // line 4
      ' */',                       // line 5
      'export const FOO = 7;'      // line 6
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');

    expect(got).toHaveLength(1);
    expect(got[0].symbol).toBe('FOO');
    expect(got[0].line).toBe(3);
  });

  it('extracts multiple @example tags from one docblock', () => {
    const src = [
      '/**',
      ' * @example',
      ' * f(1);  // => 1',
      ' * @example',
      ' * f(2);  // => 2',
      ' */',
      'export function f(n: number) { return n; }'
    ].join('\n');

    const got = extractExamples(src, 'demo.ts');
    expect(got).toHaveLength(2);
    expect(got[0].body).toBe('f(1);  // => 1');
    expect(got[1].body).toBe('f(2);  // => 2');
  });

  it('returns an empty array when there are no examples', () => {
    expect(extractExamples('export const X = 1;', 'demo.ts')).toEqual([]);
  });

});

const { rewriteImportSpecifier } = require('../../buildjs/extract_examples.cjs');

describe('rewriteImportSpecifier', () => {

  it('maps bare "jssm" to the relative source module', () => {
    expect(rewriteImportSpecifier('jssm', 'jssm.ts')).toBe('../../jssm');
  });

  it('maps "jssm/viz" to the viz source module', () => {
    expect(rewriteImportSpecifier('jssm/viz', 'jssm.ts')).toBe('../../jssm_viz');
  });

  it('resolves a relative specifier against the defining module', () => {
    expect(rewriteImportSpecifier('./jssm_constants', 'jssm_constants.ts'))
      .toBe('../../jssm_constants');
  });

  it('leaves an unrelated third-party specifier untouched', () => {
    expect(rewriteImportSpecifier('vitest', 'jssm.ts')).toBe('vitest');
  });

});

const { docexFileName } = require('../../buildjs/extract_examples.cjs');

describe('docexFileName', () => {

  it('flattens a nested entry into a single generated file name', () => {
    expect(docexFileName('machine/machine')).toBe('machine_machine.docex.ts');
  });

  it('leaves a top-level entry name as it is', () => {
    expect(docexFileName('jssm_util')).toBe('jssm_util.docex.ts');
  });

  it('folds every separator of a deeper path', () => {
    expect(docexFileName('a/b/c')).toBe('a_b_c.docex.ts');
  });

});

const { pruneStaleDocex } = require('../../buildjs/extract_examples.cjs');
const fs   = require('node:fs');
const os   = require('node:os');
const path = require('node:path');

describe('pruneStaleDocex', () => {

  it('removes only the .docex.ts files, leaving .gitkeep and other files alone', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-prune-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.docex.ts'), '// stale');
      fs.writeFileSync(path.join(dir, '.gitkeep'),   '');
      fs.writeFileSync(path.join(dir, 'notes.txt'),  'keep me');

      expect(pruneStaleDocex(dir)).toStrictEqual(['a.docex.ts']);
      expect(fs.readdirSync(dir).sort((a: string, b: string) => a.localeCompare(b))).toStrictEqual(['.gitkeep', 'notes.txt']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns an empty list and removes nothing from a directory with no generated files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jssm-prune-'));
    try {
      fs.writeFileSync(path.join(dir, '.gitkeep'), '');

      expect(pruneStaleDocex(dir)).toStrictEqual([]);
      expect(fs.readdirSync(dir)).toStrictEqual(['.gitkeep']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

});

const { rewriteOutputComments } = require('../../buildjs/extract_examples.cjs');

describe('rewriteOutputComments', () => {

  it('converts an EXPR; // => VALUE line into an assertion', () => {
    expect(rewriteOutputComments("m.state();  // => 'a'"))
      .toBe("expect(m.state()).toStrictEqual('a');");
  });

  it('tolerates a missing trailing semicolon', () => {
    expect(rewriteOutputComments('add(2, 3)  // => 5'))
      .toBe('expect(add(2, 3)).toStrictEqual(5);');
  });

  it('leaves a setup line without a marker unchanged', () => {
    expect(rewriteOutputComments('const m = sm`a -> b;`;'))
      .toBe('const m = sm`a -> b;`;');
  });

});

const { buildTestFile } = require('../../buildjs/extract_examples.cjs');

describe('buildTestFile', () => {

  it('hoists imports, dedupes them, and emits one it() per example', () => {
    const records = [
      { symbol: 'add', line: 10, body:
        "import { add } from 'jssm';\nadd(2, 3);  // => 5" },
      { symbol: 'add', line: 20, body:
        "import { add } from 'jssm';\nadd(0, 0);  // => 0" }
    ];

    const text = buildTestFile(records, 'jssm');

    // import hoisted exactly once, specifier rewritten
    expect(text.split("import { add } from '../../jssm';")).toHaveLength(2);
    // both examples present, each named with its source line
    expect(text).toContain("it('add (jssm.ts:10)'");
    expect(text).toContain("it('add (jssm.ts:20)'");
    expect(text).toContain('expect(add(2, 3)).toStrictEqual(5);');
    expect(text).toContain('expect(add(0, 0)).toStrictEqual(0);');
  });

  it('merges overlapping named imports from the same module into one declaration', () => {
    // two examples that both import `sm` must not hoist two `sm` bindings
    const records = [
      { symbol: 'f', line: 3, body:
        "import { sm, f } from 'jssm';\nf(sm`a -> b;`);  // => 1" },
      { symbol: 'g', line: 9, body:
        "import { sm, g } from 'jssm';\ng(sm`a -> b;`);  // => 2" }
    ];

    const text = buildTestFile(records, 'jssm');

    expect(text).toContain("import { sm, f, g } from '../../jssm';");
    expect(text.split("from '../../jssm';")).toHaveLength(2);
    expect(text).toContain('expect(f(sm`a -> b;`)).toStrictEqual(1);');
    expect(text).toContain('expect(g(sm`a -> b;`)).toStrictEqual(2);');
  });

  it('emits a failing test for an example with no verifiable assertion', () => {
    const records = [
      { symbol: 'noop', line: 5, body: "import { noop } from 'jssm';\nnoop();" }
    ];

    const text = buildTestFile(records, 'jssm');

    expect(text).toContain('no verifiable assertion');
  });

  it('keeps an example that already uses expect() verbatim', () => {
    const records = [
      { symbol: 'add', line: 7, body:
        "import { add } from 'jssm';\nexpect(add(1, 1)).toBe(2);" }
    ];

    expect(buildTestFile(records, 'jssm')).toContain('expect(add(1, 1)).toBe(2);');
  });

});

const { mergeImports } = require('../../buildjs/extract_examples.cjs');

describe('mergeImports', () => {

  it('unions named imports per specifier in first-seen order and sorts the lines', () => {
    expect(mergeImports([
      "import { sm, a } from '../../jssm';",
      "import { b } from '../../jssm_util';",
      "import { sm, b } from '../../jssm';"
    ])).toStrictEqual([
      "import { b } from '../../jssm_util';",
      "import { sm, a, b } from '../../jssm';"
    ]);
  });

  it('keeps non-named import forms verbatim, de-duplicated by line', () => {
    expect(mergeImports([
      "import * as jssm from '../../jssm';",
      "import * as jssm from '../../jssm';",
      "import { x } from '../../jssm';"
    ])).toStrictEqual([
      "import * as jssm from '../../jssm';",
      "import { x } from '../../jssm';"
    ]);
  });

  it('returns an empty list when no example imported anything', () => {
    expect(mergeImports([])).toStrictEqual([]);
  });

});

const { splitExample } = require('../../buildjs/extract_examples.cjs');

describe('splitExample', () => {

  it('separates a rewritten import from the code lines', () => {
    expect(splitExample("import { x } from 'jssm';\nx();", 'jssm.ts'))
      .toEqual({ imports: ["import { x } from '../../jssm';"], code: ['x();'] });
  });

  it('returns no imports when the body has none', () => {
    expect(splitExample('a();\nb();', 'jssm.ts'))
      .toEqual({ imports: [], code: ['a();', 'b();'] });
  });

  it('skips blank and whitespace-only lines', () => {
    expect(splitExample('a();\n\n   \nb();', 'jssm.ts'))
      .toEqual({ imports: [], code: ['a();', 'b();'] });
  });

  it('rewrites multiple imports from different specifiers', () => {
    expect(splitExample(
      "import { a } from 'jssm';\nimport { b } from 'jssm/viz';\na();",
      'jssm.ts'
    )).toEqual({
      imports: [
        "import { a } from '../../jssm';",
        "import { b } from '../../jssm_viz';"
      ],
      code: ['a();']
    });
  });

});
