import { createRequire }   from 'node:module';
import { execFileSync }    from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join }   from 'node:path';
import { fileURLToPath }   from 'node:url';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const { ROOT_DECLS } = require('../build_manifest.cjs') as { ROOT_DECLS: string[] };

/** Repo root, three levels above src/buildjs/tests/. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Lists every repo-root type declaration the rollup configs write, so the
 * check below follows the build rather than a hand-kept list.  Package
 * outputs (`packages/...`) and `dist/` inputs carry a slash and are skipped.
 *
 * @returns Declaration file names emitted at the repo root, sorted
 *
 * @example
 * rootDeclarationOutputs(); // => ['jssm.cli.d.ts', 'jssm.compat.d.ts', ...]
 */
const rootDeclarationOutputs = (): string[] => {

  const configs = readdirSync(ROOT).filter((f) => /^rollup\.config\..*\.js$/.test(f)),
        found   = new Set<string>();

  for (const config of configs) {
    const text = readFileSync(join(ROOT, config), 'utf8');
    for (const m of text.matchAll(/file\s*:\s*'(?:\.\/)?([^'/]+\.d\.c?ts)'/g)) { found.add(m[1]); }
  }

  return [...found].sort();

};

/** Runs git in the repo root and returns its stdout; throws on a non-zero exit. */
const git = (args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

// The root declarations are build output: committing them only ever produced
// stale copies (a ci-lite build cleans and regenerates some of them and not
// others).  These checks keep them out of the index.

describe('root type declarations are build output, not tracked files', () => {

  it('ROOT_DECLS names exactly the root declarations the rollup configs emit', () => {
    expect([...ROOT_DECLS].sort()).toEqual(rootDeclarationOutputs());
  });

  it.each(ROOT_DECLS)('%s is gitignored', (name) => {
    // --no-index: answer from the ignore rules alone, whether or not a stale
    // copy is still in someone's index.  Exit 1 (not ignored) throws.
    expect(() => git(['check-ignore', '-q', '--no-index', '--', name])).not.toThrow();
  });

  it.each(ROOT_DECLS)('%s is not tracked', (name) => {
    expect(git(['ls-files', '--', name]).trim()).toBe('');
  });

});
