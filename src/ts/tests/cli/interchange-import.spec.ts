import { importMachine } from '../../cli/subcommands/import/import';
import { modelToJson } from '../../cli/subcommands/interchange/formats/json';
import { InterchangeError } from '../../cli/subcommands/interchange/types';

describe('importMachine', () => {

  it('throws unknown-format for an unrecognized format', () => {
    try {
      // @ts-expect-error exercising the runtime guard
      importMachine('{}', { format: 'yaml' });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InterchangeError);
      expect((error as InterchangeError).reason).toBe('unknown-format');
    }
  });

  it('throws unsupported for a known-but-pending format (scxml)', () => {
    try {
      importMachine('<scxml/>', { format: 'scxml' });
      throw new Error('expected throw');
    } catch (error) {
      expect((error as InterchangeError).reason).toBe('unsupported');
    }
  });

  it('imports json losslessly into FSL', () => {
    const json = modelToJson({ states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'legal' }] });
    const r = importMachine(json, { format: 'json' });
    expect(r.output).toContain('"a"');
    expect(r.output).toContain('->');
    expect(r.output).toContain('"b"');
    expect(r.lossy).toEqual([]);
  });

  it('reports an isolated state from json as a self-loop loss', () => {
    const json = modelToJson({ states: ['x'], edges: [] });
    const r = importMachine(json, { format: 'json' });
    expect(r.lossy.some((s) => s.includes('self-loops'))).toBe(true);
  });

  it('imports mermaid with edges and flags the lost arrow kind', () => {
    const r = importMachine('stateDiagram-v2\n  s0 --> s1 : go', { format: 'mermaid' });
    expect(r.output).toContain('->');
    expect(r.lossy.some((s) => s.includes('arrow kind'))).toBe(true);
  });

  it('imports an edgeless mermaid diagram with no arrow-kind note but a self-loop note', () => {
    const r = importMachine('stateDiagram-v2\n  s0: lonely', { format: 'mermaid' });
    expect(r.lossy.some((s) => s.includes('arrow kind'))).toBe(false); // no edges → no arrow-kind loss
    expect(r.lossy.some((s) => s.includes('self-loops'))).toBe(true);
  });

});
