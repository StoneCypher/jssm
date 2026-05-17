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
 *  Build the full text of a generated `.docex.ts` test file: a generated-by
 *  header, hoisted and de-duplicated imports, and one `it()` per example.
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
  const allImports     = new Set();
  const blocks         = [];

  for (const rec of records) {
    const { imports, code } = splitExample(rec.body, definingModule);
    for (const i of imports) { allImports.add(i); }

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
    [...allImports].sort().join('\n') + '\n\n' +
    `describe('${moduleBasename}.ts docblock examples', () => {\n\n` +
    blocks.join('\n\n') + '\n\n});\n'
  );
}

module.exports = { extractExamples, nodeName, commentText, rewriteImportSpecifier, rewriteOutputComments, splitExample, buildTestFile };
