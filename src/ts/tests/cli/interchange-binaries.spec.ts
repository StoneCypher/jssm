/**
 * Coverage for the thin binary entry points `fsl-import.ts` and `fsl-export.ts`.
 *
 * Same shape as `fsl-codegen.ts`: an async `main()` that reads `process.argv`,
 * delegates to the plugin's `cli()`, then calls `process.exit(code)`. We mock
 * the plugin, replace `process.exit` with a capture stub, and dynamically
 * import the binary module (which runs `void main()` on load).
 */

const installExitCapture = (): { captured: Promise<number>; restore: () => void } => {
  const realExit = process.exit;
  let resolveCaptured!: (code: number) => void;
  const captured = new Promise<number>((res) => { resolveCaptured = res; });
  (process as any).exit = (code: number) => { resolveCaptured(code); };
  return { captured, restore: () => { (process as any).exit = realExit; } };
};

describe('cli binary entry: fsl-import.ts', () => {

  it('forwards argv (minus first two slots) to cli() and exits with its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/import/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 3; },
    }));
    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/fsl-import.cjs', 'm.mmd', '--format=mermaid'];
    try {
      await import('../../cli/fsl-import');
      expect(await captured).toBe(3);
      expect(received).toEqual(['m.mmd', '--format=mermaid']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/import/plugin');
    }
  });

});

describe('cli binary entry: fsl-export.ts', () => {

  it('forwards argv (minus first two slots) to cli() and exits with its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/export/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 4; },
    }));
    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/fsl-export.cjs', 'm.fsl', '--format=json'];
    try {
      await import('../../cli/fsl-export');
      expect(await captured).toBe(4);
      expect(received).toEqual(['m.fsl', '--format=json']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/export/plugin');
    }
  });

});
