
/**
 * Example-machine corpus guard (fsl#112, fsl#1842).
 *
 * The `src/machines/` tree holds the shipped example machines, including the
 * eleven GitHub-Linguist language samples under `src/machines/linguist/`.
 * Nothing exercised these files at test time, so they silently rotted out of
 * the grammar: every Linguist sample stopped parsing when the `jssm_version`
 * attribute was renamed to `fsl_version` and version-range values were
 * dropped in favor of bare SemVer (diagnosed as fsl#1842).  One sample even
 * carried another machine's `machine_name` from a copy-paste.
 *
 * This spec discovers every `.fsl` file under `src/machines/` at runtime (no
 * hard-coded list, so new examples are covered automatically) and, for each:
 *
 *   1. parses it with the real `jssm.from()` pipeline and requires that it
 *      not throw, and
 *   2. requires the minimum header set of fsl#112 — `machine_name`,
 *      `machine_author`, `machine_license`, and `fsl_version` — verified
 *      through the parsed machine's getters.
 *
 * Files that cannot currently parse for grammar reasons unrelated to their
 * headers may appear in PARSE_SKIP below; every entry must carry a written
 * justification, and skipped files still get text-level header assertions.
 * @see fsl#1842 (linguist samples do not parse)
 * @see fsl#112  (example machines should carry consistent headers)
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative }            from 'node:path';

import * as jssm from '../jssm';



const MACHINES_ROOT = join(__dirname, '..', '..', 'machines');



/**
 * Files that are knowingly excluded from the parse assertion.  Keys are
 * paths relative to `src/machines/` with forward slashes; values are the
 * reason the file cannot parse today.  Skipped files still must carry the
 * required headers (checked at text level, since there is no machine to
 * query).  Remove an entry once the underlying blocker is fixed so the file
 * rejoins the parse gate.
 */
const PARSE_SKIP: Map<string, string> = new Map([
  [ 'extreme case.fsl',
    'aspirational syntax showcase: uses `${handler}` template placeholders, '
  + '`on_init`-family hook attributes, and inline node-characteristic blocks '
  + '(`{ enter: ... }`, `follow:`, `arc_label:`), none of which exist in the '
  + 'current grammar; a header edit cannot make this parse' ],
  [ 'extensive states of matter.fsl',
    'uses the retired `(|-1|)` / `(|+1|)` relative-target spelling against a '
  + 'named-group spread; the modern stripe/cycle targets (`+|1`, `+1`) parse '
  + 'but do not yet compile (expansion is commented out in jssm_compiler.ts '
  + 'makeTransition and remains a test.todo in cycles.spec.ts), so this '
  + 'machine cannot be made to build without rewriting its transitions' ]
]);



/**
 * Recursively collects every `.fsl` file under a directory, returning paths
 * relative to `MACHINES_ROOT` with forward slashes so skip-list keys and
 * test names are stable across platforms.
 */
function find_fsl_files(dir: string): string[] {

  const found: string[] = [];

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {

    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      found.push(...find_fsl_files(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.fsl')) {
      found.push(relative(MACHINES_ROOT, full).split('\\').join('/'));
    }

  }

  return found.sort( (a, b) => a.localeCompare(b) );

}



const all_machines = find_fsl_files(MACHINES_ROOT);



describe('example machine corpus discovery', () => {

  test('finds a plausible corpus (guards against a bad glob root)', () =>
    expect(all_machines.length).toBeGreaterThanOrEqual(30) );

  test('finds the eleven linguist samples of fsl#1842', () =>
    expect(all_machines.filter(f => f.startsWith('linguist/')).length)
      .toBe(11) );

});



describe.each(all_machines)('example machine %s', (rel_path) => {

  const abs_path = join(MACHINES_ROOT, rel_path),
        source   = readFileSync(abs_path, 'utf8'),
        skipped  = PARSE_SKIP.get(rel_path);

  if (skipped === undefined) {

    test('parses under the current grammar', () =>
      expect(() => jssm.from(source)).not.toThrow() );

    describe('required headers (fsl#112)', () => {

      // Lazy so a parse failure surfaces inside tests (as failures) rather
      // than during collection, where it would abort the whole spec file.
      let memo: ReturnType<typeof jssm.from> | undefined;
      const machine_of = () => (memo ??= jssm.from(source));

      test('machine_name is set', () => {
        expect(typeof machine_of().machine_name()).toBe('string');
        expect((machine_of().machine_name() as string).length).toBeGreaterThan(0);
      });

      test('machine_author is set', () => {
        const authors = machine_of().machine_author();
        expect(Array.isArray(authors)).toBe(true);
        expect((authors as string[]).length).toBeGreaterThan(0);
        for (const a of authors as string[]) { expect(a.length).toBeGreaterThan(0); }
      });

      test('machine_license is set', () => {
        expect(typeof machine_of().machine_license()).toBe('string');
        expect((machine_of().machine_license() as string).length).toBeGreaterThan(0);
      });

      test('fsl_version is set', () => {
        // typed as string, but at runtime carries the parsed semver record
        // ({ full, major, minor, patch }) — accept either shape
        const v = machine_of().fsl_version();
        expect(v).toBeDefined();
        const full = typeof v === 'string' ? v : (v as unknown as { full: string }).full;
        expect(full).toMatch(/^\d+\.\d+\.\d+$/);
      });

    });

  } else {

    test(`is parse-skip-listed with a justification: ${skipped.slice(0, 40)}...`, () =>
      expect(skipped.length).toBeGreaterThan(0) );

    describe('required headers (fsl#112, text level — file is skip-listed)', () => {

      test('machine_name is declared',    () => expect(source).toMatch(/^\s*machine_name\s*:/m)    );
      test('machine_author is declared',  () => expect(source).toMatch(/^\s*machine_author\s*:/m)  );
      test('machine_license is declared', () => expect(source).toMatch(/^\s*machine_license\s*:/m) );
      test('fsl_version is declared',     () => expect(source).toMatch(/^\s*fsl_version\s*:\s*\d+\.\d+\.\d+\s*;/m) );

    });

  }

  // The renamed/retired attribute of fsl#1842 must never come back.
  test('does not use the retired jssm_version attribute', () =>
    expect(source).not.toMatch(/^\s*jssm_version\s*:/m) );

  // fsl_version takes a bare SemVer; range values were the other half of fsl#1842.
  test('does not use a version range for fsl_version', () =>
    expect(source).not.toMatch(/^\s*fsl_version\s*:\s*[><=^~]/m) );

});
