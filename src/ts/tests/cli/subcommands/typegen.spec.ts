
import { typegen, extractTypeSurface } from '../../../cli/subcommands/typegen/typegen';
import { TypegenError } from '../../../cli/types';



describe('typegen: extractTypeSurface', () => {

  test('extracts states, the action alphabet, and the start state', () => {
    const surface = extractTypeSurface("a 'go' -> b;");
    expect( surface.states  ).toEqual(['a', 'b']);
    expect( surface.actions ).toEqual(['go']);
    expect( surface.initial ).toBe('a');
  });

  test('reports an empty action alphabet for an unlabeled machine', () => {
    expect( extractTypeSurface('a -> b;').actions ).toEqual([]);
  });

  test('includes declared property names', () => {
    expect( extractTypeSurface('property color default "red"; a -> b;').props )
      .toContain('color');
  });

  test('wraps a parse failure in a TypegenError', () => {
    expect( () => extractTypeSurface('@@@ not fsl @@@') ).toThrow(TypegenError);
    expect( () => extractTypeSurface('@@@ not fsl @@@') ).toThrow(/typegen parse failed/);
  });

});



describe('typegen: TypeScript rendering', () => {

  test('emits a string-literal union of the states', () => {
    expect( typegen("a 'go' -> b;", { name: 'Light' }) )
      .toContain("export type LightState = 'a' | 'b';");
  });

  test('emits the action alphabet as a union', () => {
    expect( typegen("a 'go' -> b;", { name: 'Light' }) )
      .toContain("export type LightAction = 'go';");
  });

  test('emits the start state as a literal type', () => {
    expect( typegen("a 'go' -> b;", { name: 'Light' }) )
      .toContain("export type LightInitial = 'a';");
  });

  test('emits the caller-facing interface', () => {
    const ts = typegen("a 'go' -> b;", { name: 'Light' });
    expect( ts ).toContain('export interface Light {');
    expect( ts ).toContain('state(): LightState;');
  });

  test('renders an empty action alphabet as the never type', () => {
    expect( typegen('a -> b;', { name: 'Light' }) )
      .toContain('export type LightAction = never;');
  });

  test('defaults the base identifier to Machine', () => {
    const ts = typegen("a 'go' -> b;");
    expect( ts ).toContain('export type MachineState =');
    expect( ts ).toContain('export interface Machine {');
  });

  test('honours an explicit typescript target', () => {
    expect( typegen('a -> b;', { target: 'typescript', name: 'M' }) )
      .toContain('export type MState =');
  });

  test('escapes a single quote in a state name', () => {
    expect( typegen(`"a'b" -> c;`, { name: 'Q' }) ).toContain("\\'");
  });

});



describe('typegen: unsupported target', () => {

  test('throws a TypegenError on an unknown target', () => {
    expect( () => typegen('a -> b;', { target: 'c' as any }) ).toThrow(TypegenError);
    expect( () => typegen('a -> b;', { target: 'c' as any }) ).toThrow(/unknown target/);
  });

});
