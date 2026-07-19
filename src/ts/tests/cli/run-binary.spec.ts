/**
 * Coverage for the thin binary entry point `fsl-run.ts` (mirrors the approach
 * in `binaries.spec.ts`): mock the plugin, dynamically import the module so
 * its top-level `void main()` runs, wait for `process.exitCode` to settle to
 * the delegate's return code (the #614 drain-the-event-loop pattern), and
 * restore the original `process.exitCode` in `finally`.
 */

import { describe, it, expect, vi } from 'vitest';

const waitForExitCode = (expected: number): Promise<void> =>
  vi.waitFor(() => { expect(process.exitCode).toBe(expected); });

describe('cli binary entry: fsl-run.ts', () => {
  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/run/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 5; },
    }));

    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/path/fsl-run.cjs', 'doc.fsl', 'run.jsonl'];
    try {
      await import('../../cli/fsl-run');
      await waitForExitCode(5);
      expect(received).toEqual(['doc.fsl', 'run.jsonl']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/run/plugin');
    }
  });
});
