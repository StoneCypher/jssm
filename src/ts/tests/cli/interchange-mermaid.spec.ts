import { modelToMermaid, mermaidToModel } from '../../cli/subcommands/interchange/formats/mermaid';
import { InterchangeError } from '../../cli/subcommands/interchange/types';
import type { InterchangeModel } from '../../cli/subcommands/interchange/types';

describe('modelToMermaid', () => {

  it('emits a stateDiagram-v2 block with ids, labels, and edges', () => {
    const m: InterchangeModel = { states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'legal' }] };
    const out = modelToMermaid(m);
    expect(out).toContain('stateDiagram-v2');
    expect(out).toContain('s0: a');
    expect(out).toContain('s1: b');
    expect(out).toContain('s0 --> s1');
  });

  it('emits the action as a transition label', () => {
    const m: InterchangeModel = { states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'legal', action: 'go' }] };
    expect(modelToMermaid(m)).toContain('s0 --> s1 : go');
  });

  it('escapes double quotes in state names and action labels', () => {
    const m: InterchangeModel = { states: ['a"x'], edges: [{ from: 'a"x', to: 'a"x', kind: 'legal', action: 'b"c' }] };
    const out = modelToMermaid(m);
    expect(out).toContain('s0: a#quot;x');
    expect(out).toContain('#quot;c');
  });

  it('falls back to the raw endpoints when an edge names undeclared states', () => {
    // neither endpoint is in states → ids.get() is undefined for both → raw names
    const m: InterchangeModel = { states: ['a'], edges: [{ from: 'ghostA', to: 'ghostB', kind: 'legal' }] };
    expect(modelToMermaid(m)).toContain('ghostA --> ghostB');
  });

});

describe('mermaidToModel', () => {

  it('parses a header, node declarations, and a labeled transition', () => {
    const model = mermaidToModel('stateDiagram-v2\n  s0: Red\n  s1: Green\n  s0 --> s1 : go');
    expect(model.states).toEqual(['Red', 'Green']);
    expect(model.edges).toEqual([{ from: 'Red', to: 'Green', kind: 'legal', action: 'go' }]);
  });

  it('accepts the bare `stateDiagram` header', () => {
    const model = mermaidToModel('stateDiagram\n  s0 --> s1');
    expect(model.states).toEqual(['s0', 's1']);
  });

  it('keeps the raw id as the name when no node declaration renames it', () => {
    const model = mermaidToModel('stateDiagram-v2\n  s0 --> s1');
    expect(model.states).toEqual(['s0', 's1']);
    expect(model.edges[0]).toEqual({ from: 's0', to: 's1', kind: 'legal' });
  });

  it('unescapes #quot; back to a double quote in names and labels', () => {
    const model = mermaidToModel('stateDiagram-v2\n  s0: a#quot;b\n  s0 --> s0 : x#quot;y');
    expect(model.states).toEqual(['a"b']);
    expect(model.edges[0].action).toBe('x"y');
  });

  it('decodes every transition as a legal edge (mermaid has no arrow kind)', () => {
    expect(mermaidToModel('stateDiagram-v2\n  s0 --> s1').edges[0].kind).toBe('legal');
  });

  it('throws a parse InterchangeError when the header is missing', () => {
    try {
      mermaidToModel('  s0 --> s1');
      throw new Error('expected mermaidToModel to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InterchangeError);
      expect((e as InterchangeError).reason).toBe('parse');
    }
  });

  it('throws a parse InterchangeError on an unrecognized line', () => {
    expect(() => mermaidToModel('stateDiagram-v2\n  garbage line no colon no arrow'))
      .toThrow(InterchangeError);
  });

});
