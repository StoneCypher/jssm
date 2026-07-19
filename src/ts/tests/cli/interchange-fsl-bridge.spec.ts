import { from } from '../../jssm';
import {
  quoteState,
  quoteAction,
  fslToModel,
  modelToFsl,
} from '../../cli/subcommands/interchange/fsl-bridge';
import { InterchangeError } from '../../cli/subcommands/interchange/types';
import type { InterchangeModel } from '../../cli/subcommands/interchange/types';

// Compare two models for structural equality, order-insensitive on the edge
// and state lists. Used to assert round-trip fidelity without depending on the
// (deterministic but incidental) emission order.
function modelsEquivalent(a: InterchangeModel, b: InterchangeModel): boolean {
  const states = (m: InterchangeModel): string => JSON.stringify([...m.states].sort((x, y) => x.localeCompare(y)));
  const edges  = (m: InterchangeModel): string =>
    JSON.stringify([...m.edges].map((e) => ({ ...e }))
      .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))));
  return states(a) === states(b) && edges(a) === edges(b);
}

describe('interchange fsl-bridge: quoteState', () => {

  it('wraps a plain name in double quotes', () => {
    expect(quoteState('Red')).toBe('"Red"');
  });

  it('preserves spaces inside the quotes', () => {
    expect(quoteState('Red Light')).toBe('"Red Light"');
  });

  it('escapes embedded double quotes', () => {
    expect(quoteState('a"b')).toBe(String.raw`"a\"b"`);
  });

  it('escapes embedded backslashes (before quotes, so order is correct)', () => {
    expect(quoteState(String.raw`a\b`)).toBe(String.raw`"a\\b"`);
  });

  it('round-trips a quoted name through the FSL parser', () => {
    const name = 'Weird: name (with) stuff!';
    const fsl = `${quoteState(name)} -> ${quoteState('other')};`;
    const m = from(fsl);
    expect(m.states()).toContain(name);
  });

});

describe('interchange fsl-bridge: quoteAction', () => {

  it('wraps an action in single quotes', () => {
    expect(quoteAction('go')).toBe("'go'");
  });

  it('preserves spaces inside the action quotes', () => {
    expect(quoteAction('Shut down')).toBe("'Shut down'");
  });

  it('escapes embedded single quotes', () => {
    expect(quoteAction("o'clock")).toBe(String.raw`'o\'clock'`);
  });

  it('escapes embedded backslashes', () => {
    expect(quoteAction(String.raw`a\b`)).toBe(String.raw`'a\\b'`);
  });

});

describe('interchange fsl-bridge: fslToModel', () => {

  it('extracts states and edges from simple FSL', () => {
    const m = fslToModel('a -> b;');
    expect(m.states).toEqual(['a', 'b']);
    expect(m.edges).toEqual([{ from: 'a', to: 'b', kind: 'legal' }]);
  });

  it('maps the main arrow (=>) to kind "main"', () => {
    const m = fslToModel('a => b;');
    expect(m.edges[0].kind).toBe('main');
  });

  it('maps the forced arrow (~>) to kind "forced"', () => {
    const m = fslToModel('a ~> b;');
    expect(m.edges[0].kind).toBe('forced');
  });

  it('captures the action label when present', () => {
    const m = fslToModel("a 'go' -> b;");
    expect(m.edges[0].action).toBe('go');
  });

  it('omits the action field when no action is present', () => {
    const m = fslToModel('a -> b;');
    expect(m.edges[0].action).toBeUndefined();
  });

  it('records the initial state in start_states', () => {
    const m = fslToModel('first -> second;');
    expect(m.start_states).toEqual(['first']);
  });

  it('throws InterchangeError(parse) on invalid FSL', () => {
    try {
      fslToModel('this is not -> valid fsl !!! @@@');
      throw new Error('expected InterchangeError');
    } catch (error) {
      expect(error).toBeInstanceOf(InterchangeError);
      expect((error as InterchangeError).reason).toBe('parse');
      expect((error as InterchangeError).format).toBe('fsl');
    }
  });

});

describe('interchange fsl-bridge: modelToFsl', () => {

  it('renders one edge per transition with quoted names', () => {
    const { fsl, isolatedStates } = modelToFsl({
      states: ['a', 'b'],
      edges: [{ from: 'a', to: 'b', kind: 'legal' }],
    });
    expect(fsl).toBe('"a" -> "b";\n');
    expect(isolatedStates).toEqual([]);
  });

  it('places the action label before the arrow', () => {
    const { fsl } = modelToFsl({
      states: ['a', 'b'],
      edges: [{ from: 'a', to: 'b', kind: 'main', action: 'go' }],
    });
    expect(fsl).toBe('"a" \'go\' => "b";\n');
  });

  it('uses the forced arrow for forced edges', () => {
    const { fsl } = modelToFsl({
      states: ['a', 'b'],
      edges: [{ from: 'a', to: 'b', kind: 'forced' }],
    });
    expect(fsl).toBe('"a" ~> "b";\n');
  });

  it('materializes an isolated state as a self-loop and reports it', () => {
    const { fsl, isolatedStates } = modelToFsl({ states: ['lonely'], edges: [] });
    expect(fsl).toBe('"lonely" -> "lonely";\n');
    expect(isolatedStates).toEqual(['lonely']);
  });

  it('returns empty FSL and no isolated states for an empty model', () => {
    const { fsl, isolatedStates } = modelToFsl({ states: [], edges: [] });
    expect(fsl).toBe('');
    expect(isolatedStates).toEqual([]);
  });

  it('does not treat an edge-connected state as isolated', () => {
    const { isolatedStates } = modelToFsl({
      states: ['a', 'b'],
      edges: [{ from: 'a', to: 'b', kind: 'legal' }],
    });
    expect(isolatedStates).toEqual([]);
  });

});

describe('interchange fsl-bridge: lossless FSL round-trip', () => {

  const sources = [
    'a -> b;',
    'a => b; b ~> c; c -> a;',
    "Off 'Start' -> Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;\n[Red Yellow Green] 'Shut down' ~> Off;",
    '"Red Light" \'go now\' => "Green Light";',
  ];

  for (const src of sources) {
    it(`FSL -> model -> FSL -> model is structurally identical for: ${JSON.stringify(src).slice(0, 40)}`, () => {
      const m1 = fslToModel(src);
      const { fsl } = modelToFsl(m1);
      const m2 = fslToModel(fsl);
      expect(modelsEquivalent(m1, m2)).toBe(true);
    });
  }

});
