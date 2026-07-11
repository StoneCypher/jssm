
import * as fc from 'fast-check';

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import {
  findPluginOnPath, isInProcessEligible, invokeInProcess, dispatch
} from '../cli/dispatcher';





// Property-based coverage for the CLI dispatcher (`cli/dispatcher.ts`).
//
// Filesystem fixtures live under a per-run temp directory; in-process
// plugin fixtures are real `.cjs` modules written beneath a
// `node_modules` segment so `isInProcessEligible` accepts them.  stdout
// and stderr writes are captured by swapping `process.std*.write`, never
// by letting them print.



const RUNS = 40;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 8 }
);



/**
 * Per-suite scratch root under the project's build/ directory (the house
 *  location for temporary files); `node_modules` in the path satisfies the
 *  in-process eligibility heuristic for fixture plugins.
 */
let scratch: string;

beforeAll(async () => {
  await fs.mkdir('build', { recursive: true });
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function -- vitest beforeAll is the only place suite-scoped state can be initialized asynchronously
  scratch = await fs.mkdtemp(join('build', 'stoch-dispatch-'));
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function -- vitest beforeAll is the only place suite-scoped state can be initialized asynchronously
  scratch = join(process.cwd(), scratch);
  await fs.mkdir(join(scratch, 'node_modules'), { recursive: true });
});

afterAll(async () => {
  await fs.rm(scratch, { recursive: true, force: true });
});



/**
 *  Captures everything written to a writable stream's `write` while `fn`
 *  runs, restoring the original writer afterward.
 *  @param stream  `process.stdout` or `process.stderr`.
 *  @param fn      The (possibly async) action to run while capturing.
 *  @returns       The action's result and the captured text.
 */
async function capturing<T>(
  stream: NodeJS.WriteStream,
  fn: () => Promise<T> | T
): Promise<{ result: T, text: string }> {

  const original = stream.write.bind(stream);
  let   text     = '';

  (stream as { write: unknown }).write = (chunk: unknown): boolean => {
    text += String(chunk);
    return true;
  };

  try {
    const result = await fn();
    return { result, text };
  } finally {
    (stream as { write: unknown }).write = original;
  }

}





describe('isInProcessEligible', () => {

  test('requires both a JS extension and a node_modules path segment', () => {

    fc.assert(
      fc.property(
        word, word,
        fc.constantFrom('.js', '.mjs', '.cjs'),
        fc.constantFrom('.sh', '.cmd', '.bat', '.py', ''),
        fc.boolean(),
        (dir, base, js_ext, other_ext, windows_seps) => {

          const sep   = windows_seps ? '\\' : '/';
          const nm    = ['proj', 'node_modules', dir, `${base}${js_ext}`].join(sep);
          const no_nm = ['proj', 'plugins',      dir, `${base}${js_ext}`].join(sep);
          const no_js = ['proj', 'node_modules', dir, `${base}${other_ext}`].join(sep);

          expect(isInProcessEligible(nm)).toBe(true);
          expect(isInProcessEligible(no_nm)).toBe(false);
          expect(isInProcessEligible(no_js)).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('findPluginOnPath', () => {

  test('empty or undefined PATH short-circuits to null', async () => {

    expect(await findPluginOnPath('render', undefined)).toBe(null);
    expect(await findPluginOnPath('render', '')).toBe(null);

  });

  test('finds fsl-<subcommand> with a node extension in any searched directory', async () => {

    await fc.assert(
      fc.asyncProperty(
        word,
        fc.constantFrom('.cjs', '.mjs', '.js'),
        fc.integer({ min: 0, max: 2 }),
        async (sub, ext, decoy_dirs) => {

          const dir = await fs.mkdtemp(join(scratch, 'path-'));
          const expected = join(dir, `fsl-${sub}${ext}`);
          await fs.writeFile(expected, '// fixture\n');

          // decoy empty dirs ahead of the real one exercise the keep-looking path
          const decoys: string[] = [];
          for (let i = 0; i < decoy_dirs; ++i) {
            decoys.push(await fs.mkdtemp(join(scratch, 'decoy-')));
          }

          const path_env = [...decoys, dir].join(process.platform === 'win32' ? ';' : ':');

          expect(await findPluginOnPath(sub, path_env)).toBe(expected);

          // a name that exists nowhere resolves null through the same dirs
          expect(await findPluginOnPath(`${sub}x`, path_env)).toBe(null);

        }
      ),
      { numRuns: 15 }
    );

  });

});





describe('invokeInProcess', () => {

  /**
   *  Writes a `.cjs` plugin fixture under the scratch node_modules and
   *  returns its absolute path.
   *  @param source  Module source; should set `module.exports` to a cli fn.
   *  @returns       Path to the written fixture.
   */
  async function plugin_fixture(source: string): Promise<string> {
    const dir = await fs.mkdtemp(join(scratch, 'node_modules', 'plug-'));
    const file = join(dir, 'cli.cjs');
    await fs.writeFile(file, source);
    return file;
  }

  test('a returning cli() propagates its numeric exit code; non-numbers become 0', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 255 }),
        fc.boolean(),
        async (code, return_number) => {

          const file = await plugin_fixture(
            return_number
              ? `module.exports = async () => ${code};`
              : `module.exports = async () => 'not a number';`
          );

          expect(await invokeInProcess(file, [])).toBe(return_number ? code : 0);

        }
      ),
      { numRuns: 15 }
    );

  });

  test('process.exit(n) inside the plugin is intercepted and becomes the return code', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 255 }),
        async (code) => {

          const file = await plugin_fixture(`module.exports = async () => { process.exit(${code}); };`);

          const exit_before = process.exit;
          expect(await invokeInProcess(file, [])).toBe(code);
          expect(process.exit).toBe(exit_before);   // restored

        }
      ),
      { numRuns: 15 }
    );

  });

  test('a plugin missing its cli export yields 2 with an explanatory stderr line', async () => {

    const file = await plugin_fixture('module.exports = 42;');

    const { result, text } = await capturing(process.stderr, () => invokeInProcess(file, []));

    expect(result).toBe(2);
    expect(text).toContain('missing default cli() export');

  });

  test('a throwing plugin yields 2 and reports the thrown message', async () => {

    await fc.assert(
      fc.asyncProperty(
        word,
        async (msg) => {

          const file = await plugin_fixture(`module.exports = async () => { throw new Error('${msg}'); };`);

          const { result, text } = await capturing(process.stderr, () => invokeInProcess(file, []));

          expect(result).toBe(2);
          expect(text).toContain(msg);

        }
      ),
      { numRuns: 10 }
    );

  });

  test('argv is forwarded to the plugin and process.argv is restored afterward', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.array(word, { minLength: 0, maxLength: 4 }),
        async (args) => {

          const file = await plugin_fixture(
            'module.exports = async (argv) => argv.length;'
          );

          const argv_before = process.argv;
          expect(await invokeInProcess(file, args)).toBe(args.length);
          expect(process.argv).toBe(argv_before);

        }
      ),
      { numRuns: 15 }
    );

  });

});





describe('dispatch', () => {

  test('--help / -h / help / no args print usage and exit 0', async () => {

    for (const argv of [ [], ['--help'], ['-h'], ['help'] ]) {

      const { result, text } = await capturing(process.stdout, () => dispatch([...argv]));

      expect(result).toBe(0);
      expect(text).toContain('Usage:');
      expect(text).toContain('fsl <subcommand>');

    }

  });

  test('--version / -V / version print a version line and exit 0', async () => {

    for (const argv of [ ['--version'], ['-V'], ['version'] ]) {

      const { result, text } = await capturing(process.stdout, () => dispatch([...argv]));

      expect(result).toBe(0);
      expect(text.startsWith('fsl ')).toBe(true);

    }

  });

  test('unknown subcommands exit 1 and name the missing fsl-<name> binary', async () => {

    await fc.assert(
      fc.asyncProperty(
        word.map( w => `zz${w}q` ),   // never collides with a real PATH binary
        async (sub) => {

          const { result, text } = await capturing(process.stderr, () => dispatch([sub]));

          expect(result).toBe(1);
          expect(text).toContain(`fsl-${sub}`);

        }
      ),
      { numRuns: 10 }
    );

  });

});
