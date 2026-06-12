
import * as fc from 'fast-check';

import { promises as fs } from 'fs';
import { join, basename } from 'path';

import { cli } from '../cli/subcommands/render/plugin';





// Property-based coverage for the `fsl-render` plugin entry point.
//
// All file fixtures live in a scratch directory under build/ (the house
// location for temporary files) and are removed afterward.  stdout and
// stderr are captured by swapping the stream writers.



const GOOD_FSL = 'pa -> pb;  pb -> pc;';
const BAD_FSL  = '%% definitely not fsl %%';



let scratch: string;

beforeAll(async () => {
  await fs.mkdir('build', { recursive: true });
  scratch = await fs.mkdtemp(join('build', 'stoch-render-'));
  scratch = join(process.cwd(), scratch);
});

afterAll(async () => {
  await fs.rm(scratch, { recursive: true, force: true });
});



/**
 *  Captures a writable stream's output while `fn` runs.
 *
 *  @param stream  `process.stdout` or `process.stderr`.
 *  @param fn      The action to run while capturing.
 *  @returns       The action's result and captured text.
 */
async function capturing<T>(
  stream: NodeJS.WriteStream,
  fn: () => Promise<T> | T
): Promise<{ result: T, text: string }> {

  const original = stream.write.bind(stream);
  let   text     = '';

  (stream as { write: unknown }).write = (chunk: unknown): boolean => {
    text += typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('latin1');
    return true;
  };

  try {
    const result = await fn();
    return { result, text };
  } finally {
    (stream as { write: unknown }).write = original;
  }

}



/**
 *  Writes a fixture .fsl file into the scratch directory.
 *
 *  @param name     Base name without extension.
 *  @param content  FSL text.
 *  @returns        Absolute path to the file.
 */
async function fsl_fixture(name: string, content: string): Promise<string> {
  const file = join(scratch, `${name}.fsl`);
  await fs.writeFile(file, content);
  return file;
}





describe('reserved flags and argument errors', () => {

  test('--help and --version exit 0 with the right banners', async () => {

    const help = await capturing(process.stdout, () => cli(['--help']));
    expect(help.result).toBe(0);
    expect(help.text).toContain('fsl-render [options]');

    const version = await capturing(process.stdout, () => cli(['--version']));
    expect(version.result).toBe(0);
    expect(version.text.startsWith('fsl-render ')).toBe(true);

  });

  test('unknown flags exit 1 with an error line', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 8 }),
        async (flag) => {
          const { result, text } = await capturing(process.stderr, () => cli([`--zz${flag}`]));
          expect(result).toBe(1);
          expect(text).toContain('fsl-render: error:');
        }
      ),
      { numRuns: 15 }
    );

  });

  test('output-flag and size-flag mutual exclusions exit 1', async () => {

    const out_clash = await capturing(process.stderr, () => cli(['x.fsl', '--stdout', '--output', 'y.svg']));
    expect(out_clash.result).toBe(1);
    expect(out_clash.text).toContain('mutually exclusive');

    const size_clash = await capturing(process.stderr, () => cli(['x.fsl', '--width', '100', '--scale', '200']));
    expect(size_clash.result).toBe(1);
    expect(size_clash.text).toContain('mutually exclusive');

  });

  test('an unreadable input path exits 1 naming the path', async () => {

    const ghost = join(scratch, 'does-not-exist.fsl');
    const { result, text } = await capturing(process.stderr, () => cli([ghost, '--stdout']));

    expect(result).toBe(1);
    expect(text).toContain('cannot read');

  });

});





describe('single-input renders', () => {

  test('--stdout writes the rendered text to stdout for every text target', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('svg', 'dot', 'html'),
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 8 }),
        async (target, stem) => {

          const file = await fsl_fixture(`stdout-${target}-${stem}`, GOOD_FSL);

          const { result, text } = await capturing(process.stdout, () => cli([file, '--stdout', `--target=${target}`]));

          expect(result).toBe(0);

          if (target === 'svg')  { expect(text).toContain('<svg'); }
          if (target === 'dot')  { expect(text).toContain('digraph'); }
          if (target === 'html') { expect(text).toContain('<!DOCTYPE html>'); }

        }
      ),
      { numRuns: 12 }
    );

  });

  test('the default output is a sibling file named <input-stem>.<target>', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('svg', 'dot', 'html'),
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 8 }),
        async (target, stem) => {

          const file = await fsl_fixture(`sib-${target}-${stem}`, GOOD_FSL);

          expect(await cli([file, `--target=${target}`])).toBe(0);

          const sibling = file.replace(/\.fsl$/, `.${target}`);
          const written = await fs.readFile(sibling, 'utf8');
          expect(written.length).toBeGreaterThan(0);

        }
      ),
      { numRuns: 12 }
    );

  });

  test('--output places the render at the exact requested path', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 8 }),
        async (stem) => {

          const file = await fsl_fixture(`out-${stem}`, GOOD_FSL);
          const dest = join(scratch, `chosen-${stem}.dot`);

          expect(await cli([file, '--target=dot', '--output', dest])).toBe(0);

          const written = await fs.readFile(dest, 'utf8');
          expect(written).toContain('digraph');

        }
      ),
      { numRuns: 10 }
    );

  });

  test('a failing render exits 1 and reports through stderr with the input label', async () => {

    const file = await fsl_fixture('broken', BAD_FSL);

    const { result, text } = await capturing(process.stderr, () => cli([file, '--stdout']));

    expect(result).toBe(1);
    expect(text).toContain('fsl-render: error:');
    expect(text).toContain(basename(file));

  });

});





describe('multi-input renders', () => {

  test('multiple inputs without --out-dir exit 1 with guidance', async () => {

    const a = await fsl_fixture('multi-a', GOOD_FSL);
    const b = await fsl_fixture('multi-b', GOOD_FSL);

    const { result, text } = await capturing(process.stderr, () => cli([a, b]));

    expect(result).toBe(1);
    expect(text).toContain('--out-dir');

  });

  test('with --out-dir, every good input lands; failures set the worst exit code without aborting', async () => {

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 2, maxLength: 4 }),
        fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 6 }),
        async (goods, run_id) => {

          const out_dir = join(scratch, `outdir-${run_id}-${goods.map(Number).join('')}`);
          await fs.mkdir(out_dir, { recursive: true });

          const files: string[] = [];
          for (let i = 0; i < goods.length; ++i) {
            files.push(await fsl_fixture(`batch-${run_id}-${i}`, goods[i] ? GOOD_FSL : BAD_FSL));
          }

          const { result } = await capturing(process.stderr, () => cli([...files, '--target=dot', '--out-dir', out_dir]));

          const any_bad = goods.some( g => !g );
          expect(result).toBe(any_bad ? 1 : 0);

          for (let i = 0; i < goods.length; ++i) {

            const expected_out = join(out_dir, `batch-${run_id}-${i}.dot`);
            const exists = await fs.access(expected_out).then( () => true, () => false );

            expect(exists).toBe(goods[i]);   // good inputs land, bad ones leave nothing

          }

        }
      ),
      { numRuns: 12 }
    );

  });

});
