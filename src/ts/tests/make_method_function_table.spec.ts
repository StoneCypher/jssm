import { createRequire } from 'node:module';
import { readFileSync }  from 'node:fs';
import { resolve }       from 'node:path';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const mmft    = require('../../scripts/make_method_function_table.cjs');

const { classBodyLines, precedingDocblockIsInternal, publicMembers, functionFor, methodFor, buildTable, MACHINE_SOURCE } = mmft;

const root = resolve(__dirname, '../../..');

// The migration table for MIGRATING-5-to-6.md is generated from the Machine
// class source.  These tests pin the parser on literal class-shaped snippets
// (so an expectation never comes from the code under test), run the real
// source through it, asserting a handful of rows that are known from the
// class by name, the do -> act/action rule, and that nothing `_`-prefixed or
// `@internal` leaks into the migration surface, and finally pin the table
// embedded in MIGRATING-5-to-6.md to the generator's exact output so the
// guide cannot drift from the class it describes.



describe('classBodyLines', () => {

  it('cuts from the class declaration to its closing brace', () => {
    const src = ['before', 'class Machine<mDT> {', '  state(): S {', '    return 1;', '  }', '}', 'function create() {}'].join('\n');
    expect(classBodyLines(src)).toEqual(['class Machine<mDT> {', '  state(): S {', '    return 1;', '  }', '}']);
  });

  it('accepts an exported class declaration and CRLF line endings', () => {
    const src = 'export class Machine {\r\n  go(): void {\r\n  }\r\n}\r\n';
    expect(classBodyLines(src)).toEqual(['export class Machine {', '  go(): void {', '  }', '}']);
  });

  it('throws when there is no Machine class', () => {
    expect(() => classBodyLines('const x = 1;')).toThrow(/no `class Machine`/);
  });

});



describe('precedingDocblockIsInternal', () => {

  it('sees an @internal tag in the docblock just above the member', () => {
    const lines = ['  /**', '   *  Shared core.', '   *  @internal', '   */', '  transition_impl(): boolean {'];
    expect(precedingDocblockIsInternal(lines, 4)).toBe(true);
  });

  it('is false for a docblock without the tag', () => {
    const lines = ['  /**', '   *  Public.', '   */', '  state(): S {'];
    expect(precedingDocblockIsInternal(lines, 3)).toBe(false);
  });

  it('is false when the member has no docblock, even if an earlier one was internal', () => {
    const lines = ['  /** @internal */', '  _fire(): void {', '  }', '', '  go(): boolean {'];
    expect(precedingDocblockIsInternal(lines, 4)).toBe(false);
  });

});



describe('publicMembers', () => {

  const body = [
    'class Machine<mDT> {',
    '  _state : string;',
    '  constructor({ a }) {',
    '  }',
    '  state(): string {',
    '    if (x) { return y; }',
    '  }',
    '  on<Ev extends N>(name: Ev, handler: H): U;',
    '  on<Ev extends N>(name: Ev, filter: F, handler: H): U;',
    '  on<Ev extends N>(name: Ev, a: any, b?: any): U {',
    '  }',
    '  get history(): Array<X> {',
    '  }',
    '  get themes(): T {',
    '  }',
    '  set themes(to: T) {',
    '  }',
    '  *stochastic_runs(opts = {}): Generator<R> {',
    '  }',
    '  _fire(): void {',
    '  }',
    '  /**',
    '   *  @internal',
    '   */',
    '  transition_impl(): boolean {',
    '  }',
    '}',
  ];

  it('lists methods, getters, and setters in declaration order, collapsing overloads', () => {
    expect(publicMembers(body)).toEqual([
      { name: 'state',           kind: 'method' },
      { name: 'on',              kind: 'method' },
      { name: 'history',         kind: 'getter' },
      { name: 'themes',          kind: 'getter' },
      { name: 'themes',          kind: 'setter' },
      { name: 'stochastic_runs', kind: 'method' },
    ]);
  });

  it('skips the constructor, underscore members, internal members, and body statements', () => {
    const names = publicMembers(body).map(m => m.name);
    expect(names).not.toContain('constructor');
    expect(names).not.toContain('_fire');
    expect(names).not.toContain('_state');
    expect(names).not.toContain('transition_impl');
    expect(names).not.toContain('if');
  });

});



describe('functionFor and methodFor', () => {

  it('maps a method to name(m, ...)', () => {
    expect(functionFor({ name: 'transition', kind: 'method' })).toBe('`transition(m, ...)`');
    expect(methodFor({ name: 'transition', kind: 'method' })).toBe('`m.transition(...)`');
  });

  it('maps a getter to name(m)', () => {
    expect(functionFor({ name: 'history', kind: 'getter' })).toBe('`history(m)`');
    expect(methodFor({ name: 'history', kind: 'getter' })).toBe('`m.history`');
  });

  it('maps a setter to set_name(m, v)', () => {
    expect(functionFor({ name: 'rng_seed', kind: 'setter' })).toBe('`set_rng_seed(m, v)`');
    expect(methodFor({ name: 'rng_seed', kind: 'setter' })).toBe('`m.rng_seed = v`');
  });

  it('maps do to act / action and names the deprecation issue', () => {
    const cell = functionFor({ name: 'do', kind: 'method' });
    expect(cell).toContain('`act(m, ...)`');
    expect(cell).toContain('`action(m, ...)`');
    expect(cell).toContain('StoneCypher/fsl#1992');
    expect(cell).not.toMatch(/`do\(/);
  });

  it('maps the sm and fsl template-tag methods to the top-level tags', () => {
    expect(functionFor({ name: 'sm',  kind: 'method' })).toContain('`` sm`...` ``');
    expect(functionFor({ name: 'fsl', kind: 'method' })).toContain('`` fsl`...` ``');
    expect(methodFor({ name: 'sm', kind: 'method' })).toBe('`` m.sm`...` ``');
  });

});



describe('buildTable', () => {

  it('renders a Markdown table with the header and one row per member', () => {
    expect(buildTable([{ name: 'state', kind: 'method' }, { name: 'themes', kind: 'setter' }])).toBe(
      '| 5.x method | 6.0 function |\n' +
      '|---|---|\n' +
      '| `m.state(...)` | `state(m, ...)` |\n' +
      '| `m.themes = v` | `set_themes(m, v)` |\n'
    );
  });

});



describe('against the real Machine class', () => {

  const members = publicMembers(classBodyLines(readFileSync(MACHINE_SOURCE, 'utf8')));
  const table   = buildTable(members);
  const rows    = table.split('\n');

  it('carries the rows a 5.x user will look for first', () => {
    expect(rows).toContain('| `m.state(...)` | `state(m, ...)` |');
    expect(rows).toContain('| `m.transition(...)` | `transition(m, ...)` |');
    expect(rows).toContain('| `m.action(...)` | `action(m, ...)` |');
    expect(rows).toContain('| `m.hook(...)` | `hook(m, ...)` |');
    expect(rows).toContain('| `m.history` | `history(m)` |');
    expect(rows).toContain('| `m.history_length = v` | `set_history_length(m, v)` |');
    expect(rows).toContain('| `m.rng_seed` | `rng_seed(m)` |');
    expect(rows).toContain('| `m.rng_seed = v` | `set_rng_seed(m, v)` |');
    expect(rows).toContain('| `m.themes = v` | `set_themes(m, v)` |');
  });

  it('routes do to act / action and never prints a do function', () => {
    const do_row = rows.find(r => r.startsWith('| `m.do(...)` |'));
    expect(do_row).toBeDefined();
    expect(do_row).toContain('`act(m, ...)`');
    expect(do_row).toContain('`action(m, ...)`');
    expect(table).not.toMatch(/\| `do\(/);
  });

  it('has no underscore-prefixed, constructor, or transition_impl rows', () => {
    expect(rows.some(r => r.startsWith('| `m._'))).toBe(false);
    expect(rows.some(r => r.includes('constructor'))).toBe(false);
    expect(rows.some(r => r.includes('transition_impl'))).toBe(false);
  });

  it('routes the template-tag methods to the top-level tags', () => {
    expect(rows.some(r => r.startsWith('| `` m.sm`...` `` |')  && r.includes('`` sm`...` ``'))).toBe(true);
    expect(rows.some(r => r.startsWith('| `` m.fsl`...` `` |') && r.includes('`` fsl`...` ``'))).toBe(true);
  });

  it('is a large surface, one row per public member', () => {
    // the 5.x class carried well over a hundred public members; a parser
    // regression that silently matched nothing must not pass
    expect(members.length).toBeGreaterThan(100);
    expect(rows.filter(r => r.startsWith('| `')).length).toBe(members.length);
  });

  it('is embedded verbatim in MIGRATING-5-to-6.md, so the guide cannot drift from the class', () => {
    const guide = readFileSync(resolve(root, 'MIGRATING-5-to-6.md'), 'utf8').replace(/\r\n/g, '\n');
    expect(guide).toContain(table);
  });

});
