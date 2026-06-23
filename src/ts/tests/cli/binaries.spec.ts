/**
 * Coverage for the three thin binary entry points `fsl.ts`, `fsl-render.ts`,
 * and `fsl-export-system-prompt.ts`.
 *
 * Each has the same shape: an async `main()` that reads `process.argv`,
 * delegates to `dispatch()` / `cli()`, then sets `process.exitCode = code`.
 * They set `process.exitCode` rather than calling `process.exit(code)` so the
 * event loop drains and libuv async handles (from the WASM render paths) close
 * cleanly on Windows (#614). To exercise them in-process we:
 *
 *   1. Mock the inner delegate (`dispatcher` / `plugin`) to return a known code.
 *   2. Dynamically import the binary module — its top-level `void main();`
 *      runs immediately, kicking off the async chain.
 *   3. Wait for `process.exitCode` to settle to the delegate's return code.
 *   4. Restore the original `process.exitCode` in `finally` — otherwise the
 *      assigned code would become the test worker's own exit status.
 */

const waitForExitCode = (expected: number): Promise<void> =>
  vi.waitFor(() => { expect(process.exitCode).toBe(expected); });

describe('cli binary entry: fsl.ts', () => {

  it('forwards argv (minus first two slots) to dispatch and sets exitCode to its return code', async () => {
    vi.resetModules();
    let dispatchReceived: string[] | null = null;
    vi.doMock('../../cli/dispatcher', () => ({
      dispatch: async (argv: string[]) => { dispatchReceived = argv; return 7; },
    }));

    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/path/fsl.cjs', 'sub', '--flag', 'val'];
    try {
      await import('../../cli/fsl');
      await waitForExitCode(7);
      expect(dispatchReceived).toEqual(['sub', '--flag', 'val']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/dispatcher');
    }
  });

});

describe('cli binary entry: fsl-render.ts', () => {

  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let cliReceived: string[] | null = null;
    vi.doMock('../../cli/subcommands/render/plugin', () => ({
      cli: async (argv: string[]) => { cliReceived = argv; return 3; },
    }));

    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/path/fsl-render.cjs', 'file.fsl', '--stdout'];
    try {
      await import('../../cli/fsl-render');
      await waitForExitCode(3);
      expect(cliReceived).toEqual(['file.fsl', '--stdout']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/render/plugin');
    }
  });

});

describe('cli binary entry: fsl-export-system-prompt.ts', () => {

  it('forwards argv (minus first two slots) to cli() and sets exitCode to its return code', async () => {
    vi.resetModules();
    let cliReceived: string[] | null = null;
    vi.doMock('../../cli/subcommands/export-system-prompt/plugin', () => ({
      cli: async (argv: string[]) => { cliReceived = argv; return 5; },
    }));

    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    process.argv = ['node', '/fake/path/fsl-export-system-prompt.cjs', '--help'];
    try {
      await import('../../cli/fsl-export-system-prompt');
      await waitForExitCode(5);
      expect(cliReceived).toEqual(['--help']);
    } finally {
      process.exitCode = origExitCode;
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/export-system-prompt/plugin');
    }
  });

});
