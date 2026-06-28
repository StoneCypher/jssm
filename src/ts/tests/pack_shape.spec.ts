import { describe, test, expect } from 'vitest';
import { execSync }              from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Guards against the class of bug where an `exports`/`bin` subpath resolves
// locally (source + tests pass) but its files are absent from the published
// tarball because they were never added to `files[]` — e.g. `jssm/cli` shipping
// broken from ~v5.120 until 5.143.x.  Asserts every concrete file referenced by
// exports/bin/main/module/browser/types is actually included in `npm pack`.

describe('package tarball shape', () => {

  // Needs built dist; skip in an unbuilt tree rather than fail spuriously.
  const built = existsSync('dist/jssm.es5.cjs') && existsSync('dist/cli/lib.cjs');

  test.skipIf(!built)('every exports/bin/entry target is in the npm pack', () => {

    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

    const refs = new Set<string>();
    const add = (p: unknown): void => {
      if (typeof p === 'string' && !p.startsWith('#')) refs.add(p.replace(/^\.\//, ''));
    };
    const walk = (v: unknown): void => {
      if (typeof v === 'string') add(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };

    walk(pkg.exports);
    walk(pkg.bin);
    [pkg.main, pkg.module, pkg.browser, pkg.types].forEach(add);

    const out    = JSON.parse(execSync('npm pack --dry-run --json', { encoding: 'utf8' }));
    const packed = new Set<string>((out[0].files as Array<{ path: string }>).map((f) => f.path));

    const missing = [...refs].filter((r) => !packed.has(r));
    expect(missing, `exports/bin targets missing from the package tarball: ${missing.join(', ')}`).toEqual([]);

  // `npm pack --dry-run` packs 110+ artifacts and AV-scans each; on Windows under
  // the full build's parallel test load that exceeds the default 30s, so give it room.
  }, 120_000);

});
