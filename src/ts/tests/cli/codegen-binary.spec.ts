/**
 * Coverage for the thin binary entry point `fsl-codegen.ts`.
 *
 * Same shape as `fsl.ts` / `fsl-render.ts`: an async `main()` that reads
 * `process.argv`, delegates to the plugin's `cli()`, then sets
 * `process.exitCode = code` (the #614 drain-the-event-loop pattern; see
 * `binaries.spec.ts`). To exercise it in-process we mock the plugin,
 * dynamically import the binary module (which runs `void main()` on load),
 * wait for `process.exitCode` to settle, and restore the original
 * `process.exitCode` in `finally`.
 */

import { describe, it, expect, vi } from 'vitest';

const waitForExitCode = (expected: number): Promise<void> =>
  vi.waitFor(() => { expect(process.exitCode).toBe(expected); });

describe('cli binary entry: fsl-codegen.ts', () => {

  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let cliReceived: string[] | null = null;
    vi.doMock('../../cli/subcommands/codegen/plugin', () => ({
      cli: async (argv: string[]) => { cliReceived = argv; return 5; },
    }));

    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/path/fsl-codegen.cjs', 'file.fsl', '--stdout'];
    try {
      await import('../../cli/fsl-codegen');
      await waitForExitCode(5);
      expect(cliReceived).toEqual(['file.fsl', '--stdout']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/codegen/plugin');
    }
  });

});
