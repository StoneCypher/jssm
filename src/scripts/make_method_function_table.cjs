'use strict';

/**
 *  Generates the 5.x-method → 6.0-function table for `MIGRATING-5-to-6.md`
 *  from the `Machine` class source, so the migration guide can never drift
 *  from the class it describes (bare-functions design, "Docs": the table is
 *  generated from the export list, not hand-typed).
 *
 *  Reads `src/ts/machine/machine.ts`, walks the body of `class Machine`, and
 *  enumerates its public members by parsing member declaration lines:
 *
 *    - a method `name(...)` maps to the function `name(m, ...)`;
 *    - a getter `get name()` maps to `name(m)`;
 *    - a setter `set name(v)` maps to `set_name(m, v)`;
 *    - `do` (a reserved word with no function form) maps to `act(m, ...)` /
 *      `action(m, ...)` (decision 5, StoneCypher/fsl#1992);
 *    - the template-tag methods `sm` / `fsl` map to the top-level `sm` / `fsl`.
 *
 *  `constructor`, every `_`-prefixed member, and any member whose docblock is
 *  tagged `@internal` (the public-named `transition_impl` delegate) are
 *  skipped; they are not migration surface.
 *
 *  Prints a Markdown table (`| 5.x method | 6.0 function |`) to stdout:
 *
 *      node src/scripts/make_method_function_table.cjs
 *
 *  Pure helpers are exported for the unit test in
 *  `src/ts/tests/make_method_function_table.spec.ts` (which also pins the
 *  table embedded in the migration guide to this generator's output);
 *  `main()` runs only when the file is executed directly.
 *
 *  @see MIGRATING-5-to-6.md
 *  @see src/ts/machine/machine.ts
 */

const fs   = require('fs');
const path = require('path');

/** The class source the table is generated from, relative to the repo root. */
const MACHINE_SOURCE = path.join(__dirname, '..', 'ts', 'machine', 'machine.ts');

/** Members with no `name(m, ...)` function form, and what to print instead. */
const SPECIAL_FUNCTIONS = Object.freeze({
  do  : '`act(m, ...)` / `action(m, ...)` (`do` is a reserved word; `Machine.do()` is deprecated, StoneCypher/fsl#1992)',
  sm  : 'the top-level `` sm`...` `` (the machine already carries its options)',
  fsl : 'the top-level `` fsl`...` `` (the machine already carries its options)',
});

/** One class-member declaration line: optional accessor keyword, name, opening paren. */
const MEMBER_LINE = /^\s{2}(get |set |async |\*)?([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/;



/**
 *  Cuts the text of the `class Machine` body out of the full source: from the
 *  line declaring the class to the first line that is exactly `}` after it.
 *
 *  @param source The full text of `machine.ts`.
 *  @returns The lines of the class body, declaration line included.
 *  @throws {Error} If the source declares no `class Machine`.
 *
 *  @example
 *  classBodyLines('x\nclass Machine<mDT> {\n  state(): S {\n  }\n}\nafter')
 *  // => ['class Machine<mDT> {', '  state(): S {', '  }', '}']
 */
function classBodyLines(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(l => /^(export )?class Machine\b/.test(l));
  if (start === -1) { throw new Error('make_method_function_table: no `class Machine` in the source'); }
  const end = lines.findIndex((l, i) => i > start && l === '}');
  return lines.slice(start, end === -1 ? lines.length : end + 1);
}



/**
 *  Whether the docblock immediately preceding line `index` carries an
 *  `@internal` tag.  Walks upward over the blank lines and the comment block
 *  that ends just above the member; stops at the first non-comment line.
 *
 *  @param lines The class body lines.
 *  @param index The index of the member declaration line.
 *  @returns `true` when the member is documented as internal.
 *
 *  @example
 *  precedingDocblockIsInternal(['  /**', '   *  @internal', '   *\/', '  x() {'], 3)  // => true
 */
function precedingDocblockIsInternal(lines, index) {
  let i = index - 1;
  while (i >= 0 && lines[i].trim() === '') { i--; }
  if (i < 0 || !lines[i].trim().endsWith('*/')) { return false; }
  while (i >= 0) {
    const t = lines[i].trim();
    if (t.includes('@internal')) { return true; }
    if (t.startsWith('/*')) { return false; }
    i--;
  }
  return false;
}



/**
 *  Enumerates the public members of the class body: `{ name, kind }` records
 *  in declaration order, one per member, with overload signatures collapsed
 *  onto their implementation.  `kind` is `'method'`, `'getter'`, or
 *  `'setter'`; a getter/setter pair yields two records.
 *
 *  @param lines The class body lines (see {@link classBodyLines}).
 *  @returns The public member records.
 *
 *  @example
 *  publicMembers(['class Machine<mDT> {', '  get history(): X {', '  set history(to: X) {', '  go(s: S): boolean {', '  _fire(): void {', '}'])
 *  // => [ { name: 'history', kind: 'getter' }, { name: 'history', kind: 'setter' }, { name: 'go', kind: 'method' } ]
 */
function publicMembers(lines) {
  const seen = new Set();
  const out  = [];

  lines.forEach((line, index) => {
    const m = line.match(MEMBER_LINE);
    if (!m) { return; }

    const keyword = (m[1] || '').trim();
    const name    = m[2];
    if (name === 'constructor' || name.startsWith('_')) { return; }
    if (['if', 'for', 'while', 'switch', 'return', 'catch'].includes(name)) { return; }
    if (precedingDocblockIsInternal(lines, index)) { return; }

    const kind = keyword === 'get' ? 'getter' : keyword === 'set' ? 'setter' : 'method';
    const key  = `${kind}:${name}`;
    if (seen.has(key)) { return; }
    seen.add(key);
    out.push({ name, kind });
  });

  return out;
}



/**
 *  The 6.0 function-side cell for one member record.
 *
 *  @param member A `{ name, kind }` record from {@link publicMembers}.
 *  @returns The Markdown cell text naming the function form.
 *
 *  @example
 *  functionFor({ name: 'themes', kind: 'setter' })  // => '`set_themes(m, v)`'
 *
 *  @example
 *  functionFor({ name: 'transition', kind: 'method' })  // => '`transition(m, ...)`'
 */
function functionFor(member) {
  if (Object.prototype.hasOwnProperty.call(SPECIAL_FUNCTIONS, member.name)) { return SPECIAL_FUNCTIONS[member.name]; }
  if (member.kind === 'getter') { return `\`${member.name}(m)\``; }
  if (member.kind === 'setter') { return `\`set_${member.name}(m, v)\``; }
  return `\`${member.name}(m, ...)\``;
}



/**
 *  The 5.x method-side cell for one member record.
 *
 *  @param member A `{ name, kind }` record from {@link publicMembers}.
 *  @returns The Markdown cell text naming the class spelling.
 *
 *  @example
 *  methodFor({ name: 'themes', kind: 'setter' })  // => '`m.themes = v`'
 *
 *  @example
 *  methodFor({ name: 'sm', kind: 'method' })  // => '`` m.sm`...` ``'
 */
function methodFor(member) {
  if (member.name === 'sm' || member.name === 'fsl') { return `\`\` m.${member.name}\`...\` \`\``; }
  if (member.kind === 'getter') { return `\`m.${member.name}\``; }
  if (member.kind === 'setter') { return `\`m.${member.name} = v\``; }
  return `\`m.${member.name}(...)\``;
}



/**
 *  Renders the member records as a Markdown table.
 *
 *  @param members The records from {@link publicMembers}.
 *  @returns The table text, header rows first, one row per member, trailing newline.
 *
 *  @example
 *  buildTable([{ name: 'state', kind: 'method' }])
 *  // => '| 5.x method | 6.0 function |\n|---|---|\n| `m.state(...)` | `state(m, ...)` |\n'
 */
function buildTable(members) {
  const rows = members.map(mem => `| ${methodFor(mem)} | ${functionFor(mem)} |`);
  return ['| 5.x method | 6.0 function |', '|---|---|', ...rows].join('\n') + '\n';
}



/**
 *  Reads the class source and prints the table to stdout.
 *
 *  @param sourcePath The `machine.ts` path; defaults to the in-repo file.
 *  @returns The table text that was printed.
 */
function main(sourcePath = MACHINE_SOURCE) {
  const table = buildTable(publicMembers(classBodyLines(fs.readFileSync(sourcePath, 'utf8'))));
  process.stdout.write(table);
  return table;
}

if (require.main === module) { main(); }

module.exports = { classBodyLines, precedingDocblockIsInternal, publicMembers, functionFor, methodFor, buildTable, main, MACHINE_SOURCE, SPECIAL_FUNCTIONS };
