'use strict';

/**
 *  Doctest extractor.  Parses `@example` blocks out of the jssm TypeDoc entry
 *  points and generates one vitest file per source module under
 *  `src/ts/tests/generated/`.  Invoked by `npm run make_doctests`.
 *
 *  Pure helpers are exported for unit testing; `main()` runs when the file is
 *  executed directly.
 */

const fs   = require('fs');
const path = require('path');
const ts   = require('typescript');

/**
 *  Derive the documented symbol's name from the AST node carrying the JSDoc.
 *
 *  @param {import('typescript').Node} node - a declaration node (function,
 *         class, method, variable statement, etc.).
 *  @returns {string} the symbol name, or `'(anonymous)'` if none is found.
 *
 *  @example
 *  // for the declaration `export const FOO = 7;`, given its VariableStatement node:
 *  nodeName(variableStatementNode)  // => 'FOO'
 */
function nodeName(node) {
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    return decl && decl.name ? decl.name.getText() : '(anonymous)';
  }
  if (node.name && typeof node.name.getText === 'function') {
    return node.name.getText();
  }
  return '(anonymous)';
}

/**
 *  Flatten a JSDoc tag comment — which TypeScript models as either a string or
 *  a node array — into a plain string. Returns the concatenated text content;
 *  inline `{@link}` targets, if any, are not expanded (they never appear in an
 *  `@example` body, which is this extractor's only use).
 *
 *  @param {string | import('typescript').NodeArray | undefined} comment - a
 *         JSDoc tag's `comment` field.
 *  @returns {string} the flattened comment text, or `''` when there is none.
 *
 *  @example
 *  commentText('add(2, 3);  // => 5')  // => 'add(2, 3);  // => 5'
 *
 *  @example
 *  commentText(undefined)  // => ''
 */
function commentText(comment) {
  if (comment == null)            { return ''; }
  if (typeof comment === 'string'){ return comment; }
  return comment.map(part => part.text).join('');
}

/**
 *  Extract every `@example` block from a TypeScript source string.
 *
 *  @param {string} sourceText - the full text of a `.ts` source file.
 *  @param {string} fileLabel  - a label used only for diagnostics.
 *  @returns {Array<{symbol: string, line: number, body: string}>} one record
 *           per `@example` tag; `line` is the 1-based line of the `@example`.
 *
 *  @example
 *  extractExamples('/**\n * @example\n * f();  // => 1\n *\/\nexport function f(){}', 'd.ts')
 *  // => [ { symbol: 'f', line: 2, body: 'f();  // => 1' } ]
 */
function extractExamples(sourceText, fileLabel) {
  const sf = ts.createSourceFile(
    fileLabel, sourceText, ts.ScriptTarget.Latest, /* setParentNodes */ true
  );
  const out = [];

  const visit = (node) => {
    // Only examine nodes that directly own JSDoc (node.jsDoc is set by the
    // TypeScript parser when setParentNodes is true).  ts.getJSDocTags()
    // propagates tags *up* from parent to child, causing each @example to be
    // emitted once per child node rather than once per JSDoc owner.
    if (node.jsDoc) {
      for (const doc of node.jsDoc) {
        if (!doc.tags) { continue; }
        for (const tag of doc.tags) {
          if (tag.tagName.text !== 'example') { continue; }
          const line = sf.getLineAndCharacterOfPosition(tag.getStart(sf)).line + 1;
          out.push({
            symbol : nodeName(node),
            line   : line,
            body   : commentText(tag.comment).trim()
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

// Bare package specifiers an example author may use, mapped to the
// `src/ts/` module basename that actually defines the symbols.
const PKG_SPECIFIERS = {
  'jssm'     : 'jssm',
  'jssm/viz' : 'jssm_viz',
  'jssm/cli' : 'jssm.cli'
};

// All generated files live here; relative imports are expressed from it.
const GENERATED_REL_TO_SRC_TS = '../..';

/**
 *  Rewrite the module specifier of an import written inside an `@example` so
 *  the generated test (which lives in `src/ts/tests/generated/`) resolves to
 *  jssm source rather than built `dist/` output.
 *
 *  @param {string} specifier      - the specifier as written in the example.
 *  @param {string} definingModule - basename of the file the example lives in
 *                                   (e.g. `'jssm_constants.ts'`).
 *  @returns {string} the rewritten specifier, or the original if it does not
 *           refer to jssm source.
 *
 *  @example
 *  rewriteImportSpecifier('jssm', 'jssm.ts')  // => '../../jssm'
 *
 *  @example
 *  rewriteImportSpecifier('vitest', 'jssm.ts')  // => 'vitest'
 */
function rewriteImportSpecifier(specifier, definingModule) {
  if (Object.prototype.hasOwnProperty.call(PKG_SPECIFIERS, specifier)) {
    return `${GENERATED_REL_TO_SRC_TS}/${PKG_SPECIFIERS[specifier]}`;
  }
  if (specifier.startsWith('.')) {
    const fromDir  = path.dirname(definingModule);   // '.' for entry points
    const resolved = path.posix.normalize(
      path.posix.join(fromDir, specifier)
    ).replace(/\.ts$/, '');
    return `${GENERATED_REL_TO_SRC_TS}/${resolved}`;
  }
  return specifier;
}

/**
 *  Rewrite a single example code line.  A line of the form `EXPR; // => VALUE`
 *  becomes `expect(EXPR).toStrictEqual(VALUE);`.  Lines without the `// =>`
 *  marker are returned unchanged (they are example setup, e.g. `const ...`).
 *
 *  @param {string} codeLine - one line of example code.
 *  @returns {string} the rewritten line.
 *
 *  @example
 *  rewriteOutputComments('add(2, 3)  // => 5')
 *  // => 'expect(add(2, 3)).toStrictEqual(5);'
 */
function rewriteOutputComments(codeLine) {
  const marker = codeLine.indexOf('// =>');
  if (marker === -1) { return codeLine; }

  const expr  = codeLine.slice(0, marker).trim().replace(/;\s*$/, '');
  const value = codeLine.slice(marker + '// =>'.length).trim();
  return `expect(${expr}).toStrictEqual(${value});`;
}

/**
 *  Split one example body into its `import` lines and its executable lines.
 *
 *  @param {string} body           - the raw example text.
 *  @param {string} definingModule - basename of the file the example is in.
 *  @returns {{imports: string[], code: string[]}} import lines (specifiers
 *           already rewritten) and remaining code lines.
 *
 *  @example
 *  splitExample("import { x } from 'jssm';\nx();", 'jssm.ts')
 *  // => { imports: ["import { x } from '../../jssm';"], code: ['x();'] }
 */
function splitExample(body, definingModule) {
  const imports = [];
  const code    = [];

  for (const raw of body.split('\n')) {
    const line  = raw.replace(/\s+$/, '');
    if (line.trim() === '') { continue; }

    const m = line.match(/^\s*import\s+(.+?)\s+from\s+['"](.+?)['"]\s*;?\s*$/);
    if (m) {
      const spec = rewriteImportSpecifier(m[2], definingModule);
      imports.push(`import ${m[1]} from '${spec}';`);
    } else {
      code.push(line);
    }
  }
  return { imports, code };
}

/**
 *  Merge the hoisted import lines of every example in one module into one
 *  import per module specifier, so two examples that both import `sm` (or any
 *  overlapping name set) from `'jssm'` do not hoist two declarations of the
 *  same binding — which would make the generated file unparseable.  Named
 *  imports (`import { a, b } from 'x'`) are unioned per specifier in
 *  first-seen order; any other import form (default, namespace, side-effect)
 *  is kept verbatim and de-duplicated by exact line.
 *
 *  @param {string[]} lines - the hoisted import lines, specifiers already
 *         rewritten, in the order the examples produced them.
 *  @returns {string[]} the merged import lines, sorted for a stable output.
 *
 *  @example
 *  mergeImports(["import { sm, a } from '../../jssm';", "import { sm, b } from '../../jssm';"])
 *  // => ["import { sm, a, b } from '../../jssm';"]
 */
function mergeImports(lines) {
  const named = new Map();   // specifier -> Set of imported names
  const other = new Set();   // verbatim lines of every other import form

  for (const line of lines) {
    const m = line.match(/^import\s*\{\s*(.*?)\s*\}\s*from\s*'(.+?)';$/);
    if (!m) { other.add(line); continue; }
    if (!named.has(m[2])) { named.set(m[2], new Set()); }
    const names = named.get(m[2]);
    for (const name of m[1].split(',')) {
      const trimmed = name.trim();
      if (trimmed !== '') { names.add(trimmed); }
    }
  }

  const merged = [...named.entries()].map(
    ([spec, names]) => `import { ${[...names].join(', ')} } from '${spec}';`
  );

  return [...merged, ...other].sort();
}

/**
 *  Build the full text of a generated `.docex.ts` test file: a generated-by
 *  header, hoisted and de-duplicated imports (merged per module specifier by
 *  {@link mergeImports}), and one `it()` per example.
 *  An example with neither an `expect(` call nor a `// =>` marker yields a
 *  deliberately failing test, so the convention is enforced not skipped.
 *
 *  @param {Array<{symbol: string, line: number, body: string}>} records - the
 *         `@example` records extracted from one source module.
 *  @param {string} moduleBasename - source module basename, e.g. `'jssm'`.
 *  @returns {string} the full text of the generated `.docex.ts` file.
 *
 *  @example
 *  // Returns the text of a .docex.ts file that contains an
 *  // it('f (jssm.ts:3)', ...) whose body asserts expect(f()).toStrictEqual(1);
 *  const text = buildTestFile(
 *    [{ symbol: 'f', line: 3, body: "import { f } from 'jssm';\nf();  // => 1" }],
 *    'jssm'
 *  );
 */
function buildTestFile(records, moduleBasename) {
  const definingModule = `${moduleBasename}.ts`;
  const allImports     = [];
  const blocks         = [];

  for (const rec of records) {
    const { imports, code } = splitExample(rec.body, definingModule);
    allImports.push(...imports);

    const hasExpect = code.some(l => l.includes('expect('));
    const hasMarker = code.some(l => l.includes('// =>'));
    const title     = `${rec.symbol} (${definingModule}:${rec.line})`;

    if (!hasExpect && !hasMarker) {
      blocks.push(
        `  it('${title}', () => {\n` +
        `    throw new Error('docblock example has no verifiable assertion ` +
        `— add an expect(...) or a // => marker');\n  });`
      );
      continue;
    }

    const lines = code.map(l => `    ${rewriteOutputComments(l)}`).join('\n');
    blocks.push(
      `  it('${title}', () => {\n${lines}\n  });`
    );
  }

  const header =
    `// GENERATED by src/buildjs/extract_examples.cjs — do not edit.\n` +
    `// Regenerate with \`npm run make_doctests\`.\n` +
    `// Source of these examples: src/ts/${definingModule}\n`;

  return (
    header +
    `import { describe, it, expect } from 'vitest';\n` +
    mergeImports(allImports).join('\n') + '\n\n' +
    `describe('${moduleBasename}.ts docblock examples', () => {\n\n` +
    blocks.join('\n\n') + '\n\n});\n'
  );
}

// The doctested modules, as `src/ts/`-relative paths without the `.ts`
// extension: the 7 TypeDoc entry points plus the modules whose docblocks the
// entry points re-export.  `jssm` is a barrel since 6.0; the `Machine` class
// and its examples live in `machine/machine.ts`.
const ENTRY_POINTS = [
  'jssm', 'machine/machine', 'machine/hooks', 'machine/query', 'jssm_viz', 'jssm_types', 'jssm_constants',
  'jssm_error', 'jssm_util', 'version'
];

const SRC_TS_DIR = path.join(__dirname, '..', 'ts');
const OUT_DIR    = path.join(SRC_TS_DIR, 'tests', 'generated');

/**
 *  The generated test's file name for one entry: the entry's path with every
 *  directory separator folded into an underscore, so every generated file
 *  sits flat in `tests/generated/` (where the `.gitignore` and `clean`
 *  patterns expect it) and the `'../..'` import prefix stays correct.
 *
 *  @param {string} base - the entry, `src/ts/`-relative, without `.ts`.
 *  @returns {string} the `.docex.ts` file name.
 *
 *  @example
 *  docexFileName('machine/machine')  // => 'machine_machine.docex.ts'
 *
 *  @example
 *  docexFileName('jssm_util')  // => 'jssm_util.docex.ts'
 */
function docexFileName(base) {
  return `${base.replace(/\//g, '_')}.docex.ts`;
}

/**
 *  Generate one `.docex.ts` test file per entry point that carries
 *  `@example` blocks.  Entry points with no examples produce no file.
 *
 *  @returns {void}
 *
 *  @example
 *  // run directly: `node src/buildjs/extract_examples.cjs`
 *  main();  // writes src/ts/tests/generated/<module>.docex.ts files
 */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  for (const base of ENTRY_POINTS) {
    const srcPath = path.join(SRC_TS_DIR, `${base}.ts`);
    if (!fs.existsSync(srcPath)) { continue; }

    const records = extractExamples(fs.readFileSync(srcPath, 'utf8'), `${base}.ts`);
    if (records.length === 0) { continue; }

    fs.writeFileSync(
      path.join(OUT_DIR, docexFileName(base)),
      buildTestFile(records, base)
    );
    total += records.length;
    console.log(`extract_examples: ${base}.ts -> ${records.length} example(s)`);
  }
  console.log(`extract_examples: ${total} example(s) total`);
}

if (require.main === module) { main(); }

module.exports = { extractExamples, nodeName, commentText, rewriteImportSpecifier, rewriteOutputComments, splitExample, mergeImports, buildTestFile, docexFileName, main };
