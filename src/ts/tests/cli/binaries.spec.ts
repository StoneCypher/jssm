/**
 * Coverage for the two thin binary entry points `fsl.ts` and `fsl-render.ts`.
 *
 * Both files have the same shape: declare an async `main()` that reads
 * `process.argv`, delegates to either `dispatch()` or `cli()`, then calls
 * `process.exit(code)`. To exercise them in-process without actually
 * terminating the worker, we:
 *
 *   1. Mock the inner delegate (`dispatcher` / `plugin`) to return a known code.
 *   2. Replace `process.exit` with a capture stub that resolves a Promise.
 *   3. Dynamically import the binary module — which executes its top-level
 *      `void main();` immediately, kicking off the async chain.
 *   4. Await the capture Promise; that's also our timing signal that
 *      `main()` has run to completion.
 */

const installExitCapture = (): { captured: Promise<number>; restore: () => void } => {
  const realExit = process.exit;
  let resolveCaptured!: (code: number) => void;
  const captured = new Promise<number>((res) => { resolveCaptured = res; });
  (process as any).exit = (code: number) => { resolveCaptured(code); };
  return {
    captured,
    restore: () => { (process as any).exit = realExit; },
  };
};

describe('cli binary entry: fsl.ts', () => {

  it('forwards argv (minus first two slots) to dispatch and exits with its return code', async () => {
    vi.resetModules();
    let dispatchReceived: string[] | null = null;
    vi.doMock('../../cli/dispatcher', () => ({
      dispatch: async (argv: string[]) => { dispatchReceived = argv; return 7; },
    }));

    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/path/fsl.cjs', 'sub', '--flag', 'val'];
    try {
      await import('../../cli/fsl');
      const code = await captured;
      expect(code).toBe(7);
      expect(dispatchReceived).toEqual(['sub', '--flag', 'val']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/dispatcher');
    }
  });

});

describe('cli binary entry: fsl-render.ts', () => {

  it('forwards argv (minus first two slots) to cli() and exits with its return code', async () => {
    vi.resetModules();
    let cliReceived: string[] | null = null;
    vi.doMock('../../cli/subcommands/render/plugin', () => ({
      cli: async (argv: string[]) => { cliReceived = argv; return 3; },
    }));

    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/path/fsl-render.cjs', 'file.fsl', '--stdout'];
    try {
      await import('../../cli/fsl-render');
      const code = await captured;
      expect(code).toBe(3);
      expect(cliReceived).toEqual(['file.fsl', '--stdout']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/render/plugin');
    }
  });

});
