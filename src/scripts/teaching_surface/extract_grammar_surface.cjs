'use strict';

/**
 * Extract the classification universe of the FSL grammar: every named PEG rule
 * and every literal terminal. This is the ground truth the language-surface
 * teaching manifest must partition (see
 * notes/superpowers/specs/2026-06-27-help-bar-teaching-surface.md).
 *
 * The lexer strips line/block comments, character classes, and `{…}` semantic
 * actions so JavaScript string literals inside actions are never mistaken for
 * grammar terminals. Rule names are the column-0 identifiers that begin a rule;
 * PEG.js display-name labels (`Rule "label" = …`) are tracked and excluded from
 * the terminal set.
 *
 * @example
 *   const { extractGrammarSurface } = require('./extract_grammar_surface.cjs');
 *   const { rules, terminals } = extractGrammarSurface('Foo = "bar"\n');
 *   // rules => ['Foo'], terminals => ['bar']
 */

const fs   = require('fs');
const path = require('path');

const DEFAULT_PEG = path.join(__dirname, '..', '..', 'ts', 'fsl_parser.peg');

/**
 * Lex grammar source into its distinct literal terminals, skipping comments,
 * character classes, and `{…}` action blocks.
 *
 * @param src grammar text
 * @param labels display-name strings to exclude (PEG.js rule labels)
 * @returns distinct terminal strings, in first-seen order
 */
function lexTerminals(src, labels) {
  const seen = new Set();
  const out  = [];
  let i = 0, depth = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '[') { i++; while (i < n && src[i] !== ']') { i += src[i] === '\\' ? 2 : 1; } i++; continue; }
    if (c === '"' || c === "'") {
      const q = c; i++; let v = '';
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { v += src.slice(i, i + 2); i += 2; }
        else                 { v += src[i]; i++; }
      }
      i++;
      if (depth === 0 && !seen.has(v)) { seen.add(v); out.push(v); }
      continue;
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { if (depth > 0) depth--; i++; continue; }
    i++;
  }
  // a string used ONLY as a display label is not a grammar terminal
  return out.filter(v => !labels.has(v) || out.indexOf(v) !== out.lastIndexOf(v));
}

/**
 * Extract the rule and terminal universe from FSL grammar source.
 *
 * @param src grammar text (a PEG.js grammar)
 * @returns `{ rules, terminals }`, each a sorted, de-duplicated string array
 */
function extractGrammarSurface(src) {
  const rules  = [];
  const labels = new Set();
  for (const line of src.split(/\r?\n/)) {
    if (line === '' || /^\s/.test(line)) continue;       // body/blank lines are indented
    const m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(line);
    if (!m) continue;                                     // comments, initializer brace, etc.
    rules.push(m[1]);
    const lm = /^[A-Za-z_][A-Za-z0-9_]*\s+"((?:[^"\\]|\\.)*)"/.exec(line);
    if (lm) labels.add(lm[1]);
  }
  const terminals = lexTerminals(src, labels);
  return {
    rules:     [...new Set(rules)].sort(),
    terminals: [...new Set(terminals)].sort(),
  };
}

/**
 * Read and extract the grammar surface from a `.peg` file on disk.
 *
 * @param pegPath path to the grammar; defaults to `src/ts/fsl_parser.peg`
 */
function extractGrammarSurfaceFromFile(pegPath = DEFAULT_PEG) {
  return extractGrammarSurface(fs.readFileSync(pegPath, 'utf8'));
}

module.exports = { extractGrammarSurface, extractGrammarSurfaceFromFile, DEFAULT_PEG };

if (require.main === module) {
  const surface = extractGrammarSurfaceFromFile();
  process.stdout.write(JSON.stringify(surface, null, 2) + '\n');
}
