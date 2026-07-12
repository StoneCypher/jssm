
/*******
 *
 *  Trace tests for the published package surface (fsl#611): every entry in
 *  package.json's `files` allowlist must exist on disk and be non-empty after
 *  a full build, so a release can never silently ship without one of the
 *  obscure builds (deno dist, cdn singles, d.cts twins, the migration doc).
 *
 *  The ci-lite legs deliberately clean dist/ and rebuild only the wc/cm6/cli
 *  bundles, so this suite self-skips unless the core bundle is present —
 *  it gates exactly the full-build contexts that feed `release`, which
 *  publishes the committed dist as-is.
 *
 */

import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname }                                from 'node:path';

const root = resolve(__dirname, '../../..');
const pkg  = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const full_dist_present = existsSync(resolve(root, 'dist/jssm.es5.cjs'));



/*******
 *
 *  Expands one package.json `files` entry to concrete paths.  Directory
 *  entries and single files pass through; a trailing `*.ext` glob (the only
 *  pattern shape the manifest uses) expands against its directory, and an
 *  empty expansion is returned as the pattern itself so the existence
 *  assertion fails loudly instead of vacuously passing.
 *
 */

function expand_files_entry(entry: string): string[] {

  if (!entry.includes('*')) { return [entry]; }

  const dir     = dirname(entry);
  const abs_dir = resolve(root, dir);
  if (!existsSync(abs_dir)) { return [entry]; }

  const suffix  = entry.slice(entry.lastIndexOf('*') + 1);
  const matched = readdirSync(abs_dir)
    .filter(f => f.endsWith(suffix))
    .map(f => `${dir}/${f}`);

  return matched.length > 0 ? matched : [entry];

}



describe.skipIf(!full_dist_present)('published files trace (full dist only)', () => {

  const all_paths = (pkg.files as string[]).flatMap(expand_files_entry);

  test.each(all_paths)('%s exists and is non-empty', (rel: string) => {
    const abs = resolve(root, rel);
    expect(existsSync(abs)).toBe(true);
    expect(statSync(abs).size).toBeGreaterThan(0);
  });

  test('main, module, browser, and types entry points are published', () => {
    for (const key of ['main', 'module', 'browser', 'types'] as const) {
      const rel = (pkg[key] as string).replace(/^\.\//, '');
      expect(existsSync(resolve(root, rel)), `${key}: ${rel}`).toBe(true);
      expect(statSync(resolve(root, rel)).size).toBeGreaterThan(0);
    }
  });

});
