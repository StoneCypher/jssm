import { cli } from '../../cli/subcommands/export-system-prompt/plugin';
import { parse } from '../../jssm';

describe('export-system-prompt subcommand', () => {

  let stdoutWrite: any;
  let stderrWrite: any;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints help text and returns 0 when --help is passed', async () => {
    const code = await cli(['--help']);
    expect(code).toBe(0);
    expect(stdoutWrite).toHaveBeenCalled();
    const output = stdoutWrite.mock.calls[0][0] as string;
    expect(output).toContain('fsl-export-system-prompt [options]');
  });

  it('prints version and returns 0 when --version is passed', async () => {
    const code = await cli(['--version']);
    expect(code).toBe(0);
    expect(stdoutWrite).toHaveBeenCalled();
    const output = stdoutWrite.mock.calls[0][0] as string;
    expect(output).toContain('fsl-export-system-prompt');
  });

  it('outputs the system prompt and returns 0 when no args are passed', async () => {
    const code = await cli([]);
    expect(code).toBe(0);
    expect(stdoutWrite).toHaveBeenCalled();
    const output = stdoutWrite.mock.calls[0][0] as string;
    expect(output).toContain('# FSL v5 Agent System Prompt (llms.txt)');
    expect(output).toContain('llmstxt.org');
  });

  it('prints an error and returns 1 on unknown flags', async () => {
    const code = await cli(['--does-not-exist']);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalled();
    const output = stderrWrite.mock.calls[0][0] as string;
    expect(output).toContain('error:');
  });

  it('every FSL example in the exported prompt parses', async () => {
    await cli([]);
    const output = stdoutWrite.mock.calls.map((c: any[]) => c[0]).join('');
    const blocks = [...output.matchAll(/```fsl\n([\s\S]*?)```/g)].map(m => m[1]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const fsl of blocks) {
      expect(() => parse(fsl), `prompt FSL example must parse:\n${fsl}`).not.toThrow();
    }
  });

});
