import { exportMachine } from '../../cli/subcommands/export/export';
import { InterchangeError } from '../../cli/subcommands/interchange/types';

describe('exportMachine', () => {

  it('throws unknown-format for an unrecognized format', () => {
    try {
      // @ts-expect-error exercising the runtime guard
      exportMachine('a -> b;', { format: 'yaml' });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InterchangeError);
      expect((error as InterchangeError).reason).toBe('unknown-format');
    }
  });

  it('throws unsupported for known-but-pending formats (scxml, tla+)', () => {
    expect(() => exportMachine('a -> b;', { format: 'scxml' })).toThrow(InterchangeError);
    try {
      exportMachine('a -> b;', { format: 'tla+' });
      throw new Error('expected throw');
    } catch (error) {
      expect((error as InterchangeError).reason).toBe('unsupported');
    }
  });

  it('exports json losslessly', () => {
    const r = exportMachine("a 'go' -> b;", { format: 'json' });
    expect(r.output).toContain('"a"');
    expect(r.output).toContain('"b"');
    expect(r.lossy).toEqual([]);
  });

  it('exports mermaid with no loss when every edge is legal', () => {
    const r = exportMachine('a -> b;', { format: 'mermaid' });
    expect(r.output).toContain('stateDiagram-v2');
    expect(r.lossy).toEqual([]);
  });

  it('flags lost arrow kind when exporting a non-legal edge to mermaid', () => {
    const r = exportMachine('a => b;', { format: 'mermaid' });  // '=>' is a main edge
    expect(r.output).toContain('-->');
    expect(r.lossy.some((s) => s.includes('arrow-kind'))).toBe(true);
  });

  it('throws a parse InterchangeError when the FSL fails to compile', () => {
    try {
      exportMachine('this is not valid fsl !!', { format: 'json' });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InterchangeError);
      expect((error as InterchangeError).reason).toBe('parse');
    }
  });

  it('String()s a non-Error thrown by the FSL compiler (fsl-bridge ?? fallback)', async () => {
    vi.resetModules();
    vi.doMock('../../jssm', () => ({ from: () => { throw 'plain-string-parse-failure'; } }));
    const { exportMachine: mockedExport } = await import('../../cli/subcommands/export/export');
    const { InterchangeError: IE } = await import('../../cli/subcommands/interchange/types');
    let thrown: unknown;
    try { mockedExport('whatever', { format: 'json' }); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(IE);
    expect((thrown as Error).message).toContain('plain-string-parse-failure');
    vi.doUnmock('../../jssm');
  });

});
