'use strict';

/**
 * Per-surface ground-truth extractors for the teaching-surface manifest.
 *
 * Each jssm user-facing surface has a different enumerable contract; this module
 * censuses each into a flat list of "unit" ids that the manifest must partition
 * (one feature claims each unit exactly once). See
 * notes/superpowers/specs/2026-06-27-help-bar-teaching-surface.md §3.
 *
 *   language     → named PEG rules (delegated to extract_grammar_surface)
 *   api          → exported symbols of src/ts/jssm.ts (the `.` entry)
 *   viz          → exported symbols of src/ts/jssm_viz.ts
 *   editor       → exported symbols of src/ts/cm6/fsl_language.ts
 *   webcomponent → custom-element tag names from custom-elements.json (CEM)
 *   cli          → bins, subcommands, render targets, dispatcher flags/names
 *   llm-prompt   → markdown section headings of the exported system prompt
 *
 * @example
 *   const { surfaceUniverse } = require('./extract_surfaces.cjs');
 *   surfaceUniverse('editor'); // => ['DEPRECATED_KEYWORDS', 'fsl', ...]
 */

const fs   = require('fs');
const path = require('path');
const { extractGrammarSurfaceFromFile } = require('./extract_grammar_surface.cjs');

const TS   = path.join(__dirname, '..', '..', 'ts');
const ROOT = path.join(__dirname, '..', '..', '..');

const read = p => fs.readFileSync(p, 'utf8');

/** Strip `//` and block comments so export parsing ignores commented names. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Collect the top-level exported names of a TypeScript module: `export { a, b
 * as c }`, `export type { … }`, and `export function/class/const/type/… Name`.
 * Re-export aliases (`x as y`) contribute the exported name `y`.
 */
function exportedNames(src) {
  const s = stripComments(src);
  const names = new Set();
  const block = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  let m;
  while ((m = block.exec(s))) {
    for (let part of m[1].split(',')) {
      part = part.trim();
      if (!part) continue;
      const as = /(\S+)\s+as\s+(\S+)/.exec(part);
      names.add(as ? as[2] : part);
    }
  }
  const decl = /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/g;
  while ((m = decl.exec(s))) names.add(m[1]);
  return [...names];
}

/** Custom-element tag names declared in a CEM (`custom-elements.json`). */
function customElementTags(cem) {
  const tags = new Set();
  for (const mod of cem.modules || []) {
    for (const d of mod.declarations || []) if (d.tagName) tags.add(d.tagName);
    for (const e of mod.exports || []) {
      if (e.kind === 'custom-element-definition' && e.name) tags.add(e.name);
    }
  }
  // keep only valid custom-element names (hyphenated, lowercase, no underscore);
  // drops unresolved identifier refs the CEM analyzer records for define_canonical()
  return [...tags].filter(t => /^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(t));
}

/** CLI surface: namespaced ids for bins, subcommands, render targets, flags. */
function cliUnits() {
  const pkg  = JSON.parse(read(path.join(ROOT, 'package.json')));
  const out  = new Set();
  for (const b of Object.keys(pkg.bin || {})) out.add('bin:' + b);

  const subDir = path.join(TS, 'cli', 'subcommands');
  for (const e of fs.readdirSync(subDir, { withFileTypes: true })) {
    if (e.isDirectory()) out.add('sub:' + e.name);
  }
  const targetDir = path.join(subDir, 'render', 'targets');
  for (const f of fs.readdirSync(targetDir)) {
    if (f.endsWith('.ts')) out.add('target:' + path.basename(f, '.ts'));
  }
  const disp = read(path.join(TS, 'cli', 'dispatcher.ts'));
  const grab = (label, varName) => {
    const m = new RegExp(varName + '\\s*=\\s*new Set\\(\\[([^\\]]*)\\]').exec(disp);
    if (!m) return;
    for (const lit of m[1].match(/'[^']*'/g) || []) out.add(label + ':' + lit.slice(1, -1));
  };
  grab('flag', 'RESERVED_FLAGS');
  grab('name', 'RESERVED_NAMES');
  return [...out];
}

/** LLM-prompt surface: `##`/`###` section headings of the exported prompt. */
function promptUnits() {
  const src = read(path.join(TS, 'cli', 'subcommands', 'export-system-prompt', 'plugin.ts'));
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out  = [];
  const seen = new Set();
  for (const m of src.matchAll(/^#{2,3} (.+)$/gm)) {
    const id = slug(m[1].replace(/`/g, ''));
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

/**
 * The de-duplicated, sorted ground-truth unit list for one surface.
 *
 * @param surface one of language|api|viz|editor|webcomponent|cli|llm-prompt
 * @throws Error on an unknown surface name
 */
function surfaceUniverse(surface) {
  let units;
  switch (surface) {
    case 'language':     units = extractGrammarSurfaceFromFile().rules; break;
    case 'api':          units = exportedNames(read(path.join(TS, 'jssm.ts'))); break;
    case 'viz':          units = exportedNames(read(path.join(TS, 'jssm_viz.ts'))); break;
    case 'editor':       units = exportedNames(read(path.join(TS, 'cm6', 'fsl_language.ts'))); break;
    case 'webcomponent': units = customElementTags(JSON.parse(read(path.join(ROOT, 'custom-elements.json')))); break;
    case 'cli':          units = cliUnits(); break;
    case 'llm-prompt':   units = promptUnits(); break;
    default: throw new Error(`unknown surface: ${surface}`);
  }
  return [...new Set(units)].sort();
}

const SURFACES = ['language', 'api', 'viz', 'editor', 'webcomponent', 'cli', 'llm-prompt'];

module.exports = { surfaceUniverse, exportedNames, SURFACES };

if (require.main === module) {
  const out = {};
  for (const s of SURFACES) out[s] = surfaceUniverse(s);
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
