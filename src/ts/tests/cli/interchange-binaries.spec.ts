/**
 * Coverage for the thin binary entry points `fsl-import.ts` and `fsl-export.ts`.
 *
 * Same shape as `fsl-codegen.ts`: an async `main()` that reads `process.argv`,
 * delegates to the plugin's `cli()`, then sets `process.exitCode = code` (the
 * #614 drain-the-event-loop pattern; see `binaries.spec.ts`). We mock the
 * plugin, dynamically import the binary module (which runs `void main()` on
 * load), wait for `process.exitCode` to settle, and restore the original
 * `process.exitCode` in `finally`.
 */

import { describe, it, expect, vi } from 'vitest';

const waitForExitCode = (expected: number): Promise<void> =>
  vi.waitFor(() => { expect(process.exitCode).toBe(expected); });

describe('cli binary entry: fsl-import.ts', () => {

  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/import/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 3; },
    }));
    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/fsl-import.cjs', 'm.mmd', '--format=mermaid'];
    try {
      await import('../../cli/fsl-import');
      await waitForExitCode(3);
      expect(received).toEqual(['m.mmd', '--format=mermaid']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/import/plugin');
    }
  });

});

describe('cli binary entry: fsl-export.ts', () => {

  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/export/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 4; },
    }));
    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/fsl-export.cjs', 'm.fsl', '--format=json'];
    try {
      await import('../../cli/fsl-export');
      await waitForExitCode(4);
      expect(received).toEqual(['m.fsl', '--format=json']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/export/plugin');
    }
  });

});
