/**
 * Coverage for the thin binary entry point `fsl-codegen.ts`.
 *
 * Same shape as `fsl.ts` / `fsl-render.ts`: an async `main()` that reads
 * `process.argv`, delegates to the plugin's `cli()`, then calls
 * `process.exit(code)`. To exercise it in-process without terminating the
 * worker, we mock the plugin, replace `process.exit` with a capture stub,
 * and dynamically import the binary module (which runs `void main()` on
 * load).
 */

import { describe, it, expect, vi } from 'vitest';

const installExitCapture = (): { captured: Promise<number>; restore: () => void } => {
  const realExit = process.exit;
  let resolveCaptured!: (code: number) => void;
  const captured = new Promise<number>((resolve) => { resolveCaptured = resolve; });
  (process as any).exit = (code: number) => { resolveCaptured(code); };
  return {
    captured,
    restore: () => { (process as any).exit = realExit; },
  };
};

describe('cli binary entry: fsl-codegen.ts', () => {

  it('forwards argv (minus first two slots) to cli() and exits with its return code', async () => {
    vi.resetModules();
    let cliReceived: string[] | null = null;
    vi.doMock('../../cli/subcommands/codegen/plugin', () => ({
      cli: async (argv: string[]) => { cliReceived = argv; return 5; },
    }));

    const { captured, restore } = installExitCapture();
    const origArgv = process.argv;
    process.argv = ['node', '/fake/path/fsl-codegen.cjs', 'file.fsl', '--stdout'];
    try {
      await import('../../cli/fsl-codegen');
      const code = await captured;
      expect(code).toBe(5);
      expect(cliReceived).toEqual(['file.fsl', '--stdout']);
    } finally {
      restore();
      process.argv = origArgv;
      vi.doUnmock('../../cli/subcommands/codegen/plugin');
    }
  });

});
