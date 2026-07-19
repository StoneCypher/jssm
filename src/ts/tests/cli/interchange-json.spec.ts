import { modelToJson, jsonToModel } from '../../cli/subcommands/interchange/formats/json';
import { InterchangeError } from '../../cli/subcommands/interchange/types';

describe('interchange json: modelToJson', () => {

  it('emits a versioned envelope with states and edges', () => {
    const json = modelToJson({ states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'legal' }] });
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('fsl-interchange');
    expect(parsed.version).toBe(1);
    expect(parsed.states).toEqual(['a', 'b']);
    expect(parsed.edges).toEqual([{ from: 'a', to: 'b', kind: 'legal' }]);
  });

  it('includes start_states when the model carries them', () => {
    const json = modelToJson({ states: ['a'], edges: [], start_states: ['a'] });
    expect(JSON.parse(json).start_states).toEqual(['a']);
  });

  it('omits start_states when the model does not carry them', () => {
    const json = modelToJson({ states: ['a'], edges: [] });
    expect('start_states' in JSON.parse(json)).toBe(false);
  });

  it('terminates the output with a newline', () => {
    expect(modelToJson({ states: [], edges: [] }).endsWith('\n')).toBe(true);
  });

});

describe('interchange json: jsonToModel', () => {

  it('decodes a valid document', () => {
    const model = jsonToModel(JSON.stringify({
      format: 'fsl-interchange', version: 1,
      states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'main', action: 'go' }],
    }));
    expect(model.states).toEqual(['a', 'b']);
    expect(model.edges).toEqual([{ from: 'a', to: 'b', kind: 'main', action: 'go' }]);
  });

  it('decodes start_states when present and valid', () => {
    const model = jsonToModel(JSON.stringify({ states: ['a'], edges: [], start_states: ['a'] }));
    expect(model.start_states).toEqual(['a']);
  });

  it('ignores a malformed start_states (non-array)', () => {
    const model = jsonToModel(JSON.stringify({ states: ['a'], edges: [], start_states: 'nope' }));
    expect(model.start_states).toBeUndefined();
  });

  it('ignores a start_states array with non-string members', () => {
    const model = jsonToModel(JSON.stringify({ states: ['a'], edges: [], start_states: [1, 2] }));
    expect(model.start_states).toBeUndefined();
  });

  it('decodes an edge with no action (action stays undefined)', () => {
    const model = jsonToModel(JSON.stringify({ states: ['a', 'b'], edges: [{ from: 'a', to: 'b', kind: 'legal' }] }));
    expect(model.edges[0].action).toBeUndefined();
  });

  it('throws on invalid JSON syntax', () => {
    expect(() => jsonToModel('{not json')).toThrow(InterchangeError);
    try { jsonToModel('{not json'); } catch (error) {
      expect((error as InterchangeError).reason).toBe('parse');
      expect((error as InterchangeError).message).toMatch(/invalid JSON/);
    }
  });

  it('throws when the top-level is not an object', () => {
    expect(() => jsonToModel('42')).toThrow(/must be an object/);
  });

  it('throws when the top-level is null', () => {
    expect(() => jsonToModel('null')).toThrow(/must be an object/);
  });

  it('throws when states is missing or not an array of strings', () => {
    expect(() => jsonToModel(JSON.stringify({ edges: [] }))).toThrow(/`states` must be an array of strings/);
    expect(() => jsonToModel(JSON.stringify({ states: [1], edges: [] }))).toThrow(/`states` must be an array of strings/);
  });

  it('throws when edges is not an array', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: 'no' }))).toThrow(/`edges` must be an array/);
  });

  it('throws when an edge is not an object', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: [5] }))).toThrow(/edge 0 must be an object/);
  });

  it('throws when an edge is null', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: [null] }))).toThrow(/edge 0 must be an object/);
  });

  it('throws when an edge lacks string from/to', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: [{ to: 'b', kind: 'legal' }] })))
      .toThrow(/edge 0 requires string `from` and `to`/);
  });

  it('throws when an edge kind is invalid', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: [{ from: 'a', to: 'b', kind: 'sideways' }] })))
      .toThrow(/edge 0 `kind` must be one of/);
  });

  it('throws when an edge action is present but non-string', () => {
    expect(() => jsonToModel(JSON.stringify({ states: [], edges: [{ from: 'a', to: 'b', kind: 'legal', action: 7 }] })))
      .toThrow(/edge 0 `action` must be a string/);
  });

});

describe('interchange json: lossless model round-trip', () => {

  it('model -> json -> model is identical', () => {
    const model = {
      states: ['a', 'b', 'c'],
      edges: [
        { from: 'a', to: 'b', kind: 'main' as const, action: 'go' },
        { from: 'b', to: 'c', kind: 'forced' as const },
        { from: 'c', to: 'a', kind: 'legal' as const },
      ],
      start_states: ['a'],
    };
    expect(jsonToModel(modelToJson(model))).toEqual(model);
  });

});
