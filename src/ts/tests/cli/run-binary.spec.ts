/**
 * Coverage for the thin binary entry point `fsl-run.ts` (mirrors the approach
 * in `binaries.spec.ts`): mock the plugin, capture process.exit, dynamically
 * import the module so its top-level `void main()` runs.
 */

const installExitCapture = (): { captured: Promise<number>; restore: () => void } => {
  const realExit = process.exit;
  let resolveCaptured!: (code: number) => void;
  const captured = new Promise<number>((res) => { resolveCaptured = res; });
  (process as any).exit = (code: number) => { resolveCaptured(code); };
  return { captured, restore: () => { (process as any).exit = realExit; } };
};

describe('cli binary entry: fsl-run.ts', () => {
  it('forwards argv (minus first two slots) to cli() and exits with its return code', async () => {
    vi.resetModules();
    let received: string[] | null = null;
    vi.doMock('../../cli/subcommands/run/plugin', () => ({
      cli: async (argv: string[]) => { received = argv; return 5; },
    }));

    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/path/fsl-run.cjs', 'doc.fsl', 'run.jsonl'];
    try {
      await import('../../cli/fsl-run');
      const code = await captured;
      expect(code).toBe(5);
      expect(received).toEqual(['doc.fsl', 'run.jsonl']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/run/plugin');
    }
  });
});
