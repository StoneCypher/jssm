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
 *  @param {import('typescript').Node} node - a declaration node.
 *  @returns {string} the symbol name, or `'(anonymous)'` if none is found.
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
 *  Flatten a JSDoc tag comment (which TypeScript models as either a string or
 *  a node array) into a plain string.
 *
 *  @param {string | import('typescript').NodeArray | undefined} comment
 *  @returns {string}
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

module.exports = { extractExamples, nodeName, commentText };
